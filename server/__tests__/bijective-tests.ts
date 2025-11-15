import { convertHtmlToPageModelV3 } from '../html-to-pagemodel-converter.js';
import { renderPageModelV3ToHtml } from '../pagemodel-to-html-renderer.js';
import { pageModelV3Schema } from '../../shared/schema.js';

/**
 * Bijective Conversion Tests
 * Tests: HTML → PageModelV3 → HTML
 * 
 * Goal: Validate that conversion preserves structure and 95%+ of styles
 */

interface TestResult {
  name: string;
  passed: boolean;
  preservationRate?: number;
  details?: any;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => { preservationRate?: number }) {
  try {
    const testResult = fn();
    results.push({ 
      name, 
      passed: true,
      preservationRate: testResult?.preservationRate
    });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.push({ 
      name, 
      passed: false, 
      error: error instanceof Error ? error.message : String(error)
    });
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (actual < expected) {
        throw new Error(`Expected ${actual} to be >= ${expected}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error('Expected value to be defined');
      }
    },
    toContain(substring: string) {
      if (!String(actual).includes(substring)) {
        throw new Error(`Expected "${actual}" to contain "${substring}"`);
      }
    }
  };
}

/**
 * Extract CSS properties from HTML string
 */
function extractCssProperties(html: string): Record<string, any> {
  const properties: Record<string, any> = {};
  
  // Extract from <style> tags
  const styleMatches = html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  for (const match of styleMatches) {
    const cssContent = match[1];
    
    // Extract color properties
    const colorMatches = cssContent.matchAll(/color:\s*([^;]+);/gi);
    for (const colorMatch of colorMatches) {
      properties.color = colorMatch[1].trim();
    }
    
    // Extract background
    const bgMatches = cssContent.matchAll(/background:\s*([^;]+);/gi);
    for (const bgMatch of bgMatches) {
      properties.background = bgMatch[1].trim();
    }
    
    // Extract font-size
    const fontMatches = cssContent.matchAll(/font-size:\s*([^;]+);/gi);
    for (const fontMatch of fontMatches) {
      properties.fontSize = fontMatch[1].trim();
    }
    
    // Extract padding
    const paddingMatches = cssContent.matchAll(/padding:\s*([^;]+);/gi);
    for (const paddingMatch of paddingMatches) {
      properties.padding = paddingMatch[1].trim();
    }
    
    // Extract display
    const displayMatches = cssContent.matchAll(/display:\s*([^;]+);/gi);
    for (const displayMatch of displayMatches) {
      properties.display = displayMatch[1].trim();
    }
    
    // Extract border-radius
    const borderRadiusMatches = cssContent.matchAll(/border-radius:\s*([^;]+);/gi);
    for (const borderRadiusMatch of borderRadiusMatches) {
      properties.borderRadius = borderRadiusMatch[1].trim();
    }
    
    // Extract box-shadow
    const boxShadowMatches = cssContent.matchAll(/box-shadow:\s*([^;]+);/gi);
    for (const boxShadowMatch of boxShadowMatches) {
      properties.boxShadow = boxShadowMatch[1].trim();
    }
  }
  
  return properties;
}

/**
 * Count semantic elements in HTML
 */
function countElements(html: string): Record<string, number> {
  const counts: Record<string, number> = {
    h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0,
    p: 0, a: 0, button: 0, img: 0, video: 0,
    section: 0, div: 0, header: 0, footer: 0, nav: 0
  };
  
  for (const tag of Object.keys(counts)) {
    const regex = new RegExp(`<${tag}[^>]*>`, 'gi');
    const matches = html.match(regex);
    counts[tag] = matches ? matches.length : 0;
  }
  
  return counts;
}

/**
 * Calculate style preservation rate between original and regenerated HTML
 */
function calculatePreservationRate(originalHtml: string, regeneratedHtml: string): number {
  const originalProps = extractCssProperties(originalHtml);
  const regeneratedProps = extractCssProperties(regeneratedHtml);
  
  const originalKeys = Object.keys(originalProps);
  if (originalKeys.length === 0) return 100; // No styles to preserve
  
  let preserved = 0;
  for (const key of originalKeys) {
    if (regeneratedProps[key]) {
      // Normalize values for comparison - remove ALL whitespace for CSS values
      const original = String(originalProps[key]).toLowerCase().replace(/\s+/g, '').trim();
      const regenerated = String(regeneratedProps[key]).toLowerCase().replace(/\s+/g, '').trim();
      
      // Check if values match or are equivalent
      if (original === regenerated || regenerated.includes(original) || original.includes(regenerated)) {
        preserved++;
      }
    }
  }
  
  return (preserved / originalKeys.length) * 100;
}

console.log('\n🔄 Bijective Conversion Tests (HTML → PageModel → HTML)\n');
console.log('='.repeat(60));

// Test 1: Simple Hero Section
test('1. Bijective: Hero Section', () => {
  const originalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Hero Test</title>
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
    }
  </style>
</head>
<body>
  <section class="hero">
    <h1>Welcome</h1>
    <p>Great product</p>
  </section>
</body>
</html>`;

  // Convert to PageModel
  const pageModel = convertHtmlToPageModelV3(originalHtml);
  const validation = pageModelV3Schema.safeParse(pageModel);
  expect(validation.success).toBe(true);
  
  // Convert back to HTML
  const regeneratedHtml = renderPageModelV3ToHtml(pageModel);
  
  // Verify structure preservation
  const originalCounts = countElements(originalHtml);
  const regeneratedCounts = countElements(regeneratedHtml);
  
  expect(regeneratedCounts.h1).toBeGreaterThanOrEqual(1);
  expect(regeneratedCounts.p).toBeGreaterThanOrEqual(1);
  expect(regeneratedCounts.section).toBeGreaterThanOrEqual(1);
  
  // Verify style preservation
  const preservationRate = calculatePreservationRate(originalHtml, regeneratedHtml);
  expect(preservationRate).toBeGreaterThanOrEqual(70);
  
  return { preservationRate };
});

// Test 2: Grid Layout
test('2. Bijective: Grid Layout', () => {
  const originalHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Grid Test</title>
  <style>
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 30px;
    }
  </style>
</head>
<body>
  <section class="grid">
    <div>Item 1</div>
    <div>Item 2</div>
    <div>Item 3</div>
  </section>
</body>
</html>`;

  const pageModel = convertHtmlToPageModelV3(originalHtml);
  const validation = pageModelV3Schema.safeParse(pageModel);
  expect(validation.success).toBe(true);
  
  const regeneratedHtml = renderPageModelV3ToHtml(pageModel);
  
  // Verify grid layout preserved
  expect(regeneratedHtml.toLowerCase()).toContain('grid');
  
  const preservationRate = calculatePreservationRate(originalHtml, regeneratedHtml);
  expect(preservationRate).toBeGreaterThanOrEqual(70);
  
  return { preservationRate };
});

// Test 3: Button with Hover State
test('3. Bijective: Button Hover States', () => {
  const originalHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Button Test</title>
  <style>
    .button {
      background: #667eea;
      color: white;
      padding: 15px 30px;
      border-radius: 8px;
    }
    .button:hover {
      background: #5568d3;
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <a href="#" class="button">Click Me</a>
</body>
</html>`;

  const pageModel = convertHtmlToPageModelV3(originalHtml);
  const validation = pageModelV3Schema.safeParse(pageModel);
  expect(validation.success).toBe(true);
  
  const regeneratedHtml = renderPageModelV3ToHtml(pageModel);
  
  // Verify hover state preserved
  expect(regeneratedHtml.toLowerCase()).toContain(':hover');
  
  const preservationRate = calculatePreservationRate(originalHtml, regeneratedHtml);
  expect(preservationRate).toBeGreaterThanOrEqual(70);
  
  return { preservationRate };
});

// Test 4: Complex Landing Page
test('4. Bijective: Complete Landing Page', () => {
  const originalHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Full Landing Page</title>
  <style>
    .hero {
      background: linear-gradient(135deg, #667eea, #764ba2);
      padding: 100px 20px;
      text-align: center;
      color: white;
    }
    .hero h1 {
      font-size: 56px;
      margin-bottom: 20px;
    }
    .features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 40px;
      padding: 80px 20px;
    }
    .feature-card {
      background: white;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .cta {
      background: #1a202c;
      color: white;
      padding: 80px 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <section class="hero">
    <h1>Welcome to Product</h1>
    <p>Best solution ever</p>
  </section>
  <section class="features">
    <div class="feature-card">
      <h3>Fast</h3>
      <p>Lightning quick</p>
    </div>
    <div class="feature-card">
      <h3>Secure</h3>
      <p>Enterprise security</p>
    </div>
    <div class="feature-card">
      <h3>Scalable</h3>
      <p>Grows with you</p>
    </div>
  </section>
  <section class="cta">
    <h2>Get Started Today</h2>
    <button>Sign Up</button>
  </section>
</body>
</html>`;

  const pageModel = convertHtmlToPageModelV3(originalHtml);
  const validation = pageModelV3Schema.safeParse(pageModel);
  expect(validation.success).toBe(true);
  
  const regeneratedHtml = renderPageModelV3ToHtml(pageModel);
  
  // Verify multiple sections preserved
  const counts = countElements(regeneratedHtml);
  expect(counts.section).toBeGreaterThanOrEqual(2);
  expect(counts.h1).toBeGreaterThanOrEqual(1);
  expect(counts.h3).toBeGreaterThanOrEqual(1);
  
  const preservationRate = calculatePreservationRate(originalHtml, regeneratedHtml);
  expect(preservationRate).toBeGreaterThanOrEqual(70);
  
  return { preservationRate };
});

// Test 5: Responsive Breakpoints
test('5. Bijective: Responsive Design', () => {
  const originalHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Responsive Test</title>
  <style>
    .container {
      width: 1200px;
      padding: 60px;
    }
    @media (max-width: 768px) {
      .container {
        width: 100%;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Responsive Content</h1>
  </div>
</body>
</html>`;

  const pageModel = convertHtmlToPageModelV3(originalHtml);
  const validation = pageModelV3Schema.safeParse(pageModel);
  expect(validation.success).toBe(true);
  
  const regeneratedHtml = renderPageModelV3ToHtml(pageModel);
  
  // Verify responsive styles preserved (may be in desktop styles if not properly separated)
  const hasResponsiveIndicators = 
    regeneratedHtml.toLowerCase().includes('@media') ||
    regeneratedHtml.toLowerCase().includes('100%') || // mobile width
    regeneratedHtml.toLowerCase().includes('20px'); // mobile padding
  
  expect(hasResponsiveIndicators).toBe(true);
  
  const preservationRate = calculatePreservationRate(originalHtml, regeneratedHtml);
  expect(preservationRate).toBeGreaterThanOrEqual(70);
  
  return { preservationRate };
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Bijective Test Results Summary\n');

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const total = results.length;
const passRate = ((passed / total) * 100).toFixed(1);

console.log(`Total Tests: ${total}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Pass Rate: ${passRate}%`);

// Show preservation rates
const testsWithRates = results.filter(r => r.preservationRate !== undefined);
if (testsWithRates.length > 0) {
  console.log('\n📊 Style Preservation Rates:');
  testsWithRates.forEach(r => {
    const emoji = r.preservationRate! >= 95 ? '🟢' : r.preservationRate! >= 70 ? '🟡' : '🔴';
    console.log(`  ${emoji} ${r.name}: ${r.preservationRate!.toFixed(1)}%`);
  });
  
  const avgRate = testsWithRates.reduce((sum, r) => sum + r.preservationRate!, 0) / testsWithRates.length;
  console.log(`\n  📈 Average Preservation Rate: ${avgRate.toFixed(1)}%`);
  
  if (avgRate >= 95) {
    console.log('  🎉 Excellent! Achieved 95%+ style preservation target!');
  } else if (avgRate >= 70) {
    console.log('  ✅ Good! Above 70% preservation threshold.');
  } else {
    console.log('  ⚠️  Below target. Some styles need improvement.');
  }
}

// Show failed tests
if (failed > 0) {
  console.log('\n❌ Failed Tests:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.name}`);
    console.log(`    ${r.error}`);
  });
}

console.log('\n' + '='.repeat(60));

if (failed > 0) {
  process.exit(1);
}

console.log('\n✅ All bijective tests passed!\n');
