# Graph Report - smma  (2026-09-26)

## Corpus Check
- 104 files · ~68,578 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 3, .css 2, .example 1)

## Summary
- 895 nodes · 1056 edges · 73 communities (54 shown, 19 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 77 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a7630b9a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- test_imports.py
- nextjs-dashboard/package.json
- AnalyticsSnapshot
- AI Automation Architecture for SMM
- compilerOptions
- contrast-check.py
- package.json
- contrast-mcp.py
- Tone & Voice
- antislop-layoutmobile
- vercel.json
- get_settings
- wasm/signals.py
- lib.rs
- eslint.config.mjs
- postcss.config.mjs
- app/page.tsx
- __init__.py
- smm-wasm
- social-media-smm-automation
- waspy_test
- Python to WebAssembly Migration Plan
- antislop-human
- Group 1: Hard Gate (absolute, no exceptions)
- Comments That Add Nothing
- Group 1: Hard Gate (absolute, no exceptions)
- Phase 4: Analytics-Driven Recommendation Loop
- Pattern: CSS Visuals (Product-Accurate Illustrations, Zero Assets)
- dashboard/page.tsx
- Group 2: Purpose-Gate (technique allowed, purpose required)
- Group 2: Purpose-Gate (technique allowed, purpose required)
- AGENTS.md
- DESIGN.md — S M M A I Brand Direction
- Phase 3: TikTok + YouTube
- Decorative Elements
- Phase 2: LinkedIn + X
- antislop-ui
- Group 3: Quality Locks (consistency)
- Component specs
- Group 3: Quality Locks (consistency)
- Pattern: Scroll Reveal (IntersectionObserver, Zero Dependencies)
- Pattern: Typography System (Tokens, Eyebrow, Wordmark, Hierarchy)
- antislop
- Part 1: AI Slop Patterns (Warning Signs)
- Social Media SMM Automation
- antislop
- Part 1: AI Slop Patterns (Warning Signs)
- Pattern: Border Glow (Pointer-Tracking Conic Gradient on Cards)
- Pattern: Closing CTA Band (Full-Bleed Page Closer)
- Pattern: Hero Dashboard Card (CSS 3D Focal Point)
- Pattern: Highlights Strip (Real Metrics, No Invented Deltas)
- Pattern: Storytelling Pairs (Feature + Visual, Alternating)
- Analytics Dashboard UI
- The Craftsmanship Standard
- The Craftsmanship Standard
- Pattern Library Index
- Delivery Gate (Mandatory)
- MVP Implementation
- drafts/route.ts
- Delivery Gate (Mandatory)
- Part 3: Liveliness Toolkit
- nextjs-dashboard/README.md
- brand/route.ts
- Part 3: Liveliness Toolkit
- login/route.ts
- nextjs-dashboard/AGENTS.md

## God Nodes (most connected - your core abstractions)
1. `ContentDraft` - 25 edges
2. `BrandProfile` - 22 edges
3. `react` - 21 edges
4. `Group 1: Hard Gate (absolute, no exceptions)` - 18 edges
5. `Group 1: Hard Gate (absolute, no exceptions)` - 18 edges
6. `compilerOptions` - 16 edges
7. `ContentPlanner` - 13 edges
8. `MetaAdapter` - 13 edges
9. `ModerationService` - 13 edges
10. `Group 2: Purpose-Gate (technique allowed, purpose required)` - 13 edges

## Surprising Connections (you probably didn't know these)
- `test_analytics_snapshot_import()` --uses--> `AnalyticsSnapshot`  [INFERRED]
  tests/test_imports.py → src/smm/domain/models.py
- `test_generation_request_import()` --uses--> `GenerationRequest`  [INFERRED]
  tests/test_imports.py → src/smm/ai/provider.py
- `test_generation_result_import()` --uses--> `GenerationResult`  [INFERRED]
  tests/test_imports.py → src/smm/ai/provider.py
- `test_ai_provider_protocol_import()` --uses--> `AIProvider`  [INFERRED]
  tests/test_imports.py → src/smm/ai/provider.py
- `test_stub_ai_provider_import()` --uses--> `StubAIProvider`  [INFERRED]
  tests/test_imports.py → src/smm/ai/provider.py

## Import Cycles
- None detected.

## Communities (73 total, 19 thin omitted)

### Community 0 - "test_imports.py"
Cohesion: 0.05
Nodes (51): Enum, AIProvider, GenerationRequest, GenerationResult, Protocol, Deterministic provider for local development and tests., StubAIProvider, main() (+43 more)

### Community 1 - "nextjs-dashboard/package.json"
Cohesion: 0.05
Nodes (34): nextConfig, dependencies, next, react, react-dom, devDependencies, eslint, eslint-config-next (+26 more)

### Community 2 - "AnalyticsSnapshot"
Cohesion: 0.15
Nodes (18): get, post, engagement_rate(), summarize(), AnalyticsSnapshot, compute_engagement_rate(), compute_rank_signals(), health() (+10 more)

### Community 3 - "AI Automation Architecture for SMM"
Cohesion: 0.05
Nodes (40): 1. AI is advisory, not autonomous, 1. Brand and policy layer, 2. Platform logic is isolated, 2. Signal and research layer, 3. Content planning layer, 3. Safety is enforced in the domain layer, 4. AI generation layer, 4. Local-first development with cloud scheduling (+32 more)

### Community 4 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 5 - "contrast-check.py"
Cohesion: 0.28
Nodes (12): contrast_ratio(), linearize(), luminance(), main(), parse_hex(), parse_pairing(), parse_reference_rows(), WCAG 2.x contrast checker, home of the antislop-human contrast checker. Usage:… (+4 more)

### Community 6 - "package.json"
Cohesion: 0.17
Nodes (11): dependencies, serve, name, private, scripts, build, dev, start (+3 more)

### Community 7 - "contrast-mcp.py"
Cohesion: 0.33
Nodes (10): _channel(), check_contrast(), contrast_ratio(), _error(), main(), Minimal MCP stdio server exposing the antislop contrast checker as a tool. All…, relative_luminance(), _reply() (+2 more)

### Community 8 - "Tone & Voice"
Cohesion: 0.05
Nodes (38): Actorless Passive, All-Caps Emphasis, antislop-copywriting, Aphorism Formulas, Boldface Overuse, Chatbot Closers, Copywriting Skill Checklist, Draft, audit, final (+30 more)

### Community 9 - "antislop-layoutmobile"
Cohesion: 0.06
Nodes (30): 100vh Sections, antislop-layoutmobile, Bottom Nav That Eats Content, Breakpoint Driven by Device List, Breakpoints, Columns That Don't Collapse, Desktop-Only Layout, Desktop-Sized Everything (+22 more)

### Community 10 - "vercel.json"
Cohesion: 0.50
Nodes (3): buildCommand, framework, outputDirectory

### Community 11 - "get_settings"
Cohesion: 0.83
Nodes (3): get_settings(), Settings, test_config_import()

### Community 17 - "app/page.tsx"
Cohesion: 0.10
Nodes (19): Home(), DashboardCard(), ArchitectureSection(), layers, CtaBand(), HeroSection(), highlights, HighlightsStrip() (+11 more)

### Community 25 - "Python to WebAssembly Migration Plan"
Cohesion: 0.07
Nodes (29): 1.1 Add Waspy Dependency, 1.2 Create Rust Build Script (`src/smm/wasm/build.rs`), 1.3 Update `Cargo.toml` (if new Rust crate), 1.4 Build WASM Modules, 1.5 Serve WASM from FastAPI, 2.1 Load WASM Modules in frontend/JS, 2.2 Call Exported Functions, 2.3 Python-to-WASM Type Mapping (+21 more)

### Community 26 - "antislop-human"
Cohesion: 0.10
Nodes (20): antislop-human, Broken Tab Order, Color & Contrast, Color-Only Feedback, Focus & States, How to use this skill, Human Skill Checklist, Keyboard (+12 more)

### Community 27 - "Group 1: Hard Gate (absolute, no exceptions)"
Cohesion: 0.11
Nodes (18): Group 1: Hard Gate (absolute, no exceptions), R-02 — Copywriting, R-03 — Mobile Responsiveness, R-17 — Data & Numbers, R-18 — Testimonials, R-23 — Clarification & Visual Assets, R-24 — Navigation, R-25 — Color Contrast (+10 more)

### Community 28 - "Comments That Add Nothing"
Cohesion: 0.11
Nodes (17): antislop-code, Code Comment Checklist, Comments That Add Nothing, Decorative Emoji, Decorative Separators, Empty Labels, End Markers, How It Should Read (+9 more)

### Community 29 - "Group 1: Hard Gate (absolute, no exceptions)"
Cohesion: 0.11
Nodes (18): Group 1: Hard Gate (absolute, no exceptions), R-02 — Copywriting, R-03 — Mobile Responsiveness, R-17 — Data & Numbers, R-18 — Testimonials, R-23 — Clarification & Visual Assets, R-24 — Navigation, R-25 — Color Contrast (+10 more)

### Community 30 - "Phase 4: Analytics-Driven Recommendation Loop"
Cohesion: 0.12
Nodes (16): A/B Testing Support, Analytics Ingestion, Feedback Loop Workflow, Goals, LinkedIn Analytics, Meta Analytics, Migration from Phase 3, Overview (+8 more)

### Community 31 - "Pattern: CSS Visuals (Product-Accurate Illustrations, Zero Assets)"
Cohesion: 0.12
Nodes (15): Adaptation guide, Adaptation guide, Adaptation guide, CSS, CSS, CSS, HTML, HTML (+7 more)

### Community 32 - "dashboard/page.tsx"
Cohesion: 0.07
Nodes (25): LoginPage(), AnalyticsCards(), ApprovalQueue(), ApprovalQueueProps, AutomationStatusCard(), BrandProfileCard(), ContentDraftCard(), ContentDraftCardProps (+17 more)

### Community 33 - "Group 2: Purpose-Gate (technique allowed, purpose required)"
Cohesion: 0.15
Nodes (13): Group 2: Purpose-Gate (technique allowed, purpose required), R-01 — Color & Gradients, R-04 — Icons, R-06 — Typography, R-07 — Background, R-08 — Button Arrows, R-09 — Badges, R-10 — Glassmorphism (+5 more)

### Community 34 - "Group 2: Purpose-Gate (technique allowed, purpose required)"
Cohesion: 0.15
Nodes (13): Group 2: Purpose-Gate (technique allowed, purpose required), R-01 — Color & Gradients, R-04 — Icons, R-06 — Typography, R-07 — Background, R-08 — Button Arrows, R-09 — Badges, R-10 — Glassmorphism (+5 more)

### Community 35 - "AGENTS.md"
Cohesion: 0.17
Nodes (10): antislop, Antislop, API endpoints (Next.js), API endpoints (Python FastAPI), Architecture flow, Developer commands, Environment, Project structure (+2 more)

### Community 36 - "DESIGN.md — S M M A I Brand Direction"
Cohesion: 0.17
Nodes (11): Antislop Constraints Active, Brand Identity, DESIGN.md — S M M A I Brand Direction, Dials (antislop), Identity Motif, Layout, Letter Spacing, Palette (+3 more)

### Community 37 - "Phase 3: TikTok + YouTube"
Cohesion: 0.17
Nodes (11): Adapter Requirements, Cross-Platform Considerations, Goals, Migration from Phase 2, Overview, Phase 3: TikTok + YouTube, Risks and Constraints, Success Criteria (+3 more)

### Community 39 - "Decorative Elements"
Cohesion: 0.17
Nodes (12): AI Capsule Badges, Colored Left Stripe, Decorative Elements, Decorative Status Dot, Emoji as Decoration, Eyebrow Badge Above the Headline, Fake Terminal Window, Generic AI Icons (+4 more)

### Community 40 - "Phase 2: LinkedIn + X"
Cohesion: 0.18
Nodes (10): Adapter Requirements, Cross-Platform Planning, Goals, LinkedIn Adapter, Migration from Phase 1, Overview, Phase 2: LinkedIn + X, Risks and Constraints (+2 more)

### Community 41 - "antislop-ui"
Cohesion: 0.04
Nodes (45): 4-Column Template Footer, antislop-ui, App & Dashboard, Background Grid, Bento Grid, Charts Without a Question, Copy-Paste Feature Cards, CSS Animation and JS Transform Conflict (+37 more)

### Community 42 - "Group 3: Quality Locks (consistency)"
Cohesion: 0.20
Nodes (10): Group 3: Quality Locks (consistency), R-05 — Layout & Page Structure, R-11 — Border Radius, R-15 — CTA (Call to Action), R-16 — Copywriting & Buzzwords, R-20 — Visual Identity, R-21 — Dark Mode, R-29 — Color Palette (+2 more)

### Community 43 - "Component specs"
Cohesion: 0.20
Nodes (9): Bar chart card, Card shell, Category / device breakdown list, Component specs, Layout grid, Line / area chart card, Metric (KPI) card, Pagination control (+1 more)

### Community 45 - "Group 3: Quality Locks (consistency)"
Cohesion: 0.20
Nodes (10): Group 3: Quality Locks (consistency), R-05 — Layout & Page Structure, R-11 — Border Radius, R-15 — CTA (Call to Action), R-16 — Copywriting & Buzzwords, R-20 — Visual Identity, R-21 — Dark Mode, R-29 — Color Palette (+2 more)

### Community 48 - "Pattern: Scroll Reveal (IntersectionObserver, Zero Dependencies)"
Cohesion: 0.22
Nodes (9): Checklist before shipping, CSS, HTML usage, JavaScript, Pattern: Scroll Reveal (IntersectionObserver, Zero Dependencies), Tuning guide, What it does, What NOT to reveal (+1 more)

### Community 49 - "Pattern: Typography System (Tokens, Eyebrow, Wordmark, Hierarchy)"
Cohesion: 0.22
Nodes (8): Checklist before shipping, CSS for each level, Eyebrow Label, Font Loading (Google Fonts), Full Token Set, Pattern: Typography System (Tokens, Eyebrow, Wordmark, Hierarchy), Six Hierarchy Levels, Spaced-Letter Wordmark

### Community 50 - "antislop"
Cohesion: 0.25
Nodes (7): antislop, Core Principle, First-Run Install Wizard, Functional Patterns, Part 2: Mandatory Rules (R-01 to R-38, grouped), Two Usage Modes, What This Is (and What It Isn't)

### Community 51 - "Part 1: AI Slop Patterns (Warning Signs)"
Cohesion: 0.25
Nodes (8): Accessibility, Copywriting & Content, Decorative Elements, Functionality & Content, Identity & Originality, Layout & Components, Part 1: AI Slop Patterns (Warning Signs), Visual & Color

### Community 53 - "Social Media SMM Automation"
Cohesion: 0.25
Nodes (7): Architecture, Development, MVP, Quick start, Roadmap, Security, Social Media SMM Automation

### Community 54 - "antislop"
Cohesion: 0.25
Nodes (7): antislop, Core Principle, First-Run Install Wizard, Functional Patterns, Part 2: Mandatory Rules (R-01 to R-38, grouped), Two Usage Modes, What This Is (and What It Isn't)

### Community 55 - "Part 1: AI Slop Patterns (Warning Signs)"
Cohesion: 0.25
Nodes (8): Accessibility, Copywriting & Content, Decorative Elements, Functionality & Content, Identity & Originality, Layout & Components, Part 1: AI Slop Patterns (Warning Signs), Visual & Color

### Community 56 - "Pattern: Border Glow (Pointer-Tracking Conic Gradient on Cards)"
Cohesion: 0.25
Nodes (8): Checklist before shipping, CSS, Customisation, How the technique works, HTML structure, JavaScript, Pattern: Border Glow (Pointer-Tracking Conic Gradient on Cards), When to use this pattern

### Community 57 - "Pattern: Closing CTA Band (Full-Bleed Page Closer)"
Cohesion: 0.25
Nodes (8): Checklist before shipping, CSS, HTML, Light mode note, Page position, Pattern: Closing CTA Band (Full-Bleed Page Closer), Relationship to the hero, When to use this pattern

### Community 58 - "Pattern: Hero Dashboard Card (CSS 3D Focal Point)"
Cohesion: 0.25
Nodes (7): Antislop purpose statement (write this in the code comment), CSS, Customisation guide, HTML structure, JavaScript, Pattern: Hero Dashboard Card (CSS 3D Focal Point), When to use this pattern

### Community 59 - "Pattern: Highlights Strip (Real Metrics, No Invented Deltas)"
Cohesion: 0.25
Nodes (7): Checklist before shipping, Content guidance, CSS, HTML, Pattern: Highlights Strip (Real Metrics, No Invented Deltas), What counts as a real metric, When to use this pattern

### Community 60 - "Pattern: Storytelling Pairs (Feature + Visual, Alternating)"
Cohesion: 0.25
Nodes (7): Checklist before shipping, Content guidance, CSS, HTML, Pattern: Storytelling Pairs (Feature + Visual, Alternating), Structure, When to use this pattern

### Community 62 - "Analytics Dashboard UI"
Cohesion: 0.29
Nodes (6): Analytics Dashboard UI, Before building anything, Components covered, Core rules (what makes this "precise" instead of ad hoc), When to use this skill, Workflow

### Community 64 - "The Craftsmanship Standard"
Cohesion: 0.33
Nodes (6): C-1 — Intentionality, C-2 — Functional Completeness, C-3 — Content-Driven Composition, C-4 — Resilience, C-5 — Evidence Over Claims, The Craftsmanship Standard

### Community 65 - "The Craftsmanship Standard"
Cohesion: 0.33
Nodes (6): C-1 — Intentionality, C-2 — Functional Completeness, C-3 — Content-Driven Composition, C-4 — Resilience, C-5 — Evidence Over Claims, The Craftsmanship Standard

### Community 66 - "Pattern Library Index"
Cohesion: 0.33
Nodes (6): Full landing page section order (proven), Glow budget for this structure (R-13, max 2 elements), Motion inventory (R-19 — all guarded by prefers-reduced-motion), Pattern Library Index, Patterns, WCAG contrast reference (dark mode)

### Community 68 - "Delivery Gate (Mandatory)"
Cohesion: 0.40
Nodes (5): Block 1: Hard Gate (absolute), Block 2: Purpose-Gate (technique allowed, reason required), Block 3: Liveliness (required to be alive, not just clean), Block 4: Craftsmanship & Quality Locks, Delivery Gate (Mandatory)

### Community 69 - "MVP Implementation"
Cohesion: 0.40
Nodes (4): Boundaries, Expansion path, MVP Implementation, Safety defaults

### Community 71 - "Delivery Gate (Mandatory)"
Cohesion: 0.40
Nodes (5): Block 1: Hard Gate (absolute), Block 2: Purpose-Gate (technique allowed, reason required), Block 3: Liveliness (required to be alive, not just clean), Block 4: Craftsmanship & Quality Locks, Delivery Gate (Mandatory)

### Community 72 - "Part 3: Liveliness Toolkit"
Cohesion: 0.50
Nodes (4): Design Read (how the dials are set), Levers (how the dials become visual decisions), Part 3: Liveliness Toolkit, Three Dials (required)

### Community 73 - "nextjs-dashboard/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 75 - "Part 3: Liveliness Toolkit"
Cohesion: 0.50
Nodes (4): Design Read (how the dials are set), Levers (how the dials become visual decisions), Part 3: Liveliness Toolkit, Three Dials (required)

## Knowledge Gaps
- **534 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+529 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 608 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `dashboard/page.tsx` to `nextjs-dashboard/package.json`, `app/page.tsx`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `AnalyticsSnapshot` connect `AnalyticsSnapshot` to `test_imports.py`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `Part 2: Mandatory Rules (R-01 to R-38, grouped)` connect `antislop` to `Group 2: Purpose-Gate (technique allowed, purpose required)`, `Group 3: Quality Locks (consistency)`, `Group 1: Hard Gate (absolute, no exceptions)`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `ContentDraft` (e.g. with `ContentPlanner` and `MetaAdapter`) actually correct?**
  _`ContentDraft` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `BrandProfile` (e.g. with `ContentPlanner` and `ModerationService`) actually correct?**
  _`BrandProfile` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _534 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `test_imports.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05116279069767442 - nodes in this community are weakly interconnected._