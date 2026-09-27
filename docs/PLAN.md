# RoomRes Product and Implementation Plan

## Product goal

Build a small, polished conference-room scheduler that works well on desktop and mobile and provides a realistic repository for evaluating Datadog Code Security. The ongoing hosting and database cost should remain zero, with Datadog enabled during its trial and removable afterward.

## Users and roles

### Member

- Register with a valid shared invite code.
- Sign in with email and password.
- View the room schedule and booking history.
- Create bookings within the allowed window.
- Edit or cancel only their own future bookings.
- View booking notes only on their own bookings.

### Admin

- Perform every member operation.
- Create, edit, deactivate, and reactivate users.
- Create, edit, deactivate, and reactivate rooms.
- Create, edit, or cancel any booking.
- Reset a user's password, revoke their sessions, and require a password change at next sign-in.
- Rotate, disable, expire, or limit the shared invite code.
- Review lightweight administrative audit events.

Users and rooms with booking history are deactivated rather than permanently deleted.

## Authentication and invitations

- Use Better Auth with its Drizzle adapter and Neon Postgres.
- Use email/password authentication with secure password hashing and database-backed sessions.
- Do not require email verification or an email delivery service.
- Bootstrap the initial admin through a local command using environment-provided credentials.
- Store only a cryptographic hash of each invite code.
- Validate invite codes in a server-side pre-signup hook.
- Assign all invite-code registrations the `member` role.
- Support active status, expiration, optional maximum uses, rotation, and revocation.
- Rate-limit sign-in and registration using database-backed limits.
- Never log passwords, invite codes, session tokens, booking notes, or authentication secrets.

## Schedule and booking rules

- Office timezone: `America/New_York`.
- Office hours: Monday through Friday, 8:00 AM to 6:00 PM.
- Booking increments: 15 minutes.
- Minimum booking length: 15 minutes.
- Maximum booking length: 2 hours.
- Users may book from the present through 14 days ahead.
- The schedule provides one week of read-only booking history.
- Past bookings are read-only.
- Recurring meetings are out of scope for the first release.
- A room cannot have overlapping active bookings.
- A user cannot hold overlapping active bookings in different rooms.
- Conflict prevention must be enforced in Postgres as well as validated in the interface.

All signed-in users can see a booking's title, organizer, room, and time. Notes are visible only to the organizer and admins.

## Seed rooms

| Room | Capacity | Amenities |
|---|---:|---|
| Doc | 12 | Large display, video conferencing, whiteboard |
| Grumpy | 8 | Display, video conferencing, whiteboard |
| Happy | 6 | Display, video conferencing |
| Sleepy | 6 | Display, whiteboard |
| Bashful | 4 | Display, whiteboard |
| Sneezy | 3 | Display |
| Dopey | 2 | Whiteboard |

Each room receives a distinct accessible color and an original visual treatment. No copyrighted character artwork will be used.

## User experience

- Responsive day and week schedule views on larger screens.
- Agenda-oriented schedule on narrow mobile screens.
- Clear room filters, availability states, and conflict messages.
- Fast booking from an open time slot.
- Colorful cards, rounded surfaces, friendly empty states, and restrained motion.
- Motion respects the user's reduced-motion setting.
- Keyboard-accessible controls, visible focus states, useful labels, and sufficient color contrast.
- Destructive actions require confirmation and provide clear recovery guidance.

## Technical architecture

- Next.js App Router, React, and TypeScript.
- Tailwind CSS for responsive styling.
- Node.js runtime for database and authentication compatibility.
- Server Components for internal reads.
- Server Actions for application mutations.
- Route Handlers for authentication and endpoints that need HTTP semantics.
- Neon Postgres Free as the transactional database.
- Drizzle ORM with committed, reviewed migrations.
- Zod schemas at trust boundaries.
- Server-side authorization checks for every protected operation.

## Data model

### Authentication tables

Better Auth-managed users, accounts, sessions, and related authentication records.

Application user fields include:

- `role`: `admin` or `member`
- `active`
- `must_change_password`

### `invite_codes`

- ID
- Code hash
- Active status
- Creation and update timestamps
- Optional expiration
- Optional maximum uses
- Current use count
- Creator

