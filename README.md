# Binary Club Recruitment

Production-ready Next.js/Supabase recruitment workspace. Run `supabase/schema.sql` in a new Supabase project, create an initial auth user and matching `profiles` row with role `ADMIN`, enable the supplied environment values in Vercel, then deploy.

The application uses PostgreSQL as the sole source of truth. Realtime candidate updates, RLS, numeric score constraints, server-side rank calculation, optimistic-lock evaluation versions, and import deduplication are included. Google Sheets credentials are intentionally server-only; connect a scheduled server-side worker to process `sync_logs` pending rows using your approved Sheets client.
