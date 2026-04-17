# Backend Setup

This app now uses Vercel serverless functions with Supabase (no MongoDB required).

For full deployment steps, use `VERCEL_DEPLOY_SUPABASE.md`.

Quick local setup:

1. Create a Supabase project.
2. Run `supabase_schema.sql` in Supabase SQL Editor.
3. Create `.env.local` in project root with:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_ORIGIN=http://localhost:5173
VITE_API_BASE_URL=
```

4. Start dev server:

```
npm run dev
```

Available API routes:

```
POST /api/auth/signup
POST /api/auth/login
GET  /api/me
GET  /api/data
PUT  /api/data
GET  /api/health
```