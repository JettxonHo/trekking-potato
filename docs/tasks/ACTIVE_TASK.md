# ACTIVE TASK — 产品作品集展示页

- Project baseline: completed `TP-BETA-001`, code-ready at `main@6d0d404`
- GitHub Issue: `#112`
- Status/Mode: `READY_FOR_CONTROLLER_REVIEW / REVIEW`
- Controller: Sol XHigh
- Executor: exact custom Agent `luna-worker`
- Branch: `codex/112-product-showcase`
- Base: `main@6d0d404`

## 1. Objective

Create a polished one-page HTML product showcase for job-portfolio and project-review audiences. Explain the real
product problem, trusted capabilities, interface evidence, major decisions and delivery outcome without presenting
the code-ready Beta as deployed or real-user validated.

## 2. Approved design

Direction A — **山野产品档案**: warm editorial minimalism with an off-white paper canvas, ink-black linework,
moss-green product accents and safety orange/red semantics. Narrative order:

`真实行前问题 → 可信数据与确定性规则 → 可验证的核心 Beta`

The result should feel like a considered product case study, not a generic SaaS landing page or a redesign of the
mini-program itself.

## 3. Allowlist

- new root `product-showcase.html`
- `docs/tasks/ACTIVE_TASK.md` for controller/executor checkpoints only

No other file may change without controller approval.

## 4. Required content

1. Hero positioning, audience context and `CODE_READY` boundary.
2. User problem and product opportunity.
3. Search/confirm/input/base/advice/private-history flow.
4. `go / caution / no_go / verdict=null` demonstration with honest Chinese labels.
5. Five trusted pilot routes and the official Wutai blocked record.
6. Multi-sample hourly weather, minimum gear, source provenance, queryId and private history.
7. Deterministic rules vs AI explanation boundary.
8. Existing real product screenshots with accurate evidence caveats.
9. Architecture and quality evidence: route `91/0`, weather `86/0`, unit `55/0`, integration `55/0`, CI/build.
10. Key decisions, limitations and the separately authorized deployment-validation next stage.

## 5. Interaction and implementation constraints

- One semantic, responsive HTML file with embedded CSS/JS and no external runtime dependency.
- Reuse existing local logo and screenshots through repository-relative paths.
- Do not fabricate screenshots, user counts, conversion metrics, commercial outcomes or deployed status.
- Sticky navigation, restrained scroll reveal, verdict switcher, screenshot lightbox and visible keyboard focus.
- Honor reduced motion, 44px touch targets, sufficient contrast, desktop and mobile layouts.
- Use asymmetric editorial grids rather than three equal feature cards.
- No gradients, glassmorphism, icon-library dependency, broad product UI redesign or permanent decorative motion.
- Do not alter the production app, Cloud Functions, tests, packages/config, evidence screenshots or completed Goal
  documents.

## 6. Verification

- Inspect the rendered page at representative 1440px desktop and 390px mobile widths.
- Verify repository-relative assets load and the document has no horizontal overflow.
- Verify keyboard-visible focus, sticky navigation, verdict switching, screenshot opening/closing and Escape handling.
- Honor `prefers-reduced-motion` and keep the page readable when JavaScript is unavailable.
- Use available local HTML/browser checks; record runtime-tool limitations truthfully.

## 7. Delivery and Review

The executor returns `READY_FOR_CONTROLLER_REVIEW` with actual files, key design decisions, verification commands,
visual evidence and known limitations. It must not approve, merge, broaden scope or route work to Terra. Sol performs
independent code and visual Review and returns `APPROVED`, `CHANGES_REQUESTED`, `BLOCKED` or `ESCALATE_TO_HUMAN`.

## 8. Controller activation checkpoint — 2026-08-09

The human approved design direction A after the completed TP-BETA-001 Goal. Sol created live Issue #112, froze the
single-file allowlist and created `codex/112-product-showcase` from clean `main@6d0d404`. This is a post-Goal product
portfolio artifact; it does not reopen, deploy or expand TP-BETA-001.

## 9. Executor implementation checkpoint — 2026-08-09

