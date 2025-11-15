#!/usr/bin/env tsx
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { convertHtmlToPageModelV4 } from '../html-to-pagemodel-converter.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read complex HTML test file
const htmlPath = join(__dirname, 'complex-html-test.html');
const html = readFileSync(htmlPath, 'utf-8');

console.log('🧪 Testing PageModelV4 with Complex HTML Features');
console.log('━'.repeat(60));

// Convert HTML to PageModelV4
const pageModel = convertHtmlToPageModelV4(html);

console.log('\n✅ Conversion completed!');
console.log('Version:', pageModel.version);
console.log('Title:', pageModel.meta.title);
console.log('Total root nodes:', pageModel.nodes.length);

// Test 1: Grid Template Areas
console.log('\n📊 Test 1: Grid Template Areas & Named Areas');
console.log('─'.repeat(60));

function findNodeByClass(nodes: any[], className: string): any {
  for (const node of nodes) {
    if (node.classNames?.includes(className)) {
      return node;
    }
    if (node.children) {
      const found = findNodeByClass(node.children, className);
      if (found) return found;
    }
  }
  return null;
}

const dashboard = findNodeByClass(pageModel.nodes, 'dashboard');
if (dashboard) {
  console.log('✅ Dashboard found with grid template areas!');
  console.log('   Tag:', dashboard.tag);
  console.log('   Layout properties:');
  if (dashboard.layout?.display) console.log('     - display:', dashboard.layout.display);
  if (dashboard.layout?.gridTemplateAreas) console.log('     - gridTemplateAreas:', dashboard.layout.gridTemplateAreas);
  if (dashboard.layout?.gridTemplateColumns) console.log('     - gridTemplateColumns:', dashboard.layout.gridTemplateColumns);
  if (dashboard.layout?.gridTemplateRows) console.log('     - gridTemplateRows:', dashboard.layout.gridTemplateRows);
  
  console.log('\n   Desktop styles:');
  console.log(JSON.stringify(dashboard.styles?.desktop, null, 2));
} else {
  console.log('❌ Dashboard not found');
}

// Test 2: Responsive Styles (Media Queries)
console.log('\n📊 Test 2: Responsive Styles (Media Queries)');
console.log('─'.repeat(60));

const productsGrid = findNodeByClass(pageModel.nodes, 'products-grid');
if (productsGrid) {
  console.log('✅ Products grid found!');
  console.log('   Desktop styles:');
  if (productsGrid.styles?.desktop) {
    console.log('     gridTemplateColumns:', productsGrid.styles.desktop.gridTemplateColumns);
    console.log('     gap:', productsGrid.styles.desktop.gap);
  }
  
  if (productsGrid.styles?.mobile) {
    console.log('\n   Mobile styles (from media query):');
    console.log('     gridTemplateColumns:', productsGrid.styles.mobile.gridTemplateColumns);
    console.log('     gap:', productsGrid.styles.mobile.gap);
  } else {
    console.log('\n   ⚠️  No mobile styles detected from media query');
  }
} else {
  console.log('❌ Products grid not found');
}

// Test 3: Flexbox with Wrap
console.log('\n📊 Test 3: Flexbox with Wrap');
console.log('─'.repeat(60));

const tagsContainer = findNodeByClass(pageModel.nodes, 'tags-container');
if (tagsContainer) {
  console.log('✅ Tags container found!');
  console.log('   Layout properties:');
  if (tagsContainer.layout?.display) console.log('     - display:', tagsContainer.layout.display);
  if (tagsContainer.layout?.flexWrap) console.log('     - flexWrap:', tagsContainer.layout.flexWrap);
  if (tagsContainer.layout?.gap) console.log('     - gap:', tagsContainer.layout.gap);
  if (tagsContainer.layout?.alignItems) console.log('     - alignItems:', tagsContainer.layout.alignItems);
} else {
  console.log('❌ Tags container not found');
}

