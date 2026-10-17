# Update: database, photos and responsive UI

See [BACKEND_SETUP.md](BACKEND_SETUP.md) for the current implementation and live configuration steps. The text below is retained as historical setup context; statements about missing server routes refer to earlier commits.

# Current integration status — 16 October 2026

Firebase client authentication is now initialized with the registered public web app for `softwarewebsite-861b4`. `/account.html` provides Google/email login, signup, password reset, email verification and sign out. Sessions use tab-level persistence. Firebase manages credentials; no Admin secret is included.

The owner reported configuring Firestore Standard, default database in Bangkok, production mode, Google and Email/Password providers, a 15-character minimum password policy, email enumeration protection, and authorized domain `softwarewebsite-brown.vercel.app`. These settings were supplied through screenshots, not independently verified through administrator access.

Run `npm ci`, `npm test`, and `npm run build`. Test Google sign-in and email signup/reset on the deployed account page. Automated tests use simulated auth callbacks; they do not verify the live project configuration.

The old prototype PIN and local form submissions have been removed. Public content remains sample data and submissions are unavailable. Firestore rules/index deployments, server API integration, Redis and App Check are still pending. Keep the existing production-mode deny rules until scoped rules and APIs are ready.

The following is the earlier security planning reference; descriptions of absent client SDK/PIN integrations below refer to the previous stage.

---

# Firebase setup and current security status

Target project supplied by the owner: `softwarewebsite-861b4`.
Updated 15 October 2026.

**The Firebase console is still signed out in the agent's browser. No live Firebase settings, rules, indexes, users, or databases have been changed.** The database edition, ID, mode and region have not been verified. The site remains a local-storage prototype; the new server modules are not yet called by its forms.

## Abhi Firebase Console mein kya karna hai

1. Firebase Console mein `softwarewebsite-861b4` select karo. Project settings mein project ID verify karo.
2. **Firestore Database** kholo (console version ke mutabiq **Build** ya **Databases & Storage** ke andar). Agar database bana hua hai, uska ID, edition (Standard/Enterprise), mode aur location ka screenshot bhejo. Agar **Create database** dikhe, pehle woh batao. Region select karne se pehle Vercel server ki location agree karni hai; existing database ki location change nahi hoti. Test mode mein public access enable mat karo.
3. **Authentication → Get started → Sign-in method** kholo (naye console mein Authentication **Security** ke andar ho sakta hai). Google provider enable kar sakte ho, apna support email select karke. Agar website par email/password login chahiye to **Email/Password** bhi enable karo. Phone aur anonymous providers abhi required nahi.
4. Email/password use karne par **Authentication → Settings → Password policy** mein policy configure karo. Is project ki proposed policy: Require mode, minimum 15 characters, maximum 128. Yeh hamari application choice hai, Firebase ka default nahi. Web signup UI ko isi policy ki validation use karni hogi.
5. Authentication settings mein **Email enumeration protection** enabled verify karo. Authorized domains mein sirf actual development/production hostnames rakho; protocol, path aur port nahi. Vercel domain abhi decide nahi hua; koi guessed domain add mat karo.
6. **Project settings → General → Your apps → Web** mein `society-web` register karo agar web app pehle se nahi. Vercel par host karna hai, is liye Firebase Hosting setup required nahi. Firebase web config baad mein client app integrate karne ke liye chahiye; yeh Admin access nahi deta.

Password, OTP, refresh token ya service-account private key chat/GitHub mein nahi bhejni. Console login aur website end-users ka Firebase Authentication login alag cheezein hain.

## Password hashing

Email/password accounts ke passwords Firebase Authentication receive aur hash karta hai; Firebase apna modified scrypt use karta hai. Hum password ko Firestore, Redis, logs, browser local storage ya custom API mein save nahi karenge. Google sign-in par Google account password hamari application ko milta hi nahi.

Apna bcrypt/hash layer Firebase login se pehle lagana required nahi. Password reset aur email verification bhi Firebase Auth ke flows se honge. Console provider enable karna frontend login implement karne ke barabar nahi.

## Implemented in this repository

- `server/security/authorize.mjs`: a server helper accepting a real Firebase Admin Auth instance. It calls `verifyIdToken(token, true)`, checks the intended project, verified email, current user status and current server-managed custom claim `role`. Unknown operations/roles are denied. It never grants admin access from an email address, request body or browser state.
- `server/security/submissions.mjs`: bounded JSON parsing (16 KiB actual bytes), strict allowed fields and limits for contact/suggestion submissions. User-supplied roles, owner IDs, timestamps and approval fields are rejected. Incoming text still needs escaped rendering in the eventual UI.
- `server/security/errors.mjs`: generic errors and private/no-store error responses.
- `tests/security.test.mjs`: negative authorization and validation tests using simulated Firebase Auth responses. Run `npm test` with Node 22+; no package download or credentials needed.

