import { affiliateLandingService } from "./affiliate-landing-service";
import { vercelService } from "./vercel-service";
import type { AffiliateLandingPage } from "@shared/schema";

export class AffiliateVercelDeployService {
  private platformVercelToken: string;
  private platformTeamId?: string;

  constructor() {
    this.platformVercelToken = process.env.VERCEL_PLATFORM_TOKEN || "";
    this.platformTeamId = process.env.VERCEL_PLATFORM_TEAM_ID;

    if (!this.platformVercelToken) {
      console.warn("⚠️ VERCEL_PLATFORM_TOKEN não configurado - deploys de afiliados não funcionarão");
    }
  }

  async deployLandingPageForAffiliate(
    landingPageId: string,
    affiliatePixel?: string
  ): Promise<{
    projectId: string;
    deploymentUrl: string;
    deploymentId: string;
  }> {
    if (!this.platformVercelToken) {
      throw new Error("Token da plataforma Vercel não configurado");
    }

    const landingPage = await affiliateLandingService.getLandingPageById(landingPageId);
    
    if (!landingPage) {
      throw new Error("Landing page não encontrada");
    }

    if (landingPage.status !== "active") {
      throw new Error("Apenas landing pages ativas podem ser deployadas");
    }

    let htmlContent = landingPage.htmlContent;

    if (affiliatePixel) {
      htmlContent = this.injectTrackingPixel(htmlContent, affiliatePixel);
    }

    const projectName = this.generateProjectName(landingPage);
    
    const files = this.prepareLandingPageFiles(
      htmlContent,
      landingPage.cssContent || "",
      landingPage.jsContent || ""
    );

    const template = {
      name: projectName,
      framework: "html" as const,
      files,
    };

    console.log(`🚀 Deploying landing page "${landingPage.name}" to Vercel...`);

    const deployment = await vercelService.deployLandingPage(
      this.platformVercelToken,
      projectName,
      template,
      this.platformTeamId
    );

    await affiliateLandingService.updateVercelDeployment(
      landingPageId,
      deployment.uid,
      deployment.url
    );

    console.log(`✅ Landing page deployed successfully: ${deployment.url}`);

    return {
      projectId: deployment.uid,
      deploymentUrl: deployment.url,
      deploymentId: deployment.uid,
    };
  }

  private injectTrackingPixel(html: string, pixelCode: string): string {
    const closingBodyTag = html.lastIndexOf("</body>");
    
    if (closingBodyTag === -1) {
      console.warn("⚠️ Tag </body> não encontrada no HTML - pixel não será injetado");
      return html;
    }

    const pixelScript = `
<!-- Affiliate Tracking Pixel -->
<script>
${pixelCode}
</script>
`;

    return (
      html.substring(0, closingBodyTag) +
      pixelScript +
      html.substring(closingBodyTag)
    );
  }

  private prepareLandingPageFiles(
    htmlContent: string,
    cssContent: string,
    jsContent: string
  ): Record<string, string> {
    const files: Record<string, string> = {
      "index.html": htmlContent,
    };

    if (cssContent && cssContent.trim()) {
      files["styles.css"] = cssContent;
    }

    if (jsContent && jsContent.trim()) {
      files["script.js"] = jsContent;
    }

    files["package.json"] = JSON.stringify({
      name: "affiliate-landing-page",
      version: "1.0.0",
      private: true,
    }, null, 2);

    return files;
  }

  private generateProjectName(landingPage: AffiliateLandingPage): string {
    const sanitizedName = landingPage.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    
    const timestamp = Date.now().toString(36);
    return `affiliate-${sanitizedName}-${timestamp}`;
  }

  async deployMultipleLandingPages(
    deployments: Array<{
      landingPageId: string;
      affiliatePixel?: string;
    }>
  ): Promise<Array<{
    landingPageId: string;
    success: boolean;
    deploymentUrl?: string;
    error?: string;
  }>> {
    const results = await Promise.allSettled(
      deployments.map(async (deployment) => {
        const result = await this.deployLandingPageForAffiliate(
          deployment.landingPageId,
          deployment.affiliatePixel
        );
        return {
          landingPageId: deployment.landingPageId,
          success: true,
          deploymentUrl: result.deploymentUrl,
        };
      })
    );

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          landingPageId: deployments[index].landingPageId,
          success: false,
          error: result.reason?.message || "Erro desconhecido",
        };
      }
    });
  }
}

export const affiliateVercelDeployService = new AffiliateVercelDeployService();
