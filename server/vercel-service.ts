import { z } from "zod";
import fetch from "node-fetch";

// Vercel API response types
interface VercelUser {
  id: string;
  email: string;
  name: string;
  username: string;
  avatar?: string;
}

interface VercelTeam {
  id: string;
  name: string;
  slug: string;
}

interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  framework?: string;
  createdAt: number;
  updatedAt: number;
}

interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
  type: 'LAMBDAS';
  createdAt: number;
  buildingAt?: number;
  readyAt?: number;
}

interface VercelDomain {
  name: string;
  apexName: string;
  projectId: string;
  redirect?: string;
  gitBranch?: string;
  createdAt: number;
  updatedAt: number;
  verification?: {
    type: string;
    domain: string;
    value: string;
    reason: string;
  }[];
}

// Landing page template interface (legacy)
interface LandingPageTemplate {
  name: string;
  framework: 'nextjs' | 'react' | 'html' | null;
  files: {
    [path: string]: string;
  };
}

// Multi-page funnel template interface
interface MultiPageFunnelTemplate {
  name: string;
  framework: 'nextjs';
  files: {
    [path: string]: string;
  };
  pages: {
    path: string;
    name: string;
    pageType: 'landing' | 'checkout' | 'upsell' | 'downsell' | 'thankyou';
  }[];
  buildSettings?: {
    buildCommand?: string;
    outputDirectory?: string;
    installCommand?: string;
    devCommand?: string;
  };
}

export class VercelService {
  private baseUrl = 'https://api.vercel.com';

  constructor() {
    console.log('🚀 VercelService initialized');
  }

