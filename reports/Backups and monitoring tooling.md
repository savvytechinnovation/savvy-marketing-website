# Protect Savvy's stack for under $250 a month

Savvy can cover backups, server management and all three layers of monitoring with mostly free and open-source tools, plus a few small subscriptions. A **lean setup costs about $30–65 per month** and a **standard setup about $170–240 per month**, not counting the VPSs themselves or costs billed through to clients. The core choices are these. Database dumps are encrypted with restic and sent to **Backblaze B2 with Object Lock**, with an off-provider copy of every managed database. **Ploi** runs the WordPress servers, and **Coolify** stays behind Cloudflare Access. **Beszel** (or Netdata Business) watches the servers and **CrowdSec** protects them. **Sentry SDKs** go into every app, with Sentry Team or self-hosted GlitchTip as the backend, plus **New Relic's free tier** for PHP performance. **UptimeRobot Team plus Healthchecks.io** handle uptime and cron checks. Three findings matter most. First, provider-native backups (Neon, Supabase, DigitalOcean) do not protect against account-level loss, so every managed database also needs its own off-provider dump. Second, Coolify had 11 critical CVEs in January 2026 and more through the year, so its dashboard must never be public. Third, several popular "free" tiers (UptimeRobot Free, Netdata Community) do not allow commercial use, so an agency that relies on them is breaking the terms.

> **Important: verify all prices before buying.** During this research, most vendor websites (Supabase, Cloudflare docs, Sentry, Vercel, Better Stack, UptimeRobot, Ploi, SpinupWP, RunCloud, Netdata, Grafana and others) could not be opened directly. **Most prices in this report come from search-result snippets and third-party pricing blogs**, many of them written by competitors. Where sources disagree, the report shows a range. Check every price on the vendor's own pricing page before purchasing or quoting it to a client.

The assumptions behind the estimates are 4–6 VPSs on Vultr/DigitalOcean, about 30–60 client WordPress sites, a handful of Node/Next.js apps, and a 2–5 person team. All prices are in USD per month unless noted.

## Database backups need one copy no one can delete

