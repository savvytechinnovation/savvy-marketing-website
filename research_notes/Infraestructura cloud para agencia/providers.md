# Cloud / hosting providers for a small-medium marketing + web dev agency (late 2026)

Research date: 2026-10-29. Method note: in this session, direct fetches of vendor pricing pages were blocked by the network sandbox (e.g. digitalocean.com, vultr.com would not resolve). So almost all figures below come from search-engine summaries of third-party 2026 comparison blogs, trackers and aggregators. The one exception is AWS Lightsail, where an official AWS docs page showed up in the results. Treat every price as "reported, verify on the vendor page before quoting to clients". Where sources conflict, both figures are shown.

## 1. Price/performance per tier and egress costs; recent price changes

### Takeaway
At the 2 vCPU/4GB → 8 vCPU/16GB tiers, the "developer clouds" (DigitalOcean, Vultr, Linode/Akamai, Lightsail) all cluster around ~$24/mo for 4GB and ~$48/mo for 8GB. They include 1–5 TB of transfer, with overage around $0.01–0.02/GB. Hyperscaler VMs cost about 1.5–3x more for the same specs, and egress runs about $0.087–0.12/GB. Hetzner is still the cheapest, especially on its shared CX/CAX lines with 20 TB of traffic in the EU. But two 2026 price increases (April 1 and June 15) more than doubled its dedicated-vCPU (CCX) and CPX lines, especially in the US, which erodes its edge there. On PaaS, egress is now the main cost driver. Vercel moved Pro to a flat included-transfer model in Sept 2026, and Render cut included bandwidth around Aug 2026.

### Cited Findings

