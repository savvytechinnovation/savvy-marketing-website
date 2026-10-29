# Uptime Monitoring Tools for a Small Web/Marketing Agency (20-100 client sites, APIs, SSL/domain expiry)

Research date: 2026-10-29. **Method caveat:** This session's network blocked direct fetches of vendor pages (uptimerobot.com, betterstack.com, notifier.so, projecthelena.com all failed DNS resolution in the sandbox). All findings below come from web search result snippets. Some of those snippets quote official pages (ohdear.app/pricing, checklyhq.com/pricing.md, uptimerobot.com/pricing, site24x7 MSP page, help.uptimerobot.com). Many come from third-party or competitor blogs (notifier.so, hyperping.com, host-tracker.com, velprove, cronping, wakestat, projecthelena, uptimia), which are often biased. **Confirm every price on the vendor page before purchasing.**

## SaaS tools: features, pricing, intervals, alerts, status pages (UptimeRobot, Better Stack, Pingdom, StatusCake, HetrixTools, Oh Dear, Uptime.com, Freshping, Cronitor, Healthchecks.io, Checkly, Site24x7, Instatus/Statuspage)

### Takeaway
For an agency with 50-100 monitors, the cheapest credible paid options are StatusCake Superior (about $20-25/mo for 100 monitors), HetrixTools ($10-20/mo) and UptimeRobot Team (about $33-38/mo for 100 monitors, with status pages that include a custom domain and white-labelling). Better Stack costs more ($50-71/mo for one seat) but adds on-call, phone/SMS alerts and polished status pages. Its per-page white-label fee is very expensive. Oh Dear is the most agency-oriented tool: it charges a flat price per site and bundles uptime, SSL, broken links, cron and status pages, but it costs the most ($165 for 50 sites, $275 for 100). Freshping shut down in March 2026.

### Cited Findings

