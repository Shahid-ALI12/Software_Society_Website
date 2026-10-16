# NTU Software Engineering Society

Firebase sign-in, a responsive society website and an editorial/photo management panel on Vercel. Account signup grants no admin access.

- `/account.html`: Google/email login, signup, verification, reset and sign out.
- `/admin.html`: role-restricted content editor, photo replacement/upload and private submission review.
- `/api/portal`: Firebase Admin-backed endpoints with authorization, validation, distributed Redis rate limits, transactional writes and public-only CDN caching.

**Deployment setup is still required:** Firebase service credentials, Redis settings, rules/index deployment and the first admin role. Until configured, the homepage labels its sample content and disables submissions. No paid resources or production data were provisioned by the code change.

Read [backend setup and photo guide](docs/BACKEND_SETUP.md). Never paste service-account keys into chat/GitHub or expose them as Vite environment variables. File uploads are optional and depend on configured Firebase Storage; supported hosted photo URLs can be used instead.

Use Node.js 22.12+ or a compatible newer LTS. `npm ci`, `npm run dev`, `npm test`, `npm run build`. Vite serves the UI; use Vercel's local runtime to run API routes as well. Test scripts and their external prerequisites are documented in the guide. Vercel builds `dist` and deploys `api/portal.js` as a Node function.

The UI tests use simulated identity/API data. Live Firebase/Redis/Storage integration and production login/submission smoke checks must be performed after configuration. App Check enforcement, notification email delivery, backups, orphan-media cleanup and representative load testing remain future work.
