# Graph Report - smma-v3  (2026-10-27)

## Corpus Check
- 287 files · ~198,951 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1257 nodes · 2231 edges · 116 communities (66 shown, 41 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 198 edges (avg confidence: 0.89)
- Token cost: 1,200 input · 450 output

## Community Hubs (Navigation)
- API Routes and Seed Scripts
- Antislop Skill System
- Prisma Database Setup Guides
- Legacy Publish Queue Reconciliation
- Landing and Auth Pages
- FastAPI Analytics Endpoints
- Prisma CLI Commands
- SMM Pipeline Overview
- Dashboard Provision Plans
- Prisma Next Migration Guides
- TypeScript Config
- Dashboard Overview Cards
- Import Verification Tests
- AI Provider Protocol
- Prisma Dependencies
- Domain Models and Moderation
- Brand and Pipeline UI
- Prisma Migration SQL
- Approval Queue UI
- Analytics Dashboard UI Skill
- Runtime Dependencies
- Dev Dependencies
- Cron Schedule Runner
- Publishing Boundary Tests
- Prisma Transactions Guide
- LinkedIn Adapter
- Post Validation
- Meta Adapter
- Dashboard Shell Layout
- Prisma Compute Scaffolder
- Client Management UI
- Contrast Check Tool
- Platform Adapter Contracts
- Prisma Compute Frameworks
- AI Automation Architecture
- Architecture Audit Findings
- Prisma Agent Safety
- Prisma App Deploy
- Prisma Compute Config
- Management SDK Reference
- NPM Scripts
- Contrast MCP Server
- CRM and Neon Integration
- Antislop Rule System
- Compute Troubleshooting
- Next.js Project Setup
- Client Form Wizard
- Social Accounts Manager
- MVP and Phase Plans
- Durable Queue CI Workflows
- Publish Worker
- Security Architecture Upgrade
- Pipeline Deal Board
- Clients API Route
- Auth Proxy Middleware
- System State Controls
- Analytics Feedback Roadmap
- Audit Log Viewer
- Vercel Config
- SMM CLI Dry Run
- Package Manifest
- Button Component
- Secret Encryption
- Prisma Client Singleton
- Prisma Version Pinning
- CRM Type Layer
- Deployment Runbook
- Next.js Logo Asset
- Next Config
- Root Layout
- Rank Signals WASM
- Rust WASM Module
- Brand Moderation
- Glow Dose Rule
- Theme Toggle Rule
- Pipeline and Inbox
- AGENTS.md Import
- ESLint Config
- Next Env Types
- Prisma Manifest Entry
- Tailwind PostCSS
- Node Types Dep
- SystemState Migration
- Python Package Init
- Rust Build Script
- Rust Entry Point
- Plus Jakarta Font
- Ruff Lint Job
- CI Test Job
- CodeQL Analysis
- Gitleaks Scan
- Security Workflow
- Prisma Format
- Prisma Validate
- One-Time Token Rule
- Resource ID Prefixes
- OAuth User Access
- Connection String
- Migration SQL File
- File Icon Asset
- Globe Icon Asset
- Vercel Logo Asset
- DB Config
- smm-wasm Crate
- Root Package Name
- WASM Python Test
- Project README

## God Nodes (most connected - your core abstractions)
1. `checkRateLimit()` - 53 edges
2. `verifySession()` - 52 edges
3. `rateLimitResponse()` - 51 edges
4. `antislop Core Filter` - 33 edges
5. `prisma` - 29 edges
6. `ContentDraft` - 26 edges
7. `MetaAdapter` - 24 edges
8. `BrandProfile` - 22 edges
9. `providerErrorResponse()` - 22 edges
10. `ModerationService` - 21 edges

## Surprising Connections (you probably didn't know these)
- `test_content_draft_import()` --uses--> `ContentDraft`  [INFERRED]
  tests/test_imports.py → src/smm/domain/models.py
- `test_publish_result_import()` --uses--> `PublishResult`  [INFERRED]
  tests/test_imports.py → src/smm/domain/models.py
- `test_publisher_protocol_import()` --uses--> `Publisher`  [INFERRED]
  tests/test_imports.py → src/smm/publishing/ports.py
- `test_ai_provider_protocol_import()` --uses--> `AIProvider`  [INFERRED]
  tests/test_imports.py → src/smm/ai/provider.py
- `test_generation_request_import()` --uses--> `GenerationRequest`  [INFERRED]
  tests/test_imports.py → src/smm/ai/provider.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Analytics Dashboard UI Kit Components** — dashboard_skill_analytics_dashboard_ui_dark_first_tokens, dashboard_skill_analytics_dashboard_ui_accent_restraint, dashboard_skill_analytics_dashboard_ui_metric_kpi_card, dashboard_skill_analytics_dashboard_ui_radial_gauge, dashboard_skill_analytics_dashboard_ui_breakdown_list [EXTRACTED 1.00]
- **Delivery Gate Check Blocks** — antislop_md_delivery_gate, antislop_md_hard_gate, antislop_md_purpose_gate, antislop_md_liveliness_toolkit, antislop_md_craftsmanship_standard [EXTRACTED 1.00]
- **Prisma Compute Skill Reference Set** — nextjs_setup_nextjs_dashboard__agents_skills_prisma_compute_skill_document, nextjs_setup_nextjs_dashboard__agents_skills_prisma_compute_references_app_deploy_cli_document, nextjs_setup_nextjs_dashboard__agents_skills_prisma_compute_references_compute_config_document, nextjs_setup_nextjs_dashboard__agents_skills_prisma_compute_references_frameworks_document, nextjs_setup_nextjs_dashboard__agents_skills_prisma_compute_references_create_prisma_document, nextjs_setup_nextjs_dashboard__agents_skills_prisma_compute_references_sdk_api_document, nextjs_setup_nextjs_dashboard__agents_skills_prisma_compute_references_troubleshooting_document [EXTRACTED 1.00]
- **Dashboard Provision and Nav Plan Index** — docs_plans_master_dashboard_plan_v1_master_dashboard_plan, docs_plans_components_plan_provision_overview_command_center_provision, docs_plans_components_plan_provision_approval_gate_approval_gate_provision, docs_plans_components_plan_provision_draft_library_draft_library_provision, docs_plans_components_plan_provision_content_calendar_content_calendar_provision, docs_plans_components_plan_provision_clients_clients_provision, docs_plans_components_plan_provision_pipeline_deal_pipeline_provision, docs_plans_components_plan_provision_analytics_analytics_provision, docs_plans_components_plan_provision_guardrails_brand_guardrails_provision, docs_plans_components_plan_provision_automation_automation_provision, docs_plans_components_plan_provision_settings_settings_provision, docs_plans_components_plan_provision_audit_log_audit_log_provision, docs_plans_plan_site_nav_sitenav_plan [EXTRACTED 1.00]
- **Glow Budget (R-13) Composition** — skills_antislop_ui_patterns_hero_dashboard_card_pattern, skills_antislop_ui_patterns_cta_band_pattern, skills_antislop_ui_patterns_border_glow_pattern [EXTRACTED 1.00]
- **MongoDB Upgrade Decision Set** — nextjs_setup_nextjs_dashboard__agents_skills_prisma_mongodb_upgrade_skill_document, nextjs_setup_nextjs_dashboard__agents_skills_prisma_mongodb_upgrade_references_decision_stay_or_migrate_document, nextjs_setup_nextjs_dashboard__agents_skills_prisma_mongodb_upgrade_references_client_api_mapping_document, nextjs_setup_nextjs_dashboard__agents_skills_prisma_mongodb_upgrade_references_migrations_mapping_document [EXTRACTED 1.00]
- **Motion Inventory (R-19)** — skills_antislop_ui_patterns_scroll_reveal_pattern, skills_antislop_ui_patterns_border_glow_pattern, skills_antislop_ui_patterns_hero_dashboard_card_pattern [EXTRACTED 1.00]
- **P0 Remediation Sprint Drivers** — docs_architecture_sprint_2026_10_06_p0_remediation_sprint, docs_architecture_audit_2026_10_06_prisma_stub_finding, docs_architecture_audit_2026_10_06_ci_coverage_gap, docs_architecture_audit_2026_10_06_three_disconnected_products [EXTRACTED 1.00]
- **Phase 2 Tier 0 Build Priorities** — docs_plans_phase2_plan_priority_review_phase2_priority_review, docs_plans_components_plan_provision_automation_automation_provision, docs_plans_components_plan_provision_audit_log_audit_log_provision, docs_plans_components_plan_provision_approval_gate_approval_gate_provision [EXTRACTED 1.00]
- **Premium Landing Page Section Flow** — skills_antislop_ui_patterns_hero_dashboard_card_pattern, skills_antislop_ui_patterns_storytelling_pairs_pattern, skills_antislop_ui_patterns_highlights_strip_pattern, skills_antislop_ui_patterns_border_glow_pattern, skills_antislop_ui_patterns_cta_band_pattern [EXTRACTED 1.00]
- **Prisma Client API Reference Skill Categories** — nextjs_setup_nextjs_dashboard__agents_skills_prisma_client_api_skill, nextjs_setup_nextjs_dashboard__agents_skills_prisma_client_api_references_constructor_prisma_client_constructor, nextjs_setup_nextjs_dashboard__agents_skills_prisma_client_api_references_model_queries_model_queries, nextjs_setup_nextjs_dashboard__agents_skills_prisma_client_api_references_query_options_query_options, nextjs_setup_nextjs_dashboard__agents_skills_prisma_client_api_references_filters_filter_operators, nextjs_setup_nextjs_dashboard__agents_skills_prisma_client_api_references_relations_relation_queries, nextjs_setup_nextjs_dashboard__agents_skills_prisma_client_api_references_raw_queries_raw_queries, nextjs_setup_nextjs_dashboard__agents_skills_prisma_client_api_references_client_methods_client_methods [EXTRACTED 1.00]
- **Prisma Destructive Command Consent Flow** — nextjs_setup_nextjs_dashboard__agents_skills_prisma_cli_skill_prisma_cli_reference, nextjs_setup_nextjs_dashboard__agents_skills_prisma_cli_references_agent_safety, nextjs_setup_nextjs_dashboard__agents_skills_prisma_cli_references_db_push, nextjs_setup_nextjs_dashboard__agents_skills_prisma_cli_skill_ai_safety_checkpoint, nextjs_setup_nextjs_dashboard__agents_skills_prisma_cli_references_agent_safety_consent_env_var [EXTRACTED 1.00]
- **Prisma Postgres Setup Reference Files** — nextjs_setup_nextjs_dashboard__agents_skills_prisma_postgres_setup_references_auth_service_tokens, nextjs_setup_nextjs_dashboard__agents_skills_prisma_postgres_setup_references_api_basics_management_api_conventions, nextjs_setup_nextjs_dashboard__agents_skills_prisma_postgres_setup_references_endpoints_management_api_endpoints, nextjs_setup_nextjs_dashboard__agents_skills_prisma_postgres_setup_references_prisma7_client_prisma_7_client_instantiation [EXTRACTED 1.00]
- **Prisma Project Setup and Development Workflow** — nextjs_setup_nextjs_dashboard__agents_skills_prisma_cli_references_init_prisma_init, nextjs_setup_nextjs_dashboard__agents_skills_prisma_cli_references_dev_prisma_dev, nextjs_setup_nextjs_dashboard__agents_skills_prisma_cli_references_migrate_dev_prisma_migrate_dev, nextjs_setup_nextjs_dashboard__agents_skills_prisma_cli_references_generate_prisma_generate [EXTRACTED 1.00]
- **Prisma v7 Upgrade Reference Files** — nextjs_setup_nextjs_dashboard__agents_skills_prisma_upgrade_v7_references_schema_changes_prisma_client_generator, nextjs_setup_nextjs_dashboard__agents_skills_prisma_upgrade_v7_references_driver_adapters_driver_adapter_requirement, nextjs_setup_nextjs_dashboard__agents_skills_prisma_upgrade_v7_references_esm_support_esm_first_module_system, nextjs_setup_nextjs_dashboard__agents_skills_prisma_upgrade_v7_references_prisma_config_prisma_config_ts, nextjs_setup_nextjs_dashboard__agents_skills_prisma_upgrade_v7_references_env_variables_explicit_env_loading, nextjs_setup_nextjs_dashboard__agents_skills_prisma_upgrade_v7_references_removed_features_removed_v7_features, nextjs_setup_nextjs_dashboard__agents_skills_prisma_upgrade_v7_references_accelerate_users_accelerate_url_handling [EXTRACTED 1.00]
- **SMM Draft-to-Publish Pipeline Flow** — agents_md_smm_cli, agents_md_moderation_service, agents_md_human_approval_gate, agents_md_publishing_service, agents_md_engagement_rate [EXTRACTED 1.00]
- **SQL Driver Adapter Matrix** — nextjs_setup_nextjs_dashboard__agents_skills_prisma_database_setup_skill_driver_adapter_mapping, nextjs_setup_nextjs_dashboard__agents_skills_prisma_database_setup_references_postgresql_adapter_pg, nextjs_setup_nextjs_dashboard__agents_skills_prisma_database_setup_references_mysql_adapter_mariadb, nextjs_setup_nextjs_dashboard__agents_skills_prisma_database_setup_references_sqlite_adapter_better_sqlite3, nextjs_setup_nextjs_dashboard__agents_skills_prisma_database_setup_references_sqlite_adapter_libsql, nextjs_setup_nextjs_dashboard__agents_skills_prisma_database_setup_references_sqlserver_adapter_mssql, nextjs_setup_nextjs_dashboard__agents_skills_prisma_database_setup_references_prisma_postgres_adapter_ppg [EXTRACTED 1.00]
- **One-Time Secret Disclosure Pattern** — nextjs_setup_nextjs_dashboard__agents_skills_prisma_postgres_setup_references_auth_service_tokens, nextjs_setup_nextjs_dashboard__agents_skills_prisma_postgres_references_management_api_service_token_flow, nextjs_setup_nextjs_dashboard__agents_skills_prisma_postgres_references_management_api_sdk_one_time_token_value, nextjs_setup_nextjs_dashboard__agents_skills_prisma_postgres_references_management_api_programmatic_provisioning [INFERRED 0.75]
- **CI Quality and Security Gates** — github_workflows_ci_test_job, github_workflows_ci_ruff_advisory_job, github_workflows_security_codeql, github_workflows_security_secrets, github_workflows_security_dependency_audit [INFERRED 0.85]
- **Prisma Migrate Command Lifecycle** — nextjs_setup_nextjs_dashboard__agents_skills_prisma_cli_references_migrate_dev_prisma_migrate_dev, nextjs_setup_nextjs_dashboard__agents_skills_prisma_cli_references_migrate_deploy_prisma_migrate_deploy, nextjs_setup_nextjs_dashboard__agents_skills_prisma_cli_references_migrate_status_prisma_migrate_status, nextjs_setup_nextjs_dashboard__agents_skills_prisma_cli_references_migrate_resolve_prisma_migrate_resolve, nextjs_setup_nextjs_dashboard__agents_skills_prisma_cli_references_migrate_diff_prisma_migrate_diff, nextjs_setup_nextjs_dashboard__agents_skills_prisma_cli_references_migrate_reset_prisma_migrate_reset [INFERRED 0.85]
- **Platform Adapters Implementing the Adapter Port** — docs_architecture_ai_automation_architecture_platform_adapter_port, docs_architecture_phase2_linkedin_x_linkedin_adapter, docs_architecture_phase2_linkedin_x_x_adapter, docs_architecture_phase3_tiktok_youtube_tiktok_adapter, docs_architecture_phase3_tiktok_youtube_youtube_adapter, docs_architecture_system_architecture_upgrade_social_integration_contract [INFERRED 0.90]

## Communities (116 total, 41 thin omitted)

### Community 0 - "API Routes and Seed Scripts"
Cohesion: 0.06
Nodes (100): GET(), POST(), GET(), GET(), POST(), ALLOWED_ACTIONS, GET(), POST() (+92 more)

### Community 1 - "Antislop Skill System"
Cohesion: 0.06
Nodes (68): antislop-code Skill, Code Comment Checklist, antislop-copywriting Skill, Copywriting Skill Checklist, Draft-Audit-Final Loop, Empty AI Vocabulary, Voice Calibration Protocol, antislop-human Skill (+60 more)

### Community 2 - "Prisma Database Setup Guides"
Cohesion: 0.05
Nodes (56): CockroachDB Setup, CockroachDB BigInt/UUID ID Generation, CockroachDB Uses @prisma/adapter-pg, provider Must Be cockroachdb, MongoDB db push / db pull Workflow, MongoDB Setup, @map(_id) @db.ObjectId Mapping, MongoDB Unsupported on Prisma 7 (+48 more)

### Community 3 - "Legacy Publish Queue Reconciliation"
Cohesion: 0.13
Nodes (33): APPLY, isPublishEvent(), LIMIT, LIMIT_ARG, main(), REQUEUE_ORPHANS, GET(), ackPublishJob() (+25 more)

### Community 4 - "Landing and Auth Pages"
Cohesion: 0.08
Nodes (15): LinkedInAdapter, MetaAdapter, Exception, LinkedIn publishing boundary. Follows the same interface as MetaAdapter for…, X (formerly Twitter) publishing boundary (canonical key: "x"). Accepts the…, Return the external post ID if the last publish was successful., Classify error for retry logic., Validate that required credentials are present. (+7 more)

### Community 5 - "FastAPI Analytics Endpoints"
Cohesion: 0.08
Nodes (21): LoginPage(), Home(), DashboardCard(), SiteNav(), ArchitectureSection(), layers, CtaBand(), HeroSection() (+13 more)

### Community 6 - "Prisma CLI Commands"
Cohesion: 0.07
Nodes (33): SMM Pipeline Architecture Flow, engagement_rate(), Human Approval Gate, PublishingService, rank_signals Compute Endpoint, SMM Automation Platform, P0 Remediation Sprint Instructions, Git Safety Rules (Non-Negotiable) (+25 more)

### Community 7 - "SMM Pipeline Overview"
Cohesion: 0.10
Nodes (28): exception_handler, get, HTTPException, middleware, "AnalyticsSnapshot", post, Request, engagement_rate() (+20 more)

### Community 8 - "Dashboard Provision Plans"
Cohesion: 0.08
Nodes (19): sectionMeta, AnalyticsCards(), Overview, AutomationStatusCard(), SystemStatus, ClientsTable(), AutomationHub(), HubData (+11 more)

### Community 9 - "Prisma Next Migration Guides"
Cohesion: 0.12
Nodes (31): prisma debug Command, prisma dev Command, Prisma Postgres Local Development Database, prisma generate Command, prisma.config.ts Configuration File, prisma init Command, prisma mcp Command, prisma migrate deploy Command (+23 more)

### Community 10 - "TypeScript Config"
Cohesion: 0.16
Nodes (30): Analytics Provision Plan, Approval Gate Provision Plan, Human-in-the-Loop Approval Gate, Audit Event Types, Audit Log Provision Plan, Automation Provision Plan, Redis Queue Depth and Dead-Letter Monitoring, Clients Provision Plan (+22 more)

### Community 11 - "Dashboard Overview Cards"
Cohesion: 0.07
Nodes (19): Verify that all imports in src/smm/ resolve correctly., test_ai_provider_protocol_import(), test_analytics_snapshot_import(), test_brand_profile_import(), test_content_draft_import(), test_content_plan_import(), test_generation_request_import(), test_generation_result_import() (+11 more)

### Community 12 - "Import Verification Tests"
Cohesion: 0.09
Nodes (29): Collection Storage Name Addressing, MongoDB 8.0+ Server Floor, v6 MongoDB to Prisma Next Contract Mapping, v6 to Prisma Next Cutover Verification Checklist, Staged Read-Only Soak, Direct vs Serverless Adapter Choice, Prisma Console and Local Studio Workflow, create-db Instant Provisioning (+21 more)

### Community 13 - "AI Provider Protocol"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 14 - "Prisma Dependencies"
Cohesion: 0.15
Nodes (15): Enum, ContentDraft, DraftStatus, PublishResult, PlatformCapabilities, Exception, Protocol, SocialAdapter (+7 more)

### Community 15 - "Domain Models and Moderation"
Cohesion: 0.18
Nodes (14): AIProvider, GenerationRequest, GenerationResult, Protocol, Deterministic provider for local development and tests., StubAIProvider, main(), ContentPlan (+6 more)

### Community 16 - "Brand and Pipeline UI"
Cohesion: 0.20
Nodes (20): "Client", "ContentRevision", "PublishJob", "PublishJobEvent", "Session", "SocialAccount", "User", "Workflow" (+12 more)

### Community 17 - "Prisma Migration SQL"
Cohesion: 0.13
Nodes (15): ApprovalQueue(), ApprovalQueueProps, fieldLabel, fieldStyle, tabs, ContentDraftCard(), ContentDraftCardProps, extractReviewNote() (+7 more)

### Community 18 - "Approval Queue UI"
Cohesion: 0.10
Nodes (21): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx (+13 more)

### Community 19 - "Analytics Dashboard UI Skill"
Cohesion: 0.10
Nodes (20): Orange Accent Restraint Principle, Category Device Breakdown List, Analytics Dashboard UI Component Specs, Dark-First Design Token System, Analytics Dashboard UI Preview Reference, Metric KPI Card, Radial Gauge, Analytics Dashboard UI Skill (+12 more)

### Community 20 - "Runtime Dependencies"
Cohesion: 0.16
Nodes (16): empty, Props, statusColor, ClientStatsCards(), AnalyticsMetric, Client, CLIENT_STATUSES, ClientStats (+8 more)

### Community 21 - "Dev Dependencies"
Cohesion: 0.11
Nodes (17): name, deepmerge-ts, mysql2, sharp, source-map-js, packageManager, pnpm, overrides (+9 more)

### Community 22 - "Cron Schedule Runner"
Cohesion: 0.17
Nodes (15): get_settings(), Settings, daily_cron_run(), _get_prisma(), main(), process_schedule_queue(), Prisma, Process the schedule queue - claimed by the publish worker. (+7 more)

### Community 23 - "Publishing Boundary Tests"
Cohesion: 0.21
Nodes (16): Transactions Reference, Interactive Transactions, Transaction Isolation Levels, Nested Writes, Sequential Transactions, Transaction Best Practices, Transaction Client (tx), commit/rollback as Lifecycle Hooks (+8 more)

### Community 24 - "Prisma Transactions Guide"
Cohesion: 0.13
Nodes (15): bcryptjs, ioredis, @neondatabase/serverless, next, next-auth, dependencies, bcryptjs, ioredis (+7 more)

### Community 25 - "LinkedIn Adapter"
Cohesion: 0.20
Nodes (13): fieldLabel, fieldStyle, money(), PipelineBoard(), handleCreateLead(), handleCreateOpp(), handleLeadStatus(), handleMove() (+5 more)

### Community 26 - "Post Validation"
Cohesion: 0.18
Nodes (11): DashboardHeader(), DashboardHeaderProps, LABELS, menuItemStyle, PLATFORMS, DashboardShell(), DashboardShellProps, navCategories (+3 more)

### Community 27 - "Meta Adapter"
Cohesion: 0.22
Nodes (13): create-prisma --deploy Integrated Flow, create-prisma Compute Flow Reference, Auto Prisma Postgres Provisioning, Prisma 7 Scaffold Defaults, create-prisma Is Not the Deploy Path, create-prisma Supported Templates, compute:deploy Generated Script, create-prisma Scaffolder (+5 more)

### Community 28 - "Dashboard Shell Layout"
Cohesion: 0.28
Nodes (7): "BrandProfile", "ContentDraft", Validate post content against brand guidelines., ModerationResult, ModerationService, test_empty_caption_is_rejected(), test_prohibited_topic_is_rejected()

### Community 29 - "Prisma Compute Scaffolder"
Cohesion: 0.32
Nodes (11): contrast_ratio(), linearize(), luminance(), main(), parse_hex(), parse_pairing(), parse_reference_rows(), Turn 'White on #333333' or '#555555 on black' into two RGB tuples. (+3 more)

### Community 30 - "Client Management UI"
Cohesion: 0.18
Nodes (11): Config build Block, Framework Auto-Detection, Bun Entrypoint Deploy, framework custom Artifact, Prisma Compute Framework Readiness, Next.js Standalone Output Requirement, Nitro Node Server Output, SvelteKit Has No Deploy Key (+3 more)

### Community 31 - "Contrast Check Tool"
Cohesion: 0.20
Nodes (10): AI Automation Architecture for SMM, AI Is Advisory Not Autonomous Principle, AIProvider Interface, Dry-Run Is the Default Principle, Platform Adapter Port, LinkedIn Adapter, X Adapter, TikTok Adapter (+2 more)

### Community 32 - "Platform Adapter Contracts"
Cohesion: 0.22
Nodes (10): System Architecture and Best Practices Audit 2026-10-06, CI Never Covers Next.js Dashboard, Option A Dashboard-Only Product, Option B Dashboard as UI over Python Engine, Fake Prisma Stub Persistence Finding, Three Disconnected Products in One Repo, P0 Remediation Sprint 2026-10-06, P0 Remediation Sprint Concept (+2 more)

### Community 33 - "Prisma Compute Frameworks"
Cohesion: 0.38
Nodes (10): Prisma Agent Safety Reference, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION, prisma complete Reference, prisma db execute Reference, prisma db pull Reference, prisma db push Reference, prisma db seed Reference, Prisma AI Safety Checkpoint (+2 more)

### Community 34 - "AI Automation Architecture"
Cohesion: 0.24
Nodes (10): @prisma/cli agent install, Branch Scope Alignment, Build Logs vs App Logs, Database and Env Guardrails, Prisma Platform CLI App Deploy Reference, Exact --confirm for Destructive Commands, GitHub Push-to-Deploy, app promote Production Promotion (+2 more)

### Community 35 - "Architecture Audit Findings"
Cohesion: 0.24
Nodes (10): app vs apps Target Selection, defineComputeConfig Helper, Prisma Compute Config Reference, Compute Config File Discovery, Flag-over-Config Precedence, prisma cli init Config Generator, Region Applies Only to New Apps, prisma.compute.ts vs prisma.config.ts Separation (+2 more)

### Community 36 - "Prisma Agent Safety"
Cohesion: 0.20
Nodes (10): No Secrets in Committed Config, Compute Deploy Framework Keys, SDK Build Strategies, detectComputeApp Snapshot Detection, SDK and API Automation Reference, createManagementApiClient, Compute Region IDs, Project/Branch/App/Deployment Model (+2 more)

### Community 37 - "Prisma App Deploy"
Cohesion: 0.20
Nodes (10): @prisma/adapter-neon, @prisma/client, prisma, devDependencies, prisma, @prisma/adapter-neon, @prisma/client, prisma (+2 more)

### Community 38 - "Prisma Compute Config"
Cohesion: 0.20
Nodes (10): scripts, build, dev, lint, postinstall, prebuild, predev, seed (+2 more)

### Community 39 - "Management SDK Reference"
Cohesion: 0.38
Nodes (9): _channel(), check_contrast(), contrast_ratio(), _error(), main(), relative_luminance(), _reply(), _send() (+1 more)

### Community 40 - "NPM Scripts"
Cohesion: 0.27
Nodes (7): AdapterFactory, Factory for creating adapter instances by platform name. Platform input is…, Get an adapter instance for the specified platform., normalize_platform(), test_adapter_factory_uses_canonical_x_key(), test_platform_aliases_are_normalized(), test_x_adapter_emits_canonical_platform()

### Community 41 - "Contrast MCP Server"
Cohesion: 0.20
Nodes (10): v2 Client Records Management Module, Client Status Lifecycle, In-Memory Store Pattern, Neon Preview Branching, Pooled vs Direct Neon Connections, v3.0 PostgreSQL + Neon Database Integration, Durable Publishing Job, Editorial State vs Delivery State Separation (+2 more)

### Community 42 - "CRM and Neon Integration"
Cohesion: 0.22
Nodes (9): Craftsmanship Standard (C-1..C-5), Delivery Gate, Hard Gate Rule Group (R-02..R-38), Liveliness Toolkit, Purpose-Gate Mechanism, R-31 Every Decision Must Have a Reason, Three Dials (ENERGY/RHYTHM/MOTION), Design Dials (ENERGY/RHYTHM/MOTION) (+1 more)

### Community 43 - "Antislop Rule System"
Cohesion: 0.25
Nodes (9): Boot Watcher Port Readiness, COMPUTE_CONFIG_INVALID Errors, Troubleshooting Prisma Compute, Localhost Binding Failure, Placeholder DATABASE_URL Failure, PLAN_LIMIT_REACHED, Port Mismatch, 504 Gateway Time-out Request Timeout (+1 more)

### Community 44 - "Compute Troubleshooting"
Cohesion: 0.25
Nodes (9): create-next-app CLI, Geist Font Family, next/font Optimizer, Next.js Framework, Next.js Dashboard Project, Vercel Platform, TypeScript Errors Log 2, TypeScript Errors Log 3 (+1 more)

### Community 45 - "Next.js Project Setup"
Cohesion: 0.33
Nodes (6): ClientForm(), goBack(), goNext(), handleNext(), handleSkip(), moveFocusToStepTop()

### Community 46 - "Client Form Wizard"
Cohesion: 0.25
Nodes (5): Connection, PROVIDERS, SocialAccountsManager(), STATUS_STYLES, statusStyle()

### Community 47 - "Social Accounts Manager"
Cohesion: 0.25
Nodes (8): CANONICAL_PLATFORMS, CanonicalPlatform, getPlatformCapabilities(), normalizePlatform(), PLATFORM_ALIASES, PLATFORM_CAPABILITIES, PlatformCapabilities, SocialPlatform

### Community 48 - "MVP and Phase Plans"
Cohesion: 0.25
Nodes (8): MVP Implementation Plan, Meta-First MVP Strategy, MVP Safety Defaults, Phase 2 Integration Contract, Provider Production Gates, Provider OAuth Lifecycle, Phase 2 LinkedIn and X, Provision Upgrade Plan Social Accounts

### Community 49 - "Durable Queue CI Workflows"
Cohesion: 0.25
Nodes (8): Durable Publish Queue Integration Workflow, Repair pnpm Lockfile Configuration Workflow, Dependency Audit Job, pnpm Workspace Configuration, Idempotency-Key Publish Requirement, Phase 2 LinkedIn + X Integrations, Redis Durable Publish Queue, AES-256-GCM Token Encryption

### Community 50 - "Publish Worker"
Cohesion: 0.32
Nodes (7): adapters, moderationService, prisma, processPublishJob(), ProviderKey, publishWorkerLoop(), resolveAdapter()

### Community 51 - "Security Architecture Upgrade"
Cohesion: 0.33
Nodes (7): SMM AI System Architecture Upgrade, OWASP Security Baseline, Social Integration Contract, Workspace-Scoped CRM Domain, Encrypted Credential Storage, SocialAccountsManager Provision, Queue PR1 Runbook Dependency Audit

### Community 52 - "Pipeline Deal Board"
Cohesion: 0.29
Nodes (3): BrandProfileCard(), BrandProfile, initialBrandProfile

### Community 53 - "Clients API Route"
Cohesion: 0.47
Nodes (4): ClientStatus, GET(), PATCH(), toClientDTO()

### Community 54 - "Auth Proxy Middleware"
Cohesion: 0.40
Nodes (5): config, isPublic(), PROTECTED_PREFIXES, proxy(), PUBLIC_PATHS

### Community 55 - "System State Controls"
Cohesion: 0.40
Nodes (5): DB-backed SystemState Dry-Run Toggle, Server-Authoritative Publishing, Recommended v3 Information Architecture, No Widgets Until IA and Data Contracts Defined, Server-Authoritative System Controls

### Community 56 - "Analytics Feedback Roadmap"
Cohesion: 0.40
Nodes (5): Phase 3 TikTok and YouTube, Phase 4 Analytics-Driven Recommendation Loop, A/B Testing Support, Analytics Feedback Loop, Topic Scoring Algorithm

### Community 57 - "Audit Log Viewer"
Cohesion: 0.40
Nodes (3): ACTION_STYLES, AuditEvent, AuditLogViewer()

### Community 58 - "Vercel Config"
Cohesion: 0.40
Nodes (4): buildCommand, framework, installCommand, $schema

### Community 59 - "SMM CLI Dry Run"
Cohesion: 0.50
Nodes (4): smm CLI (python -m smm.cli), Daily SMM Dry Run Workflow, DRY_RUN Safe Default, Meta-first MVP Strategy

### Community 60 - "Package Manifest"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 62 - "Secret Encryption"
Cohesion: 0.50
Nodes (3): adapter, globalForPrisma, prisma

### Community 63 - "Prisma Client Singleton"
Cohesion: 0.67
Nodes (3): Task 1.1 Pin Prisma CLI to Stable, Prisma Neon Driver Adapter, Prisma CLI Stable Pin (7.10.0)

### Community 64 - "Prisma Version Pinning"
Cohesion: 0.67
Nodes (3): Database Enum/Shape as Source of Truth, toClientDTO Response Shaping, Unified crm.ts Type Layer

### Community 65 - "CRM Type Layer"
Cohesion: 0.67
Nodes (3): NEXT_NO_VERSION Deployment Incident, Package-Manager Hygiene Gate, Vercel Deployment Root and Package-Manager Runbook

### Community 66 - "Deployment Runbook"
Cohesion: 0.67
Nodes (3): Next.js Framework (brand identity), Next.js Dashboard Application, Next.js Logo Asset (next.svg)

## Knowledge Gaps
- **313 isolated node(s):** `PipelineWithStages`, `AuditAction`, `SessionPayload`, `ConnectionRow`, `Phase2Provider` (+308 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 466 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SiteNav()` connect `FastAPI Analytics Endpoints` to `Prisma CLI Commands`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `SiteFooter()` connect `Dashboard Provision Plans` to `FastAPI Analytics Endpoints`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `SiteNav Component Upgrade Plan` connect `Prisma CLI Commands` to `FastAPI Analytics Endpoints`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `PipelineWithStages`, `AuditAction`, `SessionPayload` to the rest of the system?**
  _313 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API Routes and Seed Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.056807362741986674 - nodes in this community are weakly interconnected._
- **Should `Antislop Skill System` be split into smaller, more focused modules?**
  _Cohesion score 0.05794556628621598 - nodes in this community are weakly interconnected._
- **Should `Prisma Database Setup Guides` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._