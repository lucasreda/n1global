import { storage } from "./storage";
const db = storage.db;
import { 
  trackingEvents, 
  analyticsSessions, 
  conversionFunnels, 
  funnelAnalytics,
  type InsertTrackingEvent,
  type InsertAnalyticsSession,
  type TrackingEvent,
  type AnalyticsSession
} from "@shared/schema";
import { eq, and, gte, lte, desc, asc, sql, count, sum, avg, between } from "drizzle-orm";
import { nanoid } from "nanoid";

export class AnalyticsService {
  /**
   * Track a user event (page view, click, conversion, etc.)
   */
  async trackEvent(eventData: {
    sessionId: string;
    visitorId: string;
    userId?: string;
    funnelId?: string;
    pageId?: string;
    deploymentId?: string;
    eventType: string;
    eventName?: string;
    eventValue?: number;
    metadata?: Record<string, any>;
    deviceInfo?: Record<string, any>;
    geoLocation?: Record<string, any>;
    trafficSource?: Record<string, any>;
    pageLoadTime?: number;
    clientTime?: Date;
  }): Promise<TrackingEvent> {
    console.log(`📊 Tracking event: ${eventData.eventType}${eventData.eventName ? ` - ${eventData.eventName}` : ''}`);

    const eventRecord = await db.insert(trackingEvents).values({
      sessionId: eventData.sessionId,
      visitorId: eventData.visitorId,
      userId: eventData.userId,
      funnelId: eventData.funnelId,
      pageId: eventData.pageId,
      deploymentId: eventData.deploymentId,
      eventType: eventData.eventType,
      eventName: eventData.eventName,
      eventValue: eventData.eventValue,
      metadata: eventData.metadata,
      deviceInfo: eventData.deviceInfo,
      geoLocation: eventData.geoLocation,
      trafficSource: eventData.trafficSource,
      pageLoadTime: eventData.pageLoadTime,
      clientTime: eventData.clientTime,
    }).returning();

    // Update session with this event
    await this.updateSessionWithEvent(eventData.sessionId, eventData);

    return eventRecord[0];
  }

  /**
   * Verify if user has access to a funnel
   */
  async verifyFunnelAccess(funnelId: string, userId: string): Promise<boolean> {
    try {
      // Get funnel with operation check
      const funnel = await db
        .select({
          id: sql`f.id`,
          operationId: sql`f.operation_id`,
          userHasAccess: sql`CASE WHEN ua.user_id IS NOT NULL THEN true ELSE false END`,
        })
        .from(sql`funnels f`)
        .leftJoin(sql`user_operation_access ua`, sql`ua.operation_id = f.operation_id AND ua.user_id = ${userId}`)
        .where(sql`f.id = ${funnelId}`)
        .limit(1);

      return funnel.length > 0 && Boolean(funnel[0].userHasAccess);
    } catch (error) {
      console.error("❌ Error verifying funnel access:", error);
      return false;
    }
  }

