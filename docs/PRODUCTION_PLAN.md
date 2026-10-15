# Proposed production plan

Draft for discussion, 15 October 2026. **Nothing in this document is implemented by the initial prototype commit.** The requested hosting target is Vercel; Firebase and Redis are the requested backend services.

## Proposed responsibilities

| Component | Responsibility |
| --- | --- |
| Next.js + TypeScript + compiled Tailwind | Preserve the design as reusable components and real pages; public rendering and server endpoints |
| Firebase Authentication | Sign-in and verified identities; privileged roles assigned only by a trusted server/admin workflow |
| Cloud Firestore | Authoritative content, submissions, moderation state, site settings and audit records |
| Cloud Storage for Firebase | Approved photos and document/media uploads with controlled types and sizes |
| Managed Redis, such as Upstash | Shared API rate-limit counters; optional cache of frequently read published content |
| Vercel | Application hosting, CDN, managed function scaling, environments and deployments |

Redis does not automatically accelerate Firestore. The application must deliberately read/write a cache, expire it, and invalidate affected entries when content changes. Start with shared rate limiting and framework/CDN caching; add Redis content caching where measured latency or database reads justify it. These are architecture recommendations, not measured requirements for this society.

Vercel manages function scaling. A separate load-balancer service is not proposed for the initial application. We still need bounded queries, suitable database/compute regions, timeout handling and monitoring; managed scaling does not remove application or database bottlenecks.

## Request and trust boundaries

Public pages expose published content only. Browser mutations go through server endpoints; the browser must not be able to bypass API rate limits by writing directly to Firestore.

Use Firebase sign-in to obtain a verified identity. For protected endpoints, verify the Firebase ID token and check the required role and record access on the server. Do not trust a role sent in a request body or local storage. Make roles server-controlled and define revocation behavior. Start with explicit token-authenticated requests; if cookie sessions are selected later, add secure HttpOnly cookies and CSRF protection.

Firestore client rules should default to deny. Under a server-mediated data model, deny direct client business-data writes and private reads. If client reads are deliberately introduced, permit only the required published documents and test matching query constraints. The Admin SDK bypasses Firestore Security Rules, so every Admin SDK endpoint still needs its own authentication, authorization and validation. Use least-privilege service credentials.

Separate secrets from browser configuration: Firebase Admin credentials and Redis write credentials are server-only. Do not put them in source control or public environment variables. Use different Firebase/Redis resources or namespaces for development, previews and production so previews cannot modify live records.

## Initial permission proposal

| Actor | Allowed actions |
| --- | --- |
| Visitor | Browse published pages; submit bounded suggestions, contact messages and alumni applications according to the final sign-in policy |
| Editor | Manage approved content categories such as events, notices, blogs, cabinet and gallery; no role administration or private inbox access by default |
| Admin | Review private submissions; approve/reject alumni; manage site settings and authorized users |

The first administrator must be provisioned through a trusted process. Public signup must never grant an administrative role. Confirm the final society role assignments before implementing this table.

## Proposed records

These names and fields are a starting point, not deployed collections.

| Collection | Important fields and access |
| --- | --- |
| `users` | Firebase UID, display name, account state; private administrative metadata; privileged roles assigned through the trusted role workflow |
| `events` | Title, slug, description, start/end timestamps, location, image, publication state |
| `notices` | Title, category, body, publication state, publish/expiry timestamps |
| `posts` | Slug, title, author, excerpt, body, publication state and timestamps |
| `cabinetSessions` | Session label, display order and status; `siteSettings` selects the current session |
| `cabinetMembers` | Session ID, name, role, group, photo and display order |
| `galleryItems` | Event association, image path, alt text, caption, publication state and order |
| `alumniApplications` | Submitted details, review status, review metadata and consent; private |
| `alumniProfiles` | Approved public fields only, source application ID and publication state |
| `suggestions` | Category, optional name, body, status and timestamps; private inbox |
| `contactMessages` | Name, email, body, status and notification status; private inbox |
| `siteSettings` | Current cabinet session, approved HOD message, contact channels and institutional content |
| `auditLogs` | Actor UID, action, entity reference, request ID and server timestamp; server-written |

Use server timestamps and nonsequential document IDs. Keep private application/contact details separate from public profiles. Approving an alumni application should atomically create/update its public profile and record the moderation result, with an idempotent repeat request. Cache invalidation happens after a successful durable mutation and should be retried if necessary.

The current notice search is substring matching over a tiny local list. Do not promise identical search over an unbounded database scan: choose bounded published-content filtering for the initial small dataset, or a deliberate indexed search solution when volume requires it.

