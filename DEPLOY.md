# 🚀 Deployment Checklist

## Quick Deploy (2 minutes)

### 1. Create GitHub Repo
```bash
# Go to https://github.com/new
# Name: health-tracker (or brandon-health-tracker)
# Public or Private: Your choice
# Don't initialize with README (we already have one)
# Create repository
```

### 2. Push Code
```bash
cd ~/.openclaw/workspace/brandon-health-tracker

# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/health-tracker.git

# Push
git push -u origin main
```

If you get authentication error:
```bash
# Use GitHub personal access token
# Settings → Developer settings → Personal access tokens → Tokens (classic)
# Generate new token with 'repo' scope
# Use token as password when prompted
```

### 3. Deploy to Vercel
1. Visit [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your `health-tracker` repo
4. Click "Deploy" (Vercel auto-detects Next.js, no config needed)
5. Wait ~60 seconds
6. Visit your live URL: `https://health-tracker-xyz.vercel.app`

### 4. Custom Domain (Optional)
- In Vercel dashboard → Settings → Domains
- Add: `health.brandonkidd.com` or `fit.brandonkidd.com`
- Follow DNS instructions (add CNAME record)

## 🗄️ Add Database (Supabase — storage + multi-device sync)

Cloud sync is **already built into the code**. The server uses the Supabase
**secret (service role) key only**; browser clients never touch the database.
Sync activates only when **both** Supabase **and** the site login are set,
because `/api/health` is auth-gated.

### Setup Supabase

1. **Create a project:** [supabase.com/dashboard](https://supabase.com/dashboard)
   - Name: brandon-health-tracker · Region: closest to you · Free tier
   - Save the database password somewhere safe.

2. **Create the tables:**
   - SQL Editor → New query
   - Paste the entire contents of [`supabase-setup.sql`](supabase-setup.sql) → Run
   - (Idempotent — safe to re-run any time.)

3. **Get your keys:**
   - Project Settings → **Data API** → copy the **Project URL**
   - Project Settings → **API Keys** → create a **secret key** (`sb_secret_…`)
   - Do **not** use the `anon`/publishable key, and never prefix with `NEXT_PUBLIC_`.

4. **Set the four required env vars** (both locally in `.env.local` and in Vercel
   → Settings → Environment Variables):
   - `SUPABASE_URL` = your Project URL
   - `SUPABASE_SECRET_KEY` = your `sb_secret_…` key
   - `SITE_PASSWORD` = a login password you choose (required for sync)
   - `AUTH_SECRET` = a long random string (`openssl rand -base64 32`)

5. **Verify:** run `npm run verify:supabase` — it connects with your secret key
   and confirms every table is reachable.

6. **Redeploy** (Vercel prompts after env changes), open the app, and **log in**
   with your `SITE_PASSWORD`. Every change now auto-syncs; logging in on another
   device pulls the merged history down.

## 📱 Add to iPhone Home Screen

1. Visit your Vercel URL in Safari
2. Tap Share button (square with arrow)
3. Scroll down → "Add to Home Screen"
4. Name it "Health Tracker" or "Brandon.Fit"
5. Tap "Add"

Now it opens like a native app!

## 🔄 Making Changes

After initial deploy, updates are automatic:

```bash
# Make changes to code
# Commit and push
git add .
git commit -m "Add workout tracking"
git push

# Vercel auto-deploys in ~60 seconds
# Visit your URL to see changes
```

## ⚠️ Current Limitations (localStorage version)

**Single device only:**
- Data saved in browser localStorage
- Phone data ≠ laptop data
- Clearing browser cache = data gone

**Workaround until database:**
- Export data weekly: Click "Export Data" button in original HTML
- Save JSON file to iCloud/Dropbox
- Manual recovery if needed

**When to add database:**
- You're using 2+ devices regularly
- You want historical charts/analytics
- You want automatic backups
- You want to integrate with Chloe for AI queries

## 🎯 Recommended Flow

**Week 1 (this week):**
- ✅ Deploy localStorage version now
- ✅ Use it daily from your phone
- ✅ See if single-device limitation bothers you

**Week 2 (if needed):**
- Add Supabase database
- Migrate your localStorage data
- Enable cross-device sync

**Week 3+ (optional):**
- Add historical charts
- Integrate with Chloe for voice logging
- Build meal photo logging
- Add progress photos section

## 🆘 Troubleshooting

**Build fails:**
```bash
rm -rf .next node_modules
npm install
npm run build
```

**Can't push to GitHub:**
- Check you're logged into correct GitHub account
- Use Personal Access Token (not password)
- Make sure repo name matches

**Vercel deploy fails:**
- Check build logs in Vercel dashboard
- Usually missing dependency or TypeScript error
- Fix locally, push again

**Data not saving:**
- Check browser console for errors (F12)
- Try different browser
- Clear cache and reload

## 📞 Need Help?

Message me in #chloe-noble-house with:
1. What you're trying to do
2. Error message (screenshot if visual)
3. Which step you're on

I'll fix it.
