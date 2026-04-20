# 🔧 Troubleshooting Guide

## Local Development Issues

### "npm run dev" fails
```bash
# Clear and reinstall
rm -rf .next node_modules package-lock.json
npm install
npm run dev
```

### Port 3000 already in use
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### TypeScript errors
```bash
# Check for syntax errors
npm run build

# If build passes, restart dev server
npm run dev
```

---

## Git/GitHub Issues

### Can't push to GitHub
**Problem:** "remote: Permission denied"

**Solution:** Use Personal Access Token
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select "repo" scope
4. Copy token
5. Use as password when pushing

### Wrong GitHub account
```bash
# Check current user
git config user.name
git config user.email

# Set correct user for this repo
git config user.name "brandon-3742"
git config user.email "brandon@noblehouseagency.com"
```

### Need to change remote URL
```bash
# Check current remote
git remote -v

# Change it
git remote set-url origin https://github.com/YOUR_USERNAME/health-tracker.git
```

---

## Vercel Deployment Issues

### Build fails on Vercel
**Check build locally first:**
```bash
npm run build
```

If local build passes but Vercel fails:
1. Check Vercel build logs (deployment → "Building" tab)
2. Usually Node version mismatch
3. Add to `package.json`:
```json
"engines": {
  "node": ">=18.0.0"
}
```

### 404 on deployed site
- Check Vercel deployment status (should say "Ready")
- Try the Vercel-provided URL first (not custom domain)
- Clear browser cache

### Environment variables not working
- Vercel dashboard → Settings → Environment Variables
- Add variables
- Redeploy (trigger by pushing dummy commit)

---

## Data/Storage Issues

### Data not saving
**Check localStorage:**
```javascript
// In browser console (F12)
localStorage.getItem('brandon_gameplan_v1')
```

**Clear and reset:**
```javascript
// In browser console
localStorage.clear()
// Reload page
```

### Lost all my data
**Recovery:**
1. Check if you exported (JSON file in Downloads)
2. If not, data is gone (localStorage limitation)
3. This is why Phase 2 adds database backup

**Prevention:**
- Export weekly: Original HTML has "Export Data" button
- Or add database (Phase 2)

### Data not syncing between devices
**This is expected with localStorage.**

**Solution:** Add database (Phase 2)
- Multi-device sync
- Automatic backups
- Never lose data

---

## Mobile/Browser Issues

### App looks broken on iPhone
- Clear Safari cache
- Force refresh (hold refresh button)
- Try in Private/Incognito first

### "Add to Home Screen" doesn't work
- Must use Safari (not Chrome)
- Must be on actual site (not localhost)
- iOS 14+ required

### Water drops not clickable on mobile
- Increase touch target size
- Report to me, I'll fix CSS

---

## Performance Issues

### App loads slowly
**Check network:**
- Open DevTools (F12) → Network tab
- Look for slow requests
- Usually external fonts/assets

**Optimize:**
```bash
# Build production version (smaller)
npm run build
npm run start
```

### Page freezes when adding data
- Check browser console for errors
- Usually infinite render loop
- Report to me with steps to reproduce

---

## Common Mistakes

### ❌ Editing files while dev server running
**Solution:** Restart dev server after major changes
```bash
# Stop: Ctrl+C
# Start: npm run dev
```

### ❌ Pushing node_modules to GitHub
**Already handled:** .gitignore blocks it

### ❌ Forgetting to commit before deploy
```bash
# Check status
git status

# Commit everything
git add .
git commit -m "Your message"
git push
```

### ❌ Testing on localhost instead of deployed URL
**Remember:** localStorage is per-domain
- localhost data ≠ production data
- Always test on deployed URL for mobile

---

## How to Report Bugs

**Message me in #chloe-noble-house with:**

1. **What you were trying to do:**
   - "Add water, clicked 5th drop"

2. **What happened instead:**
   - "Nothing happened, counter stayed at 0"

3. **Browser + device:**
   - "Safari on iPhone 14 Pro"

4. **Steps to reproduce:**
   - "Open app → Today tab → Click any water drop"

5. **Screenshot (if visual):**
   - Attach image

**I'll fix it fast.**

---

## Emergency Recovery

### Nuclear option (start fresh)
```bash
# Backup first!
cd ~/.openclaw/workspace
cp -r brandon-health-tracker brandon-health-tracker-backup

# Delete and rebuild
rm -rf brandon-health-tracker
# Tell me, I'll rebuild it
```

### Database corrupt (Phase 2+)
- Supabase has automatic backups
- Restore from yesterday's snapshot
- I'll handle recovery

---

## Getting Help

**Fast help:**
1. Check this file first
2. Read error message carefully
3. Google the exact error
4. Message me with details

**I'm available:**
- #chloe-noble-house (Slack)
- Response time: Minutes to hours
- I'll fix deployment issues immediately

**Remember:** 
- Most issues are simple (typo, wrong command)
- Always try building locally first
- Screenshot errors when possible

---

## Useful Commands

**Development:**
```bash
npm run dev          # Start dev server
npm run build        # Test production build
npm run start        # Run production locally
```

**Git:**
```bash
git status           # See what changed
git add .            # Stage all changes
git commit -m "msg"  # Commit with message
git push             # Push to GitHub
git log --oneline    # See commit history
```

**Debugging:**
```bash
# Check Node version
node -v

# Check npm version
npm -v

# Check Next.js version
npm list next

# Clear Next.js cache
rm -rf .next
```

**Browser DevTools:**
- F12 or Cmd+Option+I
- Console tab: JavaScript errors
- Network tab: API calls
- Application tab: localStorage data

---

## Still Stuck?

Message me. I'll screen share and fix it with you.

Most issues take 2-5 minutes to resolve.
