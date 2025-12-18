# DevPulse

An AI-powered assistant for engineering teams that automatically turns GitHub activity into clear, human-readable insights — without manual status reports or meetings.

## Overview

DevPulse observes commits, pull requests, reviews, and CI results from your GitHub repositories, then generates daily/weekly summaries and explanations to answer the question: **"What's going on with our engineering work?"**

## Current Status: Task #003 - Web UI for Summaries 🚀

DevPulse now has a complete web interface for viewing AI-generated engineering summaries!

### What's Implemented

✅ **Task #001: GitHub Activity Ingestion**
- GitHub OAuth authentication
- Repository selection (up to 3 repos)
- Activity ingestion: commits, PRs, reviews, CI status
- Normalized PostgreSQL schema with idempotency

✅ **Task #002: AI Summary Generation**
- Weekly activity aggregation and statistics
- GPT-4 powered summary generation
- Structured output: Overview, Accomplishments, Risks, Contributors
- Anti-hallucination safeguards (low temperature, explicit constraints)
- Summary storage with idempotency
- REST API for summary retrieval

✅ **Task #003: Web UI** 🆕
- React + TypeScript frontend with professional dark theme
- GitHub OAuth sign-in flow
- Repository selector dropdown
- Markdown-rendered summary display
- Clean, executive-friendly design
- Fast loading (<2s)

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- GitHub account and OAuth app credentials
- OpenAI API key (for AI summaries)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: DevPulse Local
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
4. Save the Client ID and Client Secret

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
PORT=3000
NODE_ENV=development

# PostgreSQL connection string
DATABASE_URL=postgresql://username:password@localhost:5432/devpulse

# GitHub OAuth credentials from step 2
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# Generate a random string for session security
SESSION_SECRET=your_random_session_secret_here_change_this

# OpenAI API key (for AI summaries)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Get your OpenAI API key:** https://platform.openai.com/api-keys

### 4. Set Up Database

Create the PostgreSQL database:

```bash
createdb devpulse
```

Run migrations:

```bash
npm run db:migrate
```

This creates three tables:
- `users` - GitHub user authentication
- `repositories` - Repository metadata
- `activities` - Normalized activity events

## Usage

### Start the Server

Development mode with auto-reload:

```bash
npm run dev
```

Production build and run:

```bash
npm run build
npm start
```

The API will be available at `http://localhost:3000`

### Web UI 🆕

DevPulse now includes a web interface!

**Access the UI:**
```
http://localhost:3000
```

**Development Mode (with hot reload):**
```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Frontend dev server: `http://localhost:5173`

**Production Build:**
```bash
cd frontend
npm run build
cd ..
npm run dev
```

### API Endpoints

#### Authentication

**Start OAuth Flow**
```
GET /auth/github
```
Redirects to GitHub for authorization.

**OAuth Callback** (automatic)
```
GET /auth/github/callback
```

**Get Current User**
```
GET /auth/me
```
Returns authenticated user info.

**Logout**
```
POST /auth/logout
```

#### Repositories

**Sync Repositories from GitHub**
```
GET /repositories/sync
```
Fetches and stores all accessible repositories.

**List All Repositories**
```
GET /repositories
```

**Get Selected Repositories**
```
GET /repositories/selected
```

**Select Repositories (Max 3)**
```
POST /repositories/select
Content-Type: application/json

{
  "repositoryIds": [1, 2, 3]
}
```

#### Activities

**Get Activities for a Repository**
```
GET /activities/:repoId
```

Query parameters:
- `startDate` - ISO date string (optional)
- `endDate` - ISO date string (optional)
- `limit` - Number (default: 100)

#### Ingestion

**Trigger Ingestion via API**
```
POST /ingestion/trigger
```
Ingests activity for all selected repositories (async).

**Run Ingestion Job via CLI**
```bash
npm run ingest <userId>
```

Example:
```bash
npm run ingest 1
```

#### AI Summaries 🆕

**Generate Weekly Summary via CLI**
```bash
npm run summary <userId> [repoId] [--days=7] [--force]
```

Examples:
```bash
npm run summary 1              # All selected repos
npm run summary 1 2            # Specific repo (ID: 2)
npm run summary 1 --days=14    # Last 14 days
npm run summary 1 --force      # Regenerate existing
```

**Get Latest Summary for Repo**
```
GET /summaries/repo/:repoId/latest
```

**Get All Summaries for Repo**
```
GET /summaries/repo/:repoId
```

**Get Latest Summaries for All Selected Repos**
```
GET /summaries/latest
```

## Workflow Example

1. **Authenticate with GitHub**
   ```bash
   curl http://localhost:3000/auth/github
   # Follow browser redirect to authorize
   ```

2. **Sync Repositories**
   ```bash
   curl http://localhost:3000/repositories/sync \
     -H "Cookie: connect.sid=your_session_cookie"
   ```

3. **Select Repositories**
   ```bash
   curl -X POST http://localhost:3000/repositories/select \
     -H "Content-Type: application/json" \
     -H "Cookie: connect.sid=your_session_cookie" \
     -d '{"repositoryIds": [1, 2]}'
   ```

4. **Run Ingestion**
   ```bash
   npm run ingest 1
   ```

5. **View Activities**
   ```bash
   curl http://localhost:3000/activities/1 \
     -H "Cookie: connect.sid=your_session_cookie"
   ```

6. **Generate AI Summary** 🆕
   ```bash
   npm run summary 1
   ```

