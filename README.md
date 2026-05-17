# Rida — Rides & Deliveries, Mtwara

## What's fixed in this version
- ✅ Hardcoded Supabase keys removed — uses .env variables
- ✅ .gitignore added — .env will never go to GitHub
- ✅ Real auth — phone OTP login via Supabase
- ✅ User profiles — name, role (commuter/driver/business), area
- ✅ Delivery type added — recipient, notes, proof of delivery fields
- ✅ Shopkeeper wired to real Supabase dispatch
- ✅ Session persistence — users stay logged in on refresh
- ✅ Role-based routing — drivers go to drive view, businesses to hub

---

## Setup — do this once

### 1. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/rida-app.git
cd rida-app
npm install
```

### 2. Create your .env file
```bash
cp .env.example .env
```
Open `.env` and fill in your real values:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```
Find these in: Supabase Dashboard → Settings → API

### 3. Run the SQL migration
- Open Supabase Dashboard
- Go to SQL Editor
- Paste the full contents of `supabase_migration.sql`
- Click Run

### 4. Enable phone auth (for real SMS login)
- Supabase Dashboard → Authentication → Providers → Phone
- Toggle Phone on
- Add Twilio credentials (Account SID, Auth Token, Phone number)
- **For testing without Twilio:** use any phone number + code `000000`

### 5. Run locally
```bash
npm run dev
```
App runs at http://localhost:3000

---

## Push to GitHub

```bash
git init
git add .
git commit -m "Rida v1 — auth, delivery, clean keys"
git remote add origin https://github.com/YOUR_USERNAME/rida-app.git
git push -u origin main
```

---

## Deploy to Netlify

1. netlify.com → Add new site → Import from Git → pick rida-app
2. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Environment variables (Site settings → Environment variables):
   - `VITE_SUPABASE_URL` → your value
   - `VITE_SUPABASE_ANON_KEY` → your value
4. Deploy — every future `git push` auto-deploys

---

## Phone login — how it works

**Test mode (no Twilio):**
Enter any number → use code `000000` → works immediately

**Live mode (with Twilio):**
Customer enters 0712 111 222 → gets real SMS → enters code → in

Tanzanian numbers are auto-normalised:
- `0754...` → `+255754...`
- `07...` → `+25507...`

---

## Next steps after launch

| Priority | Feature | How |
|---|---|---|
| 1 | Proof of delivery photo | Supabase Storage — driver uploads photo |
| 2 | Live driver tracking | Supabase Realtime + GPS coords from driver |
| 3 | M-Pesa payment | Flutterwave or Beyonic API |
| 4 | Push notifications | Supabase Edge Functions + FCM |
| 5 | Driver rating | Add ratings table after each completed ride |

---

## File structure

```
src/
  App.tsx                 ← Main app, auth gating, view routing
  main.tsx                ← React entry point
  index.css               ← Design tokens, Tailwind theme
  lib/
    supabase.ts           ← Supabase client (reads from .env)
    auth.ts               ← OTP send/verify, profile CRUD
  components/
    AuthScreen.tsx        ← Phone entry → OTP → profile setup
    UserDashboard.tsx     ← Book rides + deliveries (commuters & businesses)
    DriverDashboard.tsx   ← Accept/start/complete rides (drivers)
supabase_migration.sql    ← Run once in Supabase SQL Editor
.env.example              ← Template — copy to .env and fill in
.gitignore                ← Keeps .env and node_modules off GitHub
```
