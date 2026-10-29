# Hosting Models for a Small/Medium Marketing + Web Dev Agency (VPS, VDS, Dedicated, IaaS, PaaS, Self-hosted PaaS)

Research date: 2026-10-29. Method note: the session's network blocked direct fetches of vendor pages (vercel.com, netlify.com, developers.cloudflare.com returned DNS failures), so findings come from search-result extracts of official docs plus third-party pages. Exact prices should be checked against vendor pricing pages before budgeting. Context observed in the repo: the agency's own site is a static Vite 8 build (`vite.config.js`, `index.html`, `public/`). There is no vercel.json, netlify.toml or wrangler.toml, so the current host can't be determined from the repo.

## 1. Precise definitions and technical differences: VPS vs VDS vs dedicated vs IaaS vs PaaS

### Takeaway
"VPS" and "VDS" are marketing terms, not standards. In practice, a VDS is a KVM (full-virtualization) VM with **reserved/dedicated vCPU cores and RAM**. A "VPS" may be KVM or container-based (OpenVZ/LXC) with **shared, oversubscribed vCPU**. Bare metal removes the hypervisor entirely. IaaS (AWS/GCP/Azure) is the same VM concept plus an API-driven ecosystem and metered extras. PaaS hides the OS completely. Before buying, always check the spec sheet for "dedicated vCPU" rather than trusting the label.

