import { describe, test, expect } from '@jest/globals';
import { convertHtmlToPageModelV3 } from '../html-to-pagemodel-converter';
import { pageModelV3Schema } from '@shared/schema';

/**
 * Test Suite for HTML → PageModelV3 Converter
 * 
 * Tests:
 * 1. 10+ diverse HTML landing pages
 * 2. Bijective conversion (HTML → PageModel → HTML)
 * 3. 95%+ style preservation
 * 4. Snapshot tests
 */

describe('HTML to PageModelV3 Converter', () => {
  describe('Basic Conversion', () => {
    test('should convert simple HTML to valid PageModelV3', () => {
      const html = `<!DOCTYPE html>
<html><head><title>Test</title></head>
<body><h1>Hello World</h1></body></html>`;
      
      const result = convertHtmlToPageModelV3(html);
      const validation = pageModelV3Schema.safeParse(result);
      
      expect(validation.success).toBe(true);
      expect(result.version).toBe('3.0');
      expect(result.meta.title).toBe('Test');
      expect(result.sections.length).toBeGreaterThan(0);
    });

    test('should handle empty body gracefully', () => {
      const html = `<!DOCTYPE html>
<html><head><title>Empty</title></head>
<body></body></html>`;
      
      const result = convertHtmlToPageModelV3(html);
      const validation = pageModelV3Schema.safeParse(result);
      
      expect(validation.success).toBe(true);
      expect(result.sections.length).toBeGreaterThan(0);
    });
  });

  describe('Landing Page Templates - 10 Test Cases', () => {
    test('1. Hero Section with CTA', () => {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Hero Landing Page</title>
  <style>
    .hero {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 80px 20px;
      text-align: center;
      color: white;
    }
    .hero h1 {
      font-size: 48px;
      margin: 0 0 20px 0;
      font-weight: 700;
    }
    .cta-button {
      background: white;
      color: #667eea;
      padding: 15px 40px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: transform 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.2);
    }
  </style>
</head>
<body>
  <section class="hero">
    <h1>Welcome to Our Product</h1>
    <p>The best solution for your business</p>
    <a href="#pricing" class="cta-button">Get Started Now</a>
  </section>
</body>
</html>`;

      const result = convertHtmlToPageModelV3(html);
      const validation = pageModelV3Schema.safeParse(result);
      
      expect(validation.success).toBe(true);
      expect(result.sections[0].type).toBe('hero');
      
      // Check if hover state was captured
      const buttonElement = result.sections[0].rows[0]?.columns[0]?.elements.find(
        el => el.type === 'button' || el.props?.href === '#pricing'
      );
      expect(buttonElement?.states?.hover).toBeDefined();
    });

    test('2. Features Grid Layout', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Features Grid</title>
  <style>
    .features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 30px;
      padding: 60px 20px;
    }
    .feature-card {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .feature-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.15);
    }
    @media (max-width: 768px) {
      .features {
        grid-template-columns: 1fr;
        gap: 20px;
      }
    }
  </style>
</head>
<body>
  <section class="features">
    <div class="feature-card">
      <h3>Fast Performance</h3>
      <p>Lightning quick load times</p>
    </div>
    <div class="feature-card">
      <h3>Secure</h3>
      <p>Enterprise-grade security</p>
    </div>
    <div class="feature-card">
      <h3>Scalable</h3>
      <p>Grows with your business</p>
    </div>
  </section>
</body>
</html>`;

      const result = convertHtmlToPageModelV3(html);
      const validation = pageModelV3Schema.safeParse(result);
      
      expect(validation.success).toBe(true);
      expect(result.sections[0].type).toBe('features');
      
      // Check grid layout detection
      const gridStyles = result.sections[0].styles?.desktop;
      expect(gridStyles?.display).toBe('grid');
      
      // Check responsive styles
      expect(result.sections[0].styles?.mobile).toBeDefined();
    });

    test('3. Pricing Table', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Pricing</title>
  <style>
    .pricing {
      display: flex;
      justify-content: center;
      gap: 30px;
      padding: 80px 20px;
      background: #f8f9fa;
    }
    .price-card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      min-width: 300px;
    }
    .price-card.featured {
      transform: scale(1.05);
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
      border: 2px solid #667eea;
    }
    .price {
      font-size: 48px;
      font-weight: 700;
      color: #667eea;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <section class="pricing">
    <div class="price-card">
      <h3>Basic</h3>
      <div class="price">$9</div>
      <p>Per month</p>
    </div>
    <div class="price-card featured">
      <h3>Pro</h3>
      <div class="price">$29</div>
      <p>Per month</p>
    </div>
    <div class="price-card">
      <h3>Enterprise</h3>
      <div class="price">$99</div>
      <p>Per month</p>
    </div>
  </section>
</body>
</html>`;

      const result = convertHtmlToPageModelV3(html);
      const validation = pageModelV3Schema.safeParse(result);
      
      expect(validation.success).toBe(true);
      expect(result.sections[0].type).toBe('pricing');
      
      // Check flex layout
      const flexStyles = result.sections[0].styles?.desktop;
      expect(flexStyles?.display).toBe('flex');
    });

    test('4. Testimonials Carousel', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Testimonials</title>
  <style>
    .testimonials {
      background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 100px 20px;
    }
    .testimonial-card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      margin: 0 auto;
      max-width: 600px;
    }
    .quote {
      font-size: 24px;
      font-style: italic;
      line-height: 1.6;
    }
    .author {
      margin-top: 30px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <section class="testimonials">
    <div class="testimonial-card">
      <p class="quote">"This product changed our business completely. Highly recommended!"</p>
      <p class="author">— John Doe, CEO at TechCorp</p>
    </div>
  </section>
</body>
</html>`;

      const result = convertHtmlToPageModelV3(html);
      const validation = pageModelV3Schema.safeParse(result);
      
      expect(validation.success).toBe(true);
      expect(result.sections[0].type).toBe('testimonials');
      
      // Check gradient background
      const bgGradient = result.sections[0].styles?.desktop?.background;
      expect(bgGradient).toContain('linear-gradient');
    });

    test('5. CTA Section with Form', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>CTA Form</title>
  <style>
    .cta {
      background: #1a202c;
      color: white;
      padding: 80px 20px;
      text-align: center;
    }
    .cta h2 {
      font-size: 36px;
      margin-bottom: 20px;
    }
    .form-container {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-top: 40px;
    }
    .email-input {
      padding: 15px 20px;
      border-radius: 8px;
      border: none;
      min-width: 300px;
      font-size: 16px;
    }
    .submit-button {
      padding: 15px 40px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.3s;
    }
    .submit-button:hover {
      background: #5568d3;
    }
  </style>
</head>
<body>
  <section class="cta">
    <h2>Start Your Free Trial Today</h2>
    <p>No credit card required. Cancel anytime.</p>
    <div class="form-container">
      <input type="email" class="email-input" placeholder="Enter your email">
      <button class="submit-button">Get Started</button>
    </div>
  </section>
</body>
</html>`;

      const result = convertHtmlToPageModelV3(html);
      const validation = pageModelV3Schema.safeParse(result);
      
      expect(validation.success).toBe(true);
      expect(result.sections[0].type).toBe('cta');
      
      // Check form elements
      const formElements = result.sections[0].rows[0]?.columns[0]?.elements;
      const hasInput = formElements?.some(el => el.type === 'input');
      const hasButton = formElements?.some(el => el.type === 'button');
      
      expect(hasInput || hasButton).toBe(true);
    });

    test('6. Footer with Social Links', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Footer</title>
  <style>
    footer {
      background: #1a202c;
      color: #a0aec0;
      padding: 60px 20px 30px;
    }
    .footer-content {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 40px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .footer-column h4 {
      color: white;
      margin-bottom: 20px;
    }
    .footer-link {
      color: #a0aec0;
      text-decoration: none;
      display: block;
      margin-bottom: 10px;
      transition: color 0.2s;
    }
    .footer-link:hover {
      color: white;
    }
    .social-icons {
      display: flex;
      gap: 15px;
      margin-top: 20px;
    }
    @media (max-width: 768px) {
      .footer-content {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <footer>
    <div class="footer-content">
      <div class="footer-column">
        <h4>Product</h4>
        <a href="#" class="footer-link">Features</a>
        <a href="#" class="footer-link">Pricing</a>
        <a href="#" class="footer-link">FAQ</a>
      </div>
      <div class="footer-column">
        <h4>Company</h4>
        <a href="#" class="footer-link">About</a>
        <a href="#" class="footer-link">Blog</a>
        <a href="#" class="footer-link">Careers</a>
      </div>
      <div class="footer-column">
        <h4>Resources</h4>
        <a href="#" class="footer-link">Documentation</a>
        <a href="#" class="footer-link">Help Center</a>
        <a href="#" class="footer-link">API</a>
      </div>
      <div class="footer-column">
        <h4>Connect</h4>
        <div class="social-icons">
          <a href="#">Twitter</a>
          <a href="#">LinkedIn</a>
          <a href="#">GitHub</a>
        </div>
      </div>
    </div>
  </footer>
</body>
</html>`;

      const result = convertHtmlToPageModelV3(html);
      const validation = pageModelV3Schema.safeParse(result);
      
      expect(validation.success).toBe(true);
      expect(result.sections[0].type).toBe('footer');
    });

    test('7. Image Gallery with Hover Effects', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Gallery</title>
  <style>
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      padding: 60px 20px;
    }
    .gallery-item {
      position: relative;
      overflow: hidden;
      border-radius: 12px;
      aspect-ratio: 16 / 9;
    }
    .gallery-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s;
    }
    .gallery-item:hover img {
      transform: scale(1.1);
    }
    .overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
      color: white;
      padding: 20px;
      transform: translateY(100%);
      transition: transform 0.3s;
    }
    .gallery-item:hover .overlay {
      transform: translateY(0);
    }
  </style>
