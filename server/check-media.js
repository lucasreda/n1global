import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const { rows } = await pool.query(
    "SELECT html_content FROM affiliate_landing_pages WHERE id = 'a6f32f94-8a56-4f4b-ac0a-44256e8c1491'"
  );
  
  const html = rows[0]?.html_content || '';
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (styleMatch) {
    const css = styleMatch[1];
    const lines = css.split('\n');
    
    // Show lines 670-685 (around line 676)
    console.log('=== Lines 670-685 (around line 676) ===');
    for (let i = 669; i < 685 && i < lines.length; i++) {
      console.log(`${i+1}: ${lines[i]}`);
    }
  }
  
  await pool.end();
}

check().catch(console.error);
