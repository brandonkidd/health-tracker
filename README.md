# BRANDON.FIT - Personal Health Tracker

Interactive health and fitness tracking dashboard with daily water, protein, supplement, and workout logging.

## 🚀 Current Status

**Working:**
- ✅ Daily water tracking (16 drops = 4L)
- ✅ Daily protein tracking with quick-add buttons
- ✅ Supplement checklist (8 core supplements)
- ✅ localStorage persistence (single device)
- ✅ Mobile responsive
- ✅ Dark theme matching your original design

**Coming Soon (Phase 2):**
- Workout logging with exercise tracking
- Body composition checkpoint tracking
- Weight trend charts
- Calendar view with workout schedule
- Multi-device sync with database backend

## 📊 What's Missing for "Proper Tracking"?

You asked about **database storage** and **backend interaction**. Here's what you need:

### Current Setup (localStorage)
**Pros:**
- Works immediately
- No backend required
- Fast
- Privacy (data never leaves your device)

**Cons:**
- ❌ Data only on ONE device (phone vs laptop vs iPad don't sync)
- ❌ Browser cache clear = data gone
- ❌ No historical analytics or trend analysis
- ❌ Manual export/import for backups

### Next Level: Database Backend

**Option 1: Supabase (Free tier - RECOMMENDED)**
- Postgres database
- Real-time sync across all devices
- Built-in auth (optional - or just use as YOUR database)
- Automatic backups
- API auto-generated
- 500MB storage free forever

**Option 2: Vercel Postgres + KV**
- Integrates directly with Vercel deployment
- Postgres for structured data (weight, workouts, meals)
- KV for fast access (today's water/protein counts)
- $0.29/month after free tier

**Option 3: Firebase (Google)**
- Real-time database
- Good mobile SDKs
- Free tier: 1GB storage
- Slightly more complex setup

### What Backend Enables

**Multi-device sync:**
- Log water on your phone during workout
- Check progress on iPad at night
- Review weekly trends on laptop

**Historical analytics:**
- Weight trend charts (daily, weekly, monthly)
- Protein compliance rate (% of days hitting 190g)
- Supplement adherence tracking
- Workout volume progression

**Smart insights:**
- "You've logged 85% of workouts this month"
- "Average protein: 182g (8g below target)"
- "Water intake drops 15% on weekends"
- "Best energy ratings correlate with 8+ hours sleep"

**Backup/recovery:**
- Never lose data
- Export CSV for doctors/trainers
- Roll back to any previous date

**AI integration (future):**
- "Chloe, did I hit my protein yesterday?" → instant answer
- "Show me my worst nutrition week" → analysis
- Voice logging: "Log 42g protein from chicken"

## 🛠️ Setup & Deploy

### Local Development
```bash
npm install
npm run dev
# Visit http://localhost:3000
```

### Deploy to Vercel (2 minutes)
1. Push to GitHub:
```bash
git init
git add .
git commit -m "Initial health tracker"
git branch -M main
git remote add origin https://github.com/brandonkidd/health-tracker.git
git push -u origin main
```

2. Deploy:
- Visit [vercel.com](https://vercel.com)
- Click "Import Project"
- Connect your GitHub repo
- Click "Deploy"
- Done! Live in ~60 seconds

### Add Database (Supabase — for storage + multi-device sync)

Cloud sync is already fully wired in the code. The Next.js server talks to
Supabase using the **secret (service role) key only** — browser clients get no
database access. Because `/api/health` is auth-gated, sync turns on only when
**both** Supabase **and** the site login are configured.

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard)
   (free tier, pick a region close to you).
2. **Create the tables:** Dashboard → SQL Editor → New query → paste the entire
   contents of [`supabase-setup.sql`](supabase-setup.sql) → Run. It is
   idempotent and safe to re-run.
3. **Get your keys:** Project Settings → **Data API** → copy the *Project URL*.
   Then Project Settings → **API Keys** → create a **secret key** (`sb_secret_…`).
   (The legacy `service_role` JWT also works.) Never use the `anon`/publishable
   key here, and never prefix these with `NEXT_PUBLIC_`.
4. **Set the four required env vars** — locally in `.env.local`, and in your host
   (Vercel → Settings → Environment Variables):

```bash
SUPABASE_URL=your_project_url
SUPABASE_SECRET_KEY=sb_secret_your_key
SITE_PASSWORD=choose-a-login-password   # required — you'll type it at /login
AUTH_SECRET=long-random-string          # openssl rand -base64 32
```

5. **Verify the connection:**
```bash
npm run verify:supabase
```
It confirms every table is reachable using your secret key.

6. Restart the app, open it, and **log in** with `SITE_PASSWORD`. From then on
   every change auto-syncs to Supabase, and any device that logs in pulls the
   merged history down. To bring existing single-device data up, log in once on
   the device that has it (or Plan → *Import backup*).

## 📱 Mobile Experience

The site is fully responsive. Add to your iPhone home screen:
1. Visit site in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. Opens like a native app

## 🎯 Recommended Next Steps

**Phase 1 (this weekend):**
1. ✅ Deploy current version to Vercel (works now, localStorage)
2. ✅ Use it for 3-5 days to validate core flow
3. ✅ Identify what's annoying/missing

**Phase 2 (next week if you want multi-device):**
1. Add Supabase database
2. Migrate localStorage data to cloud
3. Enable cross-device sync
4. Add historical charts

**Phase 3 (optional, when you want deeper insights):**
1. AI analysis integration
2. Voice logging via Chloe
3. Photo progress tracking
4. Meal photo logging with AI nutrition estimation

## 💡 My Recommendation

**Deploy the current version NOW** and use it this week. See if localStorage limitations actually bother you in practice.

If you mostly track from ONE device (e.g., your phone), localStorage is fine and simpler.

If you want to check progress on laptop while logging on phone during workouts, then add Supabase next weekend.

Don't over-engineer before you validate the core UX works for you.

## 🚨 Important

Your original HTML has WAY more content (full meal plans, workout details, bloodwork panel, shopping lists, etc.). I built a **lightweight daily tracker** focused on the 3 metrics you check every day:
1. Water
2. Protein  
3. Supplements

The full content is still available in your original HTML. This Next.js version is your **daily execution dashboard**. Think of it as the difference between:
- **Original HTML** = Complete playbook (read once, reference occasionally)
- **This app** = Daily scoreboard (check 3-5x per day)

Want me to add more sections (workouts, nutrition, progress tracking)? Let me know which ones matter most and I'll build them out.
