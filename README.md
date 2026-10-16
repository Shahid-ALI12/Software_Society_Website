# NTU Software Engineering Society

The design preview includes Firebase Authentication at `/account.html`: Google and email sign-in, signup, password reset, email verification and sign out. Account creation grants no administrator permissions.

Use Node.js 22.12+ (or a compatible newer LTS). Run `npm ci`, then `npm run dev`. Run `npm test` and `npm run build` before deployment. Vercel configuration builds with Vite and serves `dist`.

`client/` contains the public Firebase configuration and authentication UI. Firebase manages password hashing. Never commit Admin service-account keys or other server credentials.

The homepage still contains sample content. Its forms are disabled until protected APIs and database rules are implemented. The demonstration admin PIN and browser-local submissions have been removed.

The tested `server/security/` helpers are foundations only, not deployed API routes. Firestore schemas, deployed rules/indexes, Admin SDK integration, Redis rate limiting and App Check remain future work. Live Google/email login needs a manual check on the deployed domain; automated tests simulate authentication callbacks and do not create production users.

See [Firebase setup](docs/FIREBASE_SETUP.md), [production plan](docs/PRODUCTION_PLAN.md) and [original prototype audit](docs/PROTOTYPE_AUDIT.md).