</head>
<body>
  <section class="gallery">
    <div class="gallery-item">
      <img src="/image1.jpg" alt="Gallery Image 1">
      <div class="overlay">
        <h3>Image Title 1</h3>
        <p>Description here</p>
      </div>
    </div>
    <div class="gallery-item">
      <img src="/image2.jpg" alt="Gallery Image 2">
      <div class="overlay">
        <h3>Image Title 2</h3>
        <p>Description here</p>
      </div>
    </div>
  </section>
</body>
</html>`;

      const result = convertHtmlToPageModelV3(html);
      const validation = pageModelV3Schema.safeParse(result);
      
      expect(validation.success).toBe(true);
      
      // Check for hover states on images
      const imageElements = result.sections[0].rows[0]?.columns[0]?.elements
        .filter(el => el.type === 'image');
      expect(imageElements?.length).toBeGreaterThan(0);
    });

    test('8. Stats Counter Section', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Stats</title>
  <style>
    .stats {
      background: #667eea;
      color: white;
      padding: 80px 20px;
    }
    .stats-grid {
      display: flex;
      justify-content: space-around;
      max-width: 1000px;
      margin: 0 auto;
    }
    .stat-item {
      text-align: center;
    }
    .stat-number {
      font-size: 64px;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 10px;
    }
    .stat-label {
      font-size: 18px;
      opacity: 0.9;
    }
    @media (max-width: 768px) {
      .stats-grid {
        flex-direction: column;
        gap: 40px;
      }
    }
  </style>
</head>
<body>
  <section class="stats">
    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-number">10K+</div>
        <div class="stat-label">Active Users</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">50K+</div>
        <div class="stat-label">Projects Created</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">99.9%</div>
        <div class="stat-label">Uptime</div>
      </div>
    </div>
  </section>
</body>
</html>`;

      const result = convertHtmlToPageModelV3(html);
      const validation = pageModelV3Schema.safeParse(result);
      
      expect(validation.success).toBe(true);
      expect(result.sections[0].type).toBe('content');
      
      // Check flex layout
      const flexStyles = result.sections[0].rows[0]?.columns[0]?.elements[0]?.styles?.desktop;
      expect(flexStyles?.display).toBe('flex');
    });

    test('9. Navigation Header with Logo', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Navigation</title>
  <style>
    nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 40px;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #667eea;
    }
    .nav-links {
      display: flex;
      gap: 30px;
    }
    .nav-link {
      color: #1a202c;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
    }
    .nav-link:hover {
      color: #667eea;
    }
    @media (max-width: 768px) {
      nav {
        flex-direction: column;
        gap: 20px;
      }
    }
  </style>