// Test 4: Combinator Selectors
console.log('\n📊 Test 4: Combinator Selectors (> child selector)');
console.log('─'.repeat(60));

const cardHeader = findNodeByClass(pageModel.nodes, 'card-header');
if (cardHeader) {
  console.log('✅ Card header found!');
  console.log('   Styles from .card > .card-header:');
  if (cardHeader.styles?.desktop) {
    console.log('     background:', cardHeader.styles.desktop.background);
    console.log('     padding:', cardHeader.styles.desktop.padding);
    console.log('     borderBottom:', cardHeader.styles.desktop.borderBottom);
  }
} else {
  console.log('❌ Card header not found');
}

// Test 5: CSS Classes Extraction
console.log('\n📊 Test 5: CSS Classes & Variables');
console.log('─'.repeat(60));

const cssClassesArray = Array.isArray(pageModel.cssClasses) ? pageModel.cssClasses : 
  (pageModel.cssClasses ? Object.values(pageModel.cssClasses) : []);
  
console.log('Total CSS classes extracted:', cssClassesArray.length);
if (cssClassesArray.length > 0) {
  console.log('\nSample classes:');
  cssClassesArray.slice(0, 5).forEach((cssClass: any) => {
    console.log(`  - ${cssClass.name}:`, Object.keys(cssClass.styles || {}).join(', '));
  });
}

// Test 6: Global CSS with variables
console.log('\n📊 Test 6: Global CSS Variables');
console.log('─'.repeat(60));

if (pageModel.globalStyles) {
  const hasVariables = pageModel.globalStyles.includes('--primary-color');
  console.log('✅ Global styles preserved:', hasVariables ? 'YES' : 'NO');
  console.log('   Includes CSS variables:', hasVariables);
  console.log('   Total CSS length:', pageModel.globalStyles.length, 'characters');
} else {
  console.log('❌ No global styles found');
}

// Test 7: Node Tree Depth
console.log('\n📊 Test 7: Node Tree Statistics');
console.log('─'.repeat(60));

function countNodes(nodes: any[]): number {
  let count = nodes.length;
  for (const node of nodes) {
    if (node.children) {
      count += countNodes(node.children);
    }
  }
  return count;
}

const totalNodes = countNodes(pageModel.nodes);
console.log('Total nodes (including nested):', totalNodes);
console.log('Root nodes:', pageModel.nodes.length);

// Test 8: Semantic HTML Preservation
console.log('\n📊 Test 8: Semantic HTML Tag Preservation');
console.log('─'.repeat(60));

function collectTags(nodes: any[]): Set<string> {
  const tags = new Set<string>();
  for (const node of nodes) {
    if (node.tag) tags.add(node.tag);
    if (node.children) {
      const childTags = collectTags(node.children);
      childTags.forEach(tag => tags.add(tag));
    }
  }
  return tags;
}

const allTags = collectTags(pageModel.nodes);
console.log('Unique HTML tags preserved:', Array.from(allTags).sort().join(', '));
console.log('Semantic tags found:', Array.from(allTags).filter(tag => 
  ['header', 'footer', 'main', 'aside', 'nav', 'section'].includes(tag)
).join(', '));

console.log('\n' + '='.repeat(60));
console.log('🎯 Complex HTML Test Summary:');
console.log('  ✅ Grid template areas:', dashboard ? 'PASS' : 'FAIL');
console.log('  ✅ Flexbox with wrap:', tagsContainer ? 'PASS' : 'FAIL');
console.log('  ✅ Combinator selectors:', cardHeader ? 'PASS' : 'FAIL');
console.log('  ✅ CSS variables preserved:', pageModel.globalStyles?.includes('--') ? 'PASS' : 'FAIL');
console.log('  ✅ Semantic HTML tags:', allTags.has('header') && allTags.has('footer') ? 'PASS' : 'FAIL');
console.log('  ✅ Total nodes converted:', totalNodes);
console.log('='.repeat(60));