- `product-showcase.html` is implemented within the frozen allowlist as one semantic responsive document with embedded
  CSS/JS and no external runtime dependencies. Direction A uses the approved off-white paper, ink, moss and safety
  orange/red editorial language, asymmetric grids, sticky navigation, restrained IntersectionObserver reveal, reduced
  motion, visible focus, 44px interactive targets and a no-JavaScript-readable document path.
- The page contains the real product narrative and evidence boundary: search/confirm/input/Base/advice/private-history,
  four verdict semantics, five full pilot RouteVariants plus the official Wutai blocked record, hourly multi-sample
  weather, minimum gear, source provenance, server-owned `queryId`, deterministic-versus-AI ownership, architecture,
  quality counts, real I22 screenshots/lightbox, limitations and the separately authorized deployment-validation next
  stage. It does not claim deployment, user validation, fabricated metrics or new product behavior.
- Local verification passed: extracted inline JavaScript compiled with `new Function`; all five repository-relative image
  paths exist; static checks found four verdict triggers/panels, zero external runtime references and zero gradients;
  `git diff --check` passed; a temporary local HTTP server returned 200 for the HTML, logo and all four screenshots;
  the existing root `npm test` suite passed unchanged (route 91/0, weather 86/0, unit 55/0 and all remaining contracts).
- No browser/Chromium/Playwright connector is available in this environment, so 1440px/390px rendered visual inspection,
  live focus/switcher/lightbox/Escape interaction and overflow inspection remain for Sol's independent visual Review;
  no GUI evidence is claimed here. No production app, Cloud Function, test, package/config, screenshot or completed Goal
  document was modified.
- Executor status: `READY_FOR_CONTROLLER_REVIEW`.

## 10. Review-fix round 1 checkpoint — 2026-08-09

- Addressed the independent Review's P2 contrast finding without changing the approved visual direction: `--orange`
  is now `#b9471f` and `--muted` is now `#656b65`, both selected to clear the 4.5:1 ordinary/small-text threshold
  on the paper and surface backgrounds used by the page.
- The `.brand` link now has an explicit `min-height: 44px`; the mobile logo remains 34px while its interactive hit area
  stays at the required target size.
- Round 1 verification records exact relative-luminance calculations for the changed tokens: `#b9471f` orange is
  `4.68:1` on `#f5f1e8` paper and `5.01:1` on `#fbf9f4` surface; `#656b65` muted is `4.85:1` and `5.19:1`
  respectively. The existing HTML/JS static checks, asset HTTP checks, root `npm test`, and `git diff --check` also
  pass. No product content, structure,
  interaction, screenshot, dependency, production code or completed Goal document changed.
- Executor status: `READY_FOR_CONTROLLER_REVIEW` pending fresh Sol Review.

## 11. Sol independent Review — 2026-08-09

- Sol opened the page through a temporary local HTTP server and inspected it at explicit `1440×1000` desktop and
  `390×844` mobile viewports. Both layouts reported `documentElement.scrollWidth === innerWidth`; the hero, editorial
  cards and screenshot gallery remained readable without horizontal overflow, and all logo/screenshot assets loaded.
- Live interaction checks passed: switching to the caution verdict updated the selected tab and exposed only the
  matching panel; opening a real screenshot populated the modal with the expected asset and accessible text; the close
  control dismissed it. Static Review also confirmed the Escape/cancel path, keyboard tab navigation, visible focus,
  reduced-motion fallback and no-JavaScript reading path.
- Independent Review initially returned `CHANGES_REQUESTED` for small-text contrast, the brand hit area, one evidence
  typo and lifecycle status. Review-fix round 1 closed all findings. The independent reviewer recalculated the four
  contrast ratios, verified the 44px target and typo correction, recompiled the inline JavaScript and returned
  `APPROVED` with no remaining P0–P3 findings.
- Sol reran the complete root `npm test` suite and `git diff --check`; both passed. The approved diff remains limited to
  `product-showcase.html` and this task checkpoint. Status: `APPROVED`, ready for focused PR publication and latest-head
  CI; merging does not deploy or publish the showcase to a public website.
