# Software Engineering Society — NTU Faisalabad

Design baseline and production planning for the Software Engineering Society website.

**Status: browser-only prototype. Firebase, Redis, real authentication, server APIs, and production deployment are not implemented in this commit.**

## What is included

- `index.html`: the supplied design, preserved byte for byte under a conventional entry filename.
- [Prototype audit](docs/PROTOTYPE_AUDIT.md): screens, data flows, existing behavior, and verified implementation gaps.
- [Production plan](docs/PRODUCTION_PLAN.md): proposed Firebase, Redis, permissions, API, caching, and Vercel architecture for discussion.

The initial scope is to understand and version the design before building the production application. No framework migration or visual redesign has been performed.

## Preview the design locally

Open `index.html` in a browser. Alternatively, from this folder:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Visit `http://localhost:8000`. CSS, fonts, icons, and photos currently require an internet connection. No package installation or build is needed for this prototype.

Use sample information only. Notices, alumni submissions, approvals, and suggestions are stored in that browser's local storage; they are not shared between users. The contact form does not send a message. The admin PIN is a demonstration, not access control.

## Intended production direction

Next.js with TypeScript and compiled Tailwind CSS on Vercel; Firebase Authentication, Cloud Firestore, and Cloud Storage for identity, records, and media; Redis for shared rate limiting and selected public-data caching. This is a proposal, not a description of working integrations.

Preserve the supplied visual design while replacing the prototype's storage and trust model. Confirm the roles and content workflows before implementing the backend.

## Initial validation

- Both inline JavaScript blocks pass `node --check`.
- Static HTML IDs are unique and literal `getElementById` references resolve.
- Static event handlers reference defined functions.
- The imported HTML matches the supplied file's SHA-256 checksum.
- Visual rendering, responsive layouts, keyboard navigation, and end-to-end browser flows remain untested in this environment.

Read the audit before treating this as an official public portal. No production readiness or security certification is implied by these checks.
