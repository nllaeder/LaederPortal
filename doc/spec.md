# LaederPortal - Technical Specification

## System Overview

LaederPortal is a client portal and project management system for a small

engineering consulting practice. It connects Wave Accounting (financial

source of truth) to Google Drive (file storage) and exposes the result

to clients through a branded, authenticated web portal.

When a project is financially initiated in Wave, the system automatically

creates a standardized folder structure in Google Drive and makes the

project visible to the correct client in the portal. Clients log in once

and see all current and historical projects.

---

## Architecture

### Components

| Component       | Technology              | Role                                    |

|-----------------|-------------------------|-----------------------------------------|

| Database        | Supabase (Postgres)     | All application data, auth, RLS         |

| Authentication  | Supabase Auth           | Magic link, Google OAuth, sessions      |

| File storage    | Google Drive            | All project documents                   |

| Financial data  | Wave Accounting API     | Source of truth for clients/projects    |

| Frontend        | Next.js / TypeScript    | Client portal, admin dashboard          |

| Deployment      | Vercel                  | Frontend hosting, scheduled sync jobs   |

| Notifications   | Telegram bot            | All system alerts and errors            |

### Data Flow

1. Wave Accounting holds client, estimate, and invoice records.

2. A scheduled sync (Vercel Cron → Next.js API route) polls Wave every

   20 minutes and upserts data into Supabase.

3. A folder provisioning process checks Supabase for any estimates or

   invoices with no google_folder_id and creates the Drive structure.

4. The Next.js frontend reads from Supabase. Supabase RLS ensures each

   client sees only their own data.

5. All system errors trigger a Telegram notification.

---

## Authentication and Authorization

### Authentication (frontend responsibility)

- Handled via Supabase Auth client SDK

- Supported methods: Magic Link, Google OAuth

- Session is persisted client-side by the SDK

- Protected routes redirect unauthenticated users to /login

- Logout clears the Supabase session

### Authorization (database responsibility)

- Enforced by Supabase Row Level Security on all tables

- Frontend contains NO data-level authorization logic

- Frontend renders whatever Supabase returns

- Admin role is stored in Supabase user metadata for UI rendering only

  (e.g., showing the admin dashboard link) - not for data access control

### Client Identity Resolution

- Clients are matched to their Supabase auth session by email

- The email on the Supabase auth user matches the email on the

  clients table

- RLS policies enforce this match at query time

---

## Wave Sync

### Schedule

Every 20 minutes via Vercel Cron triggering a Next.js API route.

### Entities Synced

- Customers → clients table

- Estimates → estimates table

- Invoices → invoices table

### Upsert Strategy

- Match on wave_id (Wave's unique identifier per entity)

- INSERT ... ON CONFLICT (wave_id) DO UPDATE

- Never overwrite: google_folder_id, portal_enabled

- All other fields are always updated from Wave

### Sync Order

Customers must sync before estimates and invoices.

wave_client_id on estimates/invoices is a Wave ID string reference,

not a resolved Supabase UUID. FK resolution is not performed during sync.

---

## Google Drive Integration

### Authentication

Google Cloud OAuth2. Credentials configured in Google Cloud Console.

Drive API and Gmail API both enabled.

### Folder Structure

LaederPortal/

[Client Name]/                        ← created on first project

[Project Title - Number]/           ← created per estimate/invoice

Drawings/

Permits/

Estimates/

Invoices/

Reports/

Photos/

Client Uploads/

### Provisioning Logic

Triggered after every Wave sync for records where google_folder_id IS NULL.

1. Check clients.google_folder_id. If null, create client parent folder,

   share with client email, write Drive folder ID to clients.google_folder_id.

2. Create project subfolder with all standard subfolders.

3. Write the project folder Drive ID to estimates.google_folder_id or

   invoices.google_folder_id.

### Permission Model

- Client parent folder: shared with client email on creation

- Project subfolders: inherit client folder permissions

---

## Frontend - Portal Views

### /login

Magic link request form and Google OAuth button.

Redirect authenticated users to /dashboard.

### /dashboard (client)

List of all projects (estimates and invoices) for the authenticated client.

Shows: project title, number, date, status (invoices), amount.

Sorted by date descending.

### /project/[id]

File list from the Google Drive project subfolder.

Download links for all files.

Upload interface writing to Client Uploads subfolder.

Download links and upload interface only; no admin-only content shown.

### /admin

Full client list, all projects across all clients, system sync status.

Protected: only accessible to users with admin role in Supabase metadata.

---

## Error Handling

All errors must:

1. Be caught explicitly - no uncaught promise rejections.

2. Be logged.

3. Trigger a Telegram notification including entity type,

   Wave ID (if applicable), and error message.

---

## Environment Variables Required

NEXT_PUBLIC_SUPABASE_URL=

NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

WAVE_API_KEY=

WAVE_BUSINESS_ID=QnVzaW5lc3M6MTc3OTBmM2QtZTE5Zi00NWZjLWI5NTMtNzAxZDVmNTFkODI5

GOOGLE_CLIENT_ID=

GOOGLE_CLIENT_SECRET=

GOOGLE_DRIVE_ROOT_FOLDER_ID=

TELEGRAM_BOT_TOKEN=

TELEGRAM_CHAT_ID=