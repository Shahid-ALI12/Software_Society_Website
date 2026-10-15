# Prototype audit

Reviewed: 15 October 2026. Source: the supplied `ntu_se_society_portal (1).html`, imported unchanged as `index.html`.

Source SHA-256: `ad31c3c118b57c197bf4abf075099b3f634ffa8fdcc8d98f98123e0af38b01cb`.

## Design and implementation inventory

One HTML file contains the layout, CSS, demonstration data, and 22 named JavaScript functions. There are eight content tabs, four forms, four content/admin overlays, and one toast notification component. No Firebase SDK, Redis integration, backend, authentication provider, or API requests are present.

The design uses Inter, Font Awesome 6.4.0, Tailwind's browser CDN, and remote Unsplash images. Its visual language is slate/navy backgrounds, blue accents, rounded cards, thin borders, and soft shadows, with both light and dark styles. Defined brand colors are navy `#0f172a`, blue `#1e3a8a`, accent `#2563eb`, and gold `#d97706`.

The header is sticky, desktop navigation switches to a mobile menu, and card layouts use responsive grids. These are source-code observations; visual quality at specific screen sizes has not been browser-tested.

## Screens and behavior

| Area | Current behavior | Production work implied by the design |
| --- | --- | --- |
| Home | Hero, HOD message, four core members, three blog cards and blog reader | Approved society content, editable message and members, published articles |
| Events & Gallery | Three sample events; All/Upcoming/Past filters; four-image lightbox gallery | Managed events and media; real dates and status; optional registration only if requested |
| Notices | Two initial notices; title/body search; locally posted notices | Persistent publishing, editing/archiving, pagination and search design |
| Cabinet | Two sessions; core, executive and general-member groups | Session history, ordering, member photos, role changes and current-session setting |
| Alumni | Two sample profiles; submission modal; local approval | Private applications, reviewed public profiles, rejection and correction workflows |
| About | Mission, vision and three campus/facility images | Approved wording and authentic campus assets |
| Suggestions | Category, optional name, required message; admin viewer | Private durable inbox with statuses and spam controls |
| Contact | Contact information, four placeholder social links, contact form | Confirmed contact channels and durable message handling; optional email notification |
| Admin overlay | Demo PIN; post a notice, approve alumni, view suggestions | Real login, server permissions, content management, moderation and audit history |

Event cards do not include a registration flow. The Contact title mentions location, but there is no embedded map. The admin overlay has no event, blog, cabinet, media or contact-message management interface.

## Current data flow

| Data | Source/storage | Consequence |
| --- | --- | --- |
| Blogs and events | `defaultBlogs` and `defaultEvents` JavaScript arrays | Editing requires source changes |
| Cabinet | `cabinetData` keyed by two sessions | Home is separately hardcoded to session `2025-2026` |
| Notices | `ntu_se_notices` in local storage | New notices only appear in the same browser and origin |
| Public alumni | `ntu_se_alumni` in local storage | Approval does not publish to other users |
| Pending alumni | `ntu_se_pending_alumni` in local storage | Another device's admin cannot review a submission |
| Suggestions | `ntu_se_suggestions` in local storage | No shared inbox or protected storage |
| Contact messages | Not stored or sent | Form resets after displaying a success notification |
| Theme | Current DOM classes | Resets on reload |

On page load, five functions render home, events/gallery, notices, the selected cabinet, and alumni. Navigation hides/shows tabs; it does not change the URL, support deep links, or integrate browser Back/Forward. Notice search filters the loaded local array. Event classification uses a manually stored `type`, not the event date.

Alumni submission appends to a local pending array. Approval removes the pending item and appends it to the public local array, using two separate local-storage writes. Suggestions append to a local array. Notice publishing prepends a local record. Most generated IDs use `Date.now()`; they are unsuitable as the sole production identifier across devices and concurrent requests.

## Findings to address before production

| Priority | Finding and source | Required change |
| --- | --- | --- |
| Launch blocker | `promptAdminPin()` compares a visible PIN with `1234`; the mutation functions do not check identity or role | Firebase sign-in and server-enforced authorization for each protected action |
| Launch blocker | Four local-storage collections are editable by the browser's user and are not shared | Durable server-owned records; separate public and private data |
| Launch blocker | `renderNotices()`, `renderAlumni()` and `renderAdminPortal()` interpolate input into `innerHTML` | Treat stored input as untrusted; use escaped text rendering and validate URLs. The current local DOM injection pattern would become cross-user stored XSS if copied into a shared backend |
| Launch blocker | `handleContactSubmit()` reports success without saving or delivering anything | Persist the message first; report actual success/failure; track any email delivery separately |
| High | No server validation, field-size limits, API abuse controls, permissions, or moderation audit | Implement validation and authorization at the server boundary with shared rate limits |
| High | Alumni link values are inserted directly into `href`; HTML `type="url"` alone is insufficient | Enforce HTTPS and the intended hostname; render a safe attribute; add explicit external-link protection |
| High | `JSON.parse(localStorage.getItem(...))` is unguarded; wrong shapes or malformed data can break startup | Remove business-data dependence on local storage; handle loading, empty, error and retry states |
| High | Tailwind is compiled in the browser using its development CDN | Generate CSS during the production build; bundle or intentionally manage other asset dependencies |
| Medium | Overlay focus is unmanaged; no Escape handling; several controls lack accessible names; generated gallery/cabinet images lack alt text | Keyboard-operable dialogs, focus return, associated labels, alt text and mobile verification |
| Medium | Names, titles, portraits, contacts, photos, event dates and institutional claims are sample or unverified | Obtain society-approved content and assets before launch |
| Medium | No routes, per-page metadata, persisted theme, automatic current session, or date-based event status | Add real routes and explicit site settings while preserving the appearance |
| Medium | Admin offers only a small subset of the required content lifecycle | Agree which records can be created, edited, archived, approved and rejected, and by whom |

The HTML remains unchanged as a design reference. The findings above are documented gaps, not fixes already implemented.

## Validation performed and limits

Both inline scripts parse successfully with Node. Static IDs have no duplicates; literal DOM lookups resolve; static event handlers reference defined functions. The imported bytes match the supplied checksum. Inspection covers the full source, including all action handlers.

No browser rendering, live backend, concurrent-user flow, load test, or production deployment has been verified. CDN availability and the factual accuracy of sample society content have not been verified.
