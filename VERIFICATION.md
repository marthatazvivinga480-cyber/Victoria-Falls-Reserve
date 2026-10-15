# Verification

Verified on 13 October 2026 with Node.js 24.21.0 on Windows.

| Check                              | Result                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `npm run lint`                     | Passed, no warnings/errors                                                  |
| `npm run typecheck`                | Passed for client and server                                                |
| `npm test`                         | 28 passed: 9 frontend interaction tests, 19 server policy/integration tests |
| `npm run build`                    | Passed for React/Vite and Express/TypeScript                                |
| Playwright desktop browser journey | Passed                                                                      |
| Playwright mobile browser journey  | Passed                                                                      |
| `npm audit`                        | Zero reported vulnerabilities at verification time                          |
| `npm audit --omit=dev`             | Zero reported production vulnerabilities                                    |

Server integration tests use an actual temporary MongoDB 7.0.24 replica set, not mocked persistence. Four concurrent reservation requests for a single room unit produce one successful reservation and three availability conflicts. Tests also cover half-open date overlap, 1–30-night limits, same-day rules, capacity, cancellation cutoff/refunds, no-shows, payment retries and duplicate-payment rejection, registration/login/refresh/logout and replay rejection, admin/customer permissions and booking ownership, reviews, favorites/profile, and core admin APIs.

The Playwright journeys ran against the seeded Express API and built frontend using the installed Chromium-based Microsoft Edge browser. Both desktop and mobile journeys passed reservation, payment decline then successful retry, confirmation download, cancellation and refund, profile editing, session persistence after page reload, customer admin rejection, admin navigation, hotel creation/edit/archive, and room creation/edit/archive. No browser page exceptions or document-level horizontal overflow occurred in the checked journeys.

The homepage was visually inspected at 1440px desktop and 390px mobile widths. Local SVG imagery loaded correctly. The browser test discovered and verified a fix for preserving checkout consent and form values after a simulated decline.

The ZIP contains source, configuration, a pinned dependency lockfile, tests, original local illustrations, and documentation. It excludes installed dependencies, database binaries/cache, build output, test recordings, and private environment files. Vercel/Render/Atlas deployment configuration is supplied; no cloud resources were provisioned or deployed during verification.

To reproduce the checks, follow `README.md`. Browser tests additionally require a Playwright Chromium installation, or set `PLAYWRIGHT_EXECUTABLE_PATH` to a compatible installed browser executable. Database tests/demo mode download MongoDB on first run; subsequent runs reuse the project cache.

## Administrator credential update � 14 October 2026

Normal seeding no longer creates an admin with a published default password. Admin passwords come from a private local/hosting environment variable. The reset service changes the bcrypt hash, increments the account token version, and deletes refresh sessions. Regression tests verify rejection of the previous password, access token, and refresh session; new-password login succeeds and repeat seeding preserves the new password. Both desktop and mobile browser journeys passed against a disposable database on dedicated test ports. The actual Atlas administrator password was rotated and verified without printing the new secret.

## Local photo integration — 14 October 2026

29 unique downloaded JPEG photos were organized and sized for web use. Image-only synchronization updated six hotel records and eighteen room categories in Atlas without changing accounts, booking data or rates. All mapped file paths exist. The live homepage was inspected with the new Falls hero, hotel cards and sunset image. Lint, type checking, thirteen client tests, nineteen server tests, and both builds passed. Original download files remain untouched.
