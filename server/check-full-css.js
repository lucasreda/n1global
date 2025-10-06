import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const { rows } = await pool.query(
    "SELECT html_content FROM affiliate_landing_pages WHERE id = 'a6f32f94-8a56-4f4b-ac0a-44256e8c1491'"
  );
  
  const html = rows[0]?.html_content || '';
  
  // Extract style content
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (styleMatch) {
    const css = styleMatch[1];
    
    // Count all .hero-features occurrences
    const count = (css.match(/\.hero-features/g) || []).length;
    console.log(`Total .hero-features occurrences: ${count}`);
    
    // Find all rules line by line around hero-features
    const lines = css.split('\n');
    let inMediaQuery = false;
    let mediaQueryStack = [];
    
    lines.forEach((line, i) => {
      if (line.includes('@media')) {
        inMediaQuery = true;
        mediaQueryStack.push(line.trim());
      }
      if (line.includes('.hero-features')) {
        const context = lines.slice(Math.max(0, i-2), i+5).join('\n');
        console.log(`\n=== Found at line ${i+1} ${inMediaQuery ? '(INSIDE @media: ' + mediaQueryStack[mediaQueryStack.length-1] + ')' : '(GLOBAL)'} ===`);
        console.log(context);
      }
      if (inMediaQuery && line.trim() === '}' && !line.includes('{')) {
        mediaQueryStack.pop();
        if (mediaQueryStack.length === 0) inMediaQuery = false;
      }
    });
  }
  
  await pool.end();
}

check().catch(console.error);