### Cited Findings
- OpenVZ is container (OS-level) virtualization: all containers share the host's kernel, so only Linux can run, and kernel modules/custom kernels aren't possible. KVM is full virtualization, where each VM has its own kernel and virtualized disk/CPU/RAM, so it can run Windows/BSD — [VPSBG docs](https://www.vpsbg.eu/docs/what-is-the-difference-between-kvm-vps-openvz-vps-and-vds); [RamNode KB](https://clientarea.ramnode.com/knowledgebase/52/What-is-the-difference-between-KVM-and-OpenVZ.html)
- RamNode states its KVM (VPS) plans are not dedicated environments and that "only our VDSs include dedicated CPU". This is an example of a provider defining VDS = dedicated CPU — [RamNode KB](https://clientarea.ramnode.com/knowledgebase/52/What-is-the-difference-between-KVM-and-OpenVZ.html)
- Several guides say VPS and VDS are often used interchangeably, especially in Russian/Eastern European markets where "VDS" is common. They add that VDS "typically implies" stronger, hardware-level isolation and resources reserved for one tenant — [Cherry Servers](https://www.cherryservers.com/blog/vds-vs-vps-comparison); [Timeweb (RU)](https://timeweb.com/ru/community/articles/vps-i-vds-v-chem-raznica-1); [Valebyte (ES)](https://www.valebyte.com/es/blog/vps-and-vds-whats-the-difference-and-what-to-choose-for-your-tasks/)
- Noisy neighbors and CPU steal: steal time is the share of time a vCPU was ready to run while the hypervisor gave the physical core to another guest. A separate throttling mechanism (CFS quota) shows **zero** steal, so you also need to check `nr_throttled` in `cpu.stat` — [Findstack](https://findstack.com/resources/dedicated-vcpu-vs-shared-vcpu)
- Vendor rule of thumb: a dedicated core shows about 0–1% steal consistently, while shared/oversubscribed plans show sustained 5–10%+. "A shared VPS can post the same number as a VDS for thirty seconds and then collapse," so benchmark over hours (sysbench repeats, a one-hour stress-ng run) — [Contabo blog](https://contabo.com/blog/benchmark-vds-cpu-performance/) (vendor, not an independent standard)
- Escalation heuristic: steal >10% sustained for 20 minutes justifies a move to dedicated — [Worldstream](https://worldstream.com/en/cpu-steal-time-on-a-vps-how-to-spot-contention-and-decide-on-dedicated)
- Steal hurts latency-sensitive APIs and databases much more than batch jobs. Paying for dedicated CPU to speed up a nightly batch queue rarely pays off — [Locaweb (PT)](https://www.locaweb.com.br/blog/temas/codigo-aberto/vcpu-vs-cpu-fisica-performance-vm/)
- Even with dedicated vCPU/RAM, storage queues and network bandwidth remain shared ("VPS is still shared hosting") — [GetPageSpeed](https://www.getpagespeed.com/server-setup/vps-is-still-shared-hosting)
- Linode community: steal "normally isn't a problem, unless you're on a host with noisy neighbors" — [Linode community](https://linode.com/community/questions/22138/difference-between-share-and-dedicated-cpu)
- Hetzner sells both tiers explicitly. CX/CAX/CPX are shared vCPU and CCX is dedicated vCPU. In 2026 the dedicated line costs far more: after June 15, 2026, CCX13 went from €15.99 to €42.99/mo and CCX33 from €62.49 to €138.49 (DE/FI, excluding IPv4) — [Privatedevops](https://privatedevops.com/news/hetzner-june-2026-cloud-price-increase-what-to-do); [WZ-IT](https://wz-it.com/en/blog/hetzner-price-increase-june-2026-cpx-ccx-alternatives/)

### Inferences
- Working definitions for the report:
  - **Shared hosting**: many sites on one OS, no root.
  - **VPS**: a VM or container with root, usually shared and oversubscribed vCPU.
  - **VDS**: a KVM VM with dedicated cores/RAM.
  - **Dedicated / bare metal**: a whole physical server with no hypervisor and no noisy neighbors, but slower provisioning and you handle hardware failure (RAID, replacement) through the provider.
  - **IaaS** (EC2/Compute Engine/Azure VMs): VMs, both shared ("burstable" t-class/e2) and dedicated, plus managed networking, IAM, block storage, snapshots and many managed services. Everything is metered, including egress.
  - **PaaS**: you push code or a container and the platform runs, scales and patches it.
  - **Serverless/edge PaaS** (Vercel Functions, Cloudflare Workers): per-request billing, no servers to manage.
- Avoid OpenVZ for agency workloads. Docker on OpenVZ is limited or unsupported on many hosts, which blocks Coolify/Dokploy. Require KVM.
- Typical agency WordPress/Next.js traffic is bursty and low-average, so shared vCPU is usually fine. Dedicated vCPU (VDS/CCX) is mainly justified for databases, WooCommerce checkouts, or a single box hosting many client sites where one client's spike shouldn't hurt others.

### Gaps
- No independent, peer-reviewed benchmark comparing shared vs dedicated vCPU across major providers was found. The thresholds above come from vendor blogs.

## 2. Cost structure and total cost of ownership (including engineering time); when each makes sense

### Takeaway
Raw compute is cheapest on VPS/VDS/bare metal and most expensive per unit on PaaS. Egress-heavy workloads are cheapest on providers with flat or free bandwidth (Cloudflare, Hetzner) and most expensive on hyperscalers and Vercel overages. PaaS buys back engineering hours. For an agency with fewer than about 3 engineers and no dedicated ops person, a free or cheap static/edge PaaS plus one or two managed VPSs usually has the lowest TCO. Hyperscaler IaaS only pays off when a client requires it (compliance, existing AWS account) or for specific managed services.

### Cited Findings
**PaaS pricing (2026)**
- **Vercel**
  - The Hobby plan is non-commercial only. "All commercial usage of the platform requires either a Pro or Enterprise plan." Commercial use includes a paid consultant writing the code or getting paid to build or host the site, which covers every agency client site — [Vercel fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines); [Vercel community](https://community.vercel.com/t/fair-use-of-the-hobby-plan/2725)
  - Pro is $20/seat/month with $20 of usage credit. It includes 1 TB Fast Data Transfer and 10M edge requests. Third-party reports put overage at about $0.15/GB, with Fast Origin Transfer at $0.06/GB — [Makerkit](https://makerkit.dev/blog/saas/vercel-cost) (third-party; the details conflict between sources, e.g. the Active CPU included allowance — [Vogels IT docs](https://docs.it.apps.vogels.com/docs/vercel/reference/pricing))
  - Viewers don't count as paid seats — [Fencode](https://www.fencode.dev/en/blog/vercel-free-vs-pro-2026-official-limits-pricing)
  - One review says Vercel's bandwidth overage costs about 2x Netlify's per 100 GB — [Temperstack](https://www.temperstack.com/plans/vercel/)
  - Functions are billed on Active CPU (only while code executes), provisioned memory and invocations — [Vercel blog](https://vercel.com/blog/introducing-active-cpu-pricing-for-fluid-compute)
- **Netlify**
  - Plans are credit-based. Free has 300 credits/mo, Personal is $9 for 1,000, and Pro is $20/mo for 3,000 credits shared across the team. The April 2026 update gave Pro **unlimited free seats** and unlimited form submissions, and updated credit rates — [Netlify changelog Apr 2026](https://www.netlify.com/changelog/2026-04-14-pricing-updates-april-2026/)
  - Third-party credit rates are about 20 credits per GB of bandwidth, 15 credits per deploy, and about 2 credits per 10k requests. These may predate the April 2026 rate change — [Activepieces](https://www.activepieces.com/blog/netlify-pricing-plans-limits-and-costs-2026.md); [netli.fyi](https://netli.fyi/blog/netlify-pricing-and-limits)
  - When credits run out, Free sites pause. Paid sites also pause if auto-recharge is off; auto-recharge is off by default — same sources
- **Cloudflare Workers/Pages**
  - The Paid plan has a $5/mo minimum and includes 10M requests (then $0.30 per million) and 30M CPU-ms (then $0.02 per million CPU-ms). Duration isn't billed, and there are "no additional charges for data transfer (egress) or throughput (bandwidth)."
  - Free tier: 100k requests/day with 10 ms CPU per invocation.
  - Cloudflare's own example: 15M requests at 7 ms CPU costs $8/mo — [Cloudflare Workers pricing docs](https://developers.cloudflare.com/workers/platform/pricing/)
- **DigitalOcean App Platform**
  - Free tier: up to 3 static-site-only apps with 1 GiB outbound per app. Extra outbound is $0.02/GiB, and extra static-site apps are $3/mo — [DO App Platform pricing docs](https://docs.digitalocean.com/products/app-platform/details/pricing/)
  - An older third-party figure of $0.10/GB is outdated — [DO community](https://www.digitalocean.com/community/questions/how-does-bandwidth-on-digital-ocean-static-sites-work-free-tier)
- **Render, Railway and Fly.io**
  - Render: flat per service, from about $7/mo — [Better Stack](https://betterstack.com/community/comparisons/heroku-alternatives/); [SelfHost.dev](https://selfhost.dev/best-railway-alternatives-in-2026-comparison/)
  - Railway: Hobby $5/mo including $5 usage; Pro $20/mo per workspace (not per seat) plus usage. Usage billing is harder to forecast — [SelfHost.dev](https://selfhost.dev/best-railway-alternatives-in-2026-comparison/)
  - Fly.io: shared-cpu-1x with 256 MB is about $2.02/mo, usage-based — [Fly.io](https://fly.io/learn/heroku-alternatives/)
- **Heroku**
  - Heroku announced on Feb 6, 2026 that it is moving to a "sustaining engineering model," i.e. maintenance mode. A Standard-2X dyno is $50/mo for 1 GB RAM as of June 2026 — [Render article](https://render.com/articles/railway-vs-heroku) (competitor-authored); [DeployHQ](https://www.deployhq.com/blog/heroku-alternatives-render-railway-fly-deployhq-vps)

**IaaS / VPS pricing**
- **AWS egress**: the first 100 GB/mo is free, then $0.09/GB up to 10 TB, $0.085 up to 50 TB, $0.07 up to 150 TB and $0.05 above. Cross-AZ is $0.01/GB each way, NAT gateway processing adds $0.045/GB, and ingress is free — [Fivenines calculator](https://fivenines.io/tools/bandwidth-cost-calculator); [Security Boulevard 2026](https://securityboulevard.com/2026/06/aws-data-transfer-costs-how-to-cut-your-egress-bill-without-rebuilding-your-stack/) (secondary; verify on aws.amazon.com)
- **Hetzner 2026 repricing**
  - About +30–37% across cloud and dedicated in all locations from April 1, 2026 — [Igor'sLab](https://www.igorslab.de/en/hetzner-to-significantly-increase-prices-for-cloud-and-dedicated-servers-from-april-2026/)
  - A second round on June 15, 2026 roughly doubled to tripled the dedicated-vCPU (CCX) and AMD shared (CPX) lines, up to +176%, while ARM (CAX) and Intel-shared (CX) rose about 30%. It applies to new orders and rescales — [WZ-IT](https://wz-it.com/en/blog/hetzner-price-increase-june-2026-cpx-ccx-alternatives/); [Northflank](https://northflank.com/blog/hetzner-cloud-server-price-increases); [Findstack](https://findstack.com/resources/hetzner-price-increase-2026)
  - One source reports cost-optimized CX plans marked "currently not available" and a capacity notice since June 26 (unverified) — [Findstack](https://findstack.com/resources/hetzner-price-increase-2026)

**Managed WordPress layers**
- Cloudways Autonomous Plan 1 is listed at $35/mo (usage-based); SpinupWP starts at $12/mo — [Capterra Cloudways](https://www.capterra.com/p/151414/Cloudways/pricing); [Capterra SpinupWP](https://www.capterra.com/p/10012241/SpinupWP/reviews/6093143)

### Inferences
- TCO heuristic: one engineer-hour costs as much as months of a small VPS. A self-managed VPS needs, at minimum, 2–4 hours/month per server for OS updates, monitoring, backup verification and incident response, plus the initial hardening. Spread across 10–30 client sites on one or two boxes, this is cheap per site. For a single site it is more expensive than PaaS.
- Rough size thresholds (a judgment, not sourced):
  - 1–3 devs: static/edge PaaS (Cloudflare Pages or Netlify) for marketing sites. One managed-WordPress panel (Cloudways, RunCloud or Ploi on a VPS) for WordPress. Vercel Pro only for Next.js apps that need its features.
  - 4–15 devs with recurring retainers: add a self-hosted PaaS (Coolify/Dokploy) on 1–3 VPSs for Node apps, internal tools and staging, so per-seat PaaS costs don't multiply.
  - Hyperscaler IaaS: only when the client mandates it or needs specific managed services (RDS, S3 at scale, compliance).
- Seat-based pricing scales badly for agencies with many collaborators. Vercel Pro is per seat; Netlify Pro (unlimited seats since Apr 2026) and Railway Pro (per workspace) do not charge per seat. This favors Netlify or Cloudflare for multi-person teams publishing many static sites.
- Hetzner's 2026 increases cut its historical price advantage, especially for dedicated vCPU. It is still typically cheaper than hyperscalers, but other EU/US budget hosts (OVHcloud, Contabo, Netcup, DigitalOcean, Vultr, Akamai/Linode) should be re-quoted. I did not verify their current prices.

### Gaps
- Official current prices for Vercel overages, RunCloud, Ploi, Cloudways tiers, Render and DO Droplets could not be fetched directly.
- No sourced study quantifies ops hours per server per month. The 2–4 h figure is an estimate.

## 3. Operational burden, scalability, performance predictability, lock-in

### Takeaway
Responsibility shifts down the stack:
- **Bare metal / VPS / VDS / IaaS VM**: the agency patches the OS and runtime, configures firewalls and TLS, runs and tests backups, monitors, and scales manually or vertically.
- **Self-hosted PaaS**: automates deploys, TLS, preview environments and some backups, but the agency still owns the OS and the panel's own security.
- **Managed PaaS**: the vendor does all of that, at the cost of metered pricing and platform-specific features that create lock-in.
Performance predictability is best on bare metal and dedicated vCPU, while serverless adds cold-start variance (much reduced on Vercel Fluid).

### Cited Findings
- Vercel Fluid compute lets one instance serve concurrent requests. Vercel claims zero cold starts for 99.37% of requests, and Pro/Enterprise keep at least one warm instance ("scale to one"). These are vendor figures — [Vercel blog: Scale to one](https://vercel.com/blog/scale-to-one-how-fluid-solves-cold-starts); [Vercel KB](https://vercel.com/kb/guide/vercel-services-fluid-compute)
- Cloudflare Workers bill CPU time, not wall time, and the default CPU limit per invocation is 30 s (configurable up to 5 min) — [Cloudflare docs](https://developers.cloudflare.com/workers/platform/pricing/)
- **Coolify vs Dokploy**
  - Coolify is Apache-2.0, has a larger one-click catalog, supports previews across 4 Git providers, and is suited to multi-server and team setups — [Coolify compare page](https://coolify.io/compare/coolify-vs-dokploy) (vendor); [DEV Community](https://dev.to/vyomcloud/dokploy-vs-coolify-best-platform-comparison-for-2026-13kf)
  - Dokploy has Docker Swarm built in and a lighter idle footprint: about 300–400 MB RAM vs 500 MB–1.2 GB for Coolify (community-measured). Both have a 2 GB minimum — [Cloudzy](https://cloudzy.com/it/blog/coolify-vs-dokploy/)
  - Licensing: part of Dokploy (its proprietary folder) is under the "Dokploy Source Available License", which requires a commercial agreement for production use of those features. This is relevant if the agency resells hosting — [Coolify compare page](https://coolify.io/compare/coolify-vs-dokploy) (competitor-authored; verify in Dokploy's repo)
  - Security: in January 2026, researchers disclosed 11 vulnerabilities in Coolify (since patched). Coolify's more complex architecture means a larger attack surface — [Virtua Cloud](https://www.virtua.cloud/learn/en/concepts/coolify-vs-dokploy-self-hosted-paas)
  - Other comparisons, including Dokku — [UpCloud](https://upcloud.com/blog/dokku-vs-coolify-vs-dokploy-production-deployment/); [GetDeploying](https://getdeploying.com/guides/coolify-vs-dokploy); [Cherry Servers](https://www.cherryservers.com/blog/coolify-vs-dokploy); [Introserv](https://introserv.com/blog/dokploy-vs-coolify-complete-comparison-of-the-best-self-hosted-paas-platforms-for-vps-and-dedicated-servers-2026/)
- Platform risk example: Heroku entered a "sustaining engineering" (maintenance) model in Feb 2026 — [Render article](https://render.com/articles/railway-vs-heroku)

### Inferences
- **Lock-in ranking, low to high:**
  1. Static Vite/Astro build output (portable anywhere)
  2. Docker container on VPS/Coolify
  3. Render/Railway/Fly (container-based, mostly portable)
  4. Next.js on Vercel (ISR, middleware, image optimization and edge config work best there; OpenNext/self-hosting is possible but with feature gaps)
  5. Cloudflare Workers-specific APIs (KV, D1, Durable Objects)
  6. Hyperscaler-native architectures (Lambda + DynamoDB + IAM)
- **Scalability:**
  - PaaS/serverless scales horizontally on its own.
  - VPS scales vertically by resizing, which means minutes of downtime.
  - Bare metal needs a new order, hours to days.
  - Self-hosted PaaS on several nodes (Swarm in Dokploy, multi-server in Coolify) gives modest horizontal scaling, but you run the load balancer and database HA yourself.
- **Backups:** VPS snapshots are crash-consistent only. Databases need logical dumps (pg_dump or mysqldump) copied off-site, e.g. to S3/R2/B2. Managed PaaS databases usually include point-in-time recovery on paid tiers.

### Gaps
- No independent cold-start benchmark for 2026 (Vercel Fluid vs Netlify Functions vs Workers) was found.
- RunCloud and Ploi feature and pricing details weren't retrieved.

## 4. Multi-tenant client hosting: isolation, billing pass-through, handover

### Takeaway
There are two clean models.
- **(a) Client-owned accounts:** the client pays the vendor directly and the agency is a member. Handover is trivial and the agency carries no billing risk.
- **(b) Agency-owned infrastructure:** the agency resells hosting as a maintenance retainer, which gives margin and control. It requires per-client isolation (separate projects/teams, containers, DB users, ideally separate servers for high-value clients) and a documented export path.
Vercel supports moving a project between teams, but the client then needs Pro for commercial use.

### Cited Findings
- **Vercel project transfer**
  - The person transferring must be an owner of the source team and a member of the destination team. The destination needs a valid payment method, and there is no downtime (the original project is hidden during transfer) — [Vercel docs: Transferring projects](https://vercel.com/docs/projects/transferring-projects)
  - "Claim Deployments" generates a claim URL that lets another account take ownership — [Vercel docs: Claim Deployments](https://vercel.com/docs/deployments/claim-deployments)
  - Community threads report clients being forced onto Pro when receiving transferred projects, since commercial use or a second owner requires a paid plan — [Vercel community](https://community.vercel.com/t/migrating-project-to-new-team-forcing-me-to-pay-for-pro/1021); [Vercel community](https://community.vercel.com/t/transferring-project-to-a-client/24728)
  - User report: transferring a v0-built project moved the deployment but not the v0 editing access — [Vercel community](https://community.vercel.com/t/transfer-client-project-from-my-account-to-client-account/21724)
- **Vercel spend controls**
  - Spend Management (Pro only, Owner/Billing roles) sends alerts at 50/75/100% and can pause production deployments (visitors get a 503). Pausing is opt-in in the docs, and a changelog says it now pauses production by default.
  - Usage is checked only every few minutes, so pausing lags. Projects must be resumed one by one — [Vercel docs: Spend Management](https://vercel.com/docs/spend-management); [Vercel changelog](https://vercel.com/changelog/spend-management-now-pauses-production-deployments-by-default)
- **Netlify credit pool:** Netlify Pro credits are shared across all of a team's projects — [Netlify changelog](https://www.netlify.com/changelog/2026-04-14-pricing-updates-april-2026/)

### Inferences
- **Isolation tiers for agency-hosted clients:**
  - Static sites: one CDN project each. Near-perfect isolation, practically free.
  - WordPress: one system user plus one PHP-FPM pool plus one DB user per site. RunCloud, Ploi, SpinupWP and Cloudways all do this per "app". Keep premium or e-commerce clients on their own server.
  - Node apps: one container per app with resource limits, via Coolify or Dokploy.
- A shared Netlify credit pool means one client's traffic spike can pause every client's sites on that team. Use separate teams per significant client, or turn on auto-recharge.
- **Billing pass-through options:**
  1. Client-owned accounts. Best for SaaS/MVP clients, and the agency should add a billing alert.
  2. A flat "hosting + maintenance" retainer that bundles VPS cost (typical for WordPress).
  3. Re-billing usage per tag or project, which is feasible on hyperscalers via cost-allocation tags but heavy for a small agency.
- **Handover readiness:** keep everything in Git under the client's org (or transferable), use infrastructure as code or Docker Compose files, keep DNS at the client's registrar or Cloudflare account, and document env vars. Never let the client's domain sit in the agency's registrar account.

### Gaps
- The Netlify site transfer process was not found in the results.
- No sourced data was found on typical agency hosting markups in LatAm.

## 5. Common agency architectures, recommended hybrids, and suitability by project type

### Takeaway
The dominant 2025–2026 agency pattern is hybrid:
- Static/Jamstack sites on an edge CDN PaaS (Cloudflare Pages, Netlify or Vercel).
- WordPress on VPSs run through a server panel (RunCloud, Ploi, SpinupWP or Cloudways), or on managed WP hosting.
- Node/Next apps, internal tools and staging on either a managed PaaS (Vercel, Render, Railway) or a self-hosted PaaS (Coolify/Dokploy) on 1–3 KVM VPSs.
- Managed databases or object storage only where needed.
- Cloudflare DNS/proxy in front of everything.

### Cited Findings
- Cloudflare does not charge egress on Workers/Pages — [Cloudflare docs](https://developers.cloudflare.com/workers/platform/pricing/)
- DigitalOcean App Platform hosts static sites free for up to 3 apps — [DO docs](https://docs.digitalocean.com/products/app-platform/details/pricing/)
- A self-hosted PaaS is a recognized Heroku/Vercel alternative for VPS ("DeployHQ + your VPS vs Render vs Railway vs Fly") — [DeployHQ](https://www.deployhq.com/blog/heroku-alternatives-render-railway-fly-deployhq-vps); [UpCloud](https://upcloud.com/blog/dokku-vs-coolify-vs-dokploy-production-deployment/)
- Render is the closest drop-in Heroku replacement (web services, workers, cron, managed Postgres) with flat pricing. Railway suits teams that accept usage billing. Fly suits global, low-latency apps but needs more infrastructure work — [Better Stack](https://betterstack.com/community/comparisons/heroku-alternatives/); [Encore](https://encore.dev/articles/render-vs-railway)

### Inferences — suitability matrix (my synthesis)
| Workload | Best fit | Acceptable | Avoid |
|---|---|---|---|
| Agency's own Vite site / static landing pages | Cloudflare Pages (free, no egress) or Netlify | Vercel Pro, DO static (free ×3) | VPS (unneeded ops) |
| Client WordPress brochure sites | VPS/VDS + RunCloud/Ploi/SpinupWP, or Cloudways | Managed WP host | Vercel/Netlify (not designed for PHP) |
| WooCommerce / high-value WP | Dedicated-vCPU VDS per client, or managed WP | Cloudways larger plan | Oversubscribed shared VPS with many tenants |
| Headless CMS (Strapi, Payload, Directus) | Coolify/Dokploy on VPS, or Render/Railway | Fly.io | Serverless (long-running and stateful) |
| Next.js apps (ISR, middleware) | Vercel Pro | Netlify, Cloudflare via OpenNext, Coolify (self-hosted Next) | — |
| Small SaaS/MVP | Render/Railway/Vercel + managed Postgres (client-owned account) | Coolify on VDS | Bare metal (premature) |
| Internal tools, cron, bots | Coolify/Dokploy on one VPS | Railway | Per-seat PaaS |
| Staging / preview environments | PaaS preview deploys; Coolify previews | Dokploy | Hyperscaler (cost drift) |
| Heavy, steady compute / many sites | Bare metal or dedicated-vCPU VDS | — | Serverless (cost) |

- Suggested baseline for a 3–10 person LatAm agency:
  - Cloudflare (DNS, proxy, Pages, R2) as the front door.
  - Netlify or Cloudflare for static sites.
  - Vercel Pro for 1–2 seats, only for Next.js work.
  - 1–2 KVM VPSs (one US-East, optionally one São Paulo or Mexico) running a WordPress panel.
  - 1 VPS running Coolify for Node apps, internal tools and staging.
  - Off-site backups to R2/S3/B2.
  - SaaS clients are put on their own accounts from day one.

### Gaps
- No survey data on what share of agencies use each architecture was found. The pattern above is a synthesis.

## 6. Pitfalls: egress/bandwidth surprise bills, cold starts, lock-in, region/latency for LatAm

### Takeaway
The biggest financial risks are:
- metered bandwidth or function usage on Vercel, Netlify and hyperscalers, especially bot or DDoS traffic, image-heavy sites, and large downloads;
- a shared credit pool pausing all sites;
- unexpected price changes such as Hetzner's in 2026.
Latency: a São Paulo origin suits Brazil and the Southern Cone, Querétaro (AWS mx-central-1) suits Mexico and Central America, and US-East serves the US plus northern LatAm acceptably. Static content on a global CDN makes origin region mostly irrelevant.

### Cited Findings
- **Metered egress:**
  - Vercel overage is about $0.15/GB beyond 1 TB on Pro, roughly 2x Netlify's — [Makerkit](https://makerkit.dev/blog/saas/vercel-cost); [Temperstack](https://www.temperstack.com/plans/vercel/)
  - AWS internet egress is $0.09/GB after 100 GB free, NAT adds $0.045/GB, and cross-AZ is $0.01/GB each way — [Fivenines](https://fivenines.io/tools/bandwidth-cost-calculator); [Security Boulevard](https://securityboulevard.com/2026/06/aws-data-transfer-costs-how-to-cut-your-egress-bill-without-rebuilding-your-stack/)
- **Vercel spend caps lag** by several minutes, so set the threshold below your true maximum. Resuming after a pause is per-project and manual — [Vercel Spend Management](https://vercel.com/docs/spend-management)
- **Netlify:** sites pause when credits run out (Free, or paid with auto-recharge off) — [Activepieces](https://www.activepieces.com/blog/netlify-pricing-plans-limits-and-costs-2026.md)
- **Cold starts:** mitigated on Vercel Fluid (vendor claim of 99.37% of requests without a cold start) — [Vercel blog](https://vercel.com/blog/scale-to-one-how-fluid-solves-cold-starts)
- **Price risk:** Hetzner's two 2026 increases (+30–37% in April, up to +176% for CCX/CPX in June) — [WZ-IT](https://wz-it.com/en/blog/hetzner-price-increase-june-2026-cpx-ccx-alternatives/)
- **Vercel regions:** 19 compute regions and 126 PoPs. gru1 = São Paulo (AWS sa-east-1). No Mexico compute region was found in the list. Vercel advises running functions in the same region as the database — [Vercel docs: Regions](https://vercel.com/docs/regions)
- **Vercel regional pricing:** a separate gru1 regional pricing page exists, implying different rates in São Paulo — [Vercel regional pricing gru1](https://vercel.com/docs/pricing/regional-pricing/gru1)
- **Vercel reachability in Brazil:** a community report says one Vercel edge IP (216.198.79.1) was unreachable from some Brazilian ISPs while other IPs worked at about 5 ms — [Vercel community](https://community.vercel.com/t/partial-vercel-edge-ip-unreachable-from-brazilian-isps-216-198-79-1/39854)
- **AWS Mexico (Central), mx-central-1:** launched January 2025 in Querétaro with 3 AZs; investment of more than $5B over 15 years — [AWS News Blog](https://aws.amazon.com/blogs/aws/aws-weekly-roundup-new-aws-mexico-central-region-simultaneous-sign-in-for-multiple-aws-accounts-and-more-january-20-2025); [IntelligentCIO](https://www.intelligentcio.com/latam/?p=16220)
- **Microsoft and Oracle in Querétaro:** reported (pre-2025) as planning regions there. Not confirmed in this research — [DatacenterDynamics](https://datacenterdynamics.com/en/news/report-aws-planning-data-center-region-in-queretaro-mexico)
- **Hetzner locations:** Germany, Finland, US and Singapore. No LatAm location — [Igor'sLab](https://www.igorslab.de/en/hetzner-to-significantly-increase-prices-for-cloud-and-dedicated-servers-from-april-2026/)
- **DigitalOcean regions:** an older snapshot lists AMS, BLR, FRA, LON, NYC, SFO, SGP, TOR, i.e. no LatAm region (possibly stale) — [DO pricing](https://www.digitalocean.com/pricing/app-platform)

### Inferences
- Mitigations:
  - Put Cloudflare in front of all origins (cache, WAF, bot management).
  - Serve images from R2 or Cloudflare Images instead of PaaS bandwidth.
  - Enable Vercel spend-management pausing and set Netlify auto-recharge limits per team.
  - Set AWS Budgets alarms on any client AWS account.
  - Avoid NAT gateways for small setups.
- Budget hosts (Hetzner, most DO regions) have no LatAm data centers. For dynamic, uncached WordPress serving Brazil or Mexico, a São Paulo or Querétaro origin (AWS/GCP/Azure, Vultr São Paulo/Mexico City, local providers) can cut TTFB noticeably. For US clients, US-East or US-Central is best. Fully cached static sites don't care. I did not verify Vultr/Linode LatAm locations in this session.
- Lock-in pitfall: build client sites so the output is portable (static export, Docker image), and avoid deep Vercel-only or Workers-only APIs unless the client accepts that.
- Vercel's Hobby-plan commercial ban is a compliance pitfall. Agencies often deploy client sites on free personal accounts, which violates the fair-use terms.

### Gaps
- Measured round-trip latencies from LatAm cities (Bogotá, Lima, CDMX, Buenos Aires) to US-East vs São Paulo vs Querétaro were not obtained.
- No reliable source was found on whether DDoS or bot traffic is refunded on Vercel or Netlify.
- Google Cloud has a Querétaro region (northamerica-south1) according to my prior knowledge, and Azure "Mexico Central" may exist, but neither was confirmed in this research. Treat both as unverified.