The goal is the **3-2-1-1-0 rule**: three copies, on two kinds of media, one off-site, one immutable, and **zero errors in verified restore tests** ([Zmanda](https://www.zmanda.com/blog/understanding-the-3-2-1-1-0-backup-rule/); [Veeam](https://www.veeam.com/blog/what-is-3-2-1-backup-rule.html)). Small teams usually fail at the "0". Backup jobs report "OK" while the data is silently corrupt, and nobody finds out until a real restore ([datazone.de](https://datazone.de/en/aktuelles/3-2-1-1-0-backup-formel/)).

**WordPress (MySQL/MariaDB) databases.** For typical WordPress databases of a few MB to a few GB, a nightly `mysqldump --single-transaction` is enough, and the panels already do this. Faster or physical tools such as mydumper and Percona XtraBackup matter mainly for large databases and for point-in-time recovery (PITR). XtraBackup was fastest for combined backup plus restore in Percona's benchmark ([Percona](https://www.percona.com/blog/backup-restore-performance-conclusion-mysqldump-vs-mysql-shell-utilities-vs-mydumper-vs-mysqlpump-vs-xtrabackup/)). A sensible approach is to tier sites by value. Brochure sites get daily dumps, WooCommerce and membership sites get hourly dumps, and only high-value stores get binary-log shipping for minute-level recovery.

**Self-hosted Postgres on Coolify.** Coolify's built-in scheduled `pg_dump` to S3-compatible storage is the baseline. Where losing more than an hour of data matters, add **WAL-G**. It is a single Go binary built for object storage, and it is rated the simplest PITR tool for small cloud-native teams ([kunalganglani.com](https://www.kunalganglani.com/blog/postgresql-backup-tools-compared.md)). pgBackRest is more powerful. It was nearly abandoned in April 2026, then rescued in May by a sponsor group that includes AWS, Supabase and Percona ([pgbackrest.org](https://pgbackrest.org/news.html); [The Register](https://www.theregister.com/databases/2026/05/20/postgresql-backup-tool-gets-some-backup-of-its-own-after-sole-maintainer-sounds-alarm/5242822)). Coolify's Postgres image does not include WAL-G, so you need a custom image. Budget about a day, including a restore drill.

**Managed databases still need your own copy.** Every provider offers native backups, but they are tied to your account. A deleted project, a suspended account, a billing lapse or stolen credentials can remove the backups along with the database.

| Provider | Native protection | Cost of longer recovery window | Off-provider dump needed? |
|---|---|---|---|
| Neon | Restore window: Free 6 h; Launch 1 day by default (7 max); Scale 1 day (30 max) ([Neon docs](https://neon.com/docs/postgres/backup-restore/history-window)) | $0.20/GB-month of history ([Neon pricing](https://neon.com/pricing)) | Yes, nightly |
| Supabase | Daily backups (7 days on Pro); PITR is an add-on | **About $100/mo per 7 days of PITR, per project** ([Supabase pricing](https://supabase.com/pricing.md)) | Yes, nightly; bill PITR to the client only if they need under-24 h recovery |
| DigitalOcean Managed DB | Daily backups and PITR; about 7 days of retention (third-party) ([DO docs](https://docs.digitalocean.com/products/databases)) | Included; sources disagree on which tiers get PITR | Yes; third parties say native backups can't be exported ([SimpleBackups](https://simplebackups.com/blog/backup-digitalocean-managed-databases)) |

A nightly GitHub Action or Coolify scheduled task can run `pg_dump` against each managed database and push the result to your own locked bucket. This is cheap insurance.

**Where backups land.** Encrypt the dumps on the server with **restic** (or Kopia) and send them to object storage with immutability turned on.

| Storage target | Price per TB/month | Immutability | Egress (downloads) | Fit |
|---|---|---|---|---|
| **Backblaze B2** | ~$6.95 | Full S3 Object Lock (governance, compliance, legal hold); no minimum storage period | Free up to 3× what you store | **Primary immutable copy** ([tech-insider](https://tech-insider.org/backblaze-b2-vs-wasabi-vs-s3-2026/)) |
| **Cloudflare R2** | ~$15; 10 GB free | "Bucket locks" (prefix retention rules), not full S3 Object Lock (unverified) | Free | Second provider, fast restores ([Cloudflare](https://cloudflare.com/en-ca/products/r2)) |
| Wasabi | $6.99–7.99 | Object Lock | Free while downloads ≤ stored | 90-day minimum charge ([Wasabi docs](https://docs.wasabi.com/docs/how-does-wasabis-minimum-storage-duration-policy-work)) |
| BorgBase | From $2 (10 GB free) | Append-only repos | — | Good if you prefer Borg ([BorgBase](https://www.borgbase.com/)) |
| S3 Glacier Deep Archive | ~$1 | Object Lock | Retrieval takes 12–48 h | Long-term archive only ([AWS](https://aws.amazon.com/blogs/aws/happy-10th-anniversary-amazon-s3-glacier-a-decade-of-cold-storage-in-the-cloud/)) |

Paid backup orchestrators such as SimpleBackups, Ottomatik and SnapShooter trade money for a dashboard and less scripting. SnapShooter's scope has been shrinking under DigitalOcean ownership ([DO docs](https://docs.digitalocean.com/products/snapshooter/how-to/connect-other-accounts/index.html.md)), and the others did not publish clear prices. WordPress backup plugins such as UpdraftPlus, BlogVault and Jetpack VaultPress are best kept for sites where clients need one-click self-service restores ([fs-code](https://www.fs-code.com/blog/best-wordpress-backup-plugins)). They duplicate what server-level backups already do.

Two rules make the setup safe. First, the backup writer gets a key that can upload but **not delete**, and a separate admin account manages retention. Second, **store the encryption passwords outside the servers**, in the team password manager. If the key is lost, the immutable backups are useless. Finally, automate a weekly restore test: pull the latest dump, load it into a throwaway container, run a few sanity queries, and ping a heartbeat monitor so a missed run also raises an alert. Practitioners stress that "the part that actually saves you is rehearsing the restore" ([StackHarbor](https://stackharbor.com/en/knowledge-base/postgres-wal-g-backup-restore/)).

## Ploi plus a locked-down Coolify beats every free control panel

Bring-your-own-VPS WordPress panels cost about **$10–45 per month** at Savvy's size. Team features are where prices jump.

| Tool | Price (reported) | Servers / sites | Team seats | Notes |
|---|---|---|---|---|
| **Ploi** | Basic €8, Pro €13, **Unlimited €30 (~$36)** | 5 / 10 / unlimited servers; unlimited sites | **Unlimited plan only** | Also handles PHP/Node apps ([Ploi pricing](https://ploi.io/pricing)) |
| SpinupWP | Essentials $12, Advanced $19 (1 server) + ~$8–10 per extra server | Unlimited sites (disputed) | Advanced only, ~$2/user | WordPress only; backups to your own S3 ([FlyWP, competitor](https://flywp.com/blog/20272/flywp-vs-spinupwp/)) |
| RunCloud | $8 / $15 / $45 Business | Business: unlimited servers | Business only | Sources conflict ([Cloudnan, competitor](https://cloudnan.com/blog/runcloud-vs-ploi-vs-cloudways-vs-cloudnan)) |
| Laravel Forge | $12 / $19 / $39 | — | — | General PHP panel ([LaraCopilot](https://laracopilot.com/blog/laravel-forge-pricing-2026/)) |
| GridPane | $30 to $1,500+ | — | White-label only at Agency tier | Too expensive for Savvy ([WPDiscounts](https://wpdiscounts.io/wordpress-hosting/gridpane-coupon/)) |
| Cloudways | From ~$11–14 **including** the VPS | Per server | Yes | Fully managed but costlier per GB of RAM ([Cloudways](https://www.cloudways.com/en/price-plan.php)) |
| cPanel / Plesk | ~$54–77 / ~$30–74 per server | — | — | 8 price rises in a row; only if clients need email hosting ([webhosting.today](https://webhosting.today/2026/10/08/plesk-whmcs-and-cpanel-cost-up-to-20-percent-more-in-2027/)) |

**Avoid the free self-hosted panels on production client servers.** CyberPanel had pre-auth remote-code-execution bugs exploited for ransomware in October 2024, with about 22,000 exposed servers ([Belgium CCB](https://ccb.belgium.be/advisories/warning-critical-vulnerabilities-cyberpanel-are-under-active-exploitation-deliver)). aaPanel has a 9.8-severity unauthenticated RCE ([NVD](https://nvd.nist.gov/vuln/detail/CVE-2026-29859)). HestiaCP had several critical 2026 CVEs, including one that bypasses fail2ban through a fake Cloudflare header ([Sherlock Forensics](https://www.sherlockforensics.com/blog/2026-05-19-cve-2026-43634.html)). A SaaS panel that connects to the server over SSH has a much smaller attack surface.

**Coolify** stays the right tool for Node/Next.js apps and staging. It is free to self-host, or $5/month for a hosted dashboard. Its security record is the main concern. On 8 January 2026 it disclosed **11 critical vulnerabilities, five rated CVSS 10.0**, some allowing root access after login ([Hostzero](https://hostzero.com/articles/is-coolify-safe-2026-cves)). More CVEs followed through the year ([CERT.hr](https://cve.cert.hr/cve/CVE-2026-41899)). In practice, anyone with a Coolify login has root on the server. Keep the dashboard behind Cloudflare Access or Tailscale, never give clients a login, and patch quickly. Dokploy is a reasonable alternative. Its core became Apache-2.0 in January 2026, but white-label and SSO need a paid licence ([Dokploy](https://dokploy.com/blog/we-are-updating-dokploys-open-source-license); [Dokploy docs](https://docs.dokploy.com/docs/core/enterprise/license-keys)).

For bulk WordPress updates and branded client reports, **MainWP Pro ($199/year, unlimited sites)** is the cheapest option at scale. **WP Umbrella** (~€1.99/site/month, includes white-label reports and uptime) needs no upkeep but costs more as the number of sites grows ([Odd Jar](https://oddjar.com/wordpress-site-management-plugins-2026-comparison/); [WP Umbrella](https://wp-umbrella.com/alternatives/mainwp/)). For building servers, **OpenTofu** (the open MPL-2.0 fork of Terraform, which moved to the BSL licence) plus a short cloud-init script can create VPSs, firewalls and Cloudflare DNS the same way every time ([Encore](https://encore.dev/articles/opentofu-vs-terraform-2026)). Adopt it once you have three or more servers.

## Beszel and CrowdSec cover servers at near-zero cost

For 2–10 small VPSs, the self-hosted tools give most of the value of an enterprise suite.

| Tool | Type | Cost for ~5–10 servers | Strengths | Watch-outs |
|---|---|---|---|---|
| **Beszel** | Self-hosted | $0 (+ ~$6 hub VPS if needed) | Tiny agent (~10–15 MB); Docker stats built in; alerts to Telegram/Slack/email ([pistack.xyz](https://www.pistack.xyz/posts/2026-05-02-beszel-lightweight-self-hosted-server-monitoring-guide/); [Beszel docs](https://www.beszel.dev/guide/notifications)) | No logs; basic dashboards |
| **Netdata Business** | SaaS + agent | ~$4.50/node/month annual (~$6 monthly) ([monitoringcost.com](https://monitoringcost.com/netdata-pricing)) | Per-second metrics, anomaly detection, setup in about an hour | Free plan is **non-commercial, 5 nodes** ([Netdata docs](https://learn.netdata.cloud/docs/security-and-privacy-design/access-control-and-feature-availability)); agent uses 100–350 MB RAM |
| Grafana Cloud | SaaS | Free: 10k series, 50 GB logs, 14-day retention; Pro $19 + usage ([CloudZero](https://www.cloudzero.com/blog/grafana-cloud-pricing/)) | Most flexible; metrics, logs and traces in one place | About a day to configure and trim metric series |
| Prometheus + Grafana (self-hosted) | Self-hosted | $0 + several days of setup | Total control | 500 MB–1 GB+ RAM; ongoing upkeep ([Instapods](https://instapods.com/apps/beszel/vs/prometheus/)) |
| DigitalOcean Monitoring | Built in | Free | Basic alerts by email/Slack ([DO](https://www.digitalocean.com/products/monitoring)) | DO droplets only; Vultr's native alerting is unknown |
| Coolify Sentinel | Built in | Free | CPU/RAM/disk graphs; deploy and backup alerts | No complex alert rules ([LumaDock](https://lumadock.com/tutorials/coolify-monitoring)) |
| Datadog | SaaS | $15–18/host before logs ([Datadog](https://www.datadoghq.com/pricing/list/)) | Enterprise-grade | $150+/month for 10 hosts; poor value here |

**Logs** can also be free at agency volumes. **Axiom's free plan includes 500 GB/month of ingest with 30-day retention** ([outmano](https://outmano.com/tools/axiom/pricing)), and Grafana Cloud Free includes 50 GB with 14-day retention. Axiom's free plan is labelled "Personal", so confirm that commercial use is allowed. If you self-host Loki, note that its log shipper Promtail reached end of life in March 2026, so use Grafana Alloy instead ([Grafana docs](https://grafana.com/docs/loki/latest/send-data/promtail/)).

For **host security**, use **CrowdSec** on each VPS. It shares a community blocklist of known attackers and has Nginx, Cloudflare and WordPress-specific rules ([LumaDock](https://lumadock.com/tutorials/crowdsec-vs-fail2ban)). fail2ban is a fine minimal fallback at 20–50 MB of RAM. Wazuh needs about 8 GB of RAM for its manager, which is overkill unless a client contract requires compliance evidence ([OSSAlt](https://ossalt.com/guides/wazuh-vs-crowdsec-vs-suricata-2026)). Be careful with firewall bouncers on Docker hosts, because Docker manages its own firewall rules.

## One error SDK everywhere keeps app monitoring portable

The key decision is to **use Sentry SDKs in every project**: WordPress (via the Sentry for WordPress plugin), Next.js, Node and React Native. GlitchTip and Better Stack both accept data from Sentry SDKs, so switching backends later only means changing a DSN ([SSOJet](https://ssojet.com/blog/best-sentry-alternatives-error-tracking); [Better Stack](https://betterstack.com/community/comparisons/better-stack-vs-sentry/)). This removes most of the lock-in risk.

| Need | Tool | Price (reported) | Notes |
|---|---|---|---|
| Error tracking | **Sentry Team** | $26/mo annual; ~50k errors ([Last9](https://last9.io/blog/sentry-pricing/)) | Widest SDK support; EU region on every plan ([Sentry docs](https://docs.sentry.io/organization/data-storage-location/)) |
| Error tracking | **GlitchTip** | Free self-hosted (~1 GB RAM) or $15/mo for 100k events ([GlitchTip](https://www.glitchtip.com/pricing)) | Uses Sentry SDKs; fewer features |
| Error tracking | Better Stack | Free tier 100k exceptions; $0.00005 per exception after that ([Better Stack](https://betterstack.com/community/comparisons/honeybadger-alternative/)) | Vendor-reported figures |
| Error tracking | Bugsnag, Rollbar, Honeybadger | Free tiers 5k–7.5k events; paid ~$15–33 ([Koji](https://www.koji.so/blog/bugsnag-alternatives-2026); [CostBench](https://costbench.com/software/error-tracking/rollbar/free-plan/)) | Free tiers too small for 20–50 projects |
| Error tracking | Highlight.io | **Discontinued** 28 Feb 2026 ([Highlight](https://www.highlight.io/blog/launchdarkly-migration)) | Do not adopt |
| PHP/WordPress performance (APM) | **New Relic Free** | $0: 100 GB/mo, 1 full user, no per-host fee ([New Relic](https://newrelic.com/info/pricing)) | Native PHP agent; hard cap pauses data when exceeded |
| PHP APM (specialist) | Tideways Flex | From €69/mo, unlimited apps ([Tideways](https://tideways.com/profiler/blog/use-tideways-for-applications-of-all-sizes-with-the-new-flex-plan)) | For busy WooCommerce stores; bill to client |
| Full APM | Datadog APM | ~$31–40/host ([SigNoz](https://signoz.io/blog/datadog-pricing/)) | Overkill |
| Core Web Vitals | **Cloudflare Web Analytics** | Free, cookieless, LCP/INP/CLS from every page view ([Cloudflare docs](https://developers.cloudflare.com/web-analytics/llms-full.txt)) | Good default for WordPress sites |
| Core Web Vitals (Next.js) | **Vercel Speed Insights / Observability Plus** | Free base tier reported; Observability Plus included on Pro teams since April 2026 ([Vercel docs](https://vercel.com/docs/observability/limits-and-pricing); [PricingSaaS](https://pricingsaas.com/news/article/vercel-splits-speed-insights-into-free-and-paid-plus-events-tiers)) | Details unconfirmed |
| Session replay | **PostHog** | 5,000 free recordings/mo; EU cloud ([PostHog](https://posthog.com/pricing)) | Best all-rounder |
| Session replay | Microsoft Clarity | Free | Needs cookie consent for EU/UK visitors since Oct 2025 ([Microsoft Learn](https://learn.microsoft.com/en-us/clarity/setup-and-installation/consent-management)) |
| Mobile crashes | Firebase Crashlytics | Free ([Drizz](https://www.drizz.dev/post/best-mobile-error-tracking-tools)) | Pair with Sentry for React Native JS errors |

Two practical rules apply. First, Sentry's quota is shared across the whole organization, so one noisy client app can use up everyone's allowance. Set per-project rate limits and filters for bots and browser extensions. Second, Sentry's data region is fixed when the organization is created. If you have EU clients, either put everyone in the EU organization or pay for a second one (+$26). Replays on checkout pages need input masking, and the client contract needs a data processing agreement that names Savvy.

## Uptime checks must run from outside your own servers

For 50–100 monitors, the value options sit between $20 and $40 a month. Freshping shut down on 6 March 2026 ([notifier.so](https://notifier.so/guides/freshping-shutdown/)), and **UptimeRobot's free plan has been personal/non-commercial use only since late 2024** ([DEV Community](https://dev.to/velprove/uptimerobot-commercial-use-free-alternatives-for-business-sites-in-2026-5d75)).

| Tool | 50 monitors | 100 monitors | Client status pages | Best for |
|---|---|---|---|---|
| **UptimeRobot Team** | ~$33–38 | ~$33–38 (45 billed monthly) | Up to 100, custom domain, white-label ([UptimeRobot Help](https://help.uptimerobot.com/en/articles/11361341-uptimerobot-status-page-feature-what-it-is-how-it-works)) | **Best overall value**; Telegram/Slack ([UptimeRobot](https://uptimerobot.com/pricing.md)) |
| UptimeRobot Solo | ~$9–10 (up to 50) | — | Limited | Lean start |
| StatusCake Superior | ~$20–25 | ~$20–25 | Yes | Cheapest per monitor; 2 seats ([toolradar](https://toolradar.com/tools/statuscake/pricing)) |
| HetrixTools | $9.95–19.95 | $19.95 (verify limits) | White-label on Business | Adds email blacklist checks; 15 monitors free ([Gappsy](https://gappsy.com/tools/hetrixtools/)) |
| Better Stack | ~$50 (1 seat) | ~$71 (1 seat); ~$129 (3 seats) | ~$12/page; **white-label ~$208/page** | On-call rotas, phone/SMS alerts ([Uptimia](https://www.uptimia.com/comparisons/uptimia-vs-betterstack); [hyperping](https://hyperping.com/blog/betterstack-pricing)) |
| Oh Dear | $165 (50 sites) | $275 (100 sites) | Included on every plan | Per-site bundle: uptime, SSL, broken links, cron, Lighthouse ([Oh Dear](https://ohdear.app/pricing)) |
| Site24x7 MSP | ~$45–49 | ~$95–99 | Includes 9 customer accounts | Multi-client accounts ([Site24x7](https://site24x7.ca/msp/pricing.html)) |
| Pingdom | $78 | $149 | Extra cost | Poor value ([hyperping](https://hyperping.com/blog/pingdom-pricing)) |
| **Uptime Kuma** (self-hosted) | ~$5 VPS | ~$5 VPS | Yes, custom domain | Free second opinion; checks from one location only ([heise](https://www.heise.de/en/news/Uptime-Kuma-2-0-Monitoring-tool-now-with-MariaDB-support-10793657.html?view=print)) |
| **Healthchecks.io** (cron/heartbeat) | Free (20 jobs) | $20 (100 jobs) | — | Backup jobs, WP-cron, Coolify tasks ([Cronping](https://cronping.com/blog/cronping-vs-healthchecks-vs-cronitor)) |

A monitor must never share a failure point with what it watches. If Uptime Kuma runs on the same Vultr VPS as client sites, it goes down with them. Put it on a different provider or region, and point an external check at Kuma itself. Two gaps remain unverified. No source confirmed which vendors have **probe locations in Latin America**, and no SaaS vendor confirmed **native WhatsApp alerts**. Uptime Kuma 2.0 added an Evolution API notifier, which appears to be a WhatsApp gateway. Oh Dear is a strong product for a paid "care plan": at $3.30 per site for 50 sites, it can be resold to clients at $5–10 per site.

## Recommended stack and monthly cost

The lean stack suits Savvy now. Move to the standard stack once the team grows or clients pay for monitoring in care plans.

| Category | Lean stack | Lean cost | Standard stack | Standard cost |
|---|---|---|---|---|
| Database backups | Panel/Coolify dumps + restic → B2 Object Lock; nightly `pg_dump` of Neon/Supabase/DO to B2; weekly restore test | ~$2–5 | Same, plus second copy on R2 (or BorgBase) and WAL-G for important Postgres apps | ~$5–15 |
| Server management | Ploi Pro (~$16) or SpinupWP Advanced (~$19–25); Coolify self-hosted behind Cloudflare Access; MainWP free | ~$16–25 | Ploi Unlimited (~$36, team seats) + MainWP Pro ($199/yr ≈ $17); OpenTofu + cloud-init | ~$53 |
| Server monitoring | Beszel + DO Monitoring + Coolify Sentinel; Axiom Free logs; CrowdSec | ~$0–6 | Netdata Business (5–10 nodes) + Axiom Free; CrowdSec | ~$25–60 |
| Application monitoring | Sentry SDKs → GlitchTip (self-hosted or $15); New Relic Free; Cloudflare Web Analytics; Vercel Speed Insights; PostHog/Clarity; Crashlytics | ~$0–15 | Sentry Team + spend cap (~$25); rest the same (+$26 if a separate EU org is needed) | ~$26–51 |
| Uptime monitoring | UptimeRobot Solo or HetrixTools Pro; Healthchecks.io Free; optional Uptime Kuma on another provider | ~$10–15 | UptimeRobot Team + Healthchecks.io Business + Uptime Kuma ($5) | ~$58–63 |
| **Total** | | **~$30–65/month** | | **~$170–240/month** |

These totals exclude the VPSs, Vercel Pro and items billed to clients: Supabase PITR (~$100+ per project), Tideways, DebugBear ($79–125) and Oh Dear care plans.

## Rollout plan: backups first, then visibility

| When | Focus | Main tasks |
|---|---|---|
| **Week 1** | Backups that can't be deleted | Create a B2 bucket with Object Lock (compliance mode, e.g. 30 days) and an upload-only key. Set up restic dumps from each server and nightly dumps of every managed database. Store encryption keys in the password manager. Add a Healthchecks.io ping to every backup job. |
| **Week 2** | Lock down management | Move WordPress servers onto Ploi (or the chosen panel). Put the Coolify dashboard, SSH and panels behind Cloudflare Access. Allow only Cloudflare IPs on ports 80/443. Install CrowdSec on every VPS. Update Coolify to the latest version. |
| **Week 3** | Uptime and server alerts | Set up UptimeRobot (or HetrixTools) checks for every site, API and SSL certificate. Install Beszel agents with Telegram/Slack alerts, and enable DO Monitoring. Run Uptime Kuma on a separate provider as a second check. |
| **Week 4** | Application monitoring | Add Sentry SDKs to all apps and the WordPress plugin to priority sites. Set per-project rate limits. Install New Relic Free on the busiest WordPress server. Turn on Cloudflare Web Analytics and Vercel Speed Insights. |
| **Month 2** | Prove the restores | Run a full restore drill for one WordPress site, one Coolify Postgres app and one managed database, and record the time each takes. Automate the weekly restore test. Add WAL-G or hourly dumps for high-value databases. |
| **Month 3+** | Productize | Decide on the standard tier (Netdata, Sentry Team, UptimeRobot Team). Package uptime, reports and backups into client care plans, billing extras such as PITR and Oh Dear to clients. Adopt OpenTofu when you reach three or more servers. |

## Conclusion

The tools are cheap. The real costs are discipline and blast radius. The most expensive failures for an agency like Savvy are not a missing feature. They are a backup that was never tested, a Coolify dashboard open to the internet, a monitor that dies with the server it watches, or a managed database whose only backups disappear with the account. That is why this plan spends its first weeks on immutability, access control and independent checks, and leaves polished dashboards for later.

The second lesson is to choose open protocols wherever possible: Sentry SDKs, S3-compatible storage, Shoutrrr/webhook alerts and OpenTelemetry. They let Savvy start on free tiers and move up to paid ones without re-instrumenting 50 client projects, and the pricing churn of 2026 (Freshping's shutdown, Highlight's retirement, UptimeRobot's free-tier change, pgBackRest's near-collapse) shows how often that matters. Before buying anything, re-check every price on the vendor's own page, because most figures here came from third-party sources.
