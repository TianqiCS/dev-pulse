# Managing Repositories & Generating Reports

## 🔄 Selecting Repositories

### Current Repository Selection

Your currently selected repositories appear in the dropdown at the top of the main page. You can switch between them using the dropdown menu.

### Adding New Repositories

There are two ways to add repositories:

#### Option 1: Using the API (Backend)

1. **Sync your GitHub repositories:**
   ```bash
   curl -X GET http://localhost:3000/repositories/sync \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
     --cookie-jar cookies.txt
   ```

2. **List all available repositories:**
   ```bash
   curl -X GET http://localhost:3000/repositories \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
   ```

3. **Select repositories (max 3):**
   ```bash
   curl -X POST http://localhost:3000/repositories/select \
     -H "Content-Type: application/json" \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
     -d '{"repositoryIds": [1, 2, 3]}'
   ```

#### Option 2: Using PostgreSQL (Direct Database)

```sql
-- View all synced repositories
SELECT * FROM repositories WHERE user_id = 1;

-- Select/deselect repositories
UPDATE repositories 
SET is_selected = true 
WHERE id IN (1, 2, 3) AND user_id = 1;

-- Unselect others
UPDATE repositories 
SET is_selected = false 
WHERE id NOT IN (1, 2, 3) AND user_id = 1;
```

## 📊 Generating Reports from Web UI

### New Summary Generation

1. **Navigate to the web UI:** http://localhost:3000
2. **Select a repository** from the dropdown
3. **Click "Generate New Summary"** button
4. Wait 5-10 seconds for the process to complete
5. The page will automatically refresh with the new summary

### What Happens Behind the Scenes

When you click "Generate New Summary":
1. **Ingestion** - Fetches latest GitHub activity (commits, PRs, reviews, CI status) from the last 7 days
2. **Aggregation** - Organizes the data by type and contributor
3. **AI Generation** - Sends data to OpenAI GPT-5-mini for summary generation
4. **Storage** - Saves the summary to the database
5. **Display** - Automatically loads and displays the new summary

### Manual Generation (CLI)

You can still generate summaries via command line:

```bash
# Generate summaries for all selected repos for user ID 1
npm run summary 1
```

## 📝 Notes

- **Maximum repositories:** 3 per user
- **Summary period:** Last 7 days of activity
- **Automatic links:** PR numbers, commit SHAs, and usernames are automatically converted to GitHub links
- **Idempotency:** Generating a summary for the same week replaces the old one
- **Background processing:** Summary generation runs asynchronously, so you get an immediate response

## 🔍 Troubleshooting

### Repository not showing up?

1. Make sure the repository is marked as `is_selected = true` in the database
2. Refresh the page
3. Check browser console for errors

### Summary not generating?

1. Check that there's activity in the repository during the last 7 days
2. Verify OpenAI API key is configured in `.env`
3. Check backend logs for errors: `npm run dev` output
4. Ensure you have run ingestion first (clicking "Generate New Summary" does this automatically)

### Need to see server logs?

The backend logs show detailed information about:
- Activity ingestion progress
- AI summary generation
- Database queries
- Any errors that occur

Watch the terminal where `npm run dev` is running.
