const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
});

async function checkSchema(schema, table) {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?select=*`, {
    headers: {
      'apikey': env.SUPABASE_SECRET_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SECRET_KEY}`,
      'Accept-Profile': schema,
      'Content-Profile': schema
    }
  });
  console.log(`Schema [${schema}.${table}]: status = ${res.status}`);
  const t = await res.text();
  console.log('  Response:', t.slice(0, 150));
}

async function run() {
  await checkSchema('supabase_migrations', 'schema_migrations');
  await checkSchema('pg_catalog', 'pg_policies');
}

run();
