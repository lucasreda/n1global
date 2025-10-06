import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import {
  affiliateLandingPages,
  affiliateLandingPageProducts,
  products,
  type AffiliateLandingPage,
  type InsertAffiliateLandingPage,
  type Product,
  type PageModelV2,
  type PageModelV4,
} from "@shared/schema";
import { renderPageModelToHTML } from "./page-model-renderer";
import { convertHtmlToPageModel, convertHtmlToPageModelV4 } from "./html-to-pagemodel-converter";

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

  async linkProductToLandingPage(
    landingPageId: string,
    productId: string
  ): Promise<void> {
    const existing = await db
      .select()
      .from(affiliateLandingPageProducts)
      .where(
        and(
          eq(affiliateLandingPageProducts.landingPageId, landingPageId),
          eq(affiliateLandingPageProducts.productId, productId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error("Produto já vinculado a esta landing page");
    }

    await db.insert(affiliateLandingPageProducts).values({
      landingPageId,
      productId,
    });
  }

  async unlinkProductFromLandingPage(
    landingPageId: string,
    productId: string
  ): Promise<void> {
    await db
      .delete(affiliateLandingPageProducts)
      .where(
        and(
          eq(affiliateLandingPageProducts.landingPageId, landingPageId),
          eq(affiliateLandingPageProducts.productId, productId)
        )
      );
  }

  async getProductsByLandingPage(landingPageId: string): Promise<Product[]> {
    const results = await db
      .select({
        product: products,
      })
      .from(affiliateLandingPageProducts)
      .innerJoin(
        products,
        eq(affiliateLandingPageProducts.productId, products.id)
      )
      .where(eq(affiliateLandingPageProducts.landingPageId, landingPageId));

    return results.map((r) => r.product);
  }

  async getLandingPagesByProduct(productId: string): Promise<AffiliateLandingPage[]> {
    const results = await db
      .select({
        landingPage: affiliateLandingPages,
      })
      .from(affiliateLandingPageProducts)
      .innerJoin(
        affiliateLandingPages,
        eq(affiliateLandingPageProducts.landingPageId, affiliateLandingPages.id)
      )
      .where(eq(affiliateLandingPageProducts.productId, productId));

    return results.map((r) => r.landingPage);
  }

  async updateLandingPageModel(
    id: string,
    model: PageModelV2
  ): Promise<AffiliateLandingPage> {
    // Generate HTML from the model
    const generatedHtml = renderPageModelToHTML(model);
    
    const [updated] = await db
      .update(affiliateLandingPages)
      .set({
        model: model as any,
        htmlContent: generatedHtml, // Auto-generate HTML from model
        updatedAt: new Date(),
      })
      .where(eq(affiliateLandingPages.id, id))
      .returning();
    
    if (!updated) {
      throw new Error("Landing page não encontrada");
    }
    
    return updated;
  }

  async convertHtmlToModel(id: string, forceReconvert: boolean = false, version: '2' | '4' = '4'): Promise<AffiliateLandingPage> {
    const landingPage = await this.getLandingPageById(id);
    
    if (!landingPage) {
      throw new Error("Landing page não encontrada");
    }
    
    if (landingPage.model && !forceReconvert) {
      throw new Error("Landing page já possui um modelo visual. Conversão não é necessária.");
    }
    
    if (!landingPage.htmlContent) {
      throw new Error("Landing page não possui conteúdo HTML para converter");
    }
    
    console.log(`🔄 Converting HTML to PageModelV${version} (preserving original HTML)...`);
    const model = version === '4' 
      ? convertHtmlToPageModelV4(landingPage.htmlContent)
      : convertHtmlToPageModel(landingPage.htmlContent);
    
    // IMPORTANT: We DON'T overwrite htmlContent to preserve the original HTML
    // This allows us to reconvert with full fidelity
    const [updated] = await db
      .update(affiliateLandingPages)
      .set({
        model: model as any,
        // Keep original htmlContent intact for future reconversions
        updatedAt: new Date(),
      })
      .where(eq(affiliateLandingPages.id, id))
      .returning();
    
    if (!updated) {
      throw new Error("Falha ao atualizar landing page");
    }
    
    console.log('✅ Conversion completed. Original HTML preserved.');
    return updated;
  }

  async reconvertLandingPage(id: string): Promise<{ nodesCount: number, model: PageModelV4 }> {
    const landingPage = await this.getLandingPageById(id);
    
    if (!landingPage) {
      throw new Error("Landing page não encontrada");
    }
    
    if (!landingPage.htmlContent) {
      throw new Error("Landing page não possui HTML para reconverter");
    }
    
    console.log(`🔄 Reconverting landing page with fixed converter: ${id}`);
    const model = convertHtmlToPageModelV4(landingPage.htmlContent);
    
    const [updated] = await db
      .update(affiliateLandingPages)
      .set({
        model: model as any,
        updatedAt: new Date(),
      })
      .where(eq(affiliateLandingPages.id, id))
      .returning();
    
    if (!updated) {
      throw new Error("Falha ao atualizar landing page");
    }
    
    console.log('✅ Reconversion completed successfully!');
    return {
      nodesCount: model.nodes.length,
      model,
    };
  }
}

export const affiliateLandingService = new AffiliateLandingService();
