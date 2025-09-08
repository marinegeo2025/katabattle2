\# Kata Battle (Vercel + Supabase + Cloudflare Stream)



Create/join a battle by custom ID. Competitors and judges sign up. A judge starts a round: two competitors are chosen randomly, each uploads a kata video via a one-time link (no login). When both videos are ready, judges score 0–10 (0.1 steps). Highest total wins and the battle is archived.



\## Stack

\- Frontend: plain HTML/CSS/JS (in `/public`)

\- API: Vercel Serverless Functions (in `/api`)

\- State: Supabase (`battles` table with one JSON doc per slug)

\- Video: Cloudflare Stream (Direct Uploads + iframe player)



\## Environment Variables

Set these in Vercel:

\- `SUPABASE\_URL`

\- `SUPABASE\_SERVICE\_ROLE`

\- `CF\_ACCOUNT\_ID`

\- `CF\_API\_TOKEN` (Stream:Edit + Stream:Read)

\- `APP\_BASE\_URL` (e.g., `https://yourapp.vercel.app`)



\## Supabase schema

Create a table `battles` with:

\- `slug` (text, primary key)

\- `data` (jsonb)



\## Local dev

```bash

npm i

npx vercel dev



