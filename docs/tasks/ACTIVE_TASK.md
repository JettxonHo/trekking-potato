# ACTIVE TASK — 产品作品集展示页

- Project baseline: completed `TP-BETA-001`, code-ready at `main@6d0d404`
- GitHub Issue: `#112`
- Status/Mode: `READY_FOR_IMPLEMENTATION / IMPLEMENTATION`
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
