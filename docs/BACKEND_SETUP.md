# Backend setup and operating guide

## What is implemented

The Vite site has a Vercel Node function at `/api/portal`. Firebase Admin verifies tokens (including revocation) and retrieves current custom claims on every protected request. The default role is `member`; privileged access must be assigned by a trusted operator. All mutations require a verified account, validation and shared Redis quotas. Public content is cached by the CDN for 30 seconds; private responses are never cached.

The management page is `/admin.html`. Editors can manage events, notices, posts, cabinet members, gallery and public alumni entries. Admins additionally control site-wide photos and review private contact messages, suggestions and alumni applications. Saving does not send email notifications. The role editor does not exist in the web application: it cannot grant itself access.

## Live configuration still required

Code deployment does not create service credentials, enable billing, assign an administrator or deploy Firebase rules/indexes. No production database writes or paid resources were provisioned during implementation.

1. In the existing Vercel project, set these **Production-only** server environment variables. Never prefix them with `VITE_`, paste them in chat, or commit them:

   | Variable | Value |
   | --- | --- |
   | `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON service credentials for `softwarewebsite-861b4`; use a dedicated account with only required Firestore, Firebase Auth and optional Storage permissions, never Owner/Editor |
   | `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel's Upstash integration adds these server-only Redis credentials automatically. The backend also accepts `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` for manual setups. |
   | `SITE_ORIGIN` | `https://softwarewebsite-brown.vercel.app` |
   | `ENABLE_PHOTO_UPLOADS` | Keep `false` until Storage is configured; set `true` only after verifying it works |

   Obtain Firebase credentials in Project settings → Service accounts or configure a dedicated service account through Google Cloud IAM. Upload the JSON directly into the Vercel secret field. Use a separately scoped service account for operator role assignment if the runtime account cannot modify users. The runtime only needs Firebase Auth reads for validation; privileged custom-claim writes are for the operator script.

2. Deploy the checked-in Firebase rules and indexes using an authenticated Firebase CLI, targeting the **existing Standard `(default)` database**:

   ```sh
   firebase deploy --project softwarewebsite-861b4 --only firestore:rules,firestore:indexes
   ```

   Wait until the composite indexes show **Enabled**. Direct browser reads/writes are deliberately denied; all data flows through the server API. An index build delay must not be fixed by opening database rules.

3. Sign in with your own verified account, copy its UID from Firebase Authentication → Users, and run the operator script from a trusted environment with the server credential configured:

   ```sh
   node scripts/set-role.mjs YOUR_FIREBASE_UID admin
   ```

   This does not rely on a hardcoded email address. It revokes sessions after changing the role. Sign out and sign back in afterward. Do not share your password or OTP.

4. Redeploy the existing Vercel project after configuring environment variables. Check `/api/portal?action=public&kind=settings`, then `/admin.html`. A missing Redis configuration intentionally returns 503 rather than allowing writes without quotas. If configuration is missing, the homepage clearly shows sample content and disables submissions.

5. Optional file uploads: configure the project's `softwarewebsite-861b4.firebasestorage.app` bucket, review applicable Firebase billing requirements, deploy `storage.rules`, and grant the runtime account access to that bucket. Do not enable paid billing without the owner's approval. Set `ENABLE_PHOTO_UPLOADS=true` and redeploy only when ready. Hosted image URLs work without uploading files to Storage.

Preview deployments cannot access the production backend by default. Do not set `ALLOW_PREVIEW_BACKEND=true` casually: this code is locked to the production project, so a proper staging environment requires an explicit separately configured Firebase project and configuration update.

## How to change photos

Open Account → Manage website → Website photos (admin only). The five photo slots are homepage banner, HOD portrait and three About-section photos. Paste an HTTPS URL from Unsplash, Pexels, Cloudinary or this project's Firebase Storage, add an accessible description, then save. Event/cabinet/gallery/post/alumni photos are editable in Content.

For direct uploads, select a JPEG, PNG or WebP under 2 MB, press Upload selected photo, add its description and save the item. The server decodes and re-encodes the photo to WebP, strips source metadata, rejects SVG/animation and limits decoded pixels to 24 million and output dimensions to 1920 pixels. Uploaded images are public media with revocable download URLs; never upload private documents. Uploading alone does not change the public page. Unused uploads are retained; periodically review unused Storage objects and budget. Concurrent edits are rejected with 409 instead of overwriting another editor's save.

## Data model

- `content/{id}`: kind, publication status, whitelisted public data, version, createdAt and updatedAt. Lists use kind/status filters and `updatedAt DESC, documentId ASC`; 24 items per page plus one look-ahead. Frontend Load more uses opaque validated cursors.
- `settings/site`: public photo URL/description slots, current cabinet session and version.
- `submissions/{sha256(uid,kind,idempotencyKey)}`: private form fields, submitting UID, content hash, moderation status, version and timestamps. Repeating a request does not duplicate it. Changing the payload while reusing the key returns 409.
- `auditLogs/{id}`: actor UID, action, target path and timestamp, written atomically with editorial changes/moderation. No tokens or submitted message bodies are logged.

Alumni approval atomically creates a separate public profile with only consented name, batch, role and LinkedIn data. Application UID and consent metadata are not copied. Published editorial output also has an explicit field whitelist. Large body/maps are excluded from indexing. Public search filters only currently loaded notices; it is not a database-wide full-text search.

## Security and operations

The request handler checks a platform-provided ingress IP bucket (600/minute), then a per-user action bucket (submissions 5/10 minutes; uploads 10/minute; other protected actions 60/minute). Thresholds are initial operating values, not measured capacity guarantees. Vercel's overwritten `x-vercel-forwarded-for` is used only in its production runtime; ordinary `x-forwarded-for` is never trusted. Redis performs atomic increment/expiry using EVAL, with a 2.5-second deadline. Unavailable or invalid Redis responses fail closed; quota errors include Retry-After.

The server never fetches arbitrary image URLs. Firebase download tokens make uploaded media public despite default-deny client Storage rules; treat them as intended public assets. Disable/revoke a token in Storage to stop access. App Check enforcement, automated orphan cleanup, email delivery, backups and load testing are not implemented. Vercel provides managed function/CDN infrastructure; no separate load balancer was provisioned.

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for a server-mediated API by denying all direct client data access and requiring authorization, validation and rate limits in the server handlers. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

## Validation commands

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

The browser suite mocks API responses and identity at the adapter boundary; it checks responsive layout/rendering and the photo form, not production Firebase credentials. The unit suite tests permission failures, validation, token revocation, quota/outage handling, duplicate UI submissions and image re-encoding.

Firestore transaction/rule integration tests require the local emulator (never production):

```sh
firebase emulators:exec --only firestore --project demo-society 'npm run test:firestore'
```

Use a compatible Java installation for your Firebase CLI version. Emulator tests check direct-client denial, optimistic conflicts, pagination/private-field separation, idempotency and atomic alumni approval. Run them before enabling the live backend if the emulator cannot be downloaded in the coding environment.

## Verification record — 16 October 2026

- 41 unit/DOM tests pass; the production bundle builds successfully.
- Production dependency audit reports zero known vulnerabilities.
- Browser tests were attempted, but Chromium launch was blocked by the execution environment (`socket() failed: Operation not permitted`). The responsive changes have not received visual browser verification here.
- Firestore emulator tests were added but not completed: emulator tooling installation could not complete in the available environment. No live database integration claim is made.
- Production Firebase credentials, Redis, Storage and administrator provisioning are still required as described above.
