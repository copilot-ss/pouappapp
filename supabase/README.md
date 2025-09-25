# Supabase Setup

1. Install the Supabase CLI (https://supabase.com/docs/guides/cli). Optional but recommended for local testing.
2. Create a project in the Supabase dashboard and note `PROJECT_URL` and `ANON_KEY`.
3. Apply the schema in this folder – either run it in the SQL editor or via CLI:
   ```bash
   supabase db push --file supabase/schema.sql
   ```
4. Under Authentication ? Providers, enable Email/Password (and other providers as desired).
5. In Authentication ? Policies, ensure Row Level Security is enabled (the schema will create the needed policies).
6. Copy `.env.example` to `.env` (or `.env.local`) and fill in your project URL/key:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
7. Restart the Expo app so that the new environment variables are picked up.

Optional:
- Use `supabase start` to spin up a local instance.
- Configure additional storage buckets or functions as your features evolve.