  /**
   * Create or update a user session
   */
  async createOrUpdateSession(sessionData: {
    sessionId: string;
    visitorId: string;
    userId?: string;
    funnelId?: string;
    operationId?: string;
    deviceInfo?: Record<string, any>;
    trafficSource?: Record<string, any>;
    geoLocation?: Record<string, any>;
    entryPage?: string;
  }): Promise<AnalyticsSession> {
    // Check if session already exists
    const existingSession = await db
      .select()
      .from(analyticsSessions)
      .where(eq(analyticsSessions.sessionId, sessionData.sessionId))
      .limit(1);

    if (existingSession.length > 0) {
      // Update existing session
      const [updatedSession] = await db
        .update(analyticsSessions)
        .set({
          endTime: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(analyticsSessions.sessionId, sessionData.sessionId))
        .returning();
      
      return updatedSession;
    }

    // Create new session
    const [newSession] = await db.insert(analyticsSessions).values({
      sessionId: sessionData.sessionId,
      visitorId: sessionData.visitorId,
      userId: sessionData.userId,
      funnelId: sessionData.funnelId,
      operationId: sessionData.operationId,
      startTime: new Date(),
      deviceInfo: sessionData.deviceInfo,
      trafficSource: sessionData.trafficSource,
      geoLocation: sessionData.geoLocation,
      entryPage: sessionData.entryPage,
    }).returning();

    console.log(`📊 New analytics session created: ${sessionData.sessionId}`);
    return newSession;
  }

  /**
   * Update session with event data
   */
  private async updateSessionWithEvent(sessionId: string, eventData: any): Promise<void> {
    // Increment page views and events count
    const updateData: any = {
      eventsCount: sql`${analyticsSessions.eventsCount} + 1`,
      endTime: new Date(),
      updatedAt: new Date(),
    };

    if (eventData.eventType === 'page_view') {
      updateData.pageViews = sql`${analyticsSessions.pageViews} + 1`;
    }

    // Check if this is a conversion event
    if (eventData.eventType === 'conversion' || eventData.eventName?.includes('purchase')) {
      updateData.converted = true;
      updateData.conversionEvent = eventData.eventName || eventData.eventType;
      updateData.conversionValue = eventData.eventValue;
      updateData.conversionTime = new Date();
    }

    // Calculate session duration if needed
    if (updateData.endTime) {
      const session = await db
        .select({ startTime: analyticsSessions.startTime })
        .from(analyticsSessions)
        .where(eq(analyticsSessions.sessionId, sessionId))
        .limit(1);
      
      if (session.length > 0) {
        const duration = Math.floor((updateData.endTime.getTime() - session[0].startTime.getTime()) / 1000);
        updateData.duration = duration;
      }
    }

    // Update exit page
    if (eventData.metadata?.url) {
      updateData.exitPage = eventData.metadata.url;
    }

    await db
      .update(analyticsSessions)
      .set(updateData)
      .where(eq(analyticsSessions.sessionId, sessionId));
  }

  /**
   * Get analytics data for a funnel
   */
  async getFunnelAnalytics(funnelId: string, options: {
    startDate?: string;
    endDate?: string;
    period?: 'daily' | 'weekly' | 'monthly';
  } = {}): Promise<{
    overview: {
      totalSessions: number;
      uniqueVisitors: number;
      conversions: number;
      conversionRate: number;
      totalRevenue: number;
      avgSessionDuration: number;
      bounceRate: number;
    };
    dailyData: Array<{
      date: string;
      sessions: number;
      visitors: number;
      conversions: number;
      revenue: number;
    }>;
    trafficSources: Record<string, number>;
    deviceBreakdown: Record<string, number>;
    topPages: Array<{ page: string; views: number }>;
  }> {
    const { startDate, endDate, period = 'daily' } = options;
    
    console.log(`📊 Getting funnel analytics for ${funnelId}`);

    // Build date filter
    const dateFilter = [];
    if (startDate) {
      dateFilter.push(gte(analyticsSessions.startTime, new Date(startDate)));
    }
    if (endDate) {
      dateFilter.push(lte(analyticsSessions.startTime, new Date(endDate)));
    }

    // Get overview metrics
    const overviewQuery = await db
      .select({
        totalSessions: count(analyticsSessions.id),
        uniqueVisitors: sql<number>`COUNT(DISTINCT ${analyticsSessions.visitorId})`,
        conversions: sql<number>`COUNT(CASE WHEN ${analyticsSessions.converted} = true THEN 1 END)`,
        totalRevenue: sql<number>`COALESCE(SUM(${analyticsSessions.conversionValue}), 0)`,
        avgDuration: avg(analyticsSessions.duration),
      })
      .from(analyticsSessions)
      .where(and(
        eq(analyticsSessions.funnelId, funnelId),
        ...dateFilter
      ));

    const overview = overviewQuery[0];
    const conversionRate = overview.totalSessions > 0 ? (overview.conversions / overview.totalSessions) * 100 : 0;
    // Calculate bounce rate (sessions with only 1 page view)
    const bounceRateQuery = await db
      .select({
        singlePageSessions: sql<number>`COUNT(CASE WHEN ${analyticsSessions.pageViews} = 1 THEN 1 END)`,
      })
      .from(analyticsSessions)
      .where(and(
        eq(analyticsSessions.funnelId, funnelId),
        ...dateFilter
      ));

    const bounceRate = overview.totalSessions > 0 ? 
      (bounceRateQuery[0].singlePageSessions / overview.totalSessions) * 100 : 0;

    // Get events for more detailed analysis
    const events = await db
      .select()
      .from(trackingEvents)
      .where(and(
        eq(trackingEvents.funnelId, funnelId),
        startDate ? gte(trackingEvents.createdAt, new Date(startDate)) : sql`true`,
        endDate ? lte(trackingEvents.createdAt, new Date(endDate)) : sql`true`
      ))
      .orderBy(desc(trackingEvents.createdAt));

    // Process traffic sources
    const trafficSources: Record<string, number> = {};
    const deviceBreakdown: Record<string, number> = {};
    const topPages: Record<string, number> = {};

    events.forEach((event: any) => {
      // Traffic sources
      const source = event.trafficSource?.source || 'direct';
      trafficSources[source] = (trafficSources[source] || 0) + 1;

      // Device breakdown
      const device = event.deviceInfo?.device_type || 'unknown';
      deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1;

      // Top pages
      const page = event.metadata?.url || '/';
      if (event.eventType === 'page_view') {
        topPages[page] = (topPages[page] || 0) + 1;
      }
    });

    // Get daily data by aggregating events
    const dailyDataQuery = await db
      .select({
        date: sql<string>`DATE(${trackingEvents.createdAt})`,
        sessions: sql<number>`COUNT(DISTINCT ${trackingEvents.sessionId})`,
        visitors: sql<number>`COUNT(DISTINCT ${trackingEvents.visitorId})`,
        conversions: sql<number>`COUNT(CASE WHEN ${trackingEvents.eventType} = 'conversion' THEN 1 END)`,
        revenue: sql<number>`COALESCE(SUM(CASE WHEN ${trackingEvents.eventType} = 'conversion' THEN ${trackingEvents.eventValue} END), 0)`,
      })
      .from(trackingEvents)
      .where(and(
        eq(trackingEvents.funnelId, funnelId),
        startDate ? gte(trackingEvents.createdAt, new Date(startDate)) : sql`true`,
        endDate ? lte(trackingEvents.createdAt, new Date(endDate)) : sql`true`
      ))
      .groupBy(sql`DATE(${trackingEvents.createdAt})`)
      .orderBy(sql`DATE(${trackingEvents.createdAt})`);

    const dailyData = dailyDataQuery.map(row => ({
      date: row.date,
      sessions: row.sessions,
      visitors: row.visitors,
      conversions: row.conversions,
      revenue: row.revenue,
    }));

    return {
      overview: {
        totalSessions: overview.totalSessions,
        uniqueVisitors: overview.uniqueVisitors,
        conversions: overview.conversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        totalRevenue: overview.totalRevenue,
        avgSessionDuration: Math.round(overview.avgDuration || 0),
        bounceRate: Math.round(bounceRate * 100) / 100,
      },
      dailyData,
      trafficSources,
      deviceBreakdown,
      topPages: Object.entries(topPages)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([page, views]) => ({ page, views })),
    };
  }

