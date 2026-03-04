# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start backend (port 3001)
cd server && npm run dev

# Start frontend (port 5173, proxies /api to :3001)
cd client && npm run dev

# Type-check
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit

# Lint frontend
cd client && npm run lint

# Build
cd server && npm run build
cd client && npm run build
```

### Environment Variables

- **Server**: `GOOGLE_CLIENT_ID` — Google OAuth Client ID (required for auth)
- **Client**: `VITE_GOOGLE_CLIENT_ID` — same Google OAuth Client ID (used by `@react-oauth/google`)

Admin accounts are managed directly in the database (`admins` table with `google_email`). No self-registration.

## Architecture

Full-stack TypeScript poker tournament director app. React + Vite frontend, Express + SQLite backend.

### Backend (`server/src/`)

- **Entry**: `index.ts` — Express app, mounts all route groups under `/api`
- **Database**: SQLite via `better-sqlite3`, file at `server/data/poker.db`. Schema defined in `db/migrations.ts`, runs automatically on startup with ALTER TABLE migrations for schema evolution
- **Auth**: Google OAuth on login (`/api/auth/google` verifies Google ID token), then JWT tokens (8h expiry) via `middleware/auth.ts`. All routes except auth use `authMiddleware`
- **Routes**: Each file handles one resource. Tournament routes (`tournaments.ts`) manage the state machine; entry routes (`entries.ts`) handle registration, elimination, rebuy, addon with automatic ticket generation
- **Services**: `seating.ts` (table rebalancing), `prizePool.ts` (prize calculations)

### Frontend (`client/src/`)

- **Routing**: React Router in `App.tsx`. All routes wrapped in `ProtectedRoute` except `/login`. Display page has no Header/AppLayout
- **State**: AuthContext for global auth. Pages manage their own state via `useState` + direct `api.get/post` calls
- **API client**: `api/client.ts` — fetch wrapper that auto-injects JWT from localStorage, redirects to `/login` on 401
- **Auth**: Google Sign-In via `@react-oauth/google`. `GoogleOAuthProvider` wraps app in `main.tsx`
- **Timer**: `hooks/useTimer.ts` — computes countdown from server timestamps (`level_started_at` + `elapsed_seconds_before_current`). Client ticks locally with `setInterval(1s)`, syncs via polling every 5s

### Tournament State Machine

`registration` → `running` ↔ `paused` → `finished`

Timer state tracked via three fields: `level_started_at` (ISO timestamp), `elapsed_seconds_before_current` (accumulated seconds from prior levels), `level_elapsed_on_pause` (seconds consumed in current level when paused). On resume, `level_started_at` is backdated to preserve timer continuity.

### Key Conventions

- All money values stored in **cents** (integers) in the database, formatted as dollars on frontend
- Ticket numbers are **per-tournament** (not global auto-increment)
- Addon has a per-player counter ("ADD-ON #1", "#2"...), rebuy does not
- Max 9 players per table; auto-seating uses round-robin distribution
- CSS uses custom properties (`--casino-dark`, `--casino-green`, `--casino-gold`, etc.) defined in `client/src/index.css`
- UI language is English
