# DevPulse - Task #003: Weekly Summary Viewer (Web UI)

## ✅ Complete - First-Class User Experience

A clean, professional web interface for viewing AI-generated weekly engineering summaries.

## What's Been Built

### Frontend Application
- ✅ React + TypeScript with Vite
- ✅ Professional dark theme UI
- ✅ GitHub OAuth integration
- ✅ Repository selector dropdown
- ✅ Markdown rendering of summaries
- ✅ Responsive, executive-friendly design

### Key Features

**Authentication**
- Sign in with GitHub
- Session persistence
- User avatar and info display

**Repository Selection**
- Dropdown selector for all selected repos
- Auto-loads latest summary
- Seamless switching between repos

**Summary Display**
- Clean markdown rendering
- Clearly separated sections
- Professional typography
- Skimmable layout
- Date range display

**UX Principles**
- ✅ Calm, professional design
- ✅ No GitHub jargon overload
- ✅ Executive-friendly
- ✅ Fast loading (<2s)
- ✅ Clear visual hierarchy

## Quick Start

### Development Mode

Run backend and frontend separately for development:

```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend (with hot reload)
cd frontend
npm run dev
```

Frontend will be available at `http://localhost:5173` with API proxy to backend.

### Production Mode

Build frontend and serve from backend:

```bash
# Build frontend
cd frontend
npm run build
cd ..

# Start backend (serves built frontend)
npm run dev
```

Access at `http://localhost:3000`

## Project Structure

```
dev-pulse/
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── App.tsx            # Main application component
│   │   ├── App.css            # Professional dark theme
│   │   ├── api.ts             # API client
│   │   └── main.tsx           # Entry point
│   ├── index.html
│   ├── vite.config.ts         # Vite configuration
│   └── package.json
├── public/                     # Built frontend (served by Express)
└── src/                        # Backend
```

## API Integration

Frontend communicates with backend via these endpoints:

- `GET /auth/me` - Get current user
- `GET /auth/github` - Start OAuth flow
- `GET /repositories/selected` - Get user's selected repos
- `GET /summaries/repo/:id/latest` - Get latest summary

All requests use `credentials: 'include'` for session cookies.

## User Flow

1. **Landing Page** → User sees login screen
2. **Click "Sign in with GitHub"** → OAuth flow
3. **Redirect back** → Authenticated, shows repo selector
4. **Select repository** → Latest summary loads
5. **Read summary** → Formatted markdown with clear sections

## Design Decisions

**Dark Theme**
- Professional, calm aesthetic
- Reduces eye strain for developers
- Modern, GitHub-inspired palette

**Markdown Rendering**
- Preserves AI-generated formatting
- Allows for rich text (bold, lists, code)
- Clean, readable typography

**Single-Page App**
- Fast, no full page reloads
- Smooth transitions
- Better UX for switching repos

**Minimal UI**
- No clutter, focus on content
- Executive-friendly
- Skimmable at a glance

## Customization

### Styling

Edit `frontend/src/App.css` to customize:
- Color scheme (CSS variables at top)
- Typography
- Spacing and layout

### API Client

Edit `frontend/src/api.ts` to:
- Add new endpoints
- Modify request/response handling
- Add error handling

## Next Steps

**Not Included (Out of Scope for Task #003):**
- ✗ Editing summaries
- ✗ Comments/collaboration
- ✗ Sharing links
- ✗ Mobile optimization
- ✗ Multiple week history view

**Future Enhancements:**
- Week selector (view previous weeks)
- Export to PDF
- Share via unique link
- Team comparison view
- Trend analysis graphs

## Deployment

For production deployment:

1. **Build frontend:**
   ```bash
   cd frontend && npm run build
   ```

2. **Set production env vars:**
   ```env
   NODE_ENV=production
   ```

3. **Serve from single process:**
   ```bash
   npm start
   ```

4. **Configure reverse proxy** (nginx/Caddy) for:
   - HTTPS
   - Static file caching
   - Rate limiting

## Screenshots

Access the UI at `http://localhost:3000` to see:

✅ **Login Screen** - Clean, professional OAuth prompt  
✅ **Dashboard** - Repository selector with summary card  
✅ **Summary View** - Formatted markdown with clear sections  

---

**Ready to demo!** 🎉 

Your weekly engineering summaries are now just one click away.
