# Server Management Tooling for a Small Web/Marketing Agency (as of late Oct 2026)

> Method note: every direct page fetch failed during this research. hostzero.com, spinupwp.com, ploi.io and runcloud.io all returned DNS failures because they are outside the session's allowed network domains. Every figure below comes from search-result summaries of the cited pages, not from reading the pages in full. Vendor pricing especially should be re-checked on official pages before budgeting. Many sources are competitor-authored comparison pages, and those are flagged where relevant. All prices are USD per month unless noted.

## 1. WordPress-focused server panels (SpinupWP, Ploi, RunCloud, GridPane, Cloudways, xCloud, FlyWP, Laravel Forge)

### Takeaway
Most bring-your-own-VPS WP panels cost about $10–$45/month at the levels a small agency needs (a few servers, unlimited sites). Team and seat features are usually gated to the mid or top tier. SpinupWP (Advanced plan) and Ploi (Unlimited plan, which also covers Node apps) are the strongest low-cost fits. GridPane is far more expensive, with white-label and client-portal access only on high tiers. Cloudways is fully managed and priced per server, including the VPS.

### Cited Findings
**SpinupWP**
- 2026 sources describe two plans: Essentials at $12/mo and Advanced at $19/mo, each with 1 server and unlimited sites — [SpinupWP pricing via search summary, Capterra](https://www.capterra.com/p/10012241/SpinupWP/); [AgencyHostHub 2026 review](https://agencyhosthub.com/spinupwp-review-2026-cloud-server-control-for-agencies/)
- Extra servers are volume-priced. FlyWP's comparison says servers 2–3 cost $10/mo each on Advanced and $8/mo each on Essentials, falling to about $1/server at 61 or more servers. FlyWP is a competitor — [FlyWP vs SpinupWP](https://flywp.com/blog/20272/flywp-vs-spinupwp/)
- Essentials is single-user. Team features need Advanced, with additional users at about $2/user/mo. Site monitoring costs $1/site/mo on Advanced — [FlyWP vs SpinupWP](https://flywp.com/blog/20272/flywp-vs-spinupwp/); [Software Advice](https://www.softwareadvice.com/server-management/spinupwp-profile/)
- Conflict: some listings still show an older scheme, Personal at $12 and Team at $39 with unlimited team members. This is likely outdated — [WPKube](https://www.wpkube.com/spinupwp-review/); [Tekpon](https://tekpon.com/software/spinupwp/reviews/)
- GridPane (a competitor) characterizes SpinupWP as having "a 10-website cap and then $9 per 10 websites." This conflicts with the "unlimited sites" claims elsewhere and may be outdated — [GridPane vs SpinupWP](https://gridpane.com/gridpane-vs/spinupwp/)

**Ploi**
- The official pricing page, via search summary, lists Basic at €8 (~$10), Pro at €13 (~$16) and Unlimited at €30 (~$36) per month. Server caps are 5, 10 and unlimited respectively. All tiers include unlimited sites, but **team management is included only on Unlimited**. Annual billing is about 10% off. There is also a free plan with 1 server, 1 site and 5 deployments a month — [Ploi pricing](https://ploi.io/pricing)
- Conflict: some third-party pages still list an $8/mo price (reviewed July 2026), which looks outdated — [MakerStack Ploi review](https://makerstack.co/reviews/ploi-review/); [Toolradar](https://toolradar.com/tools/ploi/pricing)

**RunCloud**
- A June 2026 comparison lists Basic at $8 (1 server), Pro at $15 (unlimited servers) and Business at $45 (unlimited servers plus team roles) — [Cloudnan comparison](https://cloudnan.com/blog/runcloud-vs-ploi-vs-cloudways-vs-cloudnan) (Cloudnan is a competing vendor)
- Conflict: another source says "Professional at $19 covers up to 50 servers" and that atomic deploys are gated at $49 — [MakerStack RunCloud review](https://makerstack.co/reviews/runcloud-review/). The official page could not be verified because runcloud.io was blocked.

**GridPane**
- Tier names and prices conflict widely. Websiteplanet (2026) lists Pro at $30, Developer at $100 and Enterprise at $300, with white-label excluded from Pro and Developer — [Websiteplanet](https://www.websiteplanet.com/web-hosting/gridpane/)
- Other listings show Panel at $100, Developer PLUS at $500 and Agency from $1,500/mo, with whitelabel/co-branding and full client-portal access on Agency — [WPDiscounts](https://wpdiscounts.io/wordpress-hosting/gridpane-coupon/)
- One review says the free Core plan is capped at 25 sites — [FeaturedWP FlyWP review](https://featuredwp.com/blog/flywp-review/)

**Cloudways (managed, VPS included)**
- Cloudways' own pricing page snapshots (mid-2026) show a DigitalOcean Micro plan at $11/mo (1 vCPU, 1GB). One review says Flexible now starts at $14/mo, and the 2GB DO tier is about $28/mo. Billing is hourly with no contracts. Add-ons include Rackspace email at $1.50/mailbox and Cloudflare Enterprise at $4.99/domain. The entry figures conflict between sources — [Cloudways pricing](https://www.cloudways.com/en/price-plan.php); [BloggersIdeas](https://bloggersideas.com/cloudways-pricing)
- Vultr plans are said to land "within a few dollars" of DO. AWS and GCP 2GB plans cost about $38–39/mo — [BloggersIdeas](https://bloggersideas.com/cloudways-pricing)

**xCloud / FlyWP**
- xCloud is quoted at $4.99–$19.99/mo for its panel in one comparison. xCloud's own page cites $20.01–$310/mo for managed servers (a different product) — [Robotalp](https://robotalp.com/blog/the-6-best-cloud-server-management-panels-for-2026/); [xCloud vs GridPane](https://xcloud.host/xcloud-vs-gridpane/) (vendor)
- FlyWP: one 2026 comparison says usage-based pricing from $5/mo plus managed hosting from $7/mo. A 2025 review says plans start at $9/mo, with a free plan for 1 site on 1 server. These conflict — [FlyWP blog](https://flywp.com/blog/20246/best-cloudways-alternative/) (vendor); [FeaturedWP](https://featuredwp.com/blog/flywp-review/) (2025)

**Laravel Forge**
- Hobby is $12/mo, Growth $19/mo and Business $39/mo. There is no free tier, and the VPS is billed separately by the provider. Annual billing is about 17% off. One source says it re-checked laravel.com/forge/pricing on Oct 13, 2026 — [LaraCopilot](https://laracopilot.com/blog/laravel-forge-pricing-2026/); [Lucky Media](https://www.luckymedia.dev/insights/laravel-forge)

### Inferences
- For 2–4 VPSs with a 2–5 person team, the likely monthly panel cost is roughly: Ploi Unlimited about $36 flat; SpinupWP Advanced about $19 + $10 × (servers − 1) + $2/user (about $45–55); RunCloud Business about $45; Forge Business $39. GridPane's agency and white-label tiers cost an order of magnitude more.
- Ploi and Forge are general PHP/Node panels, so they can also host the agency's Node/Next.js apps and APIs. SpinupWP and GridPane are WordPress-only, which would leave Node apps needing a second tool such as Coolify, Kamal or Ploi. This is inferred from the products' positioning, and I did not verify it against official feature pages this session.
- Cloudways removes OS patching from the team's plate, but it costs more per GB of RAM, and it is not a fit for custom Node stacks beyond its supported apps.

### Gaps
- No official pricing pages could be fetched (spinupwp.com, ploi.io and runcloud.io were blocked by the network allowlist). Seat pricing, white-label and client-portal features, and supported-provider lists are unverified for all panels except as noted.
- I found no reliable 2026 data on each panel's security track record (CVEs or breaches) for SpinupWP, Ploi, RunCloud, GridPane, xCloud or FlyWP.
- Ploi Core (Ploi's white-label client panel) was not covered by any search result.

## 2. Self-hosted PaaS (Coolify, Dokploy, CapRover, Kamal, Easypanel): licensing and security

### Takeaway
Coolify is the cheapest and most capable multi-server option, with a free self-hosted edition and a $5 cloud dashboard. Its 2026 security record is poor, though: 11 critical CVEs on Jan 8, 2026 (five at CVSS 10.0) and further CVEs through the year. Dokploy's core is Apache-2.0 since January 2026, with SSO, white-label and audit logs under a source-available paid license. Kamal is the lightest choice, with no panel. Easypanel is closed-source and the priciest per server.

### Cited Findings
**Coolify**
- Coolify disclosed 11 critical vulnerabilities on Jan 8, 2026, five of them CVSS 10.0. Some allow root on the host after authentication. Censys counted about 52,890 public instances at disclosure, and there was no confirmed in-the-wild exploitation as of July 2026 — [Hostzero, "Is Coolify safe" (via search summary, fetch blocked)](https://hostzero.com/articles/is-coolify-safe-2026-cves)
- CVE-2025-66209, -66210 and -66211 are command injections in database backup, import and PostgreSQL init. They were fixed in 4.0.0-beta.451 — [WZ-IT CVE overview](https://wz-it.com/blog/coolify-cve-sicherheitsluecken-update-2025-2026/)
- CVE-2025-64424 is a command injection via the git source field that lets a low-privileged member run commands as root (CVSS v4 9.4). CVE-2025-64425 is a password-reset host-header flaw that enables account takeover — [Mend.io](https://bolt.whitesourcesoftware.com/vulnerability-database/CVE-2025-64424); [INCIBE](https://www.incibe.es/incibe-cert/alerta-temprana/vulnerabilidades/cve-2026-34594)
- The CVEs continued through the year: CVE-2026-34034, -34038 and -34592 in spring, CVE-2026-34594 (fixed in beta.471), CVE-2026-27957 (fixed in beta.464) and CVE-2026-41899. Sources conflict on exact fix versions — [CERT.hr CVE-2026-41899](https://cve.cert.hr/cve/CVE-2026-41899); [CERT.hr CVE-2026-34167](https://cve.cert.hr/cve/CVE-2026-34167); [INCIBE](https://www.incibe.es/incibe-cert/alerta-temprana/vulnerabilidades/cve-2026-34594)
- Coolify v4 was still labeled "beta" (4.0.0-beta.4xx) in 2026 per these advisories — [WZ-IT](https://wz-it.com/blog/coolify-cve-sicherheitsluecken-update-2025-2026/)
- Pricing: self-hosted is free with all features. Coolify Cloud (hosted dashboard only, servers stay yours) is $5/mo including 2 servers, plus $3/mo per extra server, with 20% off annual — [Coolify compare page](https://coolify.io/compare/coolify-vs-dokploy-vs-caprover-vs-dokku-vs-kamal); [bex.co](https://bex.co/blog/2026/10/01/single-box-ceiling-priced-multi-server-coolify-dokploy-caprover-easypanel)

**Dokploy**
- On Jan 21, 2026, Dokploy moved "all current features" to unmodified Apache 2.0 — [Dokploy blog](https://dokploy.com/blog/we-are-updating-dokploys-open-source-license)
- Code in the `/proprietary` folder is under the Dokploy Source Available License (DSAL) 1.0. Production use of that code requires a commercial agreement, while dev and test use is free — [ScanCode LicenseDB DSAL-1.0](https://scancode-licensedb.aboutcode.org/dokploy-dsal-1.0.html)
- Enterprise features (SSO, whitelabeling, audit logs) require a license key, and the license is validated daily against the server IP. Default installs run the standard edition — [Dokploy docs: license keys](https://docs.dokploy.com/docs/core/enterprise/license-keys)
- isitreallyfoss.com rates Dokploy "Issues exist" and flags older repo terms forbidding commercial resale that conflict with the license — [isitreallyfoss](https://isitreallyfoss.com/projects/dokploy/)

**CapRover / Kamal / Easypanel**
- CapRover is free to self-host. CapRover Pro adds build notifications, login alerts and 2FA. Sources conflict on the current version (v1.15.4 vs v1.14.2) — [bex.co](https://bex.co/blog/2026/10/01/single-box-ceiling-priced-multi-server-coolify-dokploy-caprover-easypanel); [pethost.dev](https://pethost.dev/blog/coolify-vs-dokploy-vs-caprover-vs-dokku/)
- Kamal is MIT-licensed and free, with no panel and no built-in backups. It deploys over SSH to listed hosts. Latest release v2.12.0 (June) — [pethost.dev](https://pethost.dev/blog/coolify-vs-dokploy-vs-caprover-vs-dokku/); [farasat.me](https://www.farasat.me/blog/coolify-alternatives)
- Easypanel is closed-source. Hobby, Growth and Business cost $14.90, $23.90 and $37.90 per server per month (monthly billing), or $10.90, $16.90 and $29.90 billed annually. Multi-server needs Business, and clustering is reportedly alpha — [bex.co](https://bex.co/blog/2026/10/01/single-box-ceiling-priced-multi-server-coolify-dokploy-caprover-easypanel); [Panelica](https://panelica.com/blog/easypanel-vs-coolify-2026-self-hosted-paas-comparison) (competitor)

### Inferences
- A self-hosted PaaS is a good fit for the Node/Next.js apps, APIs and preview/staging environments. It is weaker for hosting 10–30 client WordPress sites, where WP panels give WP-specific caching, backups and staging-to-live push.
- The 2026 Coolify CVE pattern (authenticated → root) means anyone with dashboard access effectively has root. Never give client logins to Coolify or Dokploy. Put the dashboard behind Cloudflare Access, a VPN or Tailscale, and patch quickly. Coolify Cloud moves the dashboard off your servers but does not remove these risks.

### Gaps
- Dokploy, CapRover and Easypanel 2026 CVE history was not researched due to the tool-call budget.
- I could not confirm whether Coolify had moved out of v4 beta by Oct 2026.

## 3. Traditional free/open control panels (CloudPanel, HestiaCP, aaPanel, Webmin/Virtualmin, CyberPanel, cPanel/Plesk)

### Takeaway
Free panels carry serious, recurring root-level CVEs. CyberPanel's were exploited for ransomware in Oct 2024, HestiaCP had several critical CVEs in 2026, and aaPanel has public RCE exploits. cPanel and Plesk keep raising prices: cPanel about $54–77/mo per server for 30–100 accounts, and Plesk about $30–74/mo by edition. For a small team, a panel with a small attack surface, or a SaaS panel that connects over SSH, is safer than an internet-exposed root web UI.

### Cited Findings
- **CyberPanel:** CVE-2024-51567, -51568 and -51378 are critical pre-auth RCEs in 2.3.5–2.3.7. They were actively exploited in Oct 2024 to deploy PSAUX ransomware, with about 22,000 vulnerable instances as of Oct 28, 2024 — [Belgium CCB](https://ccb.belgium.be/advisories/warning-critical-vulnerabilities-cyberpanel-are-under-active-exploitation-deliver); [UAE CSC alert](https://assets.adgm.com/download/assets/20241030+Cyber+Security+Council+Alert+589/4c7db1fe982411ef88f68a732d684cb5)
- CVE-2024-51378 is CVSS 10.0 per Censys and was used to deploy PSAUX, C3RB3R and a Babuk variant — [Censys](https://censys.com/advisory/cve-2024-51378/); [SonicWall](https://www.sonicwall.com/blog/critical-cyberpanel-vulnerability-cve-2024-51378-how-to-stay-protected)
- **aaPanel:** CVE-2026-29859 is an arbitrary file upload leading to RCE in v7.57.0 (CVSS 9.8, no privileges required) — [NVD](https://nvd.nist.gov/vuln/detail/CVE-2026-29859); [GitHub Advisory](https://github.com/advisories/GHSA-2vp8-2rp5-p4hf). A reported OS command injection in File Manager (≤8.25.0) has a public exploit, though the vendor says auth is required — [OffSeq radar](https://radar.offseq.com/threat/cve-2026-113506-os-command-injection-in-aapanel-4d87b36f9fd65275) (unusual CVE number; low confidence). Older public exploits include directory traversal exposing the root SSH key (6.8.21) and privilege escalation to RCE (6.6.6) — [Exploit-DB 50780](https://www.exploit-db.com/exploits/50780); [Exploit-DB 48886](https://www.exploit-db.com/exploits/48886); full list at [CVEdetails](https://www.cvedetails.com/vulnerability-list/vendor_id-23472/Aapanel.html)
- **HestiaCP (2026):**
  - CVE-2026-43633 is an unauthenticated RCE in the web terminal (1.9.0–1.9.4) — [SentinelOne](https://www.sentinelone.com/vulnerability-database/cve-2026-43633/)
  - CVE-2026-43634 is a fail2ban bypass via a spoofed CF-Connecting-IP header (1.2.0–1.9.4), which is directly relevant behind Cloudflare — [Sherlock Forensics](https://www.sherlockforensics.com/blog/2026-05-19-cve-2026-43634.html)
  - CVE-2026-108390 is an authenticated root code execution (CVSS 9.9, 1.9.7–1.10.4) — [Strix](https://www.strix.ai/cve/CVE-2026-108390)
  - CVE-2026-111627 is a cron read-only bypass, fixed in 1.10.5 — [OpenCVE](https://app.opencve.io/cve/CVE-2026-111627)
  - CVE-2026-12196 lets low-privilege users run scripts via passwordless sudo — [Cyberstrike](https://cyberstrike.io/cve/CVE-2026-12196/)
  - Source dates conflict, so verify with NVD or the HestiaCP GitHub advisories.
- **cPanel (WebPros):** Prices rose Jan 1, 2026. Reseller figures: Solo $29.99, Admin (5 accounts) $35.99, Pro (30) $53.99, Premier (100) $69.99, plus $0.49 per extra account. Another increase was announced Oct 1, 2026, effective about Dec 16, 2026: Solo $32.99, Admin $38.99, Pro $58.99, Premier $76.99, plus $0.55 per account. Reportedly this is the 8th consecutive increase since per-account pricing began in 2019 — [H4Y reseller announcement](https://h4y.us/my/announcements/14/2026-cPanel-Plesk-and-WHMCS-license-cost-increases.html); [webhosting.today, Oct 8 2026](https://webhosting.today/2026/10/08/plesk-whmcs-and-cpanel-cost-up-to-20-percent-more-in-2027/)
- **Plesk:** Plesk is priced per server, with editions capped by domains (Web Admin 10, Web Pro 30, Web Host unlimited). January 2026 brought an average increase of about 26%. Reseller figures are $16.99, $29.99 and $62.99/mo, and conflict with another source's $12.50, $19 and $32. The 2027 figures are reported as $18.99, $33.99 and $73.99. Plesk's official list is in EUR — [StormWeb](https://stormweb.ca/news/view/41/cpanel---plesk-price-changes-for-2026/); [Hackceleration](https://hackceleration.com/labs/plesk-pricing); [webhosting.today](https://webhosting.today/2026/10/08/plesk-whmcs-and-cpanel-cost-up-to-20-percent-more-in-2027/)

### Inferences
- With 10–30 sites per server, Plesk Web Pro (30 domains) or Web Host would cost about $30–74/server/month. That is more than every SaaS WP panel above, so cPanel and Plesk only make sense if clients need email or classic hosting accounts.
- HestiaCP's CF-Connecting-IP bypass shows a general risk: any panel that trusts Cloudflare headers without restricting the origin to Cloudflare IPs can have its rate-limiting bypassed.
- Avoid aaPanel and CyberPanel for client production. If a free self-hosted panel is required, CloudPanel had no 2025–26 advisories in my results. That reflects an absence of evidence, not proof of security, and it should still be firewalled.

### Gaps
- No search results covered CloudPanel or Webmin/Virtualmin CVE history or features for 2025–26. These need follow-up.
- Official cPanel and Plesk price pages were not checked. All figures come from resellers or competitors (Panelica is a competing panel vendor).

## 4. Configuration management / IaC (Ansible, Terraform/OpenTofu, cloud-init)

### Takeaway
Terraform has been under BSL 1.1 since v1.6 (August 2023). OpenTofu is the MPL-2.0, Linux Foundation fork and mostly a drop-in replacement, with extras such as native state encryption. For a small agency, light IaC (OpenTofu to create Vultr/DO droplets, firewalls and Cloudflare DNS, plus cloud-init or Ansible for baseline hardening) gives repeatable servers without a dedicated DevOps person.

### Cited Findings
- Terraform moved from MPL 2.0 to BSL 1.1 in August 2023 for releases since 1.6. OpenTofu forked from 1.5.5, uses MPL 2.0 and is governed by the Linux Foundation — [Encore](https://encore.dev/articles/opentofu-vs-terraform-2026); [Scalr](https://scalr.com/learning-center/opentofu-vs-terraform)
- IBM acquired HashiCorp in 2025, and the BSL was unchanged. For end users managing their own infrastructure, the BSL has little practical effect — [Encore](https://encore.dev/articles/opentofu-vs-terraform-2026); [Luca Berton](https://lucaberton.com/blog/terraform-vs-opentofu-2026/)
- OpenTofu extras: native state encryption, for_each on provider blocks, early variable evaluation and `-exclude`. Migration is mostly a binary swap — [StackGuardian](https://www.stackguardian.io/post/opentofu-vs-terraform); [Encore](https://encore.dev/articles/opentofu-vs-terraform-2026)

### Inferences
- When to adopt: once the agency runs 3 or more servers, or rebuilds or clones servers more than a couple of times a year. A short cloud-init script plus a single Ansible playbook (users, SSH keys, ufw allowing only Cloudflare IPs on 80/443, unattended-upgrades, fail2ban) is the minimum viable step. Most WP panels already provision the web stack, so IaC should cover only what the panel doesn't: the VPS itself, firewall rules and DNS.
- Prefer OpenTofu for new work to avoid licensing ambiguity. There is no switching cost for small configurations.

### Gaps
- Searches returned nothing usable on Ansible, cloud-init, or the Vultr/DigitalOcean/Cloudflare providers specifically. The inferences above are general practice and are not cited.

## 5. Multi-site WordPress management dashboards (MainWP, ManageWP, InfiniteWP, WP Umbrella)

### Takeaway
MainWP is cheapest at scale: a free core, or Pro at $199/yr for unlimited sites, self-hosted. WP Umbrella is the simplest hosted option at about $2.19/site/mo, with white-label reports included. ManageWP and InfiniteWP start cheap, but costs grow through per-site and per-feature add-ons.

### Cited Findings
- WP Umbrella charges €1.99 (~$2.19)/site/mo with no minimum, and white-label reports are included in every plan. Security and hourly backups are add-ons, and there is a 14-day trial — [WP Umbrella vs MainWP](https://wp-umbrella.com/alternatives/mainwp/) (vendor page)
- MainWP has a free core. Pro is $29/mo, $199/yr or $599 lifetime, and white-label and client reports are Pro extensions. It runs on your own WordPress install — [WP Umbrella vs MainWP](https://wp-umbrella.com/alternatives/mainwp/); [Odd Jar 2026 comparison](https://oddjar.com/wordpress-site-management-plugins-2026-comparison/)
- ManageWP's core is free. Advanced editable reports cost about $1/site/mo, white label about $1/site/mo, and backups from about $2/site/mo — [Odd Jar](https://oddjar.com/wordpress-site-management-plugins-2026-comparison/); [Gautam Khorana](https://gautamkhorana.com/blog/managewp-alternatives/)
- InfiniteWP starts from about $147/yr, with reporting and branding as add-ons. Sources conflict on whether reporting is in the base tier — [WP Umbrella vs InfiniteWP](https://wp-umbrella.com/alternatives/infinitewp/); [Odd Jar](https://oddjar.com/wordpress-site-management-plugins-2026-comparison/)
- Estimated full-featured monthly cost at 5, 25 and 100 sites: WP Umbrella about $10, $50 and $199. MainWP is $199/yr flat. ManageWP is about $75–150/mo. InfiniteWP is $147–447/yr plus add-ons — [Odd Jar](https://oddjar.com/wordpress-site-management-plugins-2026-comparison/) (estimates)

### Inferences
- With 20–90 sites across a few servers, MainWP Pro ($199/yr) is the lowest-cost option for bulk updates and branded client reports. In exchange, the agency maintains and secures one more WordPress install, ideally on a separate small VPS behind Cloudflare Access. WP Umbrella would cost about $45–200/mo at that scale and needs no upkeep.

### Gaps
- Security incidents involving these dashboards' child plugins in 2025–26 were not researched.
- I found no current official confirmation of ManageWP's add-on prices.

## 6. Pricing per server/site, team seats, white-label/client portals (cross-cutting)

### Takeaway
Seats and white-label are where costs jump. Ploi and RunCloud gate team features to their top tier ($36 and $45). SpinupWP charges about $2/user on Advanced. GridPane's white-label and client portal is reported only at its Agency tier (reportedly from $1,500/mo, unverified). Dokploy's white-label needs an enterprise license. For client reporting, MainWP Pro and WP Umbrella are far cheaper ways to give clients a branded experience than a white-label server panel.

### Cited Findings
- Ploi: team management only on Unlimited (€30/~$36) — [Ploi pricing](https://ploi.io/pricing)
- RunCloud: team roles on Business ($45) — [Cloudnan](https://cloudnan.com/blog/runcloud-vs-ploi-vs-cloudways-vs-cloudnan)
- SpinupWP: teams on Advanced ($19), with extra users about $2/mo — [FlyWP vs SpinupWP](https://flywp.com/blog/20272/flywp-vs-spinupwp/)
- GridPane: whitelabel and full client portal on Agency, from $1,500/mo per one listing — [WPDiscounts](https://wpdiscounts.io/wordpress-hosting/gridpane-coupon/); white-label is excluded from Pro and Developer — [Websiteplanet](https://www.websiteplanet.com/web-hosting/gridpane/)
- Dokploy: whitelabel, SSO and audit logs require an enterprise license — [Dokploy docs](https://docs.dokploy.com/docs/core/enterprise/license-keys)
- WP Umbrella white-label reports included; MainWP via Pro — [WP Umbrella](https://wp-umbrella.com/alternatives/mainwp/)

### Inferences
- A likely low-cost stack for this agency: Ploi Unlimited (about $36/mo) or SpinupWP Advanced for WP servers; Coolify (self-hosted, firewalled) or Kamal for Node/Next.js apps and staging; MainWP Pro ($199/yr) for updates and client reports; and OpenTofu plus cloud-init for VPS creation. Panel and tooling spend would be roughly $55–80/mo before VPS costs. Do not give clients panel logins. Use reports, or a per-site WordPress admin.

### Gaps
- Client-portal features for Ploi Core, RunCloud, xCloud and FlyWP were not verified.
- Supported-provider lists (beyond "bring your own VPS") were not verified for each panel because official pages were blocked.
