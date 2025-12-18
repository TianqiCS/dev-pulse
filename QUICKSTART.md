# DevPulse - Quick Start Guide

This guide will help you get DevPulse running in under 10 minutes.

## Prerequisites Check

```bash
# Check Node.js (need 18+)
node --version

# Check PostgreSQL (need 14+)
psql --version

# Check npm
npm --version
```

## Installation Steps

### 1. Install Dependencies (2 min)

```bash
cd d:\Playground\dev-pulse
npm install
```

### 2. Create PostgreSQL Database (1 min)

```bash
# Create database
createdb devpulse

# Or using psql:
psql -U postgres
CREATE DATABASE devpulse;
\q
```

### 3. Configure GitHub OAuth (3 min)

1. Visit https://github.com/settings/developers
2. Click "New OAuth App"
3. Enter:
   - **Name**: DevPulse Local
   - **Homepage**: http://localhost:3000
   - **Callback**: http://localhost:3000/auth/github/callback
4. Click "Register application"
5. Copy the **Client ID**
6. Click "Generate a new client secret" and copy it

### 4. Set Up Environment (1 min)

```bash
# Copy example file
cp .env.example .env
```

Edit `.env` file with your values:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/devpulse
GITHUB_CLIENT_ID=<paste your Client ID>
GITHUB_CLIENT_SECRET=<paste your Client Secret>
SESSION_SECRET=<any random string>
```

### 5. Run Migrations (30 sec)

```bash
npm run db:migrate
```

You should see: "Database migrations completed successfully!"

### 6. Start the Server (30 sec)

```bash
npm run dev
```

Server should be running at http://localhost:3000

## First Usage

### Step 1: Authenticate
Open browser and visit:
```
http://localhost:3000/auth/github
```

Authorize the app. You'll get a JSON response with your user info.

### Step 2: Sync Repositories
In your browser (while logged in), visit:
```
http://localhost:3000/repositories/sync
```

This fetches all your GitHub repositories.

### Step 3: Select Repositories

Using curl or Postman (replace session cookie):
```bash
curl -X POST http://localhost:3000/repositories/select \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -d '{"repositoryIds": [1, 2]}'
```

To get repository IDs, visit:
```
http://localhost:3000/repositories
```

### Step 4: Run Ingestion

Find your user ID (usually 1 for first user):
```bash
npm run ingest 1
```

Watch as it pulls commits, PRs, reviews, and CI status!

### Step 5: View Results

```bash
curl http://localhost:3000/activities/1 \
  -H "Cookie: connect.sid=<your-session-cookie>"
```

Or view in browser at the same URL.

## Verification Checklist

✅ Database exists and migrations ran successfully
✅ Server starts without errors
✅ Can authenticate with GitHub
✅ Repositories sync from GitHub
✅ Can select up to 3 repositories
✅ Ingestion job completes successfully
✅ Activities are stored in database

## Common Issues

**"Connection refused" on database**
- Start PostgreSQL: `pg_ctl start` or `brew services start postgresql`

**"OAuth app not found"**
- Double-check Client ID and Secret in `.env`
- Ensure callback URL is exactly: `http://localhost:3000/auth/github/callback`

**"No repositories selected"**
- Run step 3 to select repositories before ingestion

**Session cookie issues**
- Use browser dev tools (F12) → Application → Cookies to find `connect.sid`
- Or use a tool like Postman which handles cookies automatically

## What's Next?

After completing Task #001, the next steps would be:
1. Build the AI summarization engine
2. Create a web UI dashboard
3. Add scheduled ingestion jobs
4. Implement Slack/email notifications

---

**Need help?** Check the full [README.md](README.md) for detailed documentation.
