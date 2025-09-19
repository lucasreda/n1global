import { Router } from "express";
import { analyticsService } from "./analytics-service";
import { authenticateToken, type AuthRequest } from "./auth-middleware";
import { z } from "zod";
import crypto from "crypto";

const router = Router();

// Simple in-memory rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const trackingRateLimit = (req: any, res: any, next: any) => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const key = `tracking_${clientIp}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 120; // 120 requests per minute
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset window
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    next();
  } else if (current.count < maxRequests) {
    // Increment count
    current.count++;
    next();
  } else {
    // Rate limit exceeded
    res.status(429).json({
      success: false,
      error: "Too many requests",
      retryAfter: Math.ceil((current.resetTime - now) / 1000)
    });
  }
};

// Helper function to hash IP for privacy
const hashIP = (ip: string): string => {
  return crypto.createHash('sha256').update(ip + 'analytics_salt_2025').digest('hex').substring(0, 16);
};

// Schema for tracking events
const trackEventSchema = z.object({
  sessionId: z.string(),
  visitorId: z.string(),
  funnelId: z.string().optional(),
  pageId: z.string().optional(),
  deploymentId: z.string().optional(),
  eventType: z.string(),
  eventName: z.string().optional(),
  eventValue: z.number().optional(),
  metadata: z.record(z.any()).optional(),
  deviceInfo: z.record(z.any()).optional(),
  geoLocation: z.record(z.any()).optional(),
  trafficSource: z.record(z.any()).optional(),
  pageLoadTime: z.number().optional(),
  clientTime: z.string().datetime().optional(),
});

// Schema for session creation
const createSessionSchema = z.object({
  sessionId: z.string(),
  visitorId: z.string(),
  funnelId: z.string().optional(),
  operationId: z.string().optional(),
  deviceInfo: z.record(z.any()).optional(),
  trafficSource: z.record(z.any()).optional(),
  geoLocation: z.record(z.any()).optional(),
  entryPage: z.string().optional(),
});

/**
 * Track an event (public endpoint for pixel tracking)
 */
router.post("/track/event", trackingRateLimit, async (req, res) => {
  try {
    const validatedData = trackEventSchema.parse(req.body);
    
    // Convert clientTime string to Date if provided
    const eventData = {
      ...validatedData,
      clientTime: validatedData.clientTime ? new Date(validatedData.clientTime) : undefined,
    };

    const event = await analyticsService.trackEvent(eventData);
    
    res.json({
      success: true,
      eventId: event.id,
    });
  } catch (error) {
    console.error("❌ Error tracking event:", error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Invalid tracking data",
    });
  }
});

/**
 * Create or update analytics session (public endpoint)
 */
router.post("/track/session", trackingRateLimit, async (req, res) => {
  try {
    const sessionData = createSessionSchema.parse(req.body);
    
    const session = await analyticsService.createOrUpdateSession(sessionData);
    
    res.json({
      success: true,
      sessionId: session.sessionId,
    });
  } catch (error) {
    console.error("❌ Error creating session:", error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Invalid session data",
    });
  }
});

/**
 * Get analytics data for a funnel (authenticated with authorization)
 */
router.get("/funnels/:funnelId/analytics", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { funnelId } = req.params;
    const { startDate, endDate, period } = req.query;
    const userId = req.user!.id;
    
    // Check if user has access to this funnel
    const hasAccess = await analyticsService.verifyFunnelAccess(funnelId, userId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Access denied to this funnel",
      });
    }
    
    const analytics = await analyticsService.getFunnelAnalytics(funnelId, {
      startDate: startDate as string,
      endDate: endDate as string,
      period: period as 'daily' | 'weekly' | 'monthly',
    });
    
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("❌ Error getting funnel analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get analytics data",
    });
  }
});

/**
 * Get conversion funnel analysis (authenticated with authorization)
 */
router.get("/funnels/:funnelId/conversion-analysis", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { funnelId } = req.params;
    const { timeWindowHours } = req.query;
    const userId = req.user!.id;
    
    // Check if user has access to this funnel
    const hasAccess = await analyticsService.verifyFunnelAccess(funnelId, userId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Access denied to this funnel",
      });
    }
    
    const analysis = await analyticsService.getConversionFunnelAnalysis(
      funnelId,
      timeWindowHours ? parseInt(timeWindowHours as string) : 24
    );
    
    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error("❌ Error getting conversion analysis:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get conversion analysis",
    });
  }
});

/**
 * Generate visitor and session IDs for client-side tracking
 */
router.get("/track/generate-ids", trackingRateLimit, (req, res) => {
  res.json({
    success: true,
    visitorId: analyticsService.generateVisitorId(),
    sessionId: analyticsService.generateSessionId(),
  });
});

/**
 * Simple tracking pixel endpoint (1x1 transparent GIF)
 */
router.get("/pixel.gif", trackingRateLimit, async (req, res) => {
  try {
    // Extract tracking parameters from query string
    const {
      s: sessionId,
      v: visitorId,
      f: funnelId,
      p: pageId,
      d: deploymentId,
      e: eventType = 'page_view',
      n: eventName,
      val: eventValue,
      ref: referrer,
      url,
    } = req.query;

    if (sessionId && visitorId) {
      // Track the event
      await analyticsService.trackEvent({
        sessionId: sessionId as string,
        visitorId: visitorId as string,
        funnelId: funnelId as string,
        pageId: pageId as string,
        deploymentId: deploymentId as string,
        eventType: eventType as string,
        eventName: eventName as string,
        eventValue: eventValue ? parseFloat(eventValue as string) : undefined,
        metadata: {
          url: url as string,
          referrer: referrer as string,
        },
        deviceInfo: {
          user_agent: req.headers['user-agent'],
        },
        geoLocation: {
          ip: hashIP(req.ip || 'unknown'),
        },
      });
    }

    // Return 1x1 transparent GIF
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    
    res.end(pixel);
  } catch (error) {
    console.error("❌ Error in tracking pixel:", error);
    
    // Still return pixel even if tracking fails
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
    });
    res.end(pixel);
  }
});

export default router;