## API protection and reliability

- Validate types, lengths, categories, allowed fields and URLs on the server. Reject unexpected fields such as a visitor-supplied approval status. Bound request bodies, uploads and page sizes.
- Apply distributed rate limits before expensive work, then per-user/per-operation limits after identity verification. Set final thresholds from traffic expectations and observation, not arbitrary promises.
- Account for many students sharing a campus IP. Combine a verified-user limit with a broader trusted-IP limit; for anonymous forms add appropriate bot protection rather than relying only on IP address.
- Take the client IP only from the trusted deployment boundary. Do not trust an arbitrary client-supplied forwarding header. Browser-direct Firebase sign-in endpoints require Firebase/provider abuse controls too; our API limiter does not cover them.
- Return `429` and a retry time for quota rejection. Explicitly handle Redis timeouts/errors; for mutations that require a limiter, return a temporary `503` instead of silently bypassing protection. Confirm SDK defaults when implementing.
- Make duplicate submissions and approvals safe using idempotency keys/transactions where needed. Show success only after persistence. Email delivery is a separate tracked step and must not be implied by a saved message.
- Limit retries, use timeouts and avoid returning internal exception details. Log request IDs and outcomes while keeping message bodies, credentials and tokens out of routine logs.

## Caching and database-read control

Cache only public, published data. Private inboxes, tokens, permission decisions and personal API responses must not enter shared public caches. Protected responses should use appropriate no-store behavior.

Use bounded TTLs and invalidate both the framework/CDN cache and any Redis entries on publication changes. Cache keys must account for filters, session, pagination and environment. Define what happens if invalidation fails; time-bounded staleness is acceptable for selected public content, while approval and authorization results must remain authoritative.

On a public-cache failure, permit only controlled fallback to Firestore, with timeouts and protection against a burst of duplicate cache misses. Avoid unbounded fallback reads. A cache outage and a rate-limiter outage have different policies.

Use cursor pagination, explicit query limits and required indexes. Avoid fetching entire collections or starting realtime listeners on every public page. Reuse suitable server SDK clients and measure read volume, cache hit ratio and response latency. Choose service regions together before provisioning.

## Implementation sequence

1. **Design baseline — this commit:** preserve the original, map the behavior and agree the initial workflows.
2. **Application structure:** real routes, typed data models and reusable design components; accessible navigation/dialogs; production CSS and approved assets.
3. **Identity and data foundation:** Firebase environments, server-only SDK configuration, tested rules, token verification, roles and a trusted admin provisioning process.
4. **Real workflows:** managed content, durable submissions, protected admin pages, alumni moderation and truthful contact handling.
5. **Abuse protection and performance:** shared Redis limits, pagination, caching/invalidation, validation, bounded retries, logs and monitoring.
6. **Release verification:** build and type checks; negative permission/rules tests; cross-device persistence; private/public separation; XSS/URL validation; rate-limit and dependency-failure checks; keyboard/mobile QA; preview deployment, rollback and a modest representative load test.

No paid service provisioning, Vercel deployment, Firebase setup, or Redis setup is part of this initial import. Before launch, confirm approved content, domain ownership, service accounts, costs and access handover to the society. Configure usage alerts and decide how backups and restores will be handled.

## Decisions for the next discussion

- Must ordinary students sign in, or can public visitors browse and submit feedback?
- Who manages content, who reviews private submissions, and who may assign roles?
- Are event registrations/certificates part of the first release, or just event information?
- Which society assets, current cabinet session and contact channels are approved?
- Which Firebase project, Redis service, Vercel account/region and operating budget will be used?

## Primary documentation consulted

These sources support the platform behavior discussed above; the application structure and role table are proposed design choices.

- [Firebase custom claims](https://firebase.google.com/docs/auth/admin/custom-claims): server-assigned access claims and token checks.
- [Firestore rule conditions](https://firebase.google.com/docs/firestore/security/rules-conditions): access control and the server-library bypass of client rules.
- [Firestore best practices](https://firebase.google.com/docs/firestore/best-practices): locations, document IDs, indexes and cursor pagination.
- [Vercel concurrency scaling](https://vercel.com/docs/functions/concurrency-scaling): managed function scaling and limits.
- [Upstash rate limiting](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview): HTTP-based rate limiting for serverless environments and failure-policy considerations.
- [Tailwind Play CDN](https://tailwindcss.com/docs/installation/play-cdn): development-only browser compiler; production should use generated CSS.
