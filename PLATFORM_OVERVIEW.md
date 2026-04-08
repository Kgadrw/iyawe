# SUBIZWA (Iyawe) Platform Overview

This document describes how the platform works when positioned as **SUBIZWA SYSTEM** (a secure lost credential reporting and notification system supervised by **Rwanda National Police (RNP)**), implemented in this repository under the project name **Iyawe**.

---

## What the platform serves

**SUBIZWA (Iyawe)** is a **secure, centralized lost credential registry and recovery workflow** for sensitive documents (National IDs, passports, driving licenses, academic certificates, health insurance cards, etc.). It connects:

- **Citizens** who lost a credential (report lost, search, track status, submit claim/verification).
- **RNP officers** (`OFFICER`) and **RNP-approved institutional personnel** (`INSTITUTION`) (register found credentials, supervise verification and handover).
- **Institutions / handover points** (banks, hospitals, universities, bus parks, police stations, sector offices) that participate as authorized intake and safe handover locations.

**Core value:** reduce delays and fraud risk by providing a structured pipeline: **register found → match → notify → verify (RNP-supervised) → handover**, with document numbers handled carefully (masked display; hashing utilities where used).

The proposal scope focuses on **credential recovery** (not replacement issuance, not biometrics, not non-credential items).

---

## System architecture (three clients, one API)

| Layer | Role | Typical URL |
|--------|------|-------------|
| **Citizen web app** | Next.js (App Router): login, lost report, search, matches, verification, notifications | `http://localhost:3000` |
| **RNP admin dashboard** | Separate Next.js app: admins (`ADMIN` role) monitor documents, matches, users, and handover points | `http://localhost:3001` |
| **Backend API** | Express + TypeScript + MongoDB (native driver): auth, reports, matching, verification, search, admin, institutions | `http://localhost:5000` |

The frontends call the backend via `NEXT_PUBLIC_API_URL` (see `FRONTEND_BACKEND_CONNECTION.md`). JWT auth and cookies are used for session-style access patterns described in that guide.

---

## Main data lifecycle

1. **Authentication** — Users register and log in; JWT identifies the user for protected routes.
2. **Lost report (citizen)** — A **lost** report is stored in MongoDB (`lostReports`) with credential type, optional document number, location/date, and status (`PENDING`, `MATCHED`, `VERIFIED`, etc.).
3. **Found credential registration (authorized)** — A **found** report is stored in MongoDB (`foundReports`) by an authorized registrar (RNP/admin account or RNP-approved institution account).
4. **Matching** — When a new lost or found report is created, the backend runs the matching routine against **pending** reports of the **same document type** and inserts records into **`matches`** when confidence ≥ threshold.
5. **Notification** — When matches are created (especially exact-number matches), the system records **in-app notifications** for the owner and for admins. (SMS/email delivery can be added on top of the same events.)
6. **Verification (RNP-supervised)** — For a match, a **verification record** can be created with a **random code**. The owner proves identity by entering that code **and** the document number from the lost side; on success, match and both reports move toward `VERIFIED`.
7. **Handover** — Final handover/collection is performed through designated handover points under RNP operational control (tracked by status + admin workflow).

---

## Matching algorithm (how “smart matching” works)

Implementation: `backend/src/lib/matching.ts`.

**Inputs considered:**

- **Document type** — Must match; otherwise confidence is **0** and no match is created.
- **Document numbers** (when both sides provide them):
  - **Exact match:** SHA-256 hash of normalized string (`trim`, `toLowerCase`) — adds strong weight and marks an exact match on the found-report path.
  - **Partial match:** First **4 characters** (case-insensitive) equal — adds a smaller weight.
- **Location** — If both have location: exact string match after normalize, or **substring containment** either way — adds a small bonus.
- **Date** — If lost date exists: **found date on or after** lost date, within **30 days**, adds a decaying bonus (farther apart in time → smaller addition).

**Scoring:** Weights are summed (type, number, location, date) and **capped at 1.0**.

**Threshold:** A **match is only created** if **confidence ≥ 0.3**.

**Triggers:**

- After inserting a **lost** report → `findMatchesForLostReport` scans pending **found** reports of that type.
- After inserting a **found** report → `findMatchesForFoundReport` scans pending **lost** reports of that type.

**Security helper:** `hashDocumentNumber` is used for comparing document numbers without storing raw equality checks in plain form for the hash path; display can use masked partials via `getPartialDocumentNumber`.

---

## Verification algorithm

Implementation: `backend/src/lib/verification.ts`.

1. **Create verification** — For a given `matchId`, if none exists, generate **16 hex chars** (8 random bytes, uppercase) as `verificationCode` and persist a **verification** row linking the match to lost/found report IDs.
2. **Verify ownership** — User submits `verificationCode` + `documentNumber`:
   - Code must exist and not already be used (`isVerified`).
   - Document number must **match the lost report’s** stored document number (case-insensitive string compare).
3. **On success** — Set verification verified timestamp; set **match** and **both reports** to `VERIFIED`.

This binds **“has the code”** with **“knows the document number on the lost side”** to reduce fraudulent claims.

---

## Backend service surface (Express)

Mounted in `backend/src/index.ts`:

| Prefix | Purpose |
|--------|---------|
| `/api/auth` | Register, login, logout |
| `/api/reports` | Create/list lost and found reports (matching runs on create) |
| `/api/matches` | Match operations (e.g. verification initiation by match id) |
| `/api/verify` | Ownership verification with code |
| `/api/search` | Search |
| `/api/documents` | Latest documents and related |
| `/api/admin` | Admin-only operations (e.g. all documents, reports by type) |
| `/api/institutions` | Institution-related APIs |
| `/api/notifications` | In-app notifications (admin + users) |

