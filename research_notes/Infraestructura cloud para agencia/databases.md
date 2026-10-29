# Database Server Options for an Agency (Self-hosted vs Managed vs Serverless) — as of Oct 2026

> Research method note: WebFetch was blocked in this session for most vendor domains (planetscale.com, neon.com, supabase.com, docs.digitalocean.com, bytebase.com, selfhost.dev all failed DNS through the sandbox proxy). All findings below come from web-search result summaries. Many figures are from third-party aggregators, not official pricing pages, and are flagged as such. **Verify every price on the vendor's official pricing page before quoting it to a client.**

## 1. Cost comparison at small/medium tiers (late-2026 pricing)

### Takeaway
At the small tier, entry prices cluster around $5–$30/month per database: PlanetScale PS-5 at ~$5, Supabase Pro at $25 + compute, DO/Linode managed at ~$15 single node, Atlas Flex at $8–30. HA roughly doubles the cost on DO, where a standby costs the same as the primary, and roughly triples it on PlanetScale (3-node). Self-hosting on a VPS is still the cheapest per GB/vCPU, but Hetzner raised prices sharply in 2026 (+30–38% on CX lines, much more on CPX/CCX), which narrows the gap.

### Cited Findings
**Managed (classic DBaaS)**
- DigitalOcean Managed PostgreSQL: single node "from $15" (Basic 1 GiB listed at $15.15/mo). HA clusters start at $30/mo for a 2 GiB/1 vCPU primary plus at least one standby at the same $30/mo price. Standbys can be added or removed at any time. The official page was last verified June 2025 (date-flag) — [DO docs pricing](https://docs.digitalocean.com/products/databases/postgresql/details/pricing/); [WHTOP listing](https://www.whtop.com/plans/digitalocean.com/159184). An older Severalnines article quotes a flat $20 standby charge, but it is outdated: it lists PG 10/11 as the only versions — [Severalnines](https://severalnines.com/?p=11456)
- Akamai/Linode managed MySQL/PostgreSQL: start around $15/mo for basic configurations. Typical production app with a managed DB totals $80–$200/mo. MongoDB support is conflicting across sources — [kuberns 2026](https://kuberns.com/blogs/linode-pricing/); [Valebyte Jul 2026](https://valebyte.com/en/blog/linode-akamai-review-and-where-to-migrate-in-2026/); contradicted by [dev.to](https://dev.to/alakkadshaw/hetzner-alternatives-for-2025-digitalocean-linode-vultr-ovhcloud-5936) (says MySQL/Postgres only)
- Vultr Managed Databases: no current price found (only the CLI reference that lists plans) — [Vultr docs](https://docs.vultr.com/reference/vultr-cli/database/plan/list.md)
- AWS Aurora Serverless v2 can scale to 0 ACU with auto-pause (Aurora PG 13.15+/14.12+/15.7+/16.3+, Aurora MySQL 3.08+). No ACU charges while paused, only storage. Resume takes roughly 15 s according to one source, "a few seconds" according to another — [usage.ai](https://www.usage.ai/blogs/aws/rds/aurora-serverless-v2/); [Vantage Aurora vs Neon](https://vantage.sh/blog/neon-vs-aws-aurora-serverless-postgres-cost-scale-to-zero)
- Standard RDS cannot auto-pause. A stopped instance is restarted automatically by AWS after 7 days, so the hourly charge runs continuously — [usage.ai](https://www.usage.ai/blogs/aws/rds/aurora-serverless-v2/)
- Aurora Serverless v2 ACU-hour price is inconsistent across sources ($0.12 vs ~$0.29 in us-east-1 in the same June 2026 article). Unverified — [factualminds](https://www.factualminds.com/blog/amazon-aurora-pricing-io-optimized-serverless-v2-global/)
- Firebase Data Connect has two billed parts: the Data Connect service and the underlying Cloud SQL for PostgreSQL instance. Cloud SQL "starts as low as $9.37/month". 250k operations/month are free, then $4.00 per million. 10 GiB/month egress is free. The Spark (free) plan is limited to 8,300 operations/day — [Firebase Data Connect pricing](https://firebase.google.com/docs/data-connect/pricing)

**Dev-focused / serverless**
- Supabase: Free $0. Pro $25/mo, bundling Auth, Storage, Edge Functions, Realtime and Postgres. Includes $10/mo compute credit (covers one Micro). Compute is billed extra: Micro $10, Small $15, Medium $60. Pro includes 8 GB DB storage, 100 GB file storage and 250 GB egress. A spend cap is on by default. Small production apps typically run $35–$75/mo. Team plan is $599/mo. All sources are third-party — [MakerKit](https://makerkit.dev/blog/saas/supabase-pricing); [JetAdmin 2026](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/); [nocode.mba](https://www.nocode.mba/topics/backend-app-development)
- Supabase compute credit scope is ambiguous: per project vs per organization — [Schematic](https://schematichq.com/blog/supabase-pricing) vs [CloudZero](https://www.cloudzero.com/blog/supabase-pricing/)
- Neon, after Databricks: fully usage-based. Compute dropped from $0.14 to $0.106/CU-h on Launch and from $0.26 to $0.222/CU-h on Scale (15–25% cut). Launch goes up to 16 vCPU/64 GB, Scale up to 56 vCPU/224 GB — [Vantage](https://www.vantage.sh/blog/neon-acquisition-new-pricing); rounded figures at [PricingSaaS](https://pricingsaas.com/companies/neon)
- Neon free tier (third-party summary): 100 CU-hours/month per project, 0.5 GB storage per project, up to 100 projects, 10 branches/project — [agentdeals](https://agentdeals.dev/vendor/neon)
- PlanetScale Postgres: PS-5 single node at $5/mo (1/16 vCPU, 512 MB). 3-node HA from ~$15/mo. PS-80 HA (3×1 vCPU, 8 GiB) ~$148. PS-320 HA ~$570. Metal (local NVMe) from $50/mo. There is conflicting data (CostBench lists ps_5 at $15) — [Bytebase 2026](https://www.bytebase.com/blog/postgres-hosting-options-pricing-comparison/); [CostBench](https://costbench.com/software/database-as-service/planetscale/); [PlanetScale pricing](https://www.planetscale.com/pricing)
- MongoDB Atlas Flex: $8/mo base (5 GB storage, 100 ops/s), pay-as-you-go hourly, **capped at $30/mo**. Tracker notes a rename/pricing change in March 2026 ($0.011/h) — [MongoDB Atlas Flex costs](https://mongodb.com/docs/atlas/billing/atlas-flex-costs); [MongoDB blog](https://www.mongodb.com/blog/post/dynamic-workloads-predictable-costs-mongodb-atlas-flex-tier); [PricingSaaS diff](https://pricingsaas.com/companies/mongodb/diffs/2026W13)
- Turso (libSQL): Free 500M rows read and 10M written per month. Developer $4.99 (2.5B reads, 25M writes). Scaler $24.92. Pro $416.58 (toolradar, May 2026). Other sources conflict — [toolradar](https://toolradar.com/tools/turso/pricing); [budgetforge](https://www.budgetforge.dev/tools/turso-pricing-2026)
- Cloudflare D1: billed on rows read, rows written and storage. No charge for hours or capacity units. The free Workers plan always allows prototyping. Third-party figure: $0.001 per million reads overage on Workers Paid — [Cloudflare D1 pricing docs (preview mirror, updated Aug 27 2026)](https://41dd6664.previews.developers.cloudflare.com/d1/platform/pricing/index.md); [devtoolreviews](https://www.devtoolreviews.com/reviews/turso-vs-cloudflare-d1-comparison-2026)
- Xata: pay-as-you-go instance-hours from Micro $0.012/h (1 GB RAM) to XLarge $0.192/h (16 GB). NVMe storage $0.30/GB-mo. Up to $100 onboarding credit. A self-managed open-source tier is free. One calculator puts an always-on 100 GB/2 GB workload at ~$47/mo on Xata vs ~$73/mo on Neon Launch — [Xata pricing](https://xata.io/pricing.md); [MakerKit Neon vs Xata](https://makerkit.dev/pricing-calculator/neon-vs-xata)
- Railway Hobby: $5/mo including $5 of usage credit. A credit card has reportedly been required for all Hobby users since March 2026 (secondary report) — [sota.io](https://sota.io/blog/railway-vs-render-vs-fly-pricing-2026); [pandastack](https://pandastack.io/blog/best-railway-postgres-alternatives-2026)

**Self-hosted VPS baseline**
- Hetzner raised prices on April 1, 2026 (~30–37% on cloud) and again on June 15, 2026. The June change hit CX/CAX by +33–38% and CPX/CCX by up to +176%: CX23 went from €3.99 to €5.49, and CPX22 from €7.99 to €19.49. It applies to new orders only. CX/CAX were reportedly "currently not available" as of August 2026 (single source) — [findstack](https://findstack.com/resources/hetzner-price-increase-2026); [wz-it](https://wz-it.com/en/blog/hetzner-price-increase-june-2026-cpx-ccx-alternatives/); [privatedevops](https://privatedevops.com/news/hetzner-june-2026-cloud-price-increase-what-to-do)
- Hetzner has no managed PostgreSQL/MySQL. It suits self-sufficient teams — [Better Stack review](https://betterstack.com/community/guides/web-servers/hetzner-cloud-review/)

### Inferences
- Rough monthly cost per client DB (small production, Postgres): self-hosted on a shared VPS ≈ a few € per client (amortized). Classic managed single node ≈ $15. Managed HA ≈ $30–60. Supabase Pro ≈ $25–75 (but includes auth/storage). Neon/Xata/PlanetScale PS-5 ≈ $5–50 depending on activity. Dormant client projects (MVPs, demos) favor scale-to-zero platforms: Neon, Aurora SLv2 at 0 ACU, D1/Turso.
- On fixed-instance managed DBs, HA costs about 2× (DO) or 3× (PlanetScale 3-node) the base. Reserve HA for revenue-critical clients (e-commerce, lead capture).
- The 2026 Hetzner price hikes (driven by DRAM/NAND costs) erode, but do not eliminate, self-hosting's cost edge. Other VPS providers may follow. Re-check quotes.

### Gaps
- Could not verify official 2026 prices for AWS RDS (db.t4g.micro/small), Google Cloud SQL, Azure Database for PostgreSQL Flexible Server, Vultr Managed DB or Render Postgres. Fetch was blocked, and search did not return figures.
- Egress pricing for most providers (except Supabase 250 GB included and Firebase 10 GiB free) was not verified.
- Connection limits per compute size (Supabase Micro/Small direct/pooler limits, DO connection limits per plan) were not retrievable.

## 2. Operational burden of self-hosting (backups, PITR, HA, upgrades, monitoring; Coolify/Dokploy)

### Takeaway
Coolify and Dokploy make provisioning a DB trivial, but they only do scheduled logical dumps (pg_dump) to S3. That means no PITR, and the RPO equals the dump interval. Real PITR/HA requires WAL archiving with pgBackRest, WAL-G or Barman plus Patroni, which is a significant skill and time investment. pgBackRest is the safer default for a small team.

### Cited Findings
- Coolify backups are cron-based (every minute to yearly), full `pg_dump --format=custom`, with S3-compatible storage destinations. Restore pulls from S3, a local file or a server path via pg_restore/psql. You still own server updates and restore tests — [Coolify docs](https://coolify.io/docs/databases/backups); [Coolify self-host postgres](https://coolify.io/self-host-postgres-with-backups); [Vultr guide](https://docs.vultr.com/how-to-back-up-and-restore-postgresql-databases-to-s3-compatible-storage-in-coolify)
- Coolify's restore procedure advises stopping application writes and taking a separate backup first, so restores are disruptive — [Vultr guide](https://docs.vultr.com/how-to-back-up-and-restore-postgresql-databases-to-s3-compatible-storage-in-coolify)
- Dokploy also does cron pg_dump to S3-compatible, local or remote destinations, and recommends daily or hourly for critical data. No WAL/PITR found — [Dokploy backups (mintlify mirror)](https://www.mintlify.com/Dokploy/dokploy/advanced/backups)
- Local-only backups don't protect against disk failure. Test restores periodically into a temporary container — [hamy.xyz](https://hamy.xyz/blog/2025-03_coolify-automated-db-backups); [RamNode Coolify guide](https://ramnode.com/guides/series/coolify/database-service-management)
- pgBackRest has a documented Patroni integration (bootstrap, replica creation, PITR under Patroni) — [PGConf EU 2025 talk](https://www.postgresql.eu/events/pgconfeu2025/schedule/session/6961-patroni-and-pgbackrest-better-together/); [Autobase docs](https://autobase.tech/docs/management/restore)
- WAL-G offers fast parallel backup and restore, but its docs are weak and its backup verification is less mature than pgBackRest's. Barman is a fine substitute only if you rely on full rather than block-incremental backups — [thebuild.com "After pgBackRest"](https://thebuild.com/blog/after-pgbackrest/)
- pgBackRest uses INI config with a steep learning curve. WAL-G uses env vars, cron and shell scripting. Both require `archive_command` setup — [dev.to comparison](https://dev.to/piteradyson/postgresql-backup-tools-comparison-databasus-wal-g-pgbackrest-and-barman-2kg)
- Practitioner reports of restore pitfalls under Patroni: behavior differs when Postgres is started via Patroni vs pg_ctl, and WAL-G full-cluster restores left nodes waiting for a leader — [Percona forum](https://forums.percona.com/t/patroni-and-pgbackrest-full-restore-problem/28077); [Habr comments](https://habr.com/ru/companies/T1Holding/articles/823360/comments)
- pgBackRest PITR reportedly misbehaves with pg_tde WAL encryption — [Percona forum](https://forums.percona.com/t/request-for-guidance-pg-tde-wal-encryption-behavior-with-pgbackrest-pitr/40115)
- Autobase (formerly postgresql_cluster) is an Ansible/UI tool that deploys Patroni + pgBackRest/WAL-G clusters — [Autobase](https://autobase.tech/docs/management/restore); [GitHub](https://github.com/vitabaks/postgresql_cluster/pull/40)

### Inferences
- Agency default when self-hosting: Coolify/Dokploy for provisioning, plus scheduled dumps to off-site S3 (hourly for lead/e-commerce data), plus pgBackRest/WAL-G WAL archiving on any DB where losing an hour of data is unacceptable. Add a monthly automated restore test.
- For MySQL/WordPress the equivalents are mysqldump/mydumper (logical) and Percona XtraBackup plus binlog retention (physical + PITR). Not researched in depth this round (see Gaps).
- HA (Patroni, or MySQL replication + orchestrator) is likely not worth self-operating for a small agency. Buy managed HA for the few clients that need it.
- Major-version upgrades, OS patching, tuning (shared_buffers, work_mem, max_connections) and monitoring (postgres_exporter/Prometheus, PMM) are recurring labor that managed services absorb.

### Gaps
- No source found quantifying hours/month of DBA effort for self-hosted fleets.
- Percona XtraBackup/MySQL PITR specifics and Coolify/Dokploy MySQL backup behavior were not researched due to tool-call budget.
- Monitoring stack recommendations were not sourced.

## 3. Multi-tenancy strategy (one server per client vs shared cluster)

### Takeaway
No authoritative 2025–26 source was found specifically on agency DB multi-tenancy. The recommendations below are inferences from the platform facts above.

### Cited Findings
- Neon's free tier allows up to 100 projects, with branches per project, so per-client projects are cheap on serverless — [agentdeals](https://agentdeals.dev/vendor/neon)
- Supabase compute is billed per project (each project has its own compute instance). Per-client Supabase projects therefore cost about $10+/mo each beyond the included credit — [MakerKit](https://makerkit.dev/blog/saas/supabase-pricing)
- Turso's free tier is marketed around many databases (one source: "500 databases"), which suits database-per-tenant. That source is low-quality — [subger](https://subger.com/en/service/turso)

### Inferences
- **Tiered model** (recommended):
  - Tier A, low-value WordPress/brochure sites: a shared MySQL/MariaDB server, or Postgres for Node apps, on a VPS/managed cluster. Give each client a separate database and user with no cross-DB grants. Cheapest option. Noisy-neighbor risk is mitigated by per-user connection limits (`MAX_USER_CONNECTIONS` in MySQL, `ALTER ROLE ... CONNECTION LIMIT` in PG).
  - Tier B, client apps/MVPs with variable traffic: one serverless project per client (Neon/Supabase/Turso) under an agency org. Each project can later be transferred to the client's own account and billing.
  - Tier C, revenue-critical clients or those with compliance needs: a dedicated managed instance with HA in the client's own cloud account, or in an agency sub-account billed through.
- Handover is easiest when each client has its own project/instance. Shared clusters require a dump/restore migration at handover.
- Separate databases on one server do not isolate CPU/IO, backups are server-wide, and a breach of a superuser credential exposes all clients.

### Gaps
- No sourced benchmarks on noisy-neighbor effects or per-tenant limits on shared MySQL/PG for agency workloads.
- Project-transfer mechanics (Supabase/Neon "transfer project to another org") were not verified.

## 4. Database security (private networking, TLS, encryption, least privilege, auditing)

### Takeaway
Private connectivity is the main differentiator. Some poolers have networking constraints: Supabase's dedicated PgBouncer is IPv6-only unless you pay for an IPv4 add-on. Most other controls are standard and were not separately sourced this round.

### Cited Findings
- Supabase's dedicated pooler (PgBouncer co-located with the DB) is IPv6-only and transaction-mode only. A paid IPv4 add-on is needed for IPv4-only hosts such as Railway, which is why Railway users fall back to the shared Supavisor pooler — [Supabase changelog](https://supabase.com/changelog/34404-dedicated-pooler-with-pgbouncer); [Midday docs](https://huggingface.co/spaces/AUXteam/Midday/blob/main/docs/database-connection-pooling.md)
- Coolify-provisioned DBs leave server hardening and updates to you — [Coolify self-host postgres](https://coolify.io/self-host-postgres-with-backups)

### Inferences
- Baseline checklist: never expose 5432/3306 publicly (use VPC/private network or WireGuard/Tailscale; if public, use IP allowlists). Enforce TLS (`sslmode=verify-full`). Use disk/volume encryption at rest (default on major managed DBs). One app user per DB with only the privileges it needs, plus a separate migration/owner role and a read-only analytics role. Rotate credentials in a secret manager. Turn on `pgaudit` or the MySQL audit plugin for clients that store PII or leads. Encrypt off-site backups.
- Coolify/Dokploy can publish DB ports publicly with a toggle. The agency should enforce "never public" by policy.

### Gaps
- Encryption-at-rest defaults and private-networking availability per provider (DO VPC, Neon Private Link, Supabase PrivateLink, PlanetScale private connections) were not verified with sources this round.
- Auditing feature availability by plan was not verified.

## 5. Recent changes (2024–2026)

### Takeaway
2025–26 reshaped the market. Databricks bought Neon (~$1B, May 2025) and Neon prices fell. PlanetScale launched Postgres (GA Oct 2025), with a $5 single-node entry tier after killing its free Hobby plan in 2024. Redis returned to open source with AGPLv3 (Redis 8, May 2025), but Valkey (BSD) became the cloud/distro default. MongoDB rebranded its shared tier as Atlas Flex ($8–30 cap). Hetzner raised prices twice in 2026.

### Cited Findings
- Databricks agreed to acquire Neon for ~$1B in May 2025. The tech also powers Databricks "Lakebase". Neon compute prices fell 15–25% afterwards. Vantage suggests the drop likely reflects Databricks' AWS discounts — [Financier Worldwide](https://financierworldwide.com/fw-news/2025/5/15/databricks-to-acquire-neon-for-1bn); [Vantage](https://www.vantage.sh/blog/neon-acquisition-new-pricing); [Yahoo Finance/TechCrunch](https://au.finance.yahoo.com/news/databricks-buy-open-source-database-120751104.html)
- PlanetScale removed its free Hobby plan in April 2024 and has not reinstated it. Postgres GA came in October 2025 on AWS/GCP, with Metal (local NVMe) from $50/mo and a vendor claim of lower latency and cost vs Aurora. Neki (sharded Postgres, from the Vitess team) is still in development — [InfoQ Oct 2025](https://infoq.com/news/2025/10/planetscale-metal-postgres); [agentdeals](https://agentdeals.dev/vendor/planetscale); [yespress](https://yespress.io/planetscale)
- Redis 8.0 (May 2025) added AGPLv3 alongside RSALv2/SSPLv1. Valkey is a BSD-3 fork of Redis 7.2.4 backed by AWS and Google, with 700+ contributors. Many Linux distros switched to Valkey. Microsoft signed commercial terms with Redis — [InfoQ](https://www.infoq.com/news/2025/05/redis-agpl-license); [Phoronix](https://www.phoronix.com/news/Redis-8.0-Goes-AGPLv3); [OneUptime Mar 2026](https://oneuptime.com/blog/post/2026-03-31-redis-redis-vs-valkey-understanding-the-fork/view)
- Many organizations have policies against AGPL, which limits Redis 8 enterprise appeal (Percona founder's view). Redis 8 bundles features Valkey lacks natively: vector sets, JSON and search — [support.tools](https://support.tools/redis-open-source-again/); [tech-insider](https://tech-insider.org/valkey-vs-redis-2026/)
- AWS offers ElastiCache for Valkey at a discount vs ElastiCache for Redis. The ~20% figure comes from a low-quality source and is unverified — [tech-insider](https://tech-insider.org/valkey-vs-redis-2026/)
- MongoDB Atlas "Flex" replaced the earlier shared/serverless tiers. It costs $8/mo base, capped at $30, with a packaging change in March 2026 — [MongoDB blog](https://mongodb.com/company/blog/product-release-announcements/dynamic-workloads-predictable-costs-mongodb-atlas-flex-tier); [PricingSaaS](https://pricingsaas.com/companies/mongodb/diffs/2026W13)
- Railway reportedly requires a credit card for Hobby since March 2026 — [pandastack](https://pandastack.io/blog/best-railway-postgres-alternatives-2026)
- Supabase added a dedicated PgBouncer pooler alongside Supavisor — [Supabase changelog](https://supabase.com/changelog/34404-dedicated-pooler-with-pgbouncer)

### Inferences
- For caching, default to Valkey: self-hosted (BSD, drop-in for Redis 7.2 clients) or managed (ElastiCache/Memorystore for Valkey, DO). Choose Redis 8 only if you need its vector/JSON/search modules and the AGPL/commercial terms are acceptable. For WordPress object cache, Valkey works with the Redis Object Cache plugin as a protocol-compatible server. This compatibility is assumed, not separately sourced.
- Vendor concentration risk: Neon under Databricks may shift focus toward AI/agents (PricingSaaS lists an "Agent Plan"). Keep apps on vanilla Postgres so you can move between Neon, Supabase, PlanetScale, RDS or self-hosted.

### Gaps
- Exact Neon free-tier and plan details from neon.com could not be fetched.
- Status of Xata's product pivot and Render Postgres pricing changes were not verified.
- Valkey 8.x/9.x release features were not researched.

## 6. Engine choice and latency (colocation, pooling)

### Takeaway
Default to PostgreSQL for new Node/Next.js apps and SaaS. Keep MySQL/MariaDB for WordPress. Use SQLite/libSQL (Turso/D1) for edge or per-tenant small apps. Use MongoDB only when the client stack demands it. Always colocate the DB in the same region as the compute. Serverless functions need a transaction-mode pooler, which breaks session features like prepared statements.

### Cited Findings
- Pooled (transaction-mode) connections return to the pool after each transaction, breaking SQL-level PREPARE/EXECUTE and other session state — [Neon FAQ](https://neon.com/faqs/postgres-services-built-in-connection-pooling)
- Supabase's transaction-mode pooler (port 6543) doesn't support prepared statements, but the direct connection (5432) does. Supavisor in transaction mode has the same caveats as PgBouncer — [iloveblogs guide](https://www.iloveblogs.blog/guides/supabase-connection-pooling-vercel); [Neon FAQ](https://neon.com/faqs/best-postgres-services-connection-pooling)
- A dedicated PgBouncer co-located on the DB machine gives lower latency than a separate pooler hop — [Midday docs](https://huggingface.co/spaces/AUXteam/Midday/blob/main/docs/database-connection-pooling.md)
- A production Vercel deployment saw pooler struggles under connection spikes during deploys and moved to PgDog — [Circleback blog](https://circleback.ai/blog/how-we-fixed-postgres-connection-pooling-on-serverless-with-pgdog)
- D1 and Turso bills are driven by rows read, so query efficiency and indexing dominate cost. libSQL is MIT-licensed and self-hostable. Turso supports embedded replicas — [devtoolreviews](https://www.devtoolreviews.com/reviews/turso-vs-cloudflare-d1-comparison-2026); [gautamkhorana](https://gautamkhorana.com/serverless-databases/compare/turso-vs-cloudflare-d1/)
- Firebase Data Connect is backed by Cloud SQL Postgres, so even Firebase now steers relational workloads to Postgres — [Firebase Data Connect pricing](https://firebase.google.com/docs/data-connect/pricing)
- Aurora SLv2 and Neon scale-to-zero add cold-start latency, seconds to ~15 s on Aurora — [usage.ai](https://www.usage.ai/blogs/aws/rds/aurora-serverless-v2/)

### Inferences
- Engine guide:
  - PostgreSQL: most new apps, CMS backends (Payload, Strapi, Directus), lead/analytics data with JSONB, and pgvector for AI features.
  - MySQL/MariaDB: WordPress, WooCommerce and legacy PHP. Not worth migrating.
  - SQLite/libSQL: small sites, edge apps on Cloudflare Workers, DB-per-tenant.
  - MongoDB (Atlas Flex): only for existing Mongo stacks.
  - Redis/Valkey: sessions, cache, queues (BullMQ), rate limiting. Do not use as a primary datastore.
- Put the DB in the same cloud region as the app (e.g. Vercel function region = Neon/Supabase region). Cross-region adds a network round trip per query, which compounds with ORMs issuing many queries.
- For Next.js on serverless, use the provider's pooled URL for runtime and the direct URL for migrations. Disable prepared statements in Prisma/Drizzle when using transaction mode (e.g. `pgbouncer=true`), or use HTTP/WebSocket drivers (Neon serverless driver).
- Avoid scale-to-zero for client production sites where a cold first request hurts conversions. Use it for staging, preview and MVPs.

### Gaps
- No sourced latency benchmarks for same-region vs cross-region DB access, or for Vercel Fluid compute with pooled connections.
- No 2026 Postgres vs MySQL benchmark relevant to agency workloads was collected.