  /**
   * Get conversion funnel analysis
   */
  async getConversionFunnelAnalysis(funnelId: string, timeWindowHours: number = 24): Promise<{
    steps: Array<{
      stepName: string;
      users: number;
      conversionRate: number;
      dropoffRate: number;
    }>;
    totalUsers: number;
    overallConversionRate: number;
  }> {
    console.log(`📊 Analyzing conversion funnel for ${funnelId}`);

    // Get funnel definition
    const funnel = await db
      .select()
      .from(conversionFunnels)
      .where(eq(conversionFunnels.funnelId, funnelId))
      .limit(1);

    if (!funnel.length) {
      throw new Error('Conversion funnel not found');
    }

    const funnelDef = funnel[0];
    const steps = funnelDef.steps;

    // Analyze each step
    const stepAnalysis = [];
    let previousStepUsers = 0;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // Count users who completed this step
      const stepUsers = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${trackingEvents.sessionId})` })
        .from(trackingEvents)
        .where(and(
          eq(trackingEvents.funnelId, funnelId),
          eq(trackingEvents.eventType, step.event_type),
          step.event_name ? eq(trackingEvents.eventName, step.event_name) : sql`true`,
          gte(trackingEvents.createdAt, sql`NOW() - INTERVAL '${timeWindowHours} hours'`)
        ));

      const users = stepUsers[0].count;
      
      if (i === 0) {
        previousStepUsers = users;
      }

      const conversionRate = previousStepUsers > 0 ? (users / previousStepUsers) * 100 : 0;
      const dropoffRate = 100 - conversionRate;

      stepAnalysis.push({
        stepName: step.name,
        users,
        conversionRate: Math.round(conversionRate * 100) / 100,
        dropoffRate: Math.round(dropoffRate * 100) / 100,
      });

      previousStepUsers = users;
    }

    // Calculate overall metrics
    const firstStepUsers = stepAnalysis[0]?.users || 0;
    const lastStepUsers = stepAnalysis[stepAnalysis.length - 1]?.users || 0;
    const overallConversionRate = firstStepUsers > 0 ? (lastStepUsers / firstStepUsers) * 100 : 0;

    return {
      steps: stepAnalysis,
      totalUsers: firstStepUsers,
      overallConversionRate: Math.round(overallConversionRate * 100) / 100,
    };
  }

  /**
   * Generate a unique visitor ID
   */
  generateVisitorId(): string {
    return `visitor_${nanoid(12)}`;
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId(): string {
    return `session_${nanoid(16)}`;
  }
}

export const analyticsService = new AnalyticsService();