### `rooms`

- ID
- Name
- Capacity
- Location or description
- Accessible color token
- Amenities
- Active status
- Creation and update timestamps

### `bookings`

- ID
- Room ID
- Organizer user ID
- Title
- Private notes
- Start and end timestamps stored in UTC
- Status
- Creation and update timestamps

Postgres constraints will prevent overlapping active bookings for both a room and an organizer.

### `audit_events`

- ID and timestamp
- Actor user ID
- Action type
- Target type and ID
- Minimal non-sensitive metadata

## Datadog Code Security plan

Code Security is the primary Datadog evaluation target. Browser RUM and hosted Vercel drains are not required for the first release.

### Repository scanning

- Connect the public GitHub repository through the Datadog GitHub App.
- Enable Static Code Analysis for first-party TypeScript and React code.
- Enable static Software Composition Analysis for npm dependencies.
- Enable Secret Scanning.
- Add `code-security.datadog.yaml` using schema version `v1.5`.
- Run Datadog SAST and SCA in GitHub Actions.
- Enable inline pull-request comments and GitHub checks.
- Configure a PR gate for newly introduced high- or critical-severity findings.
- Retain the npm lockfile so dependency results are deterministic.

### Safe demonstration workflow

- Keep `main` secure and deployable.
- Create a temporary, clearly named security demonstration branch.
- Introduce controlled findings that cannot be deployed from that branch.
- Demonstrate SAST, vulnerable dependency, fake-secret-pattern, and sample IaC findings.
- Open a pull request and capture Datadog's findings and suggested remediation.
- Fix the findings in the same pull request and demonstrate successful checks.
- Never merge the vulnerable commits into `main`.

### Runtime security lab

Datadog Runtime Code Analysis requires an Agent-supported runtime and is not designed for Vercel Functions. A local Docker profile will therefore run the same production Next.js build alongside the Datadog Agent.

- Enable IAST and runtime SCA only in the local security-lab profile.
- Generate legitimate application traffic with Playwright booking and administration flows.
- Keep runtime-security configuration isolated from the Vercel deployment.
- Disable and remove Datadog credentials after the trial.

## Logging and privacy

- Use structured server logs for starts, completions, durations, and sanitized failures.
- Include request or correlation IDs where available.
- Never include passwords, invite codes, session tokens, private notes, or database credentials.
- Keep optional telemetry behind configuration flags.
- After the Datadog trial, the app continues using basic Vercel runtime logs without code changes.

## Testing strategy

- Unit tests for schedule-window, duration, permission, and invite-code rules.
- Database integration tests for concurrent booking conflicts.
- Authentication tests for invite validation, disabled users, role enforcement, password changes, and session revocation.
- Playwright tests for member booking, admin CRUD, responsive navigation, and accessibility-critical flows.
- Security workflow verification for SAST, SCA, secrets, PR comments, and PR gates.
- Desktop and mobile visual checks before deployment.

## Delivery phases

1. Scaffold Next.js, TypeScript, styling, formatting, tests, and CI.
2. Add Neon, Drizzle schemas, migrations, and seed data.
3. Add Better Auth, admin bootstrap, invitation flow, and authorization.
4. Build schedule views and conflict-safe booking operations.
5. Build user, room, invite-code, and audit administration.
6. Polish responsive visuals, accessibility, animation, and error states.
7. Configure Datadog-hosted scans, GitHub Actions, PR feedback, and gates.
8. Add the isolated Docker runtime-security lab.
9. Deploy to Vercel Hobby, run end-to-end checks, and document the Datadog evaluation.

## Explicitly out of scope for the first release

- Recurring meetings
- Calendar integrations
- Email delivery and email verification
- Self-service password reset
- Multiple offices or timezones
- Approval workflows
- Catering, equipment checkout, or visitor management
- Native mobile applications

## Cost target

- GitHub public repository: free
- Vercel Hobby: free for this personal portfolio project
- Neon Postgres Free: free
- GitHub Actions for the public repository: free within GitHub's public-repository offering
- Datadog Code Security: 14-day trial, then disabled unless intentionally retained

