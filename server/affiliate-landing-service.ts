import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import {
  affiliateLandingPages,
  type AffiliateLandingPage,
  type InsertAffiliateLandingPage,
} from "@shared/schema";

export class AffiliateLandingService {
  async createLandingPage(
    data: InsertAffiliateLandingPage
  ): Promise<AffiliateLandingPage> {
    const [landingPage] = await db
      .insert(affiliateLandingPages)
      .values(data)
      .returning();
    return landingPage;
  }

  async getLandingPageById(id: string): Promise<AffiliateLandingPage | null> {
    const [landingPage] = await db
      .select()
      .from(affiliateLandingPages)
      .where(eq(affiliateLandingPages.id, id))
      .limit(1);
    return landingPage || null;
  }

  async updateLandingPage(
    id: string,
    data: Partial<InsertAffiliateLandingPage>
  ): Promise<AffiliateLandingPage> {
    const [updated] = await db
      .update(affiliateLandingPages)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(affiliateLandingPages.id, id))
      .returning();
    
    if (!updated) {
      throw new Error("Landing page não encontrada");
    }
    
    return updated;
  }

  async listLandingPages(options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<AffiliateLandingPage[]> {
    const { status, limit = 50, offset = 0 } = options;
    
    let query = db.select().from(affiliateLandingPages);
    
    if (status) {
      query = query.where(eq(affiliateLandingPages.status, status)) as any;
    }
    
    const results = await query
      .orderBy(desc(affiliateLandingPages.createdAt))
      .limit(limit)
      .offset(offset);
    
    return results;
  }

  async activateLandingPage(id: string): Promise<AffiliateLandingPage> {
    return this.updateLandingPage(id, { status: "active" });
  }

  async archiveLandingPage(id: string): Promise<AffiliateLandingPage> {
    return this.updateLandingPage(id, { status: "archived" });
  }

  async deleteLandingPage(id: string): Promise<void> {
    await db
      .delete(affiliateLandingPages)
      .where(eq(affiliateLandingPages.id, id));
  }

  async updateVercelDeployment(
    id: string,
    vercelProjectId: string,
    vercelDeploymentUrl: string
  ): Promise<AffiliateLandingPage> {
    return this.updateLandingPage(id, {
      vercelProjectId,
      vercelDeploymentUrl,
      lastDeployedAt: new Date(),
    });
  }
}

export const affiliateLandingService = new AffiliateLandingService();
