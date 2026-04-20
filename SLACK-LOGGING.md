# 💬 Slack Logging Guide

## How It Works

Text Chloe in Slack → She calls your API → Data saved to Supabase → Appears in app instantly.

## Supported Commands

### Water Logging
```
"Log 500ml water"          → Adds 0.5L
"Log 1L water"             → Adds 1L
"Log 2 water drops"        → Adds 0.5L (each drop = 250ml)
"42 protein"               → Works without "log" prefix
```

### Protein Logging
```
"Log 42g protein"          → Adds 42g
"Log 42 protein"           → Adds 42g (g is optional)
"42g protein from chicken" → Adds 42g (extra text ignored)
```

### Supplement Logging
```
"Mark creatine taken"      → Logs creatine
"Log AG1"                  → Logs AG1
"Took tongkat ali"         → Logs Tongkat Ali
"Mark d3 taken"            → Logs D3+K2
```

**Supported supplements:**
- armra / colostrum
- ag1 / athletic greens
- creatine
- tongkat / tongkat ali
- d3 / vitamin d / d3k2 / k2
- omega / omega 3 / fish oil
- lmnt / electrolytes
- protein shake / shake / whey

### Status Check
```
"Status"                   → Shows today's totals
"What's my status?"        → Shows today's totals
"Today's summary"          → Shows today's totals
```

**Response:**
```
📊 Today: 2.5L water | 127g protein | 6/8 supps
```

## Common Patterns

### Quick Logging After Meals
```
You: "42g protein from chicken lunch"
Chloe: ✅ Logged 42g protein. Total today: 127g / 190g
```

### Multiple Items at Once
```
You: "Log 500ml water and mark creatine taken"
Chloe: [Will handle first command, then second]
```

### Voice-to-Text (iPhone)
1. Open Slack
2. Hold microphone button
3. Say: "Log forty-two grams protein"
4. Send
5. Done!

## API Endpoints

### POST /api/log
**Actions:**
- `water` - Add water (value in liters)
- `protein` - Add protein (value in grams)
- `supplement` - Toggle supplement (supplementId + supplementName)
- `status` - Get today's totals

**Example request:**
```json
{
  "action": "protein",
  "value": 42
}
```

**Example response:**
```json
{
  "success": true,
  "protein": 127,
  "target": 190,
  "message": "✅ Logged 42g protein. Total today: 127g / 190g"
}
```

### GET /api/log
Get today's status without logging anything.

**Response:**
```json
{
  "success": true,
  "data": {
    "water": 2.5,
    "waterTarget": 4,
    "protein": 127,
    "proteinTarget": 190,
    "supplements": 6,
    "supplementsTarget": 8,
    "weight": 189.2,
    "sleep": 7.5,
    "energy": 8
  }
}
```

## Testing Locally

```bash
# Start server
cd ~/.openclaw/workspace/brandon-health-tracker
npm run dev

# Test via curl
curl -X POST http://localhost:3000/api/log \
  -H "Content-Type: application/json" \
  -d '{"action":"protein","value":42}'

# Test status
curl http://localhost:3000/api/log
```

## Integration with Chloe

**My message handler checks for health patterns:**
1. Message arrives in #chloe-noble-house
2. I scan for: "log", "mark", "status", protein amounts, water amounts
3. If matched, I parse command
4. Call your API endpoint
5. Return formatted response

**You never have to open the app to log.**

## Future Enhancements

**Phase 2:**
- "Log yesterday's protein" (backfill)
- "How's my water this week?" (analytics)
- "What's my avg protein?" (trends)
- Auto-log from photos (meal logging via GPT-4 Vision)

**Phase 3:**
- Scheduled reminders: "Brandon, you're 50g short on protein"
- Proactive checks: "You haven't logged water in 4 hours"
- Weekly summary DMs

## Troubleshooting

**Command not recognized:**
- Check spelling
- Try simpler format: "log 42 protein"
- Test API directly (see above)

**Data not saving:**
- Check Vercel deployment logs
- Verify Supabase env vars are set
- Test API endpoint directly

**Wrong amount logged:**
- Check your message format
- Each water drop = 250ml
- Protein needs number before "protein"

## Privacy

**All data is:**
- ✅ Stored in YOUR Supabase account
- ✅ Only accessible via YOUR API
- ✅ Never shared or logged elsewhere
- ✅ You control retention/deletion

**I can only:**
- Send commands to your API
- Read responses to format for you
- No direct database access

## Emergency Reset

**Delete today's data:**
```sql
-- In Supabase SQL Editor
DELETE FROM daily_logs WHERE date = CURRENT_DATE;
DELETE FROM supplement_logs WHERE date = CURRENT_DATE;
```

**Delete all data:**
```sql
TRUNCATE TABLE daily_logs CASCADE;
TRUNCATE TABLE supplement_logs CASCADE;
TRUNCATE TABLE workout_logs CASCADE;
```

## Questions?

Message me in #chloe-noble-house. I'll help debug or add new commands.
