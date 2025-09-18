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

// Landing page template interface
interface LandingPageTemplate {
  name: string;
  framework: 'nextjs' | 'react' | 'html';
  files: {
    [path: string]: string;
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
    framework: 'nextjs' | 'react' | 'html' = 'nextjs',
    teamId?: string
  ): Promise<VercelProject> {
    console.log(`🏗️ Creating Vercel project: ${name}`);

    try {
      const url = teamId 
        ? `${this.baseUrl}/v9/projects?teamId=${teamId}`
        : `${this.baseUrl}/v9/projects`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          framework,
          gitRepository: null, // We'll deploy without git
          buildCommand: framework === 'nextjs' ? 'npm run build' : 'npm run build',
          outputDirectory: framework === 'nextjs' ? '.next' : 'dist',
          installCommand: 'npm install',
          devCommand: framework === 'nextjs' ? 'npm run dev' : 'npm start',
        }),
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
   * Deploy a landing page to Vercel
   */
  async deployLandingPage(
    accessToken: string,
    projectName: string,
    template: LandingPageTemplate,
    teamId?: string
  ): Promise<VercelDeployment> {
    console.log(`🚀 Deploying landing page: ${projectName}`);

    try {
      const url = teamId 
        ? `${this.baseUrl}/v13/deployments?teamId=${teamId}`
        : `${this.baseUrl}/v13/deployments`;

      // Convert template files to Vercel deployment format
      const files = Object.entries(template.files).map(([path, content]) => ({
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
          name: projectName,
          files,
          projectSettings: {
            framework: template.framework,
            buildCommand: template.framework === 'nextjs' ? 'npm run build' : 'npm run build',
            outputDirectory: template.framework === 'nextjs' ? '.next' : 'dist',
            installCommand: 'npm install',
            devCommand: template.framework === 'nextjs' ? 'npm run dev' : 'npm start',
          },
          target: 'production',
        }),
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
    const params = new URLSearchParams({
      client_id: process.env.VERCEL_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'user email deploy project read project:write',
    });

    if (state) {
      params.append('state', state);
    }

    return `https://vercel.com/oauth/authorize?${params.toString()}`;
  }
}

// Export singleton instance
export const vercelService = new VercelService();