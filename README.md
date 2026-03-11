# Boardo
# Todo + Kanban with Daily Morning Email

A responsive todo and Kanban app with multiple projects, task priorities and due dates, a “today’s top priorities” dashboard, and a daily morning email digest.

**→ [Visualization, how to start, and next steps](VISUALIZATION_AND_NEXT_STEPS.md)**

## Features

- **Projects**: Create and edit projects (A, B, C, General, or any number). Reorder and archive.
- **Tasks**: Title, priority (High / Medium / Low), due date. Lives in a project and a Kanban column (To Do → In Progress → Done).
- **Dashboard**: View all projects by priority or filter by one project. Today’s priorities sorted by priority then due date.
- **Kanban**: Per-project boards with drag-and-drop between columns.
- **Daily email**: Vercel Cron calls `/api/cron/daily-digest` every day (default 7:00 AM UTC) and sends a digest to `DIGEST_EMAIL` via Resend.

## Local development

1. **Install and DB**

   ```bash
   npm install
   cp .env.example .env
   # Edit .env: DATABASE_URL="file:./dev.db" (default)
   npx prisma db push
   npm run db:seed
   ```

2. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). You’re redirected to the dashboard.

## Deploy on Vercel

1. **Database**: Create a [Vercel Postgres](https://vercel.com/storage/postgres) or [Turso](https://turso.tech/) database. For Postgres, switch `prisma/schema.prisma` to `provider = "postgresql"` and run migrations (`npx prisma migrate deploy`) in the build step or after first deploy.

2. **Env vars** (Vercel project → Settings → Environment Variables):

   - `DATABASE_URL` — Postgres or Turso connection string
   - `RESEND_API_KEY` — From [Resend](https://resend.com)
   - `RESEND_FROM` — Verified sender (e.g. `noreply@yourdomain.com`)
   - `DIGEST_EMAIL` — Recipient for the daily digest
   - `CRON_SECRET` — Secret for securing the cron endpoint (e.g. a random string)
   - `NEXT_PUBLIC_APP_URL` — Your app URL (e.g. `https://your-app.vercel.app`)

3. **Cron**: In `vercel.json` the cron is set to `0 7 * * *` (7:00 AM UTC). Vercel Cron will call the API with the correct auth when `CRON_SECRET` is set.

4. **Build**: Use `npm run build`. Ensure `prisma generate` runs (it’s in `postinstall` and in the build script).

## Troubleshooting 500 on Vercel

The 500 on `/api/projects` and `/api/tasks` is **not CORS** (same-origin requests). It’s almost always the **database**:

1. **`DATABASE_URL` missing or wrong**  
   In Vercel → Settings → Environment Variables, set `DATABASE_URL` for **Production** (and Preview if you use it). Use the full Postgres connection string from Vercel Postgres or your provider. Redeploy after changing env vars.

2. **Tables don’t exist**  
   The production database must have the Prisma schema applied. Either:
   - Run **once** (from your machine or Vercel’s deploy hook) with production `DATABASE_URL`:  
     `npx prisma db push`  
     or  
     `npx prisma migrate deploy`  
     (use `migrate deploy` only if you use migrations; otherwise `db push` is enough.)
   - Or add a **build script** that runs `prisma db push` or `prisma migrate deploy` before `next build` (e.g. in `package.json`: `"build": "prisma generate && prisma db push && next build"`). Then redeploy.

3. **See the real error**  
   After deploying the latest code, open DevTools → Network, trigger the failing request (e.g. load dashboard or create a project). Click the request and check the **Response** tab: the API now returns `{ error: "...", details: "..." }`. The `details` field is the actual error (e.g. “Can’t reach database server”, “Table 'Project' does not exist”). You can also check **Vercel → Logs → Function logs** for the same message.

## Scripts

- `npm run dev` — Start dev server
- `npm run build` — Generate Prisma client and build Next.js
- `npm run start` — Start production server
- `npm run db:push` — Push schema to DB (no migrations)
- `npm run db:seed` — Seed projects A, B, C, General and sample tasks

## Tech

- Next.js 14 (App Router), Tailwind CSS, Prisma, SQLite (dev) / Postgres or Turso (prod), Resend, Vercel Cron, @dnd-kit for Kanban drag-and-drop.
