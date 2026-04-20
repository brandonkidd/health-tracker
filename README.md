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

### Add Database (Supabase - 5 minutes)

1. Create account: [supabase.com](https://supabase.com)
2. Create new project
3. Create tables:

```sql
-- Daily tracking
CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  water DECIMAL(3,2) DEFAULT 0,
  protein INTEGER DEFAULT 0,
  weight DECIMAL(5,1),
  sleep DECIMAL(3,1),
  energy INTEGER,
  mood INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Supplement tracking
CREATE TABLE supplement_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  supplement_id VARCHAR(50) NOT NULL,
  taken BOOLEAN DEFAULT FALSE,
  time TIMESTAMP,
  UNIQUE(date, supplement_id)
);

-- Workout tracking
CREATE TABLE workout_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  workout_type VARCHAR(20), -- 'A', 'B', 'C', 'peloton'
  exercise VARCHAR(100),
  sets INTEGER,
  reps INTEGER,
  weight DECIMAL(5,1),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security (optional - for multi-user future)
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
```

4. Get your API keys from Supabase dashboard
5. Add to `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

6. Install Supabase client:
```bash
npm install @supabase/supabase-js
```

7. I'll update the code to use Supabase (takes ~30 minutes)

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
