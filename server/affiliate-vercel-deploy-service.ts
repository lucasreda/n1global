import { affiliateLandingService } from "./affiliate-landing-service";
import { vercelService } from "./vercel-service";
import { db } from "./db";
import { funnelIntegrations } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { AffiliateLandingPage } from "@shared/schema";

export class AffiliateVercelDeployService {
  private async getVercelCredentials(): Promise<{
    token: string;
    teamId?: string;
  }> {
    const activeIntegrations = await db
      .select()
      .from(funnelIntegrations)
      .where(eq(funnelIntegrations.isActive, true))
      .orderBy(desc(funnelIntegrations.connectedAt))
      .limit(1);

    if (activeIntegrations.length === 0) {
      throw new Error("Nenhuma conta Vercel conectada. Por favor, conecte sua conta primeiro.");
    }

    const integration = activeIntegrations[0];

    await db
      .update(funnelIntegrations)
      .set({ lastUsed: new Date() })
      .where(eq(funnelIntegrations.id, integration.id));

    return {
      token: integration.vercelAccessToken,
      teamId: integration.vercelTeamId || undefined,
    };
  }

  async deployLandingPageForAffiliate(
    landingPageId: string,
    affiliatePixel?: string
  ): Promise<{
    projectId: string;
    deploymentUrl: string;
    deploymentId: string;
  }> {
    const credentials = await this.getVercelCredentials();

    const landingPage = await affiliateLandingService.getLandingPageById(landingPageId);
    
    if (!landingPage) {
      throw new Error("Landing page não encontrada");
    }

    if (landingPage.status !== "active") {
      throw new Error("Apenas landing pages ativas podem ser deployadas");
    }

    // Inject universal tracking script (replaces old static pixel approach)
    let htmlContent = this.injectUniversalTrackingScript(landingPage.htmlContent);

    const files = this.prepareLandingPageFiles(
      htmlContent,
      landingPage.cssContent || "",
      landingPage.jsContent || ""
    );

    let projectId: string;
    let projectName: string;

    // Check if landing page already has a Vercel project
    if (landingPage.vercelProjectId) {
      // Existing project - just deploy to it (this will update it)
      console.log(`🔄 Updating existing Vercel project: ${landingPage.vercelProjectId}`);
      projectId = landingPage.vercelProjectId;
      projectName = landingPage.vercelProjectId; // Use the existing project name
    } else {
      // New project - create it first
      projectName = this.generateProjectName(landingPage);
      console.log(`🆕 Creating new Vercel project: ${projectName}`);
      
      const project = await vercelService.createProject(
        credentials.token,
        projectName,
        null as any, // framework: null for HTML (auto-detect)
        credentials.teamId
      );
      
      projectId = project.id;
      console.log(`✅ Project created: ${projectId}`);
    }

    // Deploy to the project
    console.log(`🚀 Deploying landing page "${landingPage.name}" to Vercel...`);

    const deployment = await vercelService.deployToProject(
      credentials.token,
      projectId,
      files,
      credentials.teamId
    );

    // Update database with project ID and deployment URL
    await affiliateLandingService.updateVercelDeployment(
      landingPageId,
      projectId,
      deployment.url
    );

    console.log(`✅ Landing page deployed successfully: ${deployment.url}`);

    return {
      projectId: projectId,
      deploymentUrl: deployment.url,
      deploymentId: deployment.uid,
    };
  }

  private injectUniversalTrackingScript(html: string): string {
    const closingBodyTag = html.lastIndexOf("</body>");
    
    if (closingBodyTag === -1) {
      console.warn("⚠️ Tag </body> não encontrada no HTML - tracking script não será injetado");
      return html;
    }

    // Get the current domain (will be set at runtime in the browser)
    const trackingScript = `
<!-- Universal Affiliate Tracking Script -->
<script>
(function() {
  'use strict';
  
  // Get affiliate reference from URL parameters
  var params = new URLSearchParams(window.location.search);
  var affiliateRef = params.get('ref') || params.get('aff') || params.get('affiliate');
  
  if (!affiliateRef) {
    console.log('[Affiliate Tracking] No affiliate reference found in URL');
    return;
  }
  
  console.log('[Affiliate Tracking] Affiliate reference detected:', affiliateRef);
  
  // Save to localStorage for future conversion
  try {
    localStorage.setItem('affiliate_ref', affiliateRef);
    localStorage.setItem('affiliate_ref_timestamp', new Date().toISOString());
    console.log('[Affiliate Tracking] Reference saved to localStorage');
  } catch (e) {
    console.error('[Affiliate Tracking] Failed to save to localStorage:', e);
  }
  
  // Prepare tracking data
  var trackingData = {
    referrer: document.referrer || '',
    landingUrl: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  };
  
  // Send click tracking to backend
  var apiUrl = window.location.origin + '/api/affiliate/tracking/click/' + encodeURIComponent(affiliateRef);
  
  fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(trackingData)
  })
  .then(function(response) {
    if (response.ok) {
      console.log('[Affiliate Tracking] Click registered successfully');
      return response.json();
    } else {
      console.error('[Affiliate Tracking] Failed to register click:', response.status);
    }
  })
  .then(function(data) {
    if (data) {
      console.log('[Affiliate Tracking] Tracking ID:', data.trackingId);
    }
  })
  .catch(function(error) {
    console.error('[Affiliate Tracking] Error sending tracking data:', error);
  });
})();
</script>
`;

    return (
      html.substring(0, closingBodyTag) +
      trackingScript +
      html.substring(closingBodyTag)
    );
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
