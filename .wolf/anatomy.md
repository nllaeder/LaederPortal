# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-04-05T22:43:53.473Z
> Files: 52 tracked | Anatomy hits: 0 | Misses: 0

## ./

- `.DS_Store` (~2186 tok)
- `.gitignore` — Git ignore rules (~107 tok)
- `AGENTS.md` — AGENTS.md - LaederPortal (~1341 tok)
- `CLAUDE.md` — OpenWolf (~1204 tok)
- `eslint.config.mjs` — ESLint flat configuration (~124 tok)
- `laederportal-service-account.json` (~673 tok)
- `next-env.d.ts` — / <reference types="next" /> (~72 tok)
- `next.config.ts` — Next.js configuration (~38 tok)
- `package-lock.json` — npm lock file (~70580 tok)
- `package.json` — Node.js package manifest (~199 tok)
- `postcss.config.mjs` — Declares config (~26 tok)
- `README.md` — Project documentation (~26 tok)
- `test-drive-direct.js` — Direct test of Google Drive functionality without Next.js (~1287 tok)
- `test-provision.cjs` — googleapis: getDriveClient, createFolder, shareFolder, run (~1022 tok)
- `test-provision.ts` — Declares run (~302 tok)
- `test-simple-provision.js` — Simple test for Google Drive provisioning (~242 tok)
- `tsconfig.json` — TypeScript configuration (~192 tok)
- `vercel.json` (~35 tok)

## .claude/

- `settings.json` (~441 tok)
- `settings.local 2.json` (~109 tok)
- `settings.local.json` — Declares for (~1931 tok)

## .claude/rules/

- `openwolf.md` (~313 tok)

## doc/

- `decisions.md` — LaederPortal - Decisions Log (~1246 tok)
- `schema.sql` — Database schema (~2244 tok)
- `spec.md` — LaederPortal - Technical Specification (~1435 tok)
- `wave-api.md` — Wave API Reference (~1490 tok)

## src/

- `middleware.ts` — Exports middleware, config (~892 tok)

## src/app/

- `globals.css` — Styles: 3 rules, 8 vars, 1 media queries (~140 tok)
- `layout.tsx` — geistSans (~250 tok)
- `page.tsx` — Home (~145 tok)

## src/app/admin/

- `page.tsx` — AdminPage (~1349 tok)

## src/app/admin/clients/new/

- `page.tsx` — NewClientPage — renders form (~2459 tok)

## src/app/admin/projects/new/

- `page.tsx` — NewProjectPage — renders form (~3688 tok)

## src/app/api/cleanup/

- `route.ts` — Next.js API route: POST (~1009 tok)

## src/app/api/debug/

- `route.ts` — Next.js API route: GET (~556 tok)

## src/app/api/drive/files/

- `route.ts` — Next.js API route: GET (~627 tok)

## src/app/api/drive/upload/

- `route.ts` — Next.js API route: POST (~713 tok)

## src/app/api/provision/

- `route.ts` — Manual provisioning endpoint for testing (~947 tok)

## src/app/api/sync/wave/

- `route.ts` — Next.js API route: GET (~1862 tok)

## src/app/api/test-db/

- `route.ts` — Next.js API route: GET (~271 tok)

## src/app/auth/callback/

- `route.ts` — Next.js API route: GET (~740 tok)

## src/app/dashboard/

- `page.tsx` — DashboardPage — uses useState, useEffect (~2202 tok)

## src/app/login/

- `page.tsx` — LoginPage — renders form (~1193 tok)

## src/app/project/[id]/

- `page.tsx` — ProjectPage — renders table — uses useParams, useRouter, useState, useEffect (~4181 tok)

## src/components/

- `navigation.tsx` — Navigation (~494 tok)

## src/contexts/

- `auth-context.tsx` — AuthContext (~821 tok)

## src/lib/

- `drive.ts` — Initializes the Google Drive client using the service account key. (~844 tok)
- `provisioning.ts` — Main entry point for folder provisioning. (~2100 tok)
- `supabase-client.ts` — Supabase client for client-side operations. (~214 tok)
- `supabase.ts` — Supabase client initialized with the service role key. (~337 tok)
- `telegram.ts` — Sends a notification to the configured Telegram bot. (~412 tok)
- `wave.ts` — Exports fetchWaveCustomers, fetchWaveEstimates, fetchWaveInvoices (~1078 tok)