**Developer clouds / VPS (reported 2026)**
- DigitalOcean, Linode and Vultr are around $24/mo at 4GB and around $48/mo at 8GB across most comparisons. One source lists Vultr at $20/mo for 4GB. — [cloudmart.dev](https://cloudmart.dev/blog/cheapest-vps-2026); [helpwithweb.com](https://helpwithweb.com/help/digitalocean-vs-linode-vs-vultr); [apicalculators.com](https://apicalculators.com/blog/cloud-vps-cost-comparison-2026); [selfhostr.com](https://selfhostr.com/comparatifs/digitalocean-vs-vultr-vs-hetzner-2026/)
- Egress reported: DigitalOcean $0.01/GB after the included allowance (1 TB cited on small plans); Vultr ~3 TB included (plan-dependent). Linode overage is reported as $0.02/GB by one source and $0.01/GB by another, so the sources conflict. — [cloudmart.dev](https://cloudmart.dev/blog/cheapest-vps-2026); [stoicvps.com](https://stoicvps.com/handbook/best/cheap-vps-hosting); [biztechscout.com](https://biztechscout.com/en/article/best-vps-hosting-2026)
- Independent benchmark comparisons for DO/Linode/Vultr are available at VPSBenchmarks. I could not extract the specific scores. — [vpsbenchmarks.com](https://www.vpsbenchmarks.com/compare/digitalocean_vs_linode_vs_vultr)

**AWS Lightsail (official AWS docs)**
- 4GB / 2 vCPU / 80GB / 4 TB transfer is $24/mo; 8GB / 2 vCPU / 160GB / 5 TB is $44/mo; 16GB / 4 vCPU / 320GB / 6 TB is $84/mo (Linux, public IPv4). IPv6-only bundles are $20, $40 and $80. Note that Lightsail's 8GB and 16GB bundles have fewer vCPUs than the target tiers. — [AWS Lightsail bundles doc](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html)
- Databases, CDN, block storage, snapshots and transfer overage are billed separately. — [cloudburn.io](https://cloudburn.io/blog/amazon-lightsail-pricing); [factualminds.com](https://www.factualminds.com/blog/amazon-lightsail-pricing-bundles-vs-ec2-true-total-cost/)

**Hyperscaler VMs (on-demand list prices, US regions)**
- GCP e2-standard-2 (2 vCPU / 8GB): ~$48.92/mo in us-central1 ($0.067/h). With committed-use discounts it is ~$30.82 (1-year) or ~$22.01 (3-year). Data updated Oct 19, 2026. — [economize.cloud](https://www.economize.cloud/resources/gcp/pricing/compute-engine/e2-standard-2/); [servercostcalculator.com](https://servercostcalculator.com/providers/gcp/plans/e2-standard-2)
- Azure B2s (2 vCPU / 4GB, burstable): from ~$30.37/mo. Azure D2s v5 (2 vCPU / 8GB): $0.096/h, about $70.08/mo on Linux in East US (as of Sep 3, 2026). — [cloudprice.net](https://cloudprice.net/vm/Standard_B2s); [economize.cloud](https://www.economize.cloud/resources/azure/pricing/virtual-machine/d2sv5/)
- Egress: Azure ~$0.087/GB for the first 10 TB. That guide is ~4 months old, so treat the figure as provisional. GCP starts at $0.12/GB for the first TB (tiered $0.12–0.08). One comparison puts AWS at $0.09/GB. — [kuberns.com](https://kuberns.com/blogs/azure-pricing/); [eon.io](https://www.eon.io/blog/google-cloud-pricing)
- Cloudflare-oriented sources contrast R2's $0 egress with AWS S3 at $0.09/GB. — [projectcostestimator.com](https://projectcostestimator.com/blog/cloudflare-cost-2026)

**Hetzner: 2026 price increases**
- First increase, effective April 1, 2026: across the portfolio, with cloud hit hardest at about +30–35%. Hetzner cited higher operating and hardware procurement costs. — [heise.de](https://heise.de/-11185981); [igorslab.de](https://www.igorslab.de/en/hetzner-to-significantly-increase-prices-for-cloud-and-dedicated-servers-from-april-2026/)
- Second increase, effective June 15, 2026, 08:00 CEST: applies to new orders and to rescales of existing instances. Existing servers are not repriced. — [docs.hetzner.com price adjustment](https://docs.hetzner.com/de/general/infrastructure-and-availability/price-adjustment/); [heise.de](https://heise.de/-11333037)
- Reported multipliers for the June round:
  - CCX (dedicated vCPU): ~2.1–2.73x in DE/FI and ~2.1–2.6x in the US.
  - CPX: ~2.4–2.75x.
  - CX (shared) and CAX (Arm): only ~1.3–1.4x.
  - Example: US CPX41 went from €38.99 to €120.49/mo.
  - — [northflank.com](https://northflank.com/blog/hetzner-cloud-server-price-increases); [heise.de](https://heise.de/-11333037)
- Example post-June prices (sources conflict slightly):
  - CX33 (4 vCPU / 8GB, EU): €6.49 → €8.49. Another source shows €8.99 / $10.59.
  - CCX13: €15.99 → €42.99.
  - US CPX31 (4 vCPU / 8GB): ~$73.49–74.09/mo, with only 3 TB of traffic.
  - CCX23 (4 vCPU / 16GB): ~$102–104/mo.
  - — [agentdeals.dev](https://agentdeals.dev/hetzner-pricing-2026); [cloudtally.eu](https://cloudtally.eu/hetzner-cloud-prices); [stackvaluelab.com](https://stackvaluelab.com/hetzner-price-increase-2026/); [betterstack.com](https://betterstack.com/community/guides/web-servers/hetzner-cloud-review/)
- Traffic: the EU CX lines include 20 TB. US CPX/CCX include much less: 3 TB for CPX31, and CCX23 is reported as 2 TB by one source but 20 TB by another (the 20 TB figure is likely the EU allowance). — [agentdeals.dev](https://agentdeals.dev/hetzner-pricing-2026); [eucloudcost.com](https://www.eucloudcost.com/providers/hetzner/)

**OVHcloud / Contabo / Hostinger (reported, low-confidence)**
- OVHcloud VPS has unmetered/unlimited bandwidth. Entry plans are cited at ~$4.20–4.54/mo. — [hostadvice.com](https://hostadvice.com/tools/web-hosting-comparison/contabo-vs-ovhcloud/); [virtarix.com](https://virtarix.com/blog/vps-guides/cheap-cloud-vps/)
- Contabo: entry plans are cited at ~$3.96–6.99/mo. Traffic is reported as "unlimited, fair use" by one source and 32 TB outbound by another. Ports are 200 Mbit. Backups are a paid add-on. — [vpsbenchmarks.com](https://www.vpsbenchmarks.com/compare/contabo_vs_hostinger); [contabo.com blog (vendor)](https://contabo.com/blog/best-vps-hosting-providers/)
- Hostinger KVM plans have fixed transfer caps: KVM 1 = 4 TB, KVM 2 = 8 TB, KVM 4 = 16 TB. Entry pricing is ~$4.99–6.49/mo on promo, and renewals are much higher (e.g. $11.99). — [hostadvice.com](https://hostadvice.com/tools/web-hosting-comparison/contabo-vs-hostinger/); [hostinger.com (vendor)](https://www.hostinger.com/tutorials/best-vps-hosting/)

**PaaS**
- Vercel Pro is still $20/seat/mo. 2026 billing changes:
  - Feb 2026: new Pro projects default to Turbo build machines at $0.126/min, vs $0.014/min for Standard.
  - June 2026: v0 became a paid add-on.
  - Sept 9–14, 2026: Pro CDN overages (Edge Requests, Fast Data Transfer, Blob and Sandbox transfer) were replaced by a flat included data-transfer allowance.
  - Late Sept 2026: Tracing Spans became billable at $0.50 per 1M.
  - A mid-2026 reference listed Pro as including 1 TB Fast Data Transfer, ~10M Edge Requests and 40 h Active CPU.
  - — [pricingsaas.com news](https://pricingsaas.com/news/article/vercel-swaps-cdn-overage-fees-for-flat-rate-included-data-transfer-on-pro); [pricingsaas.com diffs](https://pricingsaas.com/companies/vercel/diffs/2026D239); [makerkit.dev](https://makerkit.dev/blog/saas/vercel-cost)
- Vercel's old overage rate is cited as $0.40/GB past the first TB (pre-Sept 2026 model). — [projectcostestimator.com](https://projectcostestimator.com/blog/cloudflare-cost-2026)
- Fly.io egress: $0.02/GB in North America and Europe; $0.04/GB in APAC and South America; $0.12/GB in Africa and India. Compute is billed per second, and stopped Machines pay only for disk. — [techsy.io](https://techsy.io/en/blog/railway-vs-render-vs-fly-io); [bex.co Sep 2026](https://bex.co/blog/2026/09/11/railway-vs-render-vs-flyio-benchmarks); [hostim.dev](https://hostim.dev/blog/render-vs-railway-vs-fly-pricing/)
- Railway: $0.05/GB egress in every region (legacy plans were $0.10). Hobby is $5/mo, Pro is $20/seat, and compute is metered per second. — [bex.co Aug 2026](https://bex.co/blog/2026/08/16/paas-bill-lied-june-2026-pricing-spread); [bex.co Sep 2026](https://bex.co/blog/2026/09/11/railway-vs-render-vs-flyio-benchmarks)
- Render: a ~Aug 2026 replan reportedly cut included bandwidth to 5–25 GB, with overage at $0.15/GB. Another source says Hobby includes 100 GB and Pro 1 TB, so the sources conflict. Pro is reported as a flat $25/mo workspace fee. — [bex.co Sep 24 2026](https://bex.co/blog/2026/09/24/egress-is-the-bill-fly-railway-hetzner); [hostim.dev](https://hostim.dev/blog/render-vs-railway-vs-fly-pricing/)
- Netlify: 100 GB free; one source reports $0.55/GB overage on the paid plan. This is from a single dev blog and unverified. — [dev.to](https://dev.to/nayankyada/nextjs-hosting-cost-in-2026-vercel-vs-netlify-vs-railway-vs-vps-431a)
- Cloudflare:
  - Workers Paid is $5/mo with 10M requests and 30M CPU-ms included. Overage is $0.30 per M requests and $0.02 per M CPU-ms.
  - R2 has $0 egress and costs $0.015/GB-month for storage, $4.50 per M Class A operations and $0.36 per M Class B operations. 10 GB is free.
  - Pages static sites are free.
  - D1 pricing figures conflict across sources. There are no hard billing caps; one anecdote describes a $4,868 bill caused by a write-loop bug.
  - — [makerkit.dev](https://makerkit.dev/pricing-calculator/cloudflare); [apicostcalc.com](https://apicostcalc.com/cloudflare.html); [costbench.com](https://costbench.com/software/cloud-infrastructure/cloudflare-pages-workers/hidden-costs/)

**Managed WordPress**
- Starting prices vary by source: Kinsta ~$35/mo; WP Engine ~$20–30/mo; Cloudways ~$11–15/mo. Kinsta and WP Engine price per site in tiers, while Cloudways prices per server on top of DO/Vultr/Linode/AWS/GCP. — [belovdigital.agency](https://belovdigital.agency/kinsta-wpengine-cloudways-flywheel-siteground-wordpress-hosting-comparison-2026/); [managedwpguide.com](https://managedwpguide.com/managed-wp-hosting-compared/)
- Agency-scale estimates for 10 sites: Cloudways ~$60/mo on a Vultr 4GB server; WP Engine ~$96/mo on Growth; Kinsta ~$175/mo on Business. At 25 sites, Cloudways comes to ~$7–8/site and WP Engine ~$11/site. — [managedwpguide.com agencies](https://managedwpguide.com/best-wordpress-hosting-agencies/); [mevohost.com](https://mevohost.com/blog/managed-wordpress-hosting-agencies-2026/)
- Cloudways' CDN is an add-on. WP Engine is reported to include phone support on all plans and to offer client-billing/portal tools. — [mevohost.com](https://mevohost.com/blog/managed-wordpress-hosting-agencies-2026/)

### Inferences
- For a typical 4 vCPU / 8GB agency server in the US, the reported prices rank roughly as follows:
  - Hetzner CX-class (EU, ~€8.5–9): cheapest by far.
  - DO/Vultr/Linode (~$48 and up).
  - Hetzner US CPX31 (~$74, a big drop in competitiveness after June).
  - Hyperscaler on-demand (roughly $100–140+, extrapolated from the 2-vCPU prices above, not directly sourced).
- Egress is the swing factor for media-heavy client sites. Developer clouds at about $0.01/GB, Cloudflare R2 at $0 and Hetzner EU's 20 TB beat hyperscalers ($0.087–0.12/GB), Render ($0.15/GB) and Netlify ($0.55/GB, if accurate) by 10–50x.
- Because existing Hetzner servers are grandfathered, rescaling or re-creating one triggers the new prices. That is an operational trap for an agency that rebuilds client servers.

### Gaps
- Could not verify official per-tier prices for DigitalOcean, Vultr, Linode, OVHcloud, Contabo or Hostinger at exactly 2/4, 4/8 and 8/16. The vendor pages were blocked in this session and the third-party figures conflict.
- No sourced 8 vCPU / 16GB prices for most providers, and no sourced EC2 t3.medium / m7i.large on-demand prices.
- No independent CPU/disk benchmark numbers extracted (VPSBenchmarks is linked but its scores were not read).
- Exact Vercel Pro included transfer after the Sept 2026 flat-rate change, and current Netlify plan names and credit-based pricing, are not confirmed.
- I could not confirm whether DigitalOcean, Vultr or Linode changed prices in 2026.

## 2. Which providers have Latin America and US regions

### Takeaway
All the hyperscalers and Vultr cover the key LatAm metros. Vultr is the standout developer cloud there (Mexico City, São Paulo, Santiago), and Linode/Akamai reportedly has São Paulo. DigitalOcean has no LatAm region. Azure has the broadest LatAm footprint: Brazil South, Mexico Central, Chile Central and Bogotá (2024). Hetzner has US regions (Ashburn, plus Hillsboro per general knowledge, unverified here) but no LatAm region. Edge PaaS such as Cloudflare serves LatAm through its CDN rather than through regions.

### Cited Findings
- AWS has São Paulo (sa-east-1). A Lima, Peru region was announced for 2025–26. The Santiago, Chile region is described as planned. — [aidatacenterindex.com](https://aidatacenterindex.com/regions/latin-america/feed/); [cloudinfrastructuremap.com](https://www.cloudinfrastructuremap.com/)
- Google Cloud has São Paulo (southamerica-east1) and Santiago (southamerica-west1, launched 2021). — [aidatacenterindex.com](https://aidatacenterindex.com/regions/latin-america/feed/); [cloudinfrastructuremap.com](https://www.cloudinfrastructuremap.com/)
- Azure has Brazil South, Chile Central, Mexico Central and Bogotá (opened 2024). Note that one Colombia guide claims no hyperscaler region exists in Colombia, which ignores this launch. — [cloudinfrastructuremap.com](https://www.cloudinfrastructuremap.com/); contradicted by [zop.dev](https://zop.dev/cloud-cost-optimization/colombia)
- Oracle has São Paulo, Vinhedo, Santiago, Valparaíso, Bogotá, Querétaro and Monterrey (listed for context). — [dgtlinfra.com](https://dgtlinfra.com/oracle-cloud-data-center-locations/)
- Vultr lists Mexico City, São Paulo and Santiago on its regions page. It has ~32–34 regions worldwide. — [vultr.com](https://www.vultr.com/vultr-vs-digitalocean/); [spheron.network](https://www.spheron.network/blog/gpu-cloud-brazil-mexico-latin-america-2026/); [Wikipedia](https://en.wikipedia.org/wiki/Vultr)
- Linode/Akamai: São Paulo is listed, and there are ~33 core compute regions in total. — [github cloud-vps-comparison](https://github.com/xtktsr68/cloud-vps-comparison/blob/main/README.md); [northflank.com](https://northflank.com/blog/best-digitalocean-alternatives-2026)
- DigitalOcean has no data centers in South America, Latin America or Africa. — [northflank.com](https://northflank.com/blog/best-digitalocean-alternatives-2026); [hostingengines.com](https://hostingengines.com/digitalocean-vs-vultr-vs-linode/)
- Hetzner: Ashburn (ASH1) appears in US pricing tables. — [agentdeals.dev](https://agentdeals.dev/hetzner-pricing-2026)
- OVHcloud regions are listed as FR, DE, UK, PL, CA, IN, SG and AU, with no LatAm region in that list. — [hostadvice.com](https://hostadvice.com/tools/web-hosting-comparison/contabo-vs-ovhcloud/)
- Fly.io prices South America egress at $0.04/GB, which implies it has South American regions. — [techsy.io](https://techsy.io/en/blog/railway-vs-render-vs-fly-io)
- Lightsail is described as having "three US regions". — [bestusavps.com](https://bestusavps.com/reviews/aws-lightsail/)

### Inferences
- For clients in Mexico, Chile and Brazil who want low latency and simple pricing, Vultr is the most direct developer-cloud option. Linode covers Brazil. For Colombia, only Azure (and Oracle) have an in-country region. Otherwise, Bogotá is typically served from Miami/US East or from a CDN edge.
- Cloudways inherits regions from its underlying provider, so Vultr- or AWS-backed Cloudways servers can sit in São Paulo. This is inferred, not verified.

### Gaps
- Not verified in this session: Contabo, Hostinger, Render, Railway, Vercel function regions, Netlify, Kinsta/WP Engine (GCP/AWS-backed) LatAm options; Hetzner Hillsboro; AWS Mexico (Querétaro) region status in 2026.

## 3. SLA, support quality, managed add-ons

### Takeaway
I found little sourced SLA or support data. What I found suggests the hyperscalers are the default choice when formal HA SLAs or compliance matter. Among developer clouds and PaaS, managed DBs and load balancers are standard, but Lightsail and Cloudways bill add-ons (DB, CDN, snapshots) separately.

### Cited Findings
- Workloads needing compliance certifications or high-availability SLAs "point toward AWS, GCP, and Azure". — [northflank.com](https://northflank.com/blog/best-digitalocean-alternatives-2026)
- Lightsail bills managed DB, CDN, block storage and snapshots separately from the bundle price. — [cloudburn.io](https://cloudburn.io/blog/amazon-lightsail-pricing)
- Contabo backups are a paid add-on. — [vpsbenchmarks.com](https://www.vpsbenchmarks.com/compare/contabo_vs_hostinger)
- WP Engine is reported to include phone support on all plans. Cloudways requires more hands-on server management. — [mevohost.com](https://mevohost.com/blog/managed-wordpress-hosting-agencies-2026/)
- Cloudflare R2 provides S3-compatible object storage with no egress fee. D1 provides serverless SQLite but has no hard billing cap. — [costbench.com](https://costbench.com/software/cloud-infrastructure/cloudflare-pages-workers/hidden-costs/)

### Inferences
- An agency that needs a managed DB plus a load balancer plus backups with predictable bills is best served by DO, Vultr or Linode. Hetzner has a load balancer, volumes and snapshots but no general managed DB (from general knowledge, not verified here).

### Gaps
- No verified SLA percentages per provider. DO/Vultr/Linode are commonly cited at a 99.99% uptime SLA, but this is not verified here.
- No verified managed-DB, load-balancer, backup or object-storage pricing for DO, Vultr, Linode or Hetzner.
- No systematic support-reputation data (Trustpilot or community surveys) was retrieved.

## 4. Free credits, startup programs, partner/agency programs

### Takeaway
DigitalOcean reorganized its partner program in 2026 ("Partner Pod", Jan 2026, reportedly later relaunched as an "AI Partner Program"). It offers up to ~25% reseller margin and MDF. Kinsta's Agency Partner Program advertises up to $10,000 in hosting credits. Cloudways has a tiered agency program, and WP Engine has the most developed agency/partner tooling. I could not find Vercel's partner program details or 2026 startup credit amounts.

### Cited Findings
- DigitalOcean launched Partner Pod on Jan 13, 2026. — [digitalocean.com blog](https://www.digitalocean.com/blog/partner-pod-digitaloceans-new-partner-program); [channelfutures.com](https://www.channelfutures.com/channel-business/understanding-partner-pod-the-new-digitalocean-partner-program)
- DigitalOcean reportedly relaunched the program as the "DigitalOcean AI Partner Program" in April 2026. This is a single source. — [vendorradar.app](https://www.vendorradar.app/vendors/digitalocean)
- DigitalOcean partner benefits: up to 25% reseller discount or margin, plus MDF. Tiers include Registered (for agencies and consultants) and Services. The tier details come from a reseller with a commercial stake. — [datanethosting.com](https://www.datanethosting.com/blog/digitalocean-partner-2026/); [digitalocean.com partners](https://www.digitalocean.com/partners)
- Kinsta's official agency page says its Agency Partner Program offers up to $10,000 in hosting credits. One review adds volume discounts or a 10% recurring referral commission. — [kinsta.com](https://kinsta.com/wordpress-hosting/agencies/); [techearl.com](https://techearl.com/kinsta-honest-review-for-agencies)
- Cloudways' Agency Partner Program has Bronze, Silver, Gold and Platinum tiers based on monthly spend, with growth credits and priority support. — [xcloud.host](https://xcloud.host/best-wordpress-hosting-for-agencies/); [hostingdive.com](https://hostingdive.com/best-wordpress-hosting-for-digital-agencies-2026/)
- WP Engine's Agency Partner program offers co-selling, a partner portal, reseller pricing and dedicated account management. Reviews disagree on whether full white-label is supported. — [webkernelai.com](https://webkernelai.com/guides/wpengine-vs-kinsta-vs-cloudways); [mevohost.com](https://mevohost.com/blog/managed-wordpress-hosting-agencies-2026/)

### Gaps
- Vercel's Solution/Agency Partner program terms were not found.
- 2026 startup credit amounts were not found for AWS Activate, Google for Startups Cloud, Microsoft for Startups, DigitalOcean Hatch, Vultr or Cloudflare for Startups.
- Cloudways discount percentages were not found.

## 5. Reliability incidents and reputation

### Takeaway
Late 2025 to 2026 saw several high-impact outages from control-plane or config pushes at AWS us-east-1, Azure Front Door and Cloudflare (twice). A further AWS us-east-1 AZ cooling failure occurred in May 2026. DigitalOcean's notable 2026 incident (Aug) affected the control panel and API, not running Droplets. Hetzner's reputation is strong on price/performance, but the 2026 price hikes and the US traffic caps have dented its value story.

### Cited Findings
- AWS us-east-1, Oct 19–20, 2025: a DynamoDB DNS automation race condition caused an outage of ~15 h, cascading to EC2 launches, Lambda, ECS/EKS and Fargate. — [statusgator.com](https://statusgator.com/blog/2025-the-year-of-the-global-cloud-outage/); [controlplane.com](https://controlplane.com/blog/post/aws-outage-one-year-later-lessons-from-every-cloud-failure)
- Azure Front Door, Oct 29–30, 2025: a faulty config change caused a ~8 h global outage. — [medium/livewyer](https://medium.com/@livewyer/global-cloud-outages-lessons-from-aws-azure-and-cloudflares-failures-0e531eabe383)
- Cloudflare, Nov 18, 2025: a malformed bot-management config file crashed the core proxy. On Dec 5, 2025, a patch caused 500 errors on ~28% of traffic. — [statusgator.com](https://statusgator.com/blog/2025-the-year-of-the-global-cloud-outage/); [dev.to](https://dev.to/flintx/what-the-cloudflare-aws-and-azure-outages-reveal-about-a-fragile-centralised-internet-377m)
- AWS us-east-1, May 2026: a cooling failure in AZ use1-az4 hit EC2 and EBS. One source says up to 28 h with a 10% credit; the duration is unconfirmed elsewhere. — [tech-insider.org](https://tech-insider.org/aws-outage-us-east-1-2026/); [getoutofyour.cloud](https://getoutofyour.cloud/cloud-outages/)
- DigitalOcean, Aug 2026: an auth DB migration caused retry amplification, with up to 25% control-panel/API errors for ~3.5 h. Droplets were unaffected. This is a single source. — [ideatives.com](https://ideatives.com/briefs/cloud-outages/)
- 2026 roundups also list Railway incidents and a GCP global Service Control outage (June 12, 2025). — [ideatives.com](https://ideatives.com/briefs/cloud-outages/); [thenetworkdna.com](https://www.thenetworkdna.com/2026/10/cloud-networking-resilience-after-major-outages.html)
- Hetzner is described as the price/performance winner for self-hosting in 2026 reviews. — [selfhostable.dev](https://selfhostable.dev/blog/best-vps-providers-for-self-hosting-2026/); [betterstack.com](https://betterstack.com/community/guides/web-servers/hetzner-cloud-review/)

### Inferences
- An agency should avoid single-region dependence on AWS us-east-1. It should also keep DNS/CDN failover in mind, since Cloudflare itself has had global outages.

### Gaps
- No incident data found for Vultr, Linode, Hetzner, Vercel, Netlify, Render, Fly.io, Kinsta, WP Engine or Cloudways in 2026.
- No quantitative support-quality data was found.