7. **View Summary**
   ```bash
   curl http://localhost:3000/summaries/repo/2/latest \
     -H "Cookie: connect.sid=your_session_cookie"
   ```

## Database Schema

### users
- `id` - Primary key
- `github_id` - GitHub user ID (unique)
- `username` - GitHub username
- `access_token` - Encrypted OAuth token
- `created_at`, `updated_at`

### repositories
- `id` - Primary key
- `user_id` - Foreign key to users
- `github_id` - GitHub repository ID
- `name` - Repository name
- `full_name` - Owner/repo format
- `owner` - Repository owner
- `is_selected` - Monitoring flag
- `created_at`, `updated_at`

### activities
- `id` - Primary key
- `repo_id` - Foreign key to repositories
- `event_type` - Event category (commit, pr_opened, pr_merged, etc.)
- `github_id` - GitHub event identifier (for deduplication)
- `author` - Event author
- `timestamp` - Event occurrence time
- `raw_payload` - Full event data (JSONB)
- `created_at`

**Event Types:**
- `commit` - Code commits
- `pr_opened` - Pull request opened
- `pr_merged` - Pull request merged
- `pr_closed` - Pull request closed without merge
- `pr_review` - Pull request review submitted
- `ci_success` - CI/CD check passed
- `ci_failure` - CI/CD check failed

### summaries 🆕
- `id` - Primary key
- `repo_id` - Foreign key to repositories
- `week_start` - Start of summary period
- `week_end` - End of summary period
- `summary_text` - AI-generated markdown summary
- `model_version` - GPT model used (e.g., gpt-4-turbo-preview)
- `created_at`, `updated_at`
- **Unique constraint:** `(repo_id, week_start, week_end)` for idempotency

## Architecture

```
dev-pulse/
├── frontend/                  # React Web UI
│   ├── src/
│   │   ├── App.tsx           # Main component
│   │   ├── App.css           # Styling
│   │   ├── api.ts            # API client
│   │   └── main.tsx          # Entry point
│   ├── vite.config.ts
│   └── package.json
├── public/                    # Built frontend assets
├── src/                       # Backend
│   ├── config.ts             # Environment configuration
│   ├── index.ts              # Express app + frontend serving
│   ├── db/
│   │   ├── index.ts          # Database connection pool
│   │   └── migrate.ts        # Schema migrations
│   ├── models/
│   │   ├── user.ts           # User data access
│   │   ├── repository.ts     # Repository operations
│   │   ├── activity.ts       # Activity storage
│   │   └── summary.ts        # Summary storage
│   ├── services/
│   │   ├── github.ts         # GitHub API integration
│   │   ├── aggregation.ts    # Activity data aggregation
│   │   ├── prompts.ts        # LLM prompt templates
│   │   └── summary.ts        # OpenAI integration
│   ├── routes/
│   │   ├── auth.ts           # Authentication endpoints
│   │   ├── repositories.ts   # Repository management
│   │   ├── activities.ts     # Activity queries
│   │   ├── ingestion.ts      # Ingestion triggers
│   │   └── summaries.ts      # Summary retrieval
│   └── jobs/
│       ├── ingest.ts         # CLI ingestion runner
│       └── generate-summary.ts # CLI summary generator
└── package.json
```

## Definition of Done ✅

### Task #001: Activity Ingestion
- ✅ A developer can authenticate with GitHub OAuth
- ✅ Select up to 3 repositories for monitoring
- ✅ Run an ingestion job (via CLI or API)
- ✅ Verify that the last 7 days of activity are stored correctly in the database
- ✅ Idempotent ingestion prevents duplicates
- ✅ Data is normalized with structured event types

### Task #002: AI Summary Generation
- ✅ Weekly summaries can be generated on demand
- ✅ Summaries are readable, accurate, and consistent
- ✅ Summaries are stored and retrievable from DB
- ✅ Can be regenerated idempotently
- ✅ Professional tone, non-judgmental, no productivity scoring
- ✅ Anti-hallucination measures (low temperature, explicit constraints)

### Task #003: Web UI 🆕
- ✅ User logs in via GitHub OAuth
- ✅ Selects a repository from dropdown
- ✅ Sees the latest weekly summary
- ✅ Page loads in <2 seconds
- ✅ Professional, executive-friendly design
- ✅ Markdown rendering with clear sections
- ✅ Responsive, skimmable layout

## Next Steps

**Completed:**
- ✅ ~~AI-powered weekly summaries~~ (Task #002)
- ✅ ~~Web UI dashboard~~ (Task #003)

**Future Tasks:**
- Scheduled summary generation (cron jobs)
- Week selector (view history)
- Slack/email delivery of summaries
- Shareable summary links
- Real-time webhooks instead of polling
- Multi-week trend analysis
- Multi-team/organization support
- Mobile optimization
- Export to PDF

## Troubleshooting

**Database Connection Issues**
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in `.env`
- Ensure database exists: `psql -l`

**GitHub OAuth Errors**
- Verify Client ID and Secret in `.env`
- Check callback URL matches GitHub OAuth app settings
- Ensure `http://localhost:3000` is accessible

**Ingestion Failures**
- Check GitHub token has `repo` scope
- Verify selected repositories exist and are accessible
- Review logs for API rate limiting

**Summary Generation Failures**
- Verify OpenAI API key is set in `.env`
- Check OpenAI API key has sufficient credits
- Ensure activities exist for the selected time period
- Review temperature and prompt settings in `src/services/summary.ts`

## License

MIT
