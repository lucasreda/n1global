import { affiliateLandingService } from "./affiliate-landing-service";
import { vercelService } from "./vercel-service";
import { db } from "./db";
import { funnelIntegrations, affiliateProductPixels, affiliateLandingPageProducts } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import type { AffiliateLandingPage } from "@shared/schema";
import { PixelCodeGenerator } from "./pixel-code-generator";

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

  private async getPixelsForLandingPage(landingPageId: string): Promise<string> {
    // First, get products associated with this landing page
    const landingPageProducts = await db
      .select({ productId: affiliateLandingPageProducts.productId })
      .from(affiliateLandingPageProducts)
      .where(eq(affiliateLandingPageProducts.landingPageId, landingPageId));
    
    const productIds = landingPageProducts.map(p => p.productId);

    // Get pixels for this landing page:
    // 1. Pixels specifically configured for this landing page (landingPageId = X)
    // 2. Pixels configured for products but without specific landing page (landingPageId = NULL and productId in product list)
    const specificPixels = await db
      .select({ pixel: affiliateProductPixels })
      .from(affiliateProductPixels)
      .where(
        and(
          eq(affiliateProductPixels.landingPageId, landingPageId),
          eq(affiliateProductPixels.isActive, true)
        )
      );

    // Get global product pixels (pixels without specific landing page but for products in this landing page)
    const globalPixelsPromises = productIds.map(productId =>
      db
        .select({ pixel: affiliateProductPixels })
        .from(affiliateProductPixels)
        .where(
          and(
            eq(affiliateProductPixels.productId, productId),
            eq(affiliateProductPixels.isActive, true),
            eq(affiliateProductPixels.landingPageId, null as any) // Global pixels have null landingPageId
          )
        )
    );

    const globalPixelsResults = await Promise.all(globalPixelsPromises);
    const globalPixels = globalPixelsResults.flat();

    // Combine both types of pixels
    const allPixels = [...specificPixels, ...globalPixels];

    if (allPixels.length === 0) {
      return '';
    }

    // Remove duplicates based on pixel ID (in case same pixel appears multiple times)
    const uniquePixels = allPixels.reduce((acc, { pixel }) => {
      const key = `${pixel.pixelType}-${pixel.pixelId}`;
      if (!acc.has(key)) {
        acc.set(key, pixel);
      }
      return acc;
    }, new Map());

    const pixelCodes = Array.from(uniquePixels.values()).map(pixel => 
      PixelCodeGenerator.generatePixelCode(pixel)
    );

    console.log(`✅ Found ${pixelCodes.length} pixel(s) for landing page ${landingPageId} (${specificPixels.length} specific + ${globalPixels.length} global)`);

    return pixelCodes.join('\n\n');
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

    // Inject universal tracking script with dynamic pixel loading
    let htmlContent = this.injectUniversalTrackingScript(landingPage.htmlContent);
    
    console.log(`✅ Landing page HTML prepared with dynamic pixel injection (pixels will load based on ?ref parameter)`);

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
      projectId = landingPage.vercelProjectId;
      projectName = landingPage.vercelProjectId; // Use the existing project name
    } else {
      // New project - create it first
      projectName = this.generateProjectName(landingPage);
      
      const project = await vercelService.createProject(
        credentials.token,
        projectName,
        null as any, // framework: null for HTML (auto-detect)
        credentials.teamId
      );
      
      projectId = project.id;
    }

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

    const apiBaseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : (process.env.REPL_SLUG && process.env.REPL_OWNER 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
        : 'https://workspace.seraphinetools.repl.co');

    const trackingScript = `
<!-- Universal Affiliate Tracking Script with Dynamic Pixel Injection -->
<script>
(function() {
  'use strict';
  
  var API_BASE_URL = '${apiBaseUrl}';
  
  // Get affiliate reference from URL parameters
  var params = new URLSearchParams(window.location.search);
  var affiliateRef = params.get('ref') || params.get('aff') || params.get('affiliate');
  
  if (!affiliateRef) {
    console.log('[Affiliate Tracking] No affiliate reference found in URL');
    return;
  }
  
  console.log('[Affiliate Tracking] Affiliate reference detected:', affiliateRef);
  console.log('[Affiliate Tracking] API Base URL:', API_BASE_URL);
  
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
  var apiUrl = API_BASE_URL + '/api/affiliate/tracking/click/' + encodeURIComponent(affiliateRef);
  
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
  
  // Dynamic Pixel Injection
  console.log('[Affiliate Pixels] Loading pixels for ref:', affiliateRef);
  
  var pixelApiUrl = API_BASE_URL + '/api/affiliate/pixels/by-ref/' + encodeURIComponent(affiliateRef) + '/code';
  
  console.log('[Affiliate Pixels] Fetching from:', pixelApiUrl);
  
  fetch(pixelApiUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(function(response) {
    if (!response.ok) {
      console.error('[Affiliate Pixels] Failed to load pixels:', response.status);
      return null;
    }
    return response.json();
  })
  .then(function(data) {
    if (!data || !data.pixelCodes || data.pixelCodes.length === 0) {
      console.log('[Affiliate Pixels] No pixels configured for this affiliate');
      return;
    }
    
    console.log('[Affiliate Pixels] Injecting', data.pixelCodes.length, 'pixel(s)');
    
    // Inject each pixel code into the document head
    data.pixelCodes.forEach(function(pixelCode, index) {
      var container = document.createElement('div');
      container.innerHTML = pixelCode.trim();
      
      // Extract and inject script tags
      var scripts = container.querySelectorAll('script');
      scripts.forEach(function(script) {
        var newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
          newScript.async = script.async;
        } else {
          newScript.textContent = script.textContent;
        }
        document.head.appendChild(newScript);
      });
      
      // Extract and inject noscript tags
      var noscripts = container.querySelectorAll('noscript');
      noscripts.forEach(function(noscript) {
        document.head.appendChild(noscript.cloneNode(true));
      });
      
      console.log('[Affiliate Pixels] Pixel', index + 1, 'injected successfully');
    });
    
    console.log('[Affiliate Pixels] All pixels injected successfully');
  })
  .catch(function(error) {
    console.error('[Affiliate Pixels] Error loading pixels:', error);
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

  private injectPixelCode(html: string, pixelCode: string): string {
    const closingHeadTag = html.lastIndexOf("</head>");
    
    if (closingHeadTag === -1) {
      console.warn("⚠️ Tag </head> não encontrada no HTML - pixels serão injetados antes do </body>");
      const closingBodyTag = html.lastIndexOf("</body>");
      if (closingBodyTag === -1) {
        console.warn("⚠️ Tag </body> também não encontrada - pixels não serão injetados");
        return html;
      }
      return (
        html.substring(0, closingBodyTag) +
        pixelCode +
        html.substring(closingBodyTag)
      );
    }

    return (
      html.substring(0, closingHeadTag) +
      pixelCode +
      html.substring(closingHeadTag)
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