**UptimeRobot**
- The free plan has 50 monitors at 5-minute intervals. Since late 2024 it has been restricted to personal/non-commercial use. Sources disagree on whether the terms changed in October or November 2024. Business sites need a paid plan. — [notifier.so UptimeRobot pricing 2026 (competitor)](https://notifier.so/guides/uptimerobot-pricing-2026/); [DEV Community: UptimeRobot commercial use](https://dev.to/velprove/uptimerobot-commercial-use-free-alternatives-for-business-sites-in-2026-5d75); [host-tracker (competitor)](https://www.host-tracker.com/blog/uptimerobot-alternative)
- The old Pro tier (about $7/mo) was retired. The current tiers are Solo, Team and Enterprise. — [notifier.so](https://notifier.so/guides/uptimerobot-pricing-2026/)
- Prices: Solo $9/mo annual ($10 monthly), 10-50 monitors at 60s. Team $38/mo annual ($45 monthly), 100 monitors, full-featured status pages, 3 seats included. Enterprise $69/mo annual ($82 monthly). — [notifier.so (competitor, 2026)](https://notifier.so/guides/uptimerobot-pricing-2026/)
  - **Conflict:** a search snippet of UptimeRobot's own pricing comparison lists Team at **$396/year (about $33/mo)**. — [uptimerobot.com/pricing](https://uptimerobot.com/pricing.md)
- The Team plan allows up to 100 status pages with custom design, your own domain, translations, white-labelling and password protection. — [UptimeRobot Help Center: status page feature](https://help.uptimerobot.com/en/articles/11361341-uptimerobot-status-page-feature-what-it-is-how-it-works)
- Team integrations include Slack, Mattermost, MS Teams and Telegram. Multi-location checks are a paid-tier feature. — [uptimerobot.com/pricing](https://uptimerobot.com/pricing.md)

**Better Stack (Uptime)**
- Pricing is per responder license (Uptime + Telemetry): $29/mo annual or $34 monthly, as read from Better Stack's pricing page on 2026-09-28. — [Uptimia vs Better Stack (competitor)](https://www.uptimia.com/comparisons/uptimia-vs-betterstack)
- 10 monitors are included. Extra monitors cost $21 per 50 per month, and heartbeats cost $17 per 10 per month. — [Uptimia](https://www.uptimia.com/comparisons/uptimia-vs-betterstack); [hyperping Better Stack pricing (competitor)](https://hyperping.com/blog/betterstack-pricing)
- One status page is included. Extra pages cost about $12/mo annual ($15 monthly). A white-label (branding removed) page costs about $208/mo annual ($250 monthly) **per page**. — [hyperping](https://hyperping.com/blog/betterstack-pricing); [wakestat: What agencies actually pay](https://www.wakestat.com/betterstack-pricing)
- The free tier has 10 monitors and 1 status page. Older reviews that say 3 monitors, or that list $18 Starter and $99 Business plans, appear outdated. — [apistatuscheck review (likely outdated)](https://apistatuscheck.com/blog/better-stack-review-2026); [modern-datatools](https://www.modern-datatools.com/tools/better-stack/pricing)
- One estimate puts 20 clients with a status page each at about $335/mo, driven mostly by per-page fees. — [projecthelena: cost for an agency with 20 clients (2026)](https://projecthelena.com/blog/uptime-monitoring-cost-per-client-2026/)

**Pingdom (SolarWinds)**
- There is no free tier. Synthetic monitoring and RUM are sold separately. The USD calculator as of 2026-08-17 gives $18/mo for 10 uptime checks, $78/mo for 50, $149/mo for 100 and $680/mo for 500. Annual billing takes about 8-9% off. — [hyperping Pingdom pricing (competitor)](https://hyperping.com/blog/pingdom-pricing)
- The entry plan has 10 uptime checks, 1 advanced check and 50 SMS for $198/yr. — [CubeAPM](https://cubeapm.com/blog/pingdom-pricing-and-review/)
- Older tier-based figures ($15/$50/$95/$249) conflict with this and are probably outdated. — [CostBench](https://costbench.com/software/observability/pingdom)

**StatusCake**
- Free: 10 uptime monitors. Superior: 100 monitors at 1-minute intervals, 2 team members. Business: 300 monitors at 30-second intervals, 10 team members. — [ToolQuestor](https://toolquestor.com/vs/statuscake-vs-uptimerobot); [notifier.so](https://notifier.so/guides/statuscake-vs-uptimerobot/)
- Superior costs about $20.41/mo (toolradar, annual billing required) or $24.49/mo (ToolQuestor). Business costs $66.66-79.99/mo. — [toolradar](https://toolradar.com/tools/statuscake/pricing); [ToolQuestor](https://toolquestor.com/vs/statuscake-vs-uptimerobot); [host-tracker (competitor, approx. €20/€70)](https://www.host-tracker.com/cs/blog/statuscake-alternative)

**HetrixTools**
- The free plan is described as forever free: 15 uptime monitors at 1-minute intervals and 32 blacklist monitors. Slack, Discord, Telegram, PagerDuty and webhooks are included on all plans, free included. — [notifier.so HetrixTools vs UptimeRobot](https://notifier.so/guides/hetrixtools-vs-uptimerobot/); [Gappsy](https://gappsy.com/tools/hetrixtools/)
- Professional costs $9.95/mo and Business $19.95/mo. These cover most small agencies, with partial (Professional) and full (Business) white-labelling. Enterprise is $49.95/mo for about 200 monitors per Gappsy, but fitgap lists $99.95 (**conflict**). Annual billing gives 2 months free. — [Gappsy](https://gappsy.com/tools/hetrixtools/); [fitgap](https://us.fitgap.com/products/hetrixtools)
- Blacklist (DNSBL) monitoring of IPs and domains is a core feature, which helps with client email deliverability. — [Gappsy](https://gappsy.com/tools/hetrixtools/)

**Oh Dear (agency-focused)**
- Official pricing is flat per site in USD, with a 10-day trial and no card required. Monthly tiers: Solo 2 sites $17, Solo Plus 5 $32, Freelance 10 $55, Studio 25 $109, **Agency 50 $165**, Agency Plus 75 $219, **Portfolio 100 $275**. — [ohdear.app/pricing](https://ohdear.app/pricing)
- Higher tiers: Portfolio Plus 150 sites $365, Scale 200 sites $439 (third-party, not verified). — [trackdowntime](https://trackdowntime.com/blog/oh-dear-pricing-cost-per-site)
- Status pages with a custom domain are included on every plan. — [Oh Dear vs Statuspage (vendor)](https://ohdear.app/oh-dear-vs-statuspage)
- Checks cover uptime, SSL certificates, broken links, scheduled tasks (cron) and Lighthouse. It is aimed at developers and web agencies. Capterra rating is 4.9/5 (about 72 reviews), and the main complaint is that there is no mobile dashboard. — [Capterra](https://www.capterra.com/p/190028/Oh-Dear/); [SoftwareSuggest](https://www.softwaresuggest.com/oh-dear)
- Yearly billing gives 2 months free. EU prices are in EUR (e.g. Solo €15) and exclude VAT. G2 says there is no permanent free plan, only a trial. — [G2](https://www.g2.com/products/oh-dear/pricing); [siteletter](https://siteletter.com/oh-dear-alternative)

**Uptime.com**
- There is no free tier (14-day trial). The base plan is $9/mo monthly or $7/mo annual for 10 basic checks, 1 advanced check (transaction, multi-step API or page speed) and 25 SMS. — [velprove (competitor)](https://velprove.com/blog/uptime-com-alternative)
- Starter is $20/mo. Sources disagree on whether it has 20 or 30 basic checks. Essential is about $67/mo with 40-50 basic checks and 2-5 transaction checks (**conflict**). Premium is listed at $285 or $379. Status pages are an add-on at $19/mo, and extra probe locations cost $1 each. — [TechRadar review](https://www.techradar.com/pro/uptime-com-website-monitoring-review); [Newswire Starter launch](https://www.newswire.com/view/content/uptimecom-revolutionizes-website-monitoring-with-the-launch-of-its-new-22102213); [Capterra](https://www.capterra.com/p/149314/Uptime/pricing/)

**Freshping: discontinued**
- Freshworks shut down Freshping on **2026-03-06**. Free accounts were disabled and paid subscriptions do not renew. Data was retained for 90 days (about 2026-06-04) and then deleted. No replacement was offered. — [notifier.so Freshping shutdown](https://notifier.so/guides/freshping-shutdown/); [LowEndSpirit thread](https://lowendspirit.com/discussion/10419); [TrustRadius (listed as discontinued)](https://www.trustradius.com/products/freshping)

**Cron/heartbeat: Healthchecks.io and Cronitor**
- Healthchecks.io: free Hobbyist plan with 20 jobs and 3 members. Supporter $5/mo (same limits). Business $20/mo with 100 jobs and 10 members. Business Plus $80/mo with 1,000 jobs. The code is BSD-3 licensed and can be self-hosted. — [Cronping comparison (competitor)](https://cronping.com/blog/cronping-vs-healthchecks-vs-cronitor); [Capterra](https://www.capterra.com/p/249957/Healthchecksio/pricing/)
- Cronitor: free Hacker plan with 5 monitors and 1 user. Business has no base fee and costs $2/monitor/mo plus $5/user/mo (prices checked 2026-09-23). — [devtoolpicks](https://devtoolpicks.com/blog/cronitor-vs-healthchecks-io-vs-better-stack-indie-hackers-2026); **conflicts with** "from $49/mo" (March 2026) per [Cronping](https://cronping.com/blog/cronping-vs-healthchecks-vs-cronitor)

**Checkly (synthetic/Playwright)**
- Hobby (free): 10k API runs and 1.5k browser runs, single user. Team: $64/mo annual with 100k API runs, 12k browser runs and up to 20 users. Extra browser runs cost $5 per 1k (monthly) or $4 per 1k (annual). Each retry and each location counts as a separate run. — [checklyhq.com/pricing.md](https://checklyhq.com/pricing.md); [Checkly docs: check pricing](https://www.checklyhq.com/docs/monitoring/check-pricing/)
- Starter has about 3k browser and 25k API runs, priced at $24/mo (CubeAPM) or $29/mo (ToolQuestor) (**conflict**). — [CubeAPM](https://cubeapm.com/blog/checkly-pricing-review/)

**Site24x7 (MSP plan)**
- The vendor MSP page lists $49/mo ($45 annual), including 50 websites/servers/cloud monitors, 3 advanced monitors and 9 customer accounts, with a 30-day trial. Add-ons: +20 monitors for $30/mo, +50 for $50/mo. — [Site24x7 MSP pricing](https://site24x7.ca/msp/pricing.html)
- Other sources list $59 ($54 annual) and MSP Pro with 15 websites (**conflict**). — [Motadata](https://motadata.com/blog/site24x7-pricing); [CubeAPM](https://cubeapm.com/blog/site24x7-pricing-review/)

**Status page tools (Instatus, Atlassian Statuspage)**
- Instatus Pro is $20/mo ($15 annual) and includes a custom domain, about 50 checks at 30s, 5,000 subscribers and 50 team members. Business is listed at $300/mo ($225 annual) by hyperping or $50/mo by toolradar (**conflict**). — [hyperping Instatus pricing (competitor, July 2026)](https://hyperping.com/blog/instatus-pricing); [toolradar](https://toolradar.com/tools/instatus/pricing)
- Atlassian Statuspage: free plan with 100 subscribers and 25 components. Paid plans start at $29/mo (Hobby/Starter). It is unclear which tier includes a custom domain. — [productcompass](https://www.productcompass.pm/p/free-status-page); [toolradar](https://toolradar.com/tools/instatus/pricing)

### Inferences
- UptimeRobot Team at $33-45/mo covers up to 100 monitors and up to 100 white-label, custom-domain status pages. That makes it the best value for client-facing status pages at this scale. Agencies still on the free plan for client work are violating its terms.
- Better Stack's per-page white-label fee (about $208/mo) makes it unsuitable for white-labelled status pages per client. Its standard pages are fine at $12 each. It is strongest when the team needs on-call scheduling and phone/SMS escalation.
- Oh Dear's pricing is per site, not per check. One "site" includes uptime, SSL, domain expiry, broken links, mixed content, DNS and cron checks. For 50 sites at $165, that works out to $3.30/site, which an agency can bundle into a care plan.
- Pingdom ($78 for 50 checks, $149 for 100) and Uptime.com are poor value for this use case.
- For check locations, none of the sources confirmed named Latin America probe locations for any vendor. This needs manual verification (see Gaps).

### Gaps
- I could not verify the official UptimeRobot price (Team $33 vs $38 annual) or Better Stack prices, because the vendor pages were blocked.
- **Check locations (LatAm/US):** I found no source naming each vendor's probe regions. Verify, for example, whether Better Stack, UptimeRobot, StatusCake or Site24x7 have São Paulo or Mexico probes.
- **WhatsApp alerts:** No source confirmed native WhatsApp alerting for any SaaS vendor (UptimeRobot results did not mention it). Workarounds such as webhooks to Twilio or another WhatsApp API were not researched. Uptime Kuma 2.0 added an "Evolution API" notification provider. Evolution API is a WhatsApp gateway, per [heise](https://www.heise.de/en/news/Uptime-Kuma-2-0-Monitoring-tool-now-with-MariaDB-support-10793657.html?view=print); that it is a WhatsApp gateway is my inference.
- Monthly or SLA client report features per vendor (e.g. UptimeRobot, StatusCake or Oh Dear PDF reports) were not confirmed by search snippets.
- HetrixTools per-tier monitor counts are unverified. Domain expiry checks per vendor are also unverified, apart from Oh Dear's broad check list.

## Self-hosted options: Uptime Kuma, Gatus, Upptime, OpenStatus, and the self-hosting trade-off

### Takeaway
Uptime Kuma 2.x is stable and mature (2.0.0 in October 2025, 2.2.x or later in 2026). It is the default self-hosted choice, but it checks from a single location and must run on infrastructure separate from the client hosting. Upptime is free with zero servers, but checks only every 5 minutes. OpenStatus has a hosted multi-region option from about $30/mo.

### Cited Findings
- Uptime Kuma 2.0.0 stable was released around 2025-10-20. It is a major version with breaking changes (back up and read the migration guide first). It adds MariaDB support, rootless Docker images and new notification providers (Nextcloud Talk, Brevo, Evolution API), and replaces the vm2-based proxy agent after a vulnerability. — [heise](https://www.heise.de/en/news/Uptime-Kuma-2-0-Monitoring-tool-now-with-MariaDB-support-10793657.html?view=print); [linuxiac](https://linuxiac.com/uptime-kuma-2-0-arrives-with-mariadb-support-modern-ui-refresh/); [AlternativeTo](https://alternativeto.net/news/2025/10/uptime-kuma-2-0-introduces-mariadb-support-rootless-docker-modern-ui-and-upgrade-tools)
- Version 2.2.1 (April 2026) included an SSTI security fix. A Docker Hub tracker lists 2.5.0 as a stable tag, so the latest version is unconfirmed. — [SynoCommunity](https://synocommunity.com/package/uptime-kuma); [releasealert.dev](https://releasealert.dev/dockerhub/louislam/uptime-kuma)
- Uptime Kuma runs on a $5/mo VPS, but it has no SSO and checks from a single location (vendor claim by UptimeRobot, a competitor). — [UptimeRobot knowledge hub](https://uptimerobot.com/knowledge-hub/comparisons-and-alternatives/best-status-page-tools/)
- Upptime is MIT-licensed and free. It runs checks via GitHub Actions every 5 minutes, records incidents as GitHub Issues and hosts the status page on GitHub Pages, so there is no server cost. — [agentdeals Upptime](https://agentdeals.dev/vendor/upptime); [OpenStatus vs Upptime](https://agentdeals.dev/compare/openstatus-vs-upptime)
- OpenStatus: Hobby $0 (1 monitor, 10-minute checks, 6 regions, per agentdeals), Starter $30/mo (20 monitors at 1 minute), Pro $100/mo (50 monitors at 30s). It is open source and self-hostable, and UptimeRobot describes it as offering 28-region multi-cloud checks. — [toolradar OpenStatus](https://toolradar.com/tools/openstatus/pricing); [agentdeals OpenStatus](https://agentdeals.dev/vendor/openstatus)
- Gatus is self-hosted, with configuration-driven (YAML) monitoring. — [UptimeRobot comparison (competitor)](https://uptimerobot.com/knowledge-hub/?p=1505)
- Whether to self-host Uptime Kuma or pay for monitoring in 2026 is discussed by [StackFreeks](https://stackfreeks.com/self-host-uptime-kuma-worth-it/) (content not retrieved).

### Inferences
- The monitor must not share a failure domain with the things it watches. Uptime Kuma should not run on Coolify on the same Vultr/DO VPS that hosts client sites. Put it on a different provider and region, for example a $4-6 Hetzner/OVH/Oracle free-tier VM, or another Vultr region at minimum. Also add an external check on Kuma itself, such as a Healthchecks.io heartbeat or a free UptimeRobot monitor on the Kuma URL.
- Hidden costs of self-hosting: patching (security fixes happen, e.g. the SSTI fix in 2.2.1), backups, a single vantage point (false positives from one network path), and no SLA reporting. Uptime Kuma status pages support custom domains, but it has no multi-tenant client logins.
- Upptime's 5-minute minimum interval and dependence on GitHub Actions make it a backup or secondary option, not primary agency monitoring.

### Gaps
- Gatus features and LatAm options were not researched in depth. Gatus's hosted offering (if any) and pricing were not found.
- The latest Uptime Kuma version as of October 2026 is unconfirmed.

## Agency features: multi-client orgs, white-label status pages, reports, per-monitor pricing at 50-100

### Takeaway
Explicit multi-client or MSP structures exist in Site24x7 MSP (9 customer accounts included) and HetrixTools (white-label on the Business tier). Oh Dear is priced per site for agencies, and UptimeRobot Team offers up to 100 white-label status pages. Better Stack charges per responder and per white-label page, which scales poorly for agencies.

### Cited Findings
- Site24x7 MSP: $45-49/mo for 50 monitors and 9 customer accounts. — [Site24x7 MSP pricing](https://site24x7.ca/msp/pricing.html)
- HetrixTools: partial white-labelling on Professional ($9.95), full on Business ($19.95). — [Gappsy](https://gappsy.com/tools/hetrixtools/)
- UptimeRobot Team: up to 100 status pages with custom domain, white-label and password protection. — [UptimeRobot Help](https://help.uptimerobot.com/en/articles/11361341-uptimerobot-status-page-feature-what-it-is-how-it-works)
- Oh Dear: status page and custom domain on every plan; 50 sites $165, 100 sites $275. — [ohdear.app/pricing](https://ohdear.app/pricing); [Oh Dear vs Statuspage](https://ohdear.app/oh-dear-vs-statuspage)
- Better Stack white-label page: about $208/mo annual per page. 20 clients with a status page each come to about $335/mo. — [hyperping](https://hyperping.com/blog/betterstack-pricing); [projecthelena](https://projecthelena.com/blog/uptime-monitoring-cost-per-client-2026/)

### Inferences
- Per-monitor cost at 100 monitors, approximately: StatusCake Superior $0.20-0.25; UptimeRobot Team $0.33-0.45; Better Stack (1 seat) about $0.71; Pingdom $1.49; Oh Dear $2.75 per site, but bundled multi-check.

### Gaps
- Monthly uptime and SLA PDF reports emailed to clients were not confirmed in snippets for any vendor. Verify UptimeRobot, StatusCake, HetrixTools and Oh Dear report features directly.

## WordPress-specific: ManageWP, MainWP, WP Umbrella uptime

### Takeaway
WP Umbrella includes uptime monitoring at about $1.99/site/mo, which is the simplest bundle. ManageWP sells uptime as a paid per-site add-on. MainWP has no built-in uptime monitoring and needs an extension or a third-party tool. These are useful for WordPress-only client care plans, but they don't cover Vercel/Cloudflare/Node APIs.

### Cited Findings
- WP Umbrella: €1.99 (also cited as $1.99) per site per month, with uptime and performance monitoring included. — [G2 / WP Umbrella pages](https://www.g2.com/compare/blogvault-vs-wp-umbrella-vs-managewp); [WP Umbrella vs ManageWP (vendor)](https://wp-umbrella.com/alternatives/managewp/)
- ManageWP: the core is free, and premium add-ons start at $1 per feature per site (uptime monitor is a premium add-on). The full suite is about $12/site/mo, per competitor WP Umbrella. — [G2 ManageWP pricing](https://www.g2.com/products/managewp/pricing); [WP Umbrella (competitor)](https://wp-umbrella.com/alternatives/managewp/)
- MainWP: the plugin is free, and Pro ($199/yr per competitor's claim) adds 32+ extensions. Uptime requires third-party integrations. — [G2 MainWP](https://www.g2.com/products/mainwp/pricing); [WP Umbrella alternatives](https://wp-umbrella.com/alternatives)

### Inferences
- If the agency already uses one of these for WordPress updates and backups, its uptime feature can serve as a secondary check. A single cross-stack monitor (UptimeRobot, Better Stack or Oh Dear) should remain the source of truth, because many client sites are on Cloudflare Pages or Vercel and APIs run on Coolify.

### Gaps
- ManageWP uptime add-on check interval and the current exact price were not confirmed.

## Recommended setup and cost estimates (50 and 100 monitors)

### Takeaway
The best-value stack is UptimeRobot Team (or StatusCake/HetrixTools if budget-critical), plus Healthchecks.io for cron/heartbeats, plus optionally Uptime Kuma as a secondary monitor on a separate cloud. That comes to about $35-60/mo for 50 or 100 monitors. Choose Better Stack ($50-71/mo plus seats) if you need on-call and phone/SMS escalation. Choose Oh Dear ($165 or $275) if you want per-site agency bundles that include broken links, SSL and domain checks.

### Cited Findings (price inputs; see sections above for sources)
- UptimeRobot Team: $33-38/mo annual ($45 monthly) for 100 monitors at 60s, 3 seats, up to 100 white-label status pages. — [uptimerobot.com/pricing](https://uptimerobot.com/pricing.md); [notifier.so](https://notifier.so/guides/uptimerobot-pricing-2026/)
- Better Stack: $29 per responder plus $21 per 50 monitors beyond 10, plus $17 per 10 heartbeats. — [Uptimia](https://www.uptimia.com/comparisons/uptimia-vs-betterstack)
- StatusCake Superior: about $20-25/mo for 100 monitors. — [toolradar](https://toolradar.com/tools/statuscake/pricing)
- Oh Dear: $165 for 50 sites, $275 for 100. — [ohdear.app/pricing](https://ohdear.app/pricing)
- Pingdom: $78 for 50 checks, $149 for 100. — [hyperping](https://hyperping.com/blog/pingdom-pricing)
- Healthchecks.io: free for 20 jobs, $20 for 100. — [Cronping](https://cronping.com/blog/cronping-vs-healthchecks-vs-cronitor)
- Site24x7 MSP: $45-49 for 50 monitors; +50 monitors for $50. — [Site24x7 MSP](https://site24x7.ca/msp/pricing.html)

### Inferences (calculated estimates, USD/month, annual billing where available)
| Option | 50 monitors | 100 monitors | Notes |
|---|---|---|---|
| UptimeRobot Team | ~$33-38 | ~$33-38 | Same plan covers both; white-label status pages included |
| StatusCake Superior | ~$20-25 | ~$20-25 | Cheapest at 1 min; 2 seats |
| HetrixTools Business | ~$20 | ~$20 (verify limits) | Full white-label, blacklist checks |
| Better Stack, 1 responder | $29 + $21 = ~$50 (60 monitors) | $29 + 2×$21 = ~$71 (110) | +$29 per extra on-call seat; +$12 per extra status page; white-label $208 per page |
| Better Stack, 3 responders | ~$108 | ~$129 | On-call rotation for the team |
| Oh Dear | $165 (50 sites) | $275 (100 sites) | Per site, multi-check bundle, status pages included |
| Site24x7 MSP | ~$45-49 | ~$95-99 | Multi-customer accounts |
| Pingdom | $78 | $149 | Poor value |
| Uptime Kuma (self-hosted) | ~$5-6 VPS | ~$5-6 VPS | Plus your maintenance time; single location |
| + Healthchecks.io (cron) | $0 (≤20 jobs) | $20 (≤100 jobs) | Add-on for backups/cron/WP-cron/Coolify jobs |

- Suggested stack at 50 monitors: UptimeRobot Team (about $35) plus Healthchecks.io free, plus Uptime Kuma on a separate-provider $5 VPS as a secondary internal check with Telegram/WhatsApp (Evolution API) alerts. About $40/mo total.
- Suggested stack at 100 monitors: same as above, with Healthchecks.io Business ($20). About $60/mo. If paid on-call and phone escalation are required, replace UptimeRobot with Better Stack (about $71 for 1 seat, $129 for 3). If client-facing per-site reporting and broken-link/SSL checks are part of a care-plan product, use Oh Dear ($275), which can be resold at about $5-10/site.

### Gaps
- All estimates exclude SMS/voice credits and taxes. Verify pricing on vendor pages, because direct fetches were blocked in this session.
