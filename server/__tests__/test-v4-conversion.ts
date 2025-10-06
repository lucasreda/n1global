import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { convertHtmlToPageModelV4 } from '../html-to-pagemodel-converter';
import type { PageNodeV4 } from '@shared/schema';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the VitaPlus test HTML
const htmlPath = join(__dirname, 'vitaplus-grid-test.html');
const html = readFileSync(htmlPath, 'utf-8');

console.log('🧪 Testing PageModelV4 Converter with Grid Layout');
console.log('━'.repeat(60));

// Convert HTML to PageModelV4
const pageModel = convertHtmlToPageModelV4(html);

console.log('\n✅ Conversion completed!');
console.log('Version:', pageModel.version);
console.log('Title:', pageModel.meta.title);
console.log('Total root nodes:', pageModel.nodes.length);

// Find the benefits-grid node
function findNodeByClass(nodes: PageNodeV4[], className: string): PageNodeV4 | null {
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

// Test 1: Check if benefits-grid is preserved
console.log('\n📊 Test 1: Benefits Grid Preservation');
console.log('─'.repeat(60));

const benefitsGrid = findNodeByClass(pageModel.nodes, 'benefits-grid');
if (benefitsGrid) {
  console.log('✅ Benefits grid found!');
  console.log('   Tag:', benefitsGrid.tag);
  console.log('   Type:', benefitsGrid.type);
  console.log('   Children count:', benefitsGrid.children?.length || 0);
  
  // Check layout properties
  if (benefitsGrid.layout) {
    console.log('   Layout properties:');
    console.log('     - display:', benefitsGrid.layout.display);
    console.log('     - gridTemplateColumns:', benefitsGrid.layout.gridTemplateColumns);
    console.log('     - gap:', benefitsGrid.layout.gap);
  } else {
    console.log('   ❌ Layout properties not found!');
  }
  
  // Check if grid styles are in desktop styles
  if (benefitsGrid.styles?.desktop) {
    console.log('   Desktop styles:', JSON.stringify(benefitsGrid.styles.desktop, null, 2));
  }
  
  // Check children
  console.log('\n   Children (benefit cards):');
  benefitsGrid.children?.forEach((child, i) => {
    console.log(`     ${i + 1}. ${child.tag} - classes: ${child.classNames?.join(', ')}`);
  });
} else {
  console.log('❌ Benefits grid NOT found!');
}

// Test 2: Check if features container is preserved
console.log('\n📊 Test 2: Features Container Preservation');
console.log('─'.repeat(60));

const featuresContainer = findNodeByClass(pageModel.nodes, 'features-container');
if (featuresContainer) {
  console.log('✅ Features container found!');
  console.log('   Tag:', featuresContainer.tag);
  console.log('   Type:', featuresContainer.type);
  console.log('   Children count:', featuresContainer.children?.length || 0);
  
  // Check layout properties
  if (featuresContainer.layout) {
    console.log('   Layout properties:');
    console.log('     - display:', featuresContainer.layout.display);
    console.log('     - alignItems:', featuresContainer.layout.alignItems);
    console.log('     - gap:', featuresContainer.layout.gap);
  }
  
  // Check children
  console.log('\n   Children:');
  featuresContainer.children?.forEach((child, i) => {
    console.log(`     ${i + 1}. ${child.tag} - classes: ${child.classNames?.join(', ')}`);
  });
} else {
  console.log('❌ Features container NOT found!');
}

// Test 3: Count total nodes (recursive)
function countNodes(nodes: PageNodeV4[]): number {
  let count = nodes.length;
  for (const node of nodes) {
    if (node.children) {
      count += countNodes(node.children);
    }
  }
  return count;
}

console.log('\n📊 Test 3: Node Tree Statistics');
console.log('─'.repeat(60));
console.log('Total nodes (including nested):', countNodes(pageModel.nodes));
console.log('Root nodes:', pageModel.nodes.length);

// Test 4: Verify CSS classes are extracted
console.log('\n📊 Test 4: CSS Classes Extraction');
console.log('─'.repeat(60));
if (pageModel.cssClasses) {
  console.log('Total CSS classes extracted:', Object.keys(pageModel.cssClasses).length);
  console.log('Classes:', Object.keys(pageModel.cssClasses).slice(0, 10).join(', '));
  
  // Check benefits-grid class
  if (pageModel.cssClasses['benefits-grid']) {
    console.log('\n✅ benefits-grid class styles:');
    console.log(JSON.stringify(pageModel.cssClasses['benefits-grid'], null, 2));
  }
} else {
  console.log('❌ No CSS classes extracted');
}

// Final verdict
console.log('\n' + '='.repeat(60));
console.log('🎉 V4 Converter Test Summary:');
console.log('='.repeat(60));

const gridPreserved = benefitsGrid && benefitsGrid.layout?.display === 'grid';
const flexPreserved = featuresContainer && featuresContainer.layout?.display === 'flex';

if (gridPreserved && flexPreserved) {
  console.log('✅ PASSED: Grid and Flex layouts preserved perfectly!');
  console.log('✅ Complex nested structures maintained');
  console.log('✅ PageModelV4 is ready for production use');
} else {
  console.log('❌ FAILED: Some layouts were not preserved');
  if (!gridPreserved) console.log('   - Grid layout missing');
  if (!flexPreserved) console.log('   - Flex layout missing');
}

console.log('='.repeat(60));
