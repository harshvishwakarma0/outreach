# Vercel Full-Stack Deploy (Frontend + Backend + Supabase)

This project runs frontend and backend together on Vercel using `/api/*` serverless functions.

## 1. Create Supabase Project

1. Go to https://supabase.com and create an account.
2. Click New Project.
3. Set a project name and database password.
4. Choose a region close to your users.
5. Wait until the project is ready.

## 2. Create Database Tables

1. Open your Supabase project.
2. Go to SQL Editor.
3. Run the SQL from `supabase_schema.sql` in this repo.
4. Confirm tables exist: `app_users` and `user_data`.

## 3. Get Supabase Credentials

1. Open Project Settings -> API.
2. Copy:
- Project URL -> `SUPABASE_URL`
- service_role key -> `SUPABASE_SERVICE_ROLE_KEY`

Keep the service role key secret. Never expose it in frontend code.

## 4. Push Code to GitHub

1. Commit your project.
2. Push to a GitHub repository.

## 5. Deploy on Vercel

1. Go to https://vercel.com and import the GitHub repo.
2. Framework preset: Vite.
3. Keep build settings default.
4. Add these environment variables in Vercel Project Settings -> Environment Variables:

- `SUPABASE_URL` = your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service role key
- `JWT_SECRET` = long random string (at least 32 chars)
- `FRONTEND_ORIGIN` = your Vercel URL, example `https://your-app.vercel.app`
- `VITE_API_BASE_URL` = optional, leave empty for same-domain `/api` calls

If you deploy using automation tools (for example Orchids AI), keep `vercel.json` without a custom runtime string. This repo is already configured that way to avoid runtime version parsing errors.

You can copy values from `.env.example` into Vercel Environment Variables.

## 6. Verify After Deploy

1. Open `https://your-app.vercel.app/api/health` and confirm `{ "ok": true }`.
2. Open app URL.
3. Sign up.
4. Import contacts.
5. Refresh page and confirm data persists.

## 7. Backup Basics

1. In Supabase, go to Project Settings -> Backups and enable backups if your plan supports it.
2. Export regularly from table editor or use `pg_dump` for scheduled backups.
3. Store backup files in cloud storage.
