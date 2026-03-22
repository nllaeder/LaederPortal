# LaederPortal - Decisions Log

Architectural and technical decisions made during design and development.
Record new decisions here as they are made.

---

## Database

**Decision**: Supabase (hosted Postgres)
**Date**: Early 2026
**Rationale**: Free tier sufficient for current scale. Built-in Row Level
Security removes the need for application-level authorization logic.
Built-in Auth handles magic links and Google OAuth natively. Single
platform for database, auth, and REST API.

---

## File Storage

**Decision**: Google Drive
**Date**: Early 2026
**Rationale**: Already in daily use. Shareable folder links are familiar
to clients. No new storage cost. Drive's permission inheritance model
maps naturally to the client/project folder hierarchy.

---

## Financial Source of Truth

**Decision**: Wave Accounting
**Date**: Early 2026
**Rationale**: Existing billing system. No migration required. GraphQL
API available. Clients, estimates, and invoices already managed here.

---

## Authentication

**Decision**: Magic Link + Google OAuth via Supabase Auth
**Date**: Early 2026
**Rationale**: No passwords for clients to forget or manage. Magic link
is universally accessible. Google OAuth is familiar and frictionless for
clients already using Google. Supabase Auth handles both natively.

---

## Authorization Architecture

**Decision**: RLS at database layer; no authorization logic in frontend
**Date**: Early 2026
**Rationale**: Enforcing access control at the database layer is more
secure than enforcing it in the frontend. Even if a client navigates to
a URL they should not access, Supabase will return no data. The frontend
simply renders what it receives.

---

## Supabase API Access Method

**Decision**: Supabase client SDK only; never raw HTTP to PostgREST
**Date**: March 2026
**Rationale**: Supabase migrated to a new API key format (sb_secret_...)
that is not a JWT. Raw HTTP requests to the PostgREST endpoint require
a JWT and will fail with "Expected 3 parts in JWT; got 1". The Supabase
client SDK handles the new key format correctly.

---

## Wave Sync Strategy

**Decision**: Poll every 20 minutes via Vercel Cron → Next.js API route
**Date**: March 2026
**Rationale**: Wave does not support reliable outbound webhooks. Polling
is the only available strategy. 20 minutes is a reasonable balance
between data freshness and API rate limit headroom. Vercel Cron keeps
the sync logic within the same deployment as the frontend, avoiding a
separate service dependency.

---

## Upsert Key

**Decision**: wave_id (Wave's unique entity identifier)
**Date**: March 2026
**Rationale**: wave_id is stable, unique per entity type, and present
on every record returned by Wave. It provides a reliable conflict key
for upsert operations without requiring a prior lookup.

---

## wave_client_id Storage

**Decision**: Store as TEXT string; do not resolve to Supabase UUID
**Date**: March 2026
**Rationale**: Resolving wave_client_id to the Supabase clients.id UUID
during sync requires an additional database lookup per record, adding
complexity and latency to every sync run. RLS policies and application
queries can join through wave_client_id without UUID resolution. This
can be revisited if query performance becomes an issue.

---

## Protected Fields During Sync

**Decision**: Never overwrite google_folder_id or portal_enabled from Wave
**Date**: March 2026
**Rationale**: These fields are managed by the folder provisioning logic
and admin controls respectively. Wave has no knowledge of them. Allowing
Wave sync to overwrite them would destroy provisioning state.

---

## Private Project Folders

**Decision**: Break Drive permission inheritance on _Internal subfolder
**Date**: March 2026
**Rationale**: Clients must not see internal notes or draft documents.
Breaking inheritance at the subfolder level is the simplest and most
reliable approach in Google Drive. Alternatively hiding the folder via
API would require extra logic on every file read.

---

## Frontend Deployment

**Decision**: Vercel
**Date**: Early 2026
**Rationale**: Native Next.js deployment with zero configuration.
Vercel Cron Jobs support the scheduled Wave sync without a separate
service. Automatic preview deployments for PRs.

---

## Development Tool

**Decision**: Google Antigravity
**Date**: March 2026
**Rationale**: Agent-first development platform with strong TypeScript
and Next.js support. Plan Mode allows review of implementation plans
before code is written. Multi-agent Manager Surface suits the
parallel workstreams in this project (sync, provisioning, frontend).

---

## Notifications

**Decision**: Telegram bot
**Date**: Early 2026
**Rationale**: Instant delivery, zero client setup for the recipient,
reliable push notifications on mobile. Simple API. No cost.

---

## DNS and Routing

**Decision**: Cloudflare DNS with proxy enabled
**Date**: March 2026
**Rationale**: SSL termination at the edge, DDoS protection, and caching
at no meaningful cost. Cloudflare Access available as an optional
zero-trust layer for the admin route without touching application code.