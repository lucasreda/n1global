import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const { rows } = await pool.query(
    "SELECT html_content FROM affiliate_landing_pages WHERE id = 'a6f32f94-8a56-4f4b-ac0a-44256e8c1491'"
  );
  
  const html = rows[0]?.html_content || '';
  
  // Extract hero-features and cta-group CSS
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (styleMatch) {
    const css = styleMatch[1];
    
    // Find hero-features rules
    console.log('=== .hero-features CSS ===');
    const heroMatch = css.match(/\.hero-features\s*\{[^}]*\}/g);
    if (heroMatch) heroMatch.forEach(r => console.log(r));
    
    // Find media queries with hero-features
    console.log('\n=== Media Queries with .hero-features ===');
    const mediaRegex = /@media[^{]*\{[^@]*\.hero-features[^}]*\}[^}]*\}/g;
    const mediaMatches = css.match(mediaRegex);
    if (mediaMatches) mediaMatches.forEach(m => console.log(m));
    
    // Find cta-group rules
    console.log('\n=== .cta-group CSS ===');
    const ctaMatch = css.match(/\.cta-group\s*\{[^}]*\}/g);
    if (ctaMatch) ctaMatch.forEach(r => console.log(r));
    
    // Find media queries with cta-group
    console.log('\n=== Media Queries with .cta-group ===');
    const ctaMediaRegex = /@media[^{]*\{[^@]*\.cta-group[^}]*\}[^}]*\}/g;
    const ctaMediaMatches = css.match(ctaMediaRegex);
    if (ctaMediaMatches) ctaMediaMatches.forEach(m => console.log(m));
  }
  
  await pool.end();
}

check().catch(console.error);