  /**
   * Exchange OAuth code for access token
   */
  async exchangeOAuthCode(code: string, redirectUri: string): Promise<{
    accessToken: string;
    teamId?: string;
    user: VercelUser;
  }> {
    console.log('🔐 Exchanging OAuth code for Vercel token');

    try {
      const response = await fetch(`${this.baseUrl}/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.VERCEL_CLIENT_ID!,
          client_secret: process.env.VERCEL_CLIENT_SECRET!,
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error(`OAuth exchange failed: ${response.statusText}`);
      }

      const data = await response.json() as {
        access_token: string;
        team_id?: string;
        installation_id?: string;
      };

      // Get user info with the access token
      const user = await this.getCurrentUser(data.access_token);

      return {
        accessToken: data.access_token,
        teamId: data.team_id,
        user,
      };
    } catch (error) {
      console.error('❌ OAuth exchange error:', error);
      throw new Error(`Failed to exchange OAuth code: ${error}`);
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(accessToken: string): Promise<VercelUser> {
    console.log('👤 Getting Vercel user info');

    try {
      const response = await fetch(`${this.baseUrl}/v2/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get user: ${response.statusText}`);
      }

      return await response.json() as VercelUser;
    } catch (error) {
      console.error('❌ Get user error:', error);
      throw error;
    }
  }

  /**
   * Create a new project on Vercel
   */
  async createProject(
    accessToken: string,
    name: string,
    framework: 'nextjs' | 'react' | 'html' | null = 'nextjs',
    teamId?: string
  ): Promise<VercelProject> {
    console.log(`🏗️ Creating Vercel project: ${name} (framework: ${framework || 'auto-detect'})`);

    try {
      const url = teamId 
        ? `${this.baseUrl}/v9/projects?teamId=${teamId}`
        : `${this.baseUrl}/v9/projects`;

      const projectPayload: any = {
        name,
        gitRepository: null, // We'll deploy without git
      };

      // Only add framework and build settings if framework is specified
      if (framework) {
        projectPayload.framework = framework;
        projectPayload.buildCommand = framework === 'nextjs' ? 'npm run build' : 'npm run build';
        projectPayload.outputDirectory = framework === 'nextjs' ? '.next' : 'dist';
        projectPayload.installCommand = 'npm install';
        projectPayload.devCommand = framework === 'nextjs' ? 'npm run dev' : 'npm start';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectPayload),
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        console.error('❌ Project creation failed:', errorData);
        throw new Error(`Failed to create project: ${errorData.error?.message || response.statusText}`);
      }

      const project = await response.json() as VercelProject;
      console.log(`✅ Project created successfully: ${project.id}`);
      return project;
    } catch (error) {
      console.error('❌ Create project error:', error);
      throw error;
    }
  }

  /**
   * Deploy files to an existing Vercel project
   */
  async deployToProject(
    accessToken: string,
    projectId: string,
    files: Record<string, string>,
    teamId?: string
  ): Promise<VercelDeployment> {
    console.log(`📦 Deploying to existing project: ${projectId}`);

    try {
      const url = teamId 
        ? `${this.baseUrl}/v13/deployments?teamId=${teamId}`
        : `${this.baseUrl}/v13/deployments`;

      // Convert files to Vercel deployment format
      const deploymentFiles = Object.entries(files).map(([path, content]) => ({
        file: path,
        data: Buffer.from(content).toString('base64'),
        encoding: 'base64',
      }));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectId, // Use project ID as deployment name
          project: projectId, // Link to existing project
          files: deploymentFiles,
          target: 'production',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        console.error('❌ Deployment to project failed:', errorData);
        throw new Error(`Failed to deploy to project: ${errorData.error?.message || response.statusText}`);
      }

      const deployment = await response.json() as VercelDeployment;
      console.log(`✅ Deployed to project: ${deployment.uid} - ${deployment.url}`);
      return deployment;
    } catch (error) {
      console.error('❌ Deploy to project error:', error);
      throw error;
    }
  }

  /**
   * Deploy a landing page to Vercel (LEGACY)
   */
  async deployLandingPage(
    accessToken: string,
    projectName: string,
    template: LandingPageTemplate,
    teamId?: string
  ): Promise<VercelDeployment> {
    console.log(`🚀 Deploying landing page: ${projectName}`);

    try {
      // Add skipAutoDetectionConfirmation=1 when framework is null (HTML static pages)
      let url = teamId 
        ? `${this.baseUrl}/v13/deployments?teamId=${teamId}`
        : `${this.baseUrl}/v13/deployments`;
      
      if (!template.framework) {
        url += (url.includes('?') ? '&' : '?') + 'skipAutoDetectionConfirmation=1';
      }

      // Convert template files to Vercel deployment format
      const files = Object.entries(template.files).map(([path, content]) => ({
        file: path,
        data: Buffer.from(content).toString('base64'),
        encoding: 'base64',
      }));

      const deploymentPayload: any = {
        name: projectName,
        files,
        target: 'production',
      };

      // Only add projectSettings if framework is specified
      if (template.framework) {
        deploymentPayload.projectSettings = {
          framework: template.framework,
          buildCommand: template.framework === 'nextjs' ? 'npm run build' : 'npm run build',
          outputDirectory: template.framework === 'nextjs' ? '.next' : 'dist',
          installCommand: 'npm install',
          devCommand: template.framework === 'nextjs' ? 'npm run dev' : 'npm start',
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deploymentPayload),
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        console.error('❌ Deployment failed:', errorData);
        throw new Error(`Failed to deploy: ${errorData.error?.message || response.statusText}`);
      }

      const deployment = await response.json() as VercelDeployment;
      console.log(`✅ Deployment created: ${deployment.uid} - ${deployment.url}`);
      return deployment;
    } catch (error) {
      console.error('❌ Deploy error:', error);
      throw error;
    }
  }

  /**
   * Deploy a multi-page funnel to Vercel
   */
  async deployMultiPageFunnel(
    accessToken: string,
    projectName: string,
    template: MultiPageFunnelTemplate,
    teamId?: string
  ): Promise<VercelDeployment> {
    console.log(`🚀 Deploying multi-page funnel: ${projectName} with ${template.pages.length} pages`);

    try {
      const url = teamId 
        ? `${this.baseUrl}/v13/deployments?teamId=${teamId}`
        : `${this.baseUrl}/v13/deployments`;

      // Validate that required files exist
      this.validateMultiPageTemplate(template);

      // Convert template files to Vercel deployment format
      const files = Object.entries(template.files).map(([path, content]) => ({
        file: path,
        data: Buffer.from(content).toString('base64'),
        encoding: 'base64',
      }));

      // Build settings with support for Tailwind
      const buildSettings = template.buildSettings || {};
      const projectSettings = {
        framework: 'nextjs',
        buildCommand: buildSettings.buildCommand || 'npm run build',
        outputDirectory: buildSettings.outputDirectory || '.next',
        installCommand: buildSettings.installCommand || 'npm install',
        devCommand: buildSettings.devCommand || 'npm run dev',
        nodeVersion: '18.x',
      };

      console.log(`📋 Deploying ${files.length} files including:`, {
        pages: template.pages.map(p => `${p.path} (${p.pageType})`),
        hasPackageJson: !!template.files['package.json'],
        hasTailwindConfig: !!template.files['tailwind.config.js'],
        hasPostCSSConfig: !!template.files['postcss.config.js'],
        hasAppJs: !!template.files['pages/_app.js'],
        hasGlobalCSS: !!template.files['styles/globals.css'],
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          files,
          projectSettings,
          target: 'production',
          meta: {
            funnelType: 'multi-page',
            pageCount: template.pages.length,
            pageTypes: template.pages.map(p => p.pageType),
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        console.error('❌ Multi-page funnel deployment failed:', errorData);
        throw new Error(`Failed to deploy multi-page funnel: ${errorData.error?.message || response.statusText}`);
      }

      const deployment = await response.json() as VercelDeployment;
      console.log(`✅ Multi-page funnel deployed: ${deployment.uid} - ${deployment.url}`);
      console.log(`🎯 Pages deployed:`, template.pages.map(p => `${deployment.url}${p.path}`));
      
      return deployment;
    } catch (error) {
      console.error('❌ Multi-page funnel deploy error:', error);
      throw error;
    }
  }

  /**
   * Validate multi-page template structure
   */
  private validateMultiPageTemplate(template: MultiPageFunnelTemplate): void {
    const requiredFiles = [
      'package.json',
      'pages/_app.js',
      'styles/globals.css',
    ];

    const missingFiles = requiredFiles.filter(file => !template.files[file]);
    
    if (missingFiles.length > 0) {
      throw new Error(`Missing required files for multi-page deployment: ${missingFiles.join(', ')}`);
    }

    // Validate that all pages have corresponding files
    for (const page of template.pages) {
      const pageFile = page.path === '/' ? 'pages/index.js' : `pages${page.path}.js`;
      if (!template.files[pageFile]) {
        throw new Error(`Missing page file for ${page.path}: ${pageFile}`);
      }
    }

    // Check if we have at least one page
    if (template.pages.length === 0) {
      throw new Error('Multi-page funnel must have at least one page');
    }

    console.log(`✅ Multi-page template validation passed: ${template.pages.length} pages`);
  }

  /**
   * Deploy funnel using TemplateGenerator integration
   */
  async deployFunnelFromGenerator(
    accessToken: string,
    projectName: string,
    funnelPages: Array<{
      id: string;
      name: string;
      pageType: 'landing' | 'checkout' | 'upsell' | 'downsell' | 'thankyou';
      path: string;
      model: any;
    }>,
    productInfo: {
      name: string;
      description: string;
      price: number;
      currency: string;
      targetAudience: string;
    },
    options: {
      colorScheme: 'modern' | 'vibrant' | 'minimal' | 'dark';
      layout: 'single_page' | 'multi_section' | 'video_first';
      trackingConfig?: any;
      enableSharedComponents?: boolean;
      enableProgressTracking?: boolean;
      enableRouting?: boolean;
    },
    teamId?: string
  ): Promise<VercelDeployment> {
    console.log(`🎯 Deploying funnel with TemplateGenerator integration: ${projectName}`);

    try {
      // Import TemplateGenerator
      const { templateGenerator } = await import('./template-generator.js');

      // Generate files using TemplateGenerator
      console.log('🏗️ Generating funnel files...');
      const generatedFiles = templateGenerator.generateMultiPageFunnel(
        funnelPages,
        productInfo,
        options
      );

      // Convert to MultiPageFunnelTemplate format
      const template: MultiPageFunnelTemplate = {
        name: projectName,
        framework: 'nextjs',
        files: generatedFiles,
        pages: funnelPages.map(page => ({
          path: page.path,
          name: page.name,
          pageType: page.pageType,
        })),
        buildSettings: {
          buildCommand: 'npm run build',
          outputDirectory: '.next',
          installCommand: 'npm install',
          devCommand: 'npm run dev',
        },
      };

      console.log(`✅ Generated ${Object.keys(generatedFiles).length} files for ${funnelPages.length} pages`);

      // Deploy using the new multi-page method
      return await this.deployMultiPageFunnel(accessToken, projectName, template, teamId);

    } catch (error) {
      console.error('❌ Funnel deployment with TemplateGenerator failed:', error);
      throw new Error(`Failed to deploy funnel: ${error}`);
    }
  }

  /**
   * Create project and deploy funnel in one operation
   */
  async createProjectAndDeployFunnel(
    accessToken: string,
    projectName: string,
    funnelPages: Array<{
      id: string;
      name: string;
      pageType: 'landing' | 'checkout' | 'upsell' | 'downsell' | 'thankyou';
      path: string;
      model: any;
    }>,
    productInfo: {
      name: string;
      description: string;
      price: number;
      currency: string;
      targetAudience: string;
    },
    options: {
      colorScheme: 'modern' | 'vibrant' | 'minimal' | 'dark';
      layout: 'single_page' | 'multi_section' | 'video_first';
      trackingConfig?: any;
      enableSharedComponents?: boolean;
      enableProgressTracking?: boolean;
      enableRouting?: boolean;
    },
    teamId?: string
  ): Promise<{
    project: VercelProject;
    deployment: VercelDeployment;
  }> {
    console.log(`🏗️ Creating project and deploying funnel: ${projectName}`);

    try {
      // Create project first
      const project = await this.createProject(accessToken, projectName, 'nextjs', teamId);
      console.log(`✅ Project created: ${project.id}`);

      // Deploy funnel
      const deployment = await this.deployFunnelFromGenerator(
        accessToken,
        projectName,
        funnelPages,
        productInfo,
        options,
        teamId
      );

      console.log(`🎉 Project and funnel deployment completed successfully!`);
      console.log(`🌐 Live URL: ${deployment.url}`);

      return {
        project,
        deployment,
      };

    } catch (error) {
      console.error('❌ Project creation and funnel deployment failed:', error);
      throw error;
    }
  }

  /**
   * Get deployment status
   */
  async getDeployment(
    accessToken: string,
    deploymentId: string,
    teamId?: string
  ): Promise<VercelDeployment> {
    console.log(`📊 Getting deployment status: ${deploymentId}`);

    try {
      const url = teamId
        ? `${this.baseUrl}/v13/deployments/${deploymentId}?teamId=${teamId}`
        : `${this.baseUrl}/v13/deployments/${deploymentId}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get deployment: ${response.statusText}`);
      }

      return await response.json() as VercelDeployment;
    } catch (error) {
      console.error('❌ Get deployment error:', error);
      throw error;
    }
  }

  /**
   * Add a custom domain to project
   */
  async addDomain(
    accessToken: string,
    projectId: string,
    domain: string,
    teamId?: string
  ): Promise<VercelDomain> {
    console.log(`🌐 Adding domain ${domain} to project ${projectId}`);

    try {
      const url = teamId
        ? `${this.baseUrl}/v9/projects/${projectId}/domains?teamId=${teamId}`
        : `${this.baseUrl}/v9/projects/${projectId}/domains`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: domain,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        console.error('❌ Add domain failed:', errorData);
        throw new Error(`Failed to add domain: ${errorData.error?.message || response.statusText}`);
      }

      const domainInfo = await response.json() as VercelDomain;
      console.log(`✅ Domain added successfully: ${domain}`);
      return domainInfo;
    } catch (error) {
      console.error('❌ Add domain error:', error);
      throw error;
    }
  }

  /**
   * Get projects list
   */
  async getProjects(
    accessToken: string,
    teamId?: string
  ): Promise<VercelProject[]> {
    console.log('📋 Getting Vercel projects');

    try {
      const url = teamId
        ? `${this.baseUrl}/v9/projects?teamId=${teamId}&limit=100`
        : `${this.baseUrl}/v9/projects?limit=100`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get projects: ${response.statusText}`);
      }

      const data = await response.json() as { projects: VercelProject[] };
      return data.projects;
    } catch (error) {
      console.error('❌ Get projects error:', error);
      throw error;
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(
    accessToken: string,
    projectId: string,
    teamId?: string
  ): Promise<void> {
    console.log(`🗑️ Deleting project: ${projectId}`);

    try {
      const url = teamId
        ? `${this.baseUrl}/v9/projects/${projectId}?teamId=${teamId}`
        : `${this.baseUrl}/v9/projects/${projectId}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        throw new Error(`Failed to delete project: ${errorData.error?.message || response.statusText}`);
      }

      console.log(`✅ Project deleted successfully: ${projectId}`);
    } catch (error) {
      console.error('❌ Delete project error:', error);
      throw error;
    }
  }

  /**
   * Get deployments for a project
   */
  async getProjectDeployments(
    accessToken: string,
    projectId: string,
    teamId?: string,
    limit: number = 20
  ): Promise<VercelDeployment[]> {
    console.log(`📊 Getting deployments for project: ${projectId}`);

    try {
      const url = teamId
        ? `${this.baseUrl}/v6/deployments?projectId=${projectId}&teamId=${teamId}&limit=${limit}`
        : `${this.baseUrl}/v6/deployments?projectId=${projectId}&limit=${limit}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get deployments: ${response.statusText}`);
      }

      const data = await response.json() as { deployments: VercelDeployment[] };
      return data.deployments;
    } catch (error) {
      console.error('❌ Get deployments error:', error);
      throw error;
    }
  }

  /**
   * Validate access token
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.getCurrentUser(accessToken);
      return true;
    } catch (error) {
      console.log('❌ Token validation failed');
      return false;
    }
  }

  /**
   * Generate OAuth URL for Vercel integration
   */
  getOAuthUrl(redirectUri: string, state?: string): string {
    // For Vercel Integrations, use the integration flow instead of OAuth direct
    const integrationSlug = 'n1funnelbuilder'; // Your Integration slug
    const params = new URLSearchParams();
    
    // Add redirect URI and state for the integration flow
    params.append('redirect_uri', redirectUri);
    
    if (state) {
      params.append('state', state);
    }

    // Use Integration flow URL instead of OAuth direct
    return `https://vercel.com/integrations/${integrationSlug}/new?${params.toString()}`;
  }

  /**
   * Deploy from preview session (PHASE 2.4 FEATURE)
   * Takes a validated preview session and deploys it to Vercel
   */
  async deployFromPreviewSession(
    accessToken: string,
    sessionId: string,
    projectName: string,
    teamId?: string
  ): Promise<{
    project: VercelProject;
    deployment: VercelDeployment;
  }> {
    console.log(`🎯 PHASE 2.4: Deploying from preview session: ${sessionId}`);

    try {
      // Import PreviewService to get session data
      const { previewService } = await import('./preview-service.js');

      // Get session metadata and files
      const session = (previewService as any).sessions.get(sessionId);
      if (!session) {
        throw new Error(`Preview session ${sessionId} not found or expired`);
      }

      // Validate that the session has been validated and is ready for deploy
      if (!session.validation) {
        throw new Error('Preview session must be validated before deployment');
      }

      if (!session.validation.isValid) {
        throw new Error(`Preview session validation failed (score: ${session.validation.score}/100). Fix issues before deployment.`);
      }

      if (session.validation.score < 70) {
        console.warn(`⚠️ Preview session has low validation score (${session.validation.score}/100). Consider fixing issues for better deployment.`);
      }

      console.log(`✅ Session validation passed - Score: ${session.validation.score}/100`);

      // Extract files and pages from session
      const { files, pages, productInfo } = session;

      // Create project first
      console.log(`🏗️ Creating Vercel project: ${projectName}`);
      const project = await this.createProject(accessToken, projectName, 'nextjs', teamId);
      console.log(`✅ Project created: ${project.id}`);

      // Convert session files to deployment format
      const template: MultiPageFunnelTemplate = {
        name: projectName,
        framework: 'nextjs',
        files: files,
        pages: pages.map((page: any) => ({
          path: page.path,
          name: page.name,
          pageType: page.pageType,
        })),
        buildSettings: {
          buildCommand: 'npm run build',
          outputDirectory: '.next',
          installCommand: 'npm install',
          devCommand: 'npm run dev',
        },
      };

      // Deploy using the existing multi-page deployment method
      console.log(`🚀 Deploying ${Object.keys(files).length} files to Vercel...`);
      const deployment = await this.deployMultiPageFunnel(accessToken, projectName, template, teamId);

      console.log(`🎉 PHASE 2.4: Deployment from preview completed successfully!`);
      console.log(`🌐 Live URL: ${deployment.url}`);

      return {
        project,
        deployment,
      };

    } catch (error) {
      console.error('❌ PHASE 2.4: Deploy from preview session failed:', error);
      throw new Error(`Failed to deploy from preview session: ${error}`);
    }
  }

  /**
   * Get deployment statistics for analytics (PHASE 2.4 FEATURE)
   */
  async getDeploymentStats(
    accessToken: string,
    teamId?: string,
    projectIds?: string[]
  ): Promise<{
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    avgBuildTime: number;
    recentDeployments: VercelDeployment[];
    deploymentsByProject: Record<string, number>;
  }> {
    console.log('📊 PHASE 2.4: Getting deployment statistics');

    try {
      let allDeployments: VercelDeployment[] = [];

      if (projectIds && projectIds.length > 0) {
        // Get deployments for specific projects
        for (const projectId of projectIds) {
          const deployments = await this.getProjectDeployments(accessToken, projectId, teamId);
          allDeployments.push(...deployments);
        }
      } else {
        // This would require listing all projects first, then getting their deployments
        // For now, we'll return empty stats if no project IDs are provided
        console.warn('⚠️ No project IDs provided for deployment stats');
      }

      // Calculate statistics
      const totalDeployments = allDeployments.length;
      const successfulDeployments = allDeployments.filter(d => d.state === 'READY').length;
      const failedDeployments = allDeployments.filter(d => d.state === 'ERROR').length;

      // Calculate average build time for successful deployments
      const completedDeployments = allDeployments.filter(d => d.readyAt && d.buildingAt);
      const avgBuildTime = completedDeployments.length > 0
        ? completedDeployments.reduce((sum, d) => sum + (d.readyAt! - d.buildingAt!), 0) / completedDeployments.length
        : 0;

      // Count deployments by project
      const deploymentsByProject: Record<string, number> = {};
      for (const deployment of allDeployments) {
        const projectName = deployment.name;
        deploymentsByProject[projectName] = (deploymentsByProject[projectName] || 0) + 1;
      }

      // Get recent deployments (last 10)
      const recentDeployments = allDeployments
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10);

      console.log(`📊 Deployment stats: ${totalDeployments} total, ${successfulDeployments} successful, ${failedDeployments} failed`);

      return {
        totalDeployments,
        successfulDeployments,
        failedDeployments,
        avgBuildTime: Math.round(avgBuildTime / 1000), // Convert to seconds
        recentDeployments,
        deploymentsByProject,
      };

    } catch (error) {
      console.error('❌ Failed to get deployment statistics:', error);
      throw error;
    }
  }

  /**
   * Redeploy an existing project with updated files (PHASE 2.4 FEATURE)
   */
  async redeployProject(
    accessToken: string,
    projectName: string,
    sessionId: string,
    teamId?: string
  ): Promise<VercelDeployment> {
    console.log(`🔄 PHASE 2.4: Redeploying project: ${projectName} from session: ${sessionId}`);

    try {
      // Import PreviewService to get session data
      const { previewService } = await import('./preview-service.js');

      // Get session metadata and files
      const session = (previewService as any).sessions.get(sessionId);
      if (!session) {
        throw new Error(`Preview session ${sessionId} not found or expired`);
      }

      // Validate that the session has been validated
      if (!session.validation || !session.validation.isValid) {
        throw new Error('Preview session must be validated before redeployment');
      }

      console.log(`✅ Session validation passed for redeployment - Score: ${session.validation.score}/100`);

      // Extract files from session
      const { files, pages } = session;

      // Convert session files to deployment format
      const template: MultiPageFunnelTemplate = {
        name: projectName,
        framework: 'nextjs',
        files: files,
        pages: pages.map((page: any) => ({
          path: page.path,
          name: page.name,
          pageType: page.pageType,
        })),
        buildSettings: {
          buildCommand: 'npm run build',
          outputDirectory: '.next',
          installCommand: 'npm install',
          devCommand: 'npm run dev',
        },
      };

      // Deploy using the existing multi-page deployment method
      console.log(`🚀 Redeploying ${Object.keys(files).length} files to existing project...`);
      const deployment = await this.deployMultiPageFunnel(accessToken, projectName, template, teamId);

      console.log(`🎉 PHASE 2.4: Redeployment completed successfully!`);
      console.log(`🌐 Updated URL: ${deployment.url}`);

      return deployment;

    } catch (error) {
      console.error('❌ PHASE 2.4: Redeployment failed:', error);
      throw new Error(`Failed to redeploy project: ${error}`);
    }
  }
}

// Export singleton instance
export const vercelService = new VercelService();