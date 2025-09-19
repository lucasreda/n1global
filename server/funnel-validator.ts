import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  recommendations: string[];
  performance: PerformanceMetrics;
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: 'structure' | 'content' | 'performance' | 'accessibility' | 'seo';
  message: string;
  file?: string;
  line?: number;
  severity: number; // 1-10
}

export interface PerformanceMetrics {
  estimatedLoadTime: number; // in ms
  bundleSize: number; // in bytes
  imageOptimization: number; // score 0-100
  codeQuality: number; // score 0-100
  accessibility: number; // score 0-100
  seo: number; // score 0-100
}

export class FunnelValidator {
  constructor() {
    console.log('🧪 FunnelValidator initialized');
  }

  /**
   * Validate a complete funnel
   */
  async validateFunnel(
    sessionId: string,
    files: Record<string, string>,
    pages: Array<{
      path: string;
      name: string;
      pageType: string;
    }>,
    productInfo: {
      name: string;
      description: string;
      price: number;
      currency: string;
    }
  ): Promise<ValidationResult> {
    console.log(`🧪 Starting validation for funnel session: ${sessionId}`);

    const issues: ValidationIssue[] = [];
    let score = 100;

    // Run validation checks
    const structureResult = await this.validateStructure(files, pages);
    const contentResult = await this.validateContent(files, pages, productInfo);
    const performanceResult = await this.validatePerformance(files);
    const accessibilityResult = await this.validateAccessibility(files);
    const seoResult = await this.validateSEO(files, productInfo);

    // Combine results
    issues.push(...structureResult.issues);
    issues.push(...contentResult.issues);
    issues.push(...performanceResult.issues);
    issues.push(...accessibilityResult.issues);
    issues.push(...seoResult.issues);

    // Calculate overall score
    score = this.calculateScore(issues);

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues, score);

    const performance: PerformanceMetrics = {
      estimatedLoadTime: performanceResult.estimatedLoadTime,
      bundleSize: performanceResult.bundleSize,
      imageOptimization: performanceResult.imageOptimization,
      codeQuality: performanceResult.codeQuality,
      accessibility: accessibilityResult.score,
      seo: seoResult.score
    };

    const result: ValidationResult = {
      isValid: score >= 70, // Valid if score is 70 or higher
      score,
      issues: issues.sort((a, b) => b.severity - a.severity),
      recommendations,
      performance
    };

