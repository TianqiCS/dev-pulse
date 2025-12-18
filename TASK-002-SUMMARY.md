# DevPulse - Task #002: AI Summary Generation

## Quick Start - Generate Your First Summary

### 1. Add OpenAI API Key to `.env`

```env
OPENAI_API_KEY=sk-...your-key-here
```

Get your API key from: https://platform.openai.com/api-keys

### 2. Generate Summary

For all selected repositories:
```bash
npm run summary 1
```

For a specific repository:
```bash
npm run summary 1 2  # User ID 1, Repo ID 2
```

With custom time window:
```bash
npm run summary 1 --days=14  # Last 14 days
```

Force regenerate existing summary:
```bash
npm run summary 1 --force
```

### 3. View Summaries via API

**Get latest summary for a repo:**
```
GET /summaries/repo/2/latest
```

**Get all summaries for a repo:**
```
GET /summaries/repo/2
```

**Get latest summaries for all selected repos:**
```
GET /summaries/latest
```

## What Gets Generated

The AI summary includes:

✅ **Overview** - High-level summary of the week  
✅ **Key Accomplishments** - Merged PRs and major work  
✅ **Ongoing Work** - Open PRs and in-progress items  
✅ **Issues & Risks** - CI failures, blockers  
✅ **Notable Contributors** - Active team members  

## Example Output

```markdown
## Overview
This week saw significant activity in TianqiCS/ping-caster with 1 commit, 1 pull request merged, and some CI challenges addressed.

## Key Accomplishments
- PR #1 "sync version" was successfully merged by TianqiCS
- Version synchronization work completed with upstream

## Ongoing Work
- No pull requests currently in review

## Issues & Risks
- Build job failed with "failure" conclusion (commit cdc5f9c)
- Deploy job was skipped following the build failure

## Notable Contributors
- Tianqi Wang: Contributed merge commit and addressed version sync
- TianqiCS: Opened and merged PR #1
```

## How It Works

1. **Aggregation** - Collects last 7 days of activity (commits, PRs, reviews, CI)
2. **Structuring** - Organizes data into stats and categories
3. **AI Generation** - Sends structured prompt to GPT-4 (temperature: 0.3)
4. **Storage** - Saves to database with idempotency (won't duplicate)
5. **Retrieval** - Access via API or CLI

## Anti-Hallucination Measures

- ✅ Explicit "only use provided data" instructions
- ✅ Low temperature (0.3) for consistency
- ✅ Structured data format prevents ambiguity
- ✅ Clear boundaries on what to include/exclude
- ✅ No productivity scoring or judgmental language

## API Integration

All summaries are accessible via REST API with authentication:

```javascript
// Browser console (after auth)
fetch('http://localhost:3000/summaries/latest')
  .then(r => r.json())
  .then(console.log)
```

```powershell
# PowerShell (with session cookie)
$session = ... # Your auth session
Invoke-WebRequest -Uri 'http://localhost:3000/summaries/repo/2/latest' `
  -WebSession $session -UseBasicParsing
```

## Next Steps

Once you've tested the summaries:
1. Schedule weekly generation (cron job)
2. Add Slack/email delivery
3. Build web UI dashboard
4. Add multi-week comparisons

---

**Ready to try it?** Just run: `npm run summary 1`