These are executable building blocks, **not deployed API routes**. Tests do not verify Firebase signatures themselves; the real Admin SDK must do that. No Firebase SDK is installed or initialized by this commit. Admin SDK/emulator integration tests remain pending.

## Permission policy used by the helper

| Action | Member | Editor | Admin |
| --- | --- | --- | --- |
| Submit suggestion/contact/alumni application | Yes, verified email | Yes | Yes |
| Manage public content | No | Yes | Yes |
| Read private inbox and moderate alumni | No | No | Yes |
| Change site settings | No | No | Yes |
| Assign roles through website API | No | No | No |

Public browsing will remain open. The first implementation assumes signed-in, verified users for submissions. An anonymous contact form would need its own deliberately protected flow. The first admin and subsequent role changes require a trusted operator process with an audit trail; no public role-assignment endpoint exists. Role-management tooling has not been implemented.

The helper reads current Auth user claims each time so a demotion affects subsequent authorization checks, rather than waiting for an old ID token to expire. Requests already in flight are not cancelled. This adds Auth service calls; measure latency and quotas before adding any authorization cache. An Auth outage fails closed with 503.

## Indexing: next step after identifying the database

Indexes speed up specific filter/sort queries; they do not grant access and do not replace security rules. Every index increases write/storage work. We will select the actual index definitions for the verified edition and the queries the application implements. No index configuration has been deployed or guessed here.

The existing production plan identifies the intended queries: published notices/posts by publication time, events by date, cabinet members by session/order, and private inboxes by moderation state/time. Queries must use bounded page sizes and cursor pagination. Long message/description fields should not be indexed unless the chosen query requires them. Avoid one query fetching every record and avoid offsets for large lists.

Do not manually seed private records or create broad indexes yet. After edition/region verification, add the matching security-rules/index files, test the client restrictions in the Firebase emulator, deploy to the exact project/database, then verify index readiness. This commit intentionally has no `firebase.json` or Firestore deployment command because the target instance is unverified.

## Remaining production integration

1. Identify the database edition/mode/ID and choose a region if creation is needed. Record dev and production targets separately.
2. Install and lock compatible Firebase client/Admin SDK versions in the actual application; initialize Admin only in server code with least-privilege credentials. Keep emulator configuration out of production. Do not give the web runtime Owner/Editor IAM roles.
3. Replace prototype PIN/localStorage flows with real sign-in and API routes. Call authorization and input validation before every database mutation. Set owner/status/timestamps on the server. Use explicit public response fields so private details cannot leak through a spread of a database document.
4. Use a server-mediated database policy: direct browser business-data writes and private reads denied. Admin SDK bypasses Firestore rules, so route authorization and IAM are mandatory. Add tested rules for the verified edition; no permissive temporary rules.
5. Add shared Redis rate limits before expensive operations, with verified-user limits after authentication. Use only trusted hosting-provided IP information. Limiter failure must reject protected mutations with 503; return 429 and retry time when limited. These controls are not implemented by this commit.
6. Add App Check to the web client and verify its token on custom API routes; enable provider enforcement only after legitimate requests are verified. It supplements Auth/permissions/rate limits and does not replace them.
7. Add the matching indexes, publication queries, transactions/idempotency, and public-only cache invalidation. Private responses use no-store. Do not put tokens/private forms/authorization decisions in a shared public cache.
8. Configure budget alerts, operational logs without private message bodies, and an approved backup/restore policy. Check costs before enabling paid features. Test a restore, permissions, rate-limit failures and real login before public launch.

## Primary references checked

- [Firebase password authentication and password policy](https://firebase.google.com/docs/auth/web/password-auth)
- [Firebase password hashing/import format](https://firebase.google.com/docs/auth/admin/import-users)
- [ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Revocation checks](https://firebase.google.com/docs/auth/admin/manage-sessions)
- [Server-managed custom claims](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Email enumeration protection](https://docs.cloud.google.com/identity-platform/docs/admin/email-enumeration-protection)
- [Firestore database management](https://firebase.google.com/docs/firestore/manage-databases)
- [Firestore indexing and query best practices](https://firebase.google.com/docs/firestore/best-practices)
- [Server client libraries and IAM](https://docs.cloud.google.com/firestore/native/docs/reference/libraries)
- [App Check on custom backends](https://firebase.google.com/docs/app-check/custom-resource-backend)