`GET /health` returns API health for monitoring.

---

## Tech stack summary

- **Frontends:** Next.js 14, TypeScript, Tailwind / Radix (as in repo docs).
- **Backend:** Node, Express, TypeScript, MongoDB native driver, Zod validation, JWT (e.g. `jose` per backend README).
- **Database:** MongoDB; indexes initialized on server start (`db-init`).

> Your proposal may list newer framework versions (e.g., Next.js 16 / React 19). The platform’s **architecture and security workflow** match SUBIZWA; version numbers can be updated later without changing the conceptual system design.

---

## Related docs in this repo

- `README.md` — Product features and root Next.js layout (may also describe Prisma in some setups; **runtime matching** for the Express backend is in `backend/src/lib/matching.ts`).
- `backend/README.md` — API and backend setup.
- `FRONTEND_BACKEND_CONNECTION.md` — How `NEXT_PUBLIC_API_URL` and `lib/api.ts` tie clients to the API.
- `admin-dashboard/README.md` — Admin app and port **3001**.

---

## Mapping Iyawe to the “SUBIZWA System” concepts

Your proposal describes **SUBIZWA** as an **RNP-supervised, centralized lost credential reporting + notification system**. Iyawe already implements many of the same building blocks; the main work is **tightening roles/workflows** (who can register found credentials) and **adding notifications + accountability controls**.

### Concept-by-concept alignment (proposal ↔ current platform)

| SUBIZWA concept (proposal) | What it means in the proposal | Iyawe today | What to adjust to fully match SUBIZWA |
|---|---|---|---|
| **Centralized digital registry** | One national database for found credentials + lost claims | ✅ Central MongoDB collections for lost/found + matches | Mostly aligned; ensure indexing + retention policies for national scale |
| **RNP/authorized personnel register found credentials** | Only officers / approved institutions can input found credentials | ✅ Enforced on backend: `POST /api/reports/found` requires `ADMIN`, `OFFICER`, or `INSTITUTION` | Ensure officer accounts are provisioned by RNP (not public self-registration) |
| **Citizen portal: search + monitor status** | Citizens search, track recovery steps | ✅ Search endpoints exist; report statuses exist (`PENDING`, `VERIFIED`, etc.) | Add a clearer “claim / tracking” workflow if you want proposal-style “monitor recovery process” UX |
| **Automated match detection** | When found credential is registered, system finds likely owners | ✅ Matching is automatic on report creation with confidence scoring | Consider improving matching for “official credentials” (e.g., safer partial matching rules than first 4 chars; more robust location/date normalization) |
| **Notification (SMS + Email)** | Citizen gets SMS/email when match is found | ✅ In-app notifications exist on match creation; SMS/email is not yet integrated | Add SMS/email gateways (e.g., Twilio + SMTP) and trigger them when notifications are created or when matches become “exact/verified” |
| **RNP-supervised verification** | Police supervise claim verification before handover | ✅ Verification exists: code + doc number check; statuses become `VERIFIED` | Extend verification to officer workflow: officer approves handover; log officer ID; add optional in-person verification steps (proposal scope excludes biometrics, so this can be manual) |
| **Role-Based Access Control (RBAC)** | Citizen vs officer vs admin permissions | ✅ Roles implied (`ADMIN` for admin dashboard) | Enforce RBAC across backend routes (officer-only create found credential, admin-only reports overview, etc.) and model explicit roles for RNP + institutions |
| **Audit logs / accountability** | Every state-changing action recorded | ⚠️ Not yet implemented as a dedicated `auditLogs` collection | Add `auditLogs` collection + middleware to record: user, role, action, entity id, before/after status, timestamp, IP/user-agent |
| **Multi-agency / institution network** | Banks, hospitals, bus parks, etc. act as authorized intake points | ✅ `/api/institutions` exists; “institution” idea exists in docs | Ensure institution onboarding + authorization by RNP; tie found report records to an institution + registering officer/personnel |
| **Fraud risk minimization** | Reduce misuse of credentials | ✅ Hashing is used for comparison in matching; verification requires code + number | Improve privacy model for citizens: avoid exposing found details; show partial masked numbers; consider storing hashed doc numbers and only collecting full number during verification |

### How to position Iyawe as “SUBIZWA” in the report (wording)

If you want your proposal text to match the platform you have now, the clean narrative is:

- **Iyawe is already a centralized web platform** with an API, database, matching, verification, admin dashboard, and institution endpoints.
- To match **SUBIZWA**, the platform’s operational policy becomes: **only RNP/authorized personnel register found credentials**, while citizens mainly **report lost**, **search**, **get notified**, and **claim/verify** under RNP supervision.
- The remaining engineering items are **notifications (SMS/email)** and **audit logging**, plus stricter **RBAC** around found registration.

### Concrete “gap → feature” checklist to meet SUBIZWA objectives

- **Objective 1 (secure centralized database)**: already present; add **audit logs**, stronger indexes, and retention rules.
- **Objective 2 (citizen reporting + monitoring)**: already present; add explicit **claim tracking states** and UI cues.
- **Objective 3 (claim verification)**: verification exists; add officer-supervised steps + approvals + logged actor.
- **Objective 4 (SMS notifications)**: implement SMS/email notification service + match-triggered events.
- **Objective 5 (transparency/efficiency)**: audit logs + status timeline + notifications deliver this.

*Generated as a high-level architecture and behavior reference for the Iyawe codebase.*
