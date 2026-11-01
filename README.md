# Fluffy Africa Admin

The panel for the Fluffy Africa website: items, photos, wording, contact details and the logo. The public site is a separate repository, `fluffy`, and both use the same Supabase project.

## Running it

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=https://the-public-website
REVALIDATE_SECRET=the-same-value-as-on-the-public-site
```

Then `npm run dev`.

## Deploying

Add those four variables to this Vercel project. `REVALIDATE_SECRET` must match the public site, because that is how a save reaches the website at once. Without it, the website catches up within five minutes.

## Login

- The first login is in `ADMIN-LOGIN.txt`, which is never committed.
- Public sign-ups are off, so accounts cannot be created from the login page.
- Forgot the password? Run `node scripts/setup-supabase.mjs --reset-password`. The project has no mail provider, so there is no reset email. This needs `SUPABASE_ACCESS_TOKEN` in `.env.local`.

## Database

`supabase/schema.sql` holds the tables and access rules. `node scripts/setup-supabase.mjs` applies it and is safe to run again.