    console.log(`✅ Validation completed for ${sessionId}: Score ${score}/100`);
    return result;
  }

  /**
   * Validate funnel structure
   */
  private async validateStructure(
    files: Record<string, string>,
    pages: Array<{ path: string; name: string; pageType: string }>
  ): Promise<{ issues: ValidationIssue[] }> {
    const issues: ValidationIssue[] = [];

    // Check required files
    const requiredFiles = ['package.json', 'pages/_app.js', 'styles/globals.css'];
    for (const file of requiredFiles) {
      if (!files[file]) {
        issues.push({
          type: 'error',
          category: 'structure',
          message: `Arquivo obrigatório ausente: ${file}`,
          file,
          severity: 9
        });
      }
    }

    // Check package.json structure
    if (files['package.json']) {
      try {
        const packageJson = JSON.parse(files['package.json']);
        if (!packageJson.dependencies?.next) {
          issues.push({
            type: 'warning',
            category: 'structure',
            message: 'Dependência Next.js não encontrada no package.json',
            file: 'package.json',
            severity: 6
          });
        }
        if (!packageJson.scripts?.build) {
          issues.push({
            type: 'warning',
            category: 'structure',
            message: 'Script de build não encontrado no package.json',
            file: 'package.json',
            severity: 5
          });
        }
      } catch (error) {
        issues.push({
          type: 'error',
          category: 'structure',
          message: 'package.json inválido (JSON malformado)',
          file: 'package.json',
          severity: 10
        });
      }
    }

    // Check page files
    for (const page of pages) {
      const pageFile = page.path === '/' ? 'pages/index.js' : `pages${page.path}.js`;
      if (!files[pageFile]) {
        issues.push({
          type: 'error',
          category: 'structure',
          message: `Arquivo de página ausente: ${pageFile}`,
          file: pageFile,
          severity: 8
        });
      } else {
        // Check page content
        const content = files[pageFile];
        if (!content.includes('export default')) {
          issues.push({
            type: 'error',
            category: 'structure',
            message: `Página ${pageFile} não possui export default`,
            file: pageFile,
            severity: 7
          });
        }
      }
    }

    // Check navigation consistency
    const hasMultiplePages = pages.length > 1;
    if (hasMultiplePages) {
      const indexContent = files['pages/index.js'] || '';
      const hasNavigation = indexContent.includes('router.push') || 
                           indexContent.includes('Link') ||
                           indexContent.includes('href=');
      
      if (!hasNavigation) {
        issues.push({
          type: 'warning',
          category: 'structure',
          message: 'Funnel multi-página sem navegação entre páginas detectada',
          file: 'pages/index.js',
          severity: 6
        });
      }
    }

    return { issues };
  }

  /**
   * Validate content quality
   */
  private async validateContent(
    files: Record<string, string>,
    pages: Array<{ path: string; name: string; pageType: string }>,
    productInfo: { name: string; description: string; price: number; currency: string }
  ): Promise<{ issues: ValidationIssue[] }> {
    const issues: ValidationIssue[] = [];

    // Check product information consistency
    for (const page of pages) {
      const pageFile = page.path === '/' ? 'pages/index.js' : `pages${page.path}.js`;
      const content = files[pageFile];
      
      if (content) {
        // Check if product name is mentioned
        if (!content.includes(productInfo.name)) {
          issues.push({
            type: 'warning',
            category: 'content',
            message: `Nome do produto "${productInfo.name}" não encontrado na página ${page.name}`,
            file: pageFile,
            severity: 4
          });
        }

        // Check for pricing information on checkout pages
        if (page.pageType === 'checkout' && !content.includes(productInfo.price.toString())) {
          issues.push({
            type: 'warning',
            category: 'content',
            message: `Preço do produto não encontrado na página de checkout`,
            file: pageFile,
            severity: 5
          });
        }

        // Check for empty or too short content
        const textContent = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        if (textContent.length < 100) {
          issues.push({
            type: 'warning',
            category: 'content',
            message: `Conteúdo muito curto na página ${page.name} (${textContent.length} caracteres)`,
            file: pageFile,
            severity: 3
          });
        }

        // Check for call-to-action buttons
        const hasCtaButton = content.includes('button') || 
                            content.includes('btn') ||
                            content.includes('onClick');
        
        if (!hasCtaButton && ['landing', 'checkout', 'upsell'].includes(page.pageType)) {
          issues.push({
            type: 'warning',
            category: 'content',
            message: `Página ${page.name} pode precisar de botões de call-to-action`,
            file: pageFile,
            severity: 5
          });
        }
      }
    }

    return { issues };
  }

  /**
   * Validate performance characteristics
   */
  private async validatePerformance(
    files: Record<string, string>
  ): Promise<{ 
    issues: ValidationIssue[];
    estimatedLoadTime: number;
    bundleSize: number;
    imageOptimization: number;
    codeQuality: number;
  }> {
    const issues: ValidationIssue[] = [];
    
    // Calculate bundle size
    let bundleSize = 0;
    let jsSize = 0;
    let cssSize = 0;
    
    for (const [path, content] of Object.entries(files)) {
      bundleSize += content.length;
      
      if (path.endsWith('.js') || path.endsWith('.jsx')) {
        jsSize += content.length;
      } else if (path.endsWith('.css')) {
        cssSize += content.length;
      }
    }

    // Performance thresholds
    const MAX_BUNDLE_SIZE = 1024 * 1024; // 1MB
    const MAX_JS_SIZE = 512 * 1024; // 512KB
    const MAX_CSS_SIZE = 256 * 1024; // 256KB

    if (bundleSize > MAX_BUNDLE_SIZE) {
      issues.push({
        type: 'warning',
        category: 'performance',
        message: `Bundle muito grande: ${Math.round(bundleSize / 1024)}KB (recomendado: <1MB)`,
        severity: 6
      });
    }

    if (jsSize > MAX_JS_SIZE) {
      issues.push({
        type: 'warning',
        category: 'performance',
        message: `JavaScript muito grande: ${Math.round(jsSize / 1024)}KB (recomendado: <512KB)`,
        severity: 5
      });
    }

    // Estimate load time (simplified calculation)
    const estimatedLoadTime = Math.round((bundleSize / 1024) * 0.1 + 500); // ms

    if (estimatedLoadTime > 3000) {
      issues.push({
        type: 'warning',
        category: 'performance',
        message: `Tempo de carregamento estimado muito alto: ${estimatedLoadTime}ms`,
        severity: 7
      });
    }

    // Check for performance optimizations
    let codeQuality = 100;
    
    // Check if using optimized images
    const hasUnoptimizedImages = Object.keys(files).some(path => 
      ['.jpg', '.jpeg', '.png'].some(ext => path.includes(ext)) && !path.includes('optimized')
    );
    
    const imageOptimization = hasUnoptimizedImages ? 60 : 90;
    
    if (hasUnoptimizedImages) {
      issues.push({
        type: 'info',
        category: 'performance',
        message: 'Considere otimizar imagens para melhor performance',
        severity: 3
      });
      codeQuality -= 10;
    }

    // Check for inline styles (performance anti-pattern)
    const hasInlineStyles = Object.values(files).some(content => 
      content.includes('style=') && content.includes('{{')
    );
    
    if (hasInlineStyles) {
      issues.push({
        type: 'info',
        category: 'performance',
        message: 'Estilos inline detectados - considere usar CSS classes',
        severity: 2
      });
      codeQuality -= 5;
    }

    return {
      issues,
      estimatedLoadTime,
      bundleSize,
      imageOptimization,
      codeQuality: Math.max(codeQuality, 0)
    };
  }

  /**
   * Validate accessibility
   */
  private async validateAccessibility(
    files: Record<string, string>
  ): Promise<{ issues: ValidationIssue[]; score: number }> {
    const issues: ValidationIssue[] = [];
    let score = 100;

    for (const [path, content] of Object.entries(files)) {
      if (path.endsWith('.js') || path.endsWith('.jsx')) {
        // Check for alt text on images
        const imgMatches = content.match(/<img[^>]*>/g);
        if (imgMatches) {
          for (const img of imgMatches) {
            if (!img.includes('alt=')) {
              issues.push({
                type: 'warning',
                category: 'accessibility',
                message: 'Imagem sem texto alternativo (alt) encontrada',
                file: path,
                severity: 4
              });
              score -= 5;
            }
          }
        }

        // Check for proper heading structure
        if (!content.includes('<h1') && path.includes('index.js')) {
          issues.push({
            type: 'warning',
            category: 'accessibility',
            message: 'Página principal sem heading H1',
            file: path,
            severity: 5
          });
          score -= 10;
        }

        // Check for button accessibility
        const buttonMatches = content.match(/<button[^>]*>/g);
        if (buttonMatches) {
          for (const button of buttonMatches) {
            if (!button.includes('aria-label') && !content.includes('>{') && !button.includes('>')) {
              issues.push({
                type: 'info',
                category: 'accessibility',
                message: 'Botão pode precisar de aria-label para acessibilidade',
                file: path,
                severity: 3
              });
              score -= 2;
            }
          }
        }
      }
    }

    return { 
      issues, 
      score: Math.max(score, 0) 
    };
  }

  /**
   * Validate SEO optimization
   */
  private async validateSEO(
    files: Record<string, string>,
    productInfo: { name: string; description: string; price: number; currency: string }
  ): Promise<{ issues: ValidationIssue[]; score: number }> {
    const issues: ValidationIssue[] = [];
    let score = 100;

    // Check for meta tags in pages
    for (const [path, content] of Object.entries(files)) {
      if (path.includes('pages/') && path.endsWith('.js')) {
        // Check for Head component and meta tags
        if (!content.includes('Head') && !content.includes('<title>')) {
          issues.push({
            type: 'warning',
            category: 'seo',
            message: `Página ${path} sem título (meta title)`,
            file: path,
            severity: 6
          });
          score -= 15;
        }

        if (!content.includes('meta name="description"')) {
          issues.push({
            type: 'warning',
            category: 'seo',
            message: `Página ${path} sem meta description`,
            file: path,
            severity: 5
          });
          score -= 10;
        }

        // Check if product information is mentioned in SEO tags
        if (path.includes('index.js')) {
          if (!content.includes(productInfo.name)) {
            issues.push({
              type: 'info',
              category: 'seo',
              message: 'Nome do produto não encontrado em tags SEO da página principal',
              file: path,
              severity: 3
            });
            score -= 5;
          }
        }
      }
    }

    // Check for Open Graph tags
    const hasOgTags = Object.values(files).some(content => 
      content.includes('og:title') || content.includes('og:description')
    );
    
    if (!hasOgTags) {
      issues.push({
        type: 'info',
        category: 'seo',
        message: 'Tags Open Graph não encontradas - importante para compartilhamento social',
        severity: 4
      });
      score -= 10;
    }

    return { 
      issues, 
      score: Math.max(score, 0) 
    };
  }

  /**
   * Calculate overall score based on issues
   */
  private calculateScore(issues: ValidationIssue[]): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.type) {
        case 'error':
          score -= issue.severity * 2;
          break;
        case 'warning':
          score -= issue.severity;
          break;
        case 'info':
          score -= issue.severity * 0.5;
          break;
      }
    }

    return Math.max(Math.round(score), 0);
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(issues: ValidationIssue[], score: number): string[] {
    const recommendations: string[] = [];

    // Priority recommendations based on score
    if (score < 50) {
      recommendations.push('🚨 Score crítico - revisar problemas estruturais e de performance');
    } else if (score < 70) {
      recommendations.push('⚠️ Score baixo - focar em melhorias de conteúdo e acessibilidade');
    } else if (score < 85) {
      recommendations.push('✅ Score bom - pequenos ajustes podem melhorar a qualidade');
    } else {
      recommendations.push('🎉 Score excelente - funnel pronto para deploy!');
    }

    // Category-specific recommendations
    const errorsByCategory = issues.reduce((acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (errorsByCategory.structure > 2) {
      recommendations.push('🏗️ Corrigir problemas estruturais críticos antes do deploy');
    }

    if (errorsByCategory.performance > 1) {
      recommendations.push('⚡ Otimizar performance para melhor experiência do usuário');
    }

    if (errorsByCategory.accessibility > 2) {
      recommendations.push('♿ Melhorar acessibilidade para atingir mais usuários');
    }

    if (errorsByCategory.seo > 1) {
      recommendations.push('🔍 Adicionar meta tags e otimizações SEO para melhor visibilidade');
    }

    if (errorsByCategory.content > 2) {
      recommendations.push('📝 Revisar e melhorar qualidade do conteúdo');
    }

    return recommendations;
  }
}

// Export singleton instance
export const funnelValidator = new FunnelValidator();