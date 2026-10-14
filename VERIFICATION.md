# Verification

Verified on 13 October 2026 with Node.js 24.21.0 on Windows.

| Check                              | Result                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `npm run lint`                     | Passed, no warnings/errors                                                  |
| `npm run typecheck`                | Passed for client and server                                                |
| `npm test`                         | 27 passed: 9 frontend interaction tests, 18 server policy/integration tests |
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
