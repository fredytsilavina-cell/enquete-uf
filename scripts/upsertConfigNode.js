const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8');
  raw.split(/\r?\n/).forEach(line => {
    const m = line.match(/^(\w+)=(.*)$/);
    if (m) {
      const k = m[1];
      let v = m[2] || '';
      // Remove surrounding quotes
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[k] = process.env[k] || v;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE env vars. Check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function upsert() {
  const url1 = 'https://ee.kobotoolbox.org/x/zHy4iTMt';
  const url2 = 'https://ee.kobotoolbox.org/x/FO24PkpW';

  try {
    const { data, error } = await supabase
      .from('config')
      .upsert([{ id: 1, url1, url2 }], { onConflict: 'id' });

    if (error) {
      console.error('Upsert error:', error);
      process.exit(1);
    }

    console.log('Upsert success:', data);
  } catch (e) {
    console.error('Exception upserting config:', e);
    process.exit(1);
  }
}

upsert();
