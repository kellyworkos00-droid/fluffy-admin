// Sets up the Supabase project: schema, auth rules, public keys and the admin login.
// Run with: node scripts/setup-supabase.mjs
// Add --reset-password to issue a new admin password. Safe to run more than once.
import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const ADMIN_EMAIL = 'admin@fluffyafrica.co.ke';
const REF = 'booiweytvsvrezfxsecp';
const reset = process.argv.includes('--reset-password');

const envText = () => (existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '');
const env = (name) => envText().split(/\r?\n/).find((l) => l.startsWith(name + '='))?.slice(name.length + 1).trim();
const token = env('SUPABASE_ACCESS_TOKEN');
if (!token) throw new Error('SUPABASE_ACCESS_TOKEN is missing from .env.local');

const api = async (path, options = {}) => {
  const response = await fetch(`https://api.supabase.com/v1/projects/${REF}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${path} ${response.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
};
const sql = (query) => api('/database/query', { method: 'POST', body: JSON.stringify({ query }) });

await sql(readFileSync('supabase/schema.sql', 'utf8'));
console.log('schema applied');

await api('/config/auth', {
  method: 'PATCH',
  body: JSON.stringify({ disable_signup: true, mailer_autoconfirm: true, mailer_secure_email_change_enabled: false }),
});
console.log('public sign-ups off');

const keys = await api('/api-keys?reveal=true');
const pick = (...names) => keys.find((k) => names.includes(k.name) && k.api_key)?.api_key;
const anon = pick('anon', 'publishable', 'default');
const service = pick('service_role', 'secret');
if (!anon || !service) throw new Error('Could not read the project keys');

const url = `https://${REF}.supabase.co`;
for (const [name, value] of [['NEXT_PUBLIC_SUPABASE_URL', url], ['NEXT_PUBLIC_SUPABASE_ANON_KEY', anon]]) {
  if (!env(name)) appendFileSync('.env.local', `${name}=${value}\n`);
}
console.log('public keys saved');

const auth = (path, options = {}) =>
  fetch(`${url}/auth/v1/admin${path}`, { ...options, headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' } });

const existing = await sql('select u.id from auth.users u join public.admin_users a on a.user_id = u.id limit 1');
const makePassword = () => randomBytes(14).toString('base64url');

if (!existing.length) {
  const password = makePassword();
  const created = await auth('/users', { method: 'POST', body: JSON.stringify({ email: ADMIN_EMAIL, password, email_confirm: true }) });
  const user = await created.json();
  if (!created.ok) throw new Error(`Could not create admin: ${JSON.stringify(user).slice(0, 200)}`);
  await sql(`insert into public.admin_users (user_id) values ('${user.id}') on conflict do nothing`);
  writeFileSync('ADMIN-LOGIN.txt', `Fluffy Africa admin\nLogin page: /admin\nEmail: ${ADMIN_EMAIL}\nPassword: ${password}\n`);
  console.log('admin created, login saved to ADMIN-LOGIN.txt');
} else if (reset) {
  const password = makePassword();
  const updated = await auth(`/users/${existing[0].id}`, { method: 'PUT', body: JSON.stringify({ password }) });
  if (!updated.ok) throw new Error('Could not reset the password');
  const [{ email }] = await sql(`select email from auth.users where id = '${existing[0].id}'`);
  writeFileSync('ADMIN-LOGIN.txt', `Fluffy Africa admin\nLogin page: /admin\nEmail: ${email}\nPassword: ${password}\n`);
  console.log('password reset, login saved to ADMIN-LOGIN.txt');
} else {
  console.log('admin already exists');
}
