import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const { rows } = await pool.query(
    "SELECT html_content FROM affiliate_landing_pages WHERE id = 'a6f32f94-8a56-4f4b-ac0a-44256e8c1491'"
  );
  
  const html = rows[0]?.html_content || '';
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (styleMatch) {
    const css = styleMatch[1];
    const lines = css.split('\n');
    
    // Show lines 660-690 to see the full media query
    console.log('=== Lines 660-690 (full @media context) ===');
    for (let i = 659; i < 690 && i < lines.length; i++) {
      console.log(`${i+1}: ${lines[i]}`);
    }
  }
  
  await pool.end();
}

check().catch(console.error);
