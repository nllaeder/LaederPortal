# AGENTS.md - LaederPortal

## Project Identity

LaederPortal is a client portal and project management system for a small
engineering consulting practice. It automates project provisioning from
Wave Accounting into Google Drive and exposes files to clients through a
branded self-serve portal.

Source of truth: Wave Accounting.
Database: Supabase (Postgres + Auth + RLS).
File storage: Google Drive.
Frontend: Next.js / TypeScript, deployed on Vercel.
Notifications: Telegram bot.

The full technical specification lives in /doc/spec.md.
Wave GraphQL query reference lives in /doc/wave-api.md.
Database schema lives in /doc/schema.sql.

---

## Coding Standards

- TypeScript everywhere. No JavaScript files.
- Use async/await. Never raw Promise chains.
- All functions must have explicit return type annotations.
- Prefer named exports over default exports.
- Use descriptive variable names. No single-letter variables outside
  of loop indices.
- Error handling must be explicit. Never silently swallow errors.
- All errors must route to the Telegram notification system. See the
  Error Handling section below.

---

## Critical Rules - Read Before Writing Any Code

These are non-negotiable. Violating any of these will break the system.

### Supabase Access
- ALWAYS use the Supabase client SDK.
- NEVER make raw HTTP requests to the PostgREST endpoint.
- Reason: The new Supabase key format (sb_secret_...) is not a JWT and
  will be rejected by PostgREST with "Expected 3 parts in JWT; got 1".
- Import pattern: import { createClient } from '@supabase/supabase-js'

### Wave Sync - Protected Fields
- NEVER overwrite google_folder_id during a Wave sync operation.
- NEVER overwrite portal_enabled during a Wave sync operation.
- These fields are managed by the folder provisioning logic only.
- Upsert strategy: ON CONFLICT (wave_id) DO UPDATE, excluding
  google_folder_id and portal_enabled.

### Wave API - Known Schema Quirks
These were discovered through testing. Do not attempt to "fix" them.
- AREstimate type has NO status field. Do not query it.
- Use dueDate on estimates, not expiresAt (does not exist).
- Use lastViewedAt on estimates, not viewedByCustomerAt (does not exist).
- Invoice type DOES have a status field:
  DRAFT | SENT | VIEWED | PAID | PARTIAL | OVERDUE | UNPAID
- All monetary values are nested: e.g., amountDue { value }. Extract .value
- Currency is nested: currency { code }. Extract .code.
- Customer reference on estimates/invoices: customer { id name }.
  Store id as wave_client_id (string). Do not resolve to a Supabase UUID.

### Row Level Security
- RLS is enforced at the database layer. The frontend does NOT implement
  authorization logic.
- The frontend handles authentication only: login, session management,
  protected route redirects, and logout via Supabase Auth SDK.
- The frontend renders whatever Supabase returns and trusts that RLS
  has filtered it correctly.
- Do not add client-side data filtering as a substitute for RLS.

### Google Drive - Private Folders
- Every project has an _Internal subfolder.
- _Internal MUST have its permission inheritance explicitly broken.
- _Internal is NEVER shared with clients under any circumstances.

---

## Authentication Architecture

Authentication (who are you?) is handled in the frontend:
- Supabase Auth client SDK manages sessions and tokens.
- Magic link and Google OAuth are both supported.
- Protected routes redirect unauthenticated users to /login.
- Session is persisted client-side via Supabase Auth SDK.

Authorization (what can you see?) is handled at the database:
- Supabase RLS policies control data access.
- Frontend has no authorization logic.
- Admin role is set in Supabase user metadata, used only for UI rendering.

---

## Error Handling

All errors - in sync logic, folder provisioning, or API calls - must:
1. Be caught explicitly (no uncaught promise rejections).
2. Log the error locally.
3. Send a Telegram notification including:
   - Entity type (client, estimate, invoice, folder)
   - Wave ID of the affected record (if applicable)
   - Error message

Telegram notification is not optional. Silent failures are not acceptable.

---

## Folder Structure (Google Drive)

LaederPortal/
  [Client Name]/
    [Project Title - Number]/
      Drawings/
      Permits/
      Estimates/
      Invoices/
      Reports/
      Photos/
      Client Uploads/
      _Internal/    <-- permission inheritance broken, never shared

When provisioning:
1. Check if client parent folder exists via client.google_folder_id.
2. If not, create it, share with client email, write ID to Supabase.
3. Create project subfolder with all standard subfolders.
4. Create _Internal, break inheritance, write project folder ID to
   the estimate or invoice record in Supabase.

---

## Database Upsert Pattern

All Wave sync operations use upsert, not insert.
Match key: wave_id (unique per entity type).
Pattern: insert ... on conflict (wave_id) do update set ...
Never overwrite: google_folder_id, portal_enabled.

---

## Task Execution (Antigravity-Specific)

- Use Plan Mode for all multi-file tasks. Do not skip the plan review.
- One clear mission per task. Do not combine unrelated changes.
- After completing a task, verify against the spec in /doc/spec.md.
- When in doubt about Wave API field names, check /doc/wave-api.md.
  Do not guess field names. The schema has known quirks (see above).
- When adding a new dependency, note it in /doc/decisions.md with the
  reason for the choice.
