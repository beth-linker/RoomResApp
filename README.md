# RoomRes

RoomRes is a colorful, mobile-friendly conference-room scheduling app for a small office. It is a Next.js application hosted on Vercel and backed by Neon Postgres.

The first release will support:

- Email/password accounts with invite-code registration
- Admin management of users and rooms
- Conflict-safe room bookings
- Seven preconfigured conference rooms
- Responsive daily schedule with a three-week browsing window
- Automated code, dependency, and secret scanning

See [docs/PLAN.md](docs/PLAN.md) for the complete product and implementation plan.

## Local development

Requirements: Node.js 24 and a Postgres database. The Vercel-managed Neon integration is the recommended zero-cost database.

```bash
npm install --legacy-peer-deps
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000/setup` to create the first administrator. Every later self-service registration requires an invite code created under Admin → Invites.

## Booking rules

- America/New_York office time
- Monday–Friday, 8:00 AM–6:00 PM
- 15-minute increments, up to 2 hours
- One-week lookback and booking up to 14 days ahead
- No overlapping room or organizer bookings

## Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## REST API

Signed-in users can create 30-day bearer tokens from **API tokens** in the app. The
versioned API exposes active rooms and the shared booking schedule, and lets token
owners create, update, and cancel their own bookings. Admin tokens can manage any
booking. Private notes remain visible only to the organizer and admins.

- Interactive documentation: `/api-docs`
- OpenAPI 3.1 specification: `/openapi.yaml`
- API base path: `/api/v1`