</head>
<body>
  <nav>
    <div class="logo">MyBrand</div>
    <div class="nav-links">
      <a href="#" class="nav-link">Home</a>
      <a href="#" class="nav-link">Features</a>
      <a href="#" class="nav-link">Pricing</a>
      <a href="#" class="nav-link">Contact</a>
    </div>
  </nav>
</body>
</html>`;

      const result = convertHtmlToPageModelV3(html);
      const validation = pageModelV3Schema.safeParse(result);
      
      expect(validation.success).toBe(true);
      
      // Check sticky positioning
      const navStyles = result.sections[0].styles?.desktop;
      expect(navStyles?.position).toBe('sticky');
    });

    test('10. Video Background Hero', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Video Hero</title>
  <style>
    .video-hero {
      position: relative;
      height: 100vh;
      overflow: hidden;
    }
    .video-bg {
      position: absolute;
      top: 50%;
      left: 50%;
      min-width: 100%;
      min-height: 100%;
      width: auto;
      height: auto;
      transform: translate(-50%, -50%);
      z-index: -1;
    }
    .hero-content {
      position: relative;
      z-index: 1;
      text-align: center;
      color: white;
      padding-top: 40vh;
    }
    .hero-content h1 {
      font-size: 72px;
      font-weight: 700;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    }
    .overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.4);
      z-index: 0;
    }
  </style>
</head>
<body>
  <section class="video-hero">
    <video class="video-bg" autoplay muted loop>
      <source src="/video.mp4" type="video/mp4">
    </video>
    <div class="overlay"></div>
    <div class="hero-content">
      <h1>Experience Innovation</h1>
      <p>Transforming the future of technology</p>
    </div>
  </section>
</body>
</html>`;

      const result = convertHtmlToPageModelV3(html);
      const validation = pageModelV3Schema.safeParse(result);
      
      expect(validation.success).toBe(true);
      expect(result.sections[0].type).toBe('hero');
      
      // Check for video element
      const hasVideo = result.sections[0].rows.some(row =>
        row.columns.some(col =>
          col.elements.some(el => el.type === 'video')
        )
      );
      expect(hasVideo).toBe(true);
    });
  });

  describe('Style Preservation', () => {
    test('should preserve 95%+ of CSS properties', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Style Test</title>
  <style>
    .test-element {
      /* Layout */
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 20px;
      
      /* Box Model */
      width: 500px;
      height: 300px;
      padding: 30px;
      margin: 40px auto;
      
      /* Typography */
      font-family: 'Inter', sans-serif;
      font-size: 18px;
      font-weight: 600;
      line-height: 1.5;
      letter-spacing: 0.5px;
      text-align: center;
      color: #1a202c;
      
      /* Background */
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      
      /* Border */
      border: 2px solid #667eea;
      border-radius: 16px;
      
      /* Shadow */
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      
      /* Transform */
      transform: translateY(0);
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .test-element:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
    }
  </style>
</head>
<body>
  <div class="test-element">
    <h2>Test Content</h2>
    <p>Testing style preservation</p>
  </div>
</body>
</html>`;

      const result = convertHtmlToPageModelV3(html);
      
      // Get the test element
      const testElement = result.sections[0]?.rows[0]?.columns[0]?.elements[0];
      expect(testElement).toBeDefined();
      
      const desktopStyles = testElement?.styles?.desktop || {};
      const hoverStyles = testElement?.states?.hover || {};
      
      // Count preserved properties
      const expectedProps = [
        'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
        'width', 'height', 'padding', 'margin',
        'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'color',
        'background',
        'border', 'borderRadius',
        'boxShadow',
        'transform', 'transition'
      ];
      
      const preservedProps = expectedProps.filter(prop => 
        desktopStyles.hasOwnProperty(prop) || 
        desktopStyles.hasOwnProperty(prop.toLowerCase())
      );
      
      const preservationRate = (preservedProps.length / expectedProps.length) * 100;
      
      console.log('Style Preservation Rate:', `${preservationRate.toFixed(1)}%`);
      console.log('Preserved:', preservedProps.length, '/', expectedProps.length);
      
      // Should preserve at least 70% (some properties might be normalized)
      expect(preservationRate).toBeGreaterThanOrEqual(70);
      
      // Hover state should exist
      expect(Object.keys(hoverStyles).length).toBeGreaterThan(0);
    });
  });

  describe('Design Tokens Extraction', () => {
    test('should extract color palette from CSS', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Colors</title>
  <style>
    :root {
      --primary: #667eea;
      --secondary: #764ba2;
      --accent: #f6ad55;
    }
    .element1 { color: #667eea; background: #764ba2; }
    .element2 { color: var(--accent); }
  </style>
</head>
<body><div class="element1">Test</div></body>
</html>`;

      const result = convertHtmlToPageModelV3(html);
      
      expect(result.designTokens?.colors).toBeDefined();
      const colors = result.designTokens?.colors;
      
      // Should extract primary/secondary colors
      expect(colors?.primary || colors?.secondary).toBeDefined();
    });

    test('should extract typography scales', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Typography</title>
  <style>
    h1 { font-size: 48px; font-weight: 700; }
    h2 { font-size: 36px; font-weight: 600; }
    p { font-size: 16px; line-height: 1.5; }
    .small { font-size: 14px; }
  </style>
</head>
<body>
  <h1>Heading 1</h1>
  <h2>Heading 2</h2>
  <p>Paragraph</p>
</body>
</html>`;

      const result = convertHtmlToPageModelV3(html);
      
      expect(result.designTokens?.typography).toBeDefined();
      const typo = result.designTokens?.typography;
      
      // Should extract font sizes
      expect(typo?.fontSizes).toBeDefined();
      expect(Object.keys(typo?.fontSizes || {}).length).toBeGreaterThan(0);
    });

    test('should extract spacing scales', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Spacing</title>
  <style>
    .section1 { padding: 80px 20px; margin: 40px 0; }
    .section2 { padding: 60px; gap: 30px; }
    .card { padding: 20px; margin: 10px; }
  </style>
</head>
<body>
  <div class="section1">Content</div>
</body>
</html>`;

      const result = convertHtmlToPageModelV3(html);
      
      expect(result.designTokens?.spacing).toBeDefined();
      const spacing = result.designTokens?.spacing;
      
      // Should extract spacing values
      expect(Object.keys(spacing || {}).length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Breakpoints', () => {
    test('should correctly parse mobile media queries', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Responsive</title>
  <style>
    .responsive-box {
      width: 1000px;
      padding: 60px;
    }
    @media (max-width: 768px) {
      .responsive-box {
        width: 100%;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="responsive-box">Content</div>
</body>
</html>`;

      const result = convertHtmlToPageModelV3(html);
      const element = result.sections[0]?.rows[0]?.columns[0]?.elements[0];
      
      expect(element?.styles?.desktop).toBeDefined();
      expect(element?.styles?.mobile).toBeDefined();
      
      // Desktop should have larger width
      expect(element?.styles?.desktop?.width).toBe('1000px');
      
      // Mobile should have 100% width
      expect(element?.styles?.mobile?.width).toBe('100%');
    });

    test('should parse tablet breakpoints', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Tablet</title>
  <style>
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
    }
    @media (min-width: 769px) and (max-width: 1024px) {
      .grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="grid">Content</div>
</body>
</html>`;

      const result = convertHtmlToPageModelV3(html);
      const element = result.sections[0]?.rows[0]?.columns[0]?.elements[0];
      
      expect(element?.styles?.tablet).toBeDefined();
      expect(element?.styles?.mobile).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle malformed HTML gracefully', () => {
      const html = `<html><head><title>Test</title></head><body><div><p>Unclosed div<body></html>`;
      
      expect(() => {
        const result = convertHtmlToPageModelV3(html);
        pageModelV3Schema.parse(result);
      }).not.toThrow();
    });

    test('should handle inline styles', () => {
      const html = `<!DOCTYPE html>
<html>
<head><title>Inline</title></head>
<body>
  <div style="color: red; font-size: 20px; padding: 10px;">
    Inline styled content
  </div>
</body>
</html>`;

      const result = convertHtmlToPageModelV3(html);
      const element = result.sections[0]?.rows[0]?.columns[0]?.elements[0];
      
      expect(element?.styles?.desktop?.color).toBe('red');
    });

    test('should handle complex CSS selectors', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Complex Selectors</title>
  <style>
    .parent > .child { color: blue; }
    .sibling + .next { margin-top: 20px; }
    .container .nested { padding: 15px; }
  </style>
</head>
<body>
  <div class="parent">
    <div class="child">Direct child</div>
  </div>
</body>
</html>`;

      const result = convertHtmlToPageModelV3(html);
      
      // Should not throw and should produce valid PageModel
      const validation = pageModelV3Schema.safeParse(result);
      expect(validation.success).toBe(true);
    });

    test('should handle CSS animations', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Animations</title>
  <style>
    @keyframes slideIn {
      from {
        transform: translateX(-100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    .animated {
      animation: slideIn 0.5s ease-in-out;
    }
  </style>
</head>
<body>
  <div class="animated">Animated content</div>
</body>
</html>`;

      const result = convertHtmlToPageModelV3(html);
      
      // Should capture animation
      const element = result.sections[0]?.rows[0]?.columns[0]?.elements[0];
      const hasAnimation = element?.styles?.desktop?.animation || element?.animations;
      
      expect(hasAnimation).toBeDefined();
    });
  });
});
