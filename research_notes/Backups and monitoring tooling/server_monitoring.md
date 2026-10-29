# Server / Infrastructure Monitoring Tools for a Small Agency (2-10 Linux VPSs)

Research date: 2026-10-29. Scope covers host-level metrics, logs, alerts and host security. APM, error tracking and uptime checks are out of scope and mentioned only where tools overlap.

**Method and access caveats:** Many vendor sites could not be fetched from this research environment because their DNS was blocked: netdata.cloud, grafana.com, betterstack.com, docs.digitalocean.com and dev.to. Only datadoghq.com/pricing/list was fetched directly. All other pricing comes from search-result summaries, which mostly draw on third-party 2026 pricing blogs (CubeAPM, CostBench, Motadata, Capterra and others). Treat every price below as "verify on the vendor page before purchase". Each conflict found between sources is flagged where it appears.

## Self-hosted options (Netdata, Prometheus stack, Zabbix, Checkmk, Beszel, Glances)

### Takeaway
For 2-10 small VPSs, Beszel is the lightest self-hosted option, with an agent of about 10-15 MB, Docker stats built in, and alerts to Telegram, Slack and email. Netdata gives the richest per-second view, but it uses more RAM, its dashboard is not open source, and the free plan has a 5-node limit for commercial use. Prometheus + Grafana is the most flexible but the heaviest choice and takes the most DevOps time. Zabbix and Checkmk suit larger or classic IT estates.

### Cited Findings
**Beszel**
- A 2026 guide recommends Beszel for 1-20 servers. It puts the agent at about 10-15 MB, against 100-350 MB for Netdata and 500 MB-1 GB+ for a Grafana + Prometheus stack. Per-container Docker stats are built in. — [pistack.xyz Beszel guide (May 2026)](https://www.pistack.xyz/posts/2026-05-02-beszel-lightweight-self-hosted-server-monitoring-guide/); [Instapods Beszel vs Prometheus](https://instapods.com/apps/beszel/vs/prometheus/) (note: Instapods sells hosted Beszel, so it is not neutral)
- The Beszel hub also runs in roughly 12-30 MB, depending on the source. — [Instapods best server monitoring tools](https://instapods.com/blog/best-server-monitoring-tools/); [DEV: 7 tools on a $3 VPS (2026)](https://dev.to/vikasprogrammer/i-tested-7-self-hosted-monitoring-tools-on-a-3-vps-in-2026-heres-the-one-i-kept-aoa)
- Beszel defines notifications as Shoutrrr URLs. Its docs give URL formats for Telegram and Slack, and Shoutrrr also supports email. Beszel uses a maintained fork, nicholas-fedor/shoutrrr. — [Beszel notifications docs](https://www.beszel.dev/guide/notifications); [Shoutrrr services](https://deepwiki.com/nicholas-fedor/shoutrrr/1.2-supported-services)
- Several guides suggest pairing Beszel with Uptime Kuma for availability checks, and with Loki or similar for logs. Beszel has no log management. — [Big Iron comparison](https://www.bigiron.cc/guides/beszel-vs-netdata-vs-prometheus-grafana-for-homelab-metrics); [denshub self-hosted monitoring](https://denshub.com/en/self-hosted-monitoring/)

**Netdata (Agent and Cloud)**
- The Netdata Agent is GPLv3+ and "free forever on any number of nodes". The dashboard UI, however, is licensed under the proprietary NCUL1 (Netdata Cloud UI License). — [Netdata open source page](https://www.netdata.cloud/open-source/); [isitreallyfoss: Netdata](https://isitreallyfoss.com/projects/netdata/)
- The free Community plan is for personal, non-commercial use, with up to 5 active connected nodes. — [Netdata access control docs](https://learn.netdata.cloud/docs/security-and-privacy-design/access-control-and-feature-availability); [Netdata pricing (via search)](https://www.netdata.cloud/pricing/)
- **Conflict on the local dashboard:** Netdata's docs say the local Agent dashboard's multi-node views follow the streaming configuration. A GitHub docs PR (#24327) says the 5-node limit also applies locally, falling back to 5 if Netdata Cloud can't be reached. Community threads report users surprised by the "local dashboard is limited to 5 nodes" behaviour. It is unresolved which behaviour ships in the current release. — [Netdata docs](https://learn.netdata.cloud/docs/security-and-privacy-design/access-control-and-feature-availability); [GitHub PR #24327](https://github.com/netdata/netdata/pull/24327); [Netdata forum: agent dashboard changes](https://community.netdata.cloud/t/important-changes-to-the-netdata-agent-dashboard/5693)
- Netdata's docs put the agent at about 100-350 MB of RAM per node, and one comparison says 200-500 MB. It has per-second resolution and built-in ML anomaly detection. — [Instapods Beszel vs others](https://instapods.com/apps/beszel/vs/); [pistack.xyz](https://www.pistack.xyz/posts/2026-05-02-beszel-lightweight-self-hosted-server-monitoring-guide/)

**Prometheus + Node Exporter + Grafana + Alertmanager**
- This stack is the most flexible, with PromQL and custom dashboards. It is also the heaviest, at about 500 MB-1 GB+ across four or more components. Docker metrics need cAdvisor added separately, and setup takes "hours". One review says it suits 50+ targets. — [Instapods Beszel vs Prometheus](https://instapods.com/apps/beszel/vs/prometheus/); [Big Iron](https://www.bigiron.cc/guides/beszel-vs-netdata-vs-prometheus-grafana-for-homelab-metrics)

**Checkmk**
- The Raw edition has been renamed **Checkmk Community**. Internal identifiers such as `raw` are unchanged in 2.3 and 2.4, and package names change in 2.5. Checkmk 2.5 stable was released on 28 April 2026. Checkmk positions Community for small setups and home labs. — [Checkmk werk #19391](https://checkmk.com/werk/19391); [Checkmk blog: new lineup](https://checkmk.com/blog/meet-new-checkmk-lineup); [Checkmk forum](https://forum.checkmk.com/t/new-checkmk-editions-lineup/57743); [Wikipedia: Checkmk](https://en.wikipedia.org/wiki/Checkmk)

**Glances**
- Glances appears in 2026 comparisons as a lightweight live-view tool alongside Beszel and Netdata. — [techfuelhq Beszel vs Netdata vs Glances (2026)](https://techfuelhq.com/homelab/beszel-vs-netdata-vs-glances-2026/)

### Inferences
- Glances is best treated as an ad-hoc "top on steroids" or a metrics exporter, not a fleet alerting system.
- For an agency with little DevOps time, Beszel gives about 80% of the value of the Prometheus stack for about 5% of the effort. The hub can run on an existing small VPS or a $5-6 droplet. Use it for Docker/Coolify container stats plus threshold alerts on CPU, RAM, disk, temperature and bandwidth, sent to Telegram or Slack.
- Netdata's free tier is not a clean fit for a commercial agency: it is non-commercial, capped at 5 nodes, and has the dashboard licence uncertainty. In practice it means paying for Business (see SaaS section).
- Zabbix and Checkmk Community are mature, free and support SNMP and agent-based checks. However, they need a dedicated server (with a DB for Zabbix) and much more configuration. For a WordPress/Docker agency they are probably overkill, unless someone on the team already knows them.

### Gaps
- No 2026 source was found on Zabbix 7.x resource requirements for small deployments, or on its Telegram/Slack media types. Training knowledge says both are supported natively, but this is unverified here.
- The Alertmanager Telegram receiver was not verified in this session. It is native in Alertmanager since v0.24 (training knowledge, unverified).
- No vendor-neutral, methodologically sound RAM benchmarks were found. The figures above are self-reported by blogs, some of them vendor-affiliated.
- Glances features and alerting capabilities were not researched in depth.

## SaaS options (Grafana Cloud, Datadog, New Relic, Better Stack, Site24x7, Netdata Cloud, Dynatrace, provider-native, Coolify)

### Takeaway
Grafana Cloud Free (10k series, 50 GB logs, 14-day retention) and New Relic Free (100 GB/month, 1 full user) can cover 2-10 VPSs at $0. Netdata Business costs about $4.50-6 per node per month. Datadog costs $15-18 per host per month for Infrastructure Pro before logs, which is hard to justify at this scale. DigitalOcean's free Monitoring gives basic alerts to email and Slack.

### Cited Findings
**Grafana Cloud**
- Free tier: $0, with 10,000 metrics series, 50 GB logs, 50 GB traces, 50 GB profiles, 3 users and 14-day retention. No credit card is required. — [CloudZero Grafana Cloud pricing 2026](https://www.cloudzero.com/blog/grafana-cloud-pricing/); [CubeAPM Grafana Cloud review 2026](https://cubeapm.com/blog/grafana-cloud-pricing-and-review/); [freetier.co](https://freetier.co/directory/products/grafana-cloud)
- Pro: $19/month base plus usage. Metrics cost about $6.50 per 1k active series, falling to $5.50 at 200k+. Logs cost about $0.50-0.55/GB, which one source breaks down as $0.05 process + $0.40 write + $0.10 retain. Enterprise starts at a $25k/year commitment. Sources were last checked between Aug and Sep 2026. — [CostBench Grafana](https://costbench.com/software/developer-tools/grafana/); [modern-datatools Grafana Cloud](https://www.modern-datatools.com/tools/grafana-cloud/pricing); [CubeAPM](https://cubeapm.com/blog/grafana-cloud-pricing-and-review/)

**Datadog (fetched from the official page)**
- Infrastructure Pro costs $15/host/month billed annually, or $18 month-to-month or on-demand. Enterprise costs $23 annually or $27 on-demand. Infrastructure Basic is now "Contact Sales", and the list page shows no free tier. — [Datadog pricing list](https://www.datadoghq.com/pricing/list/)
- Logs cost $0.10/GB to ingest, plus indexing per 1M events: $1.06 for 3-day retention, $1.70 for 15-day and $2.50 for 30-day (annual billing). Flex Logs storage costs $0.05 per 1M events per month. — [Datadog pricing list](https://www.datadoghq.com/pricing/list/)

**New Relic**
- Free tier: 100 GB of ingest per month, 1 full platform user and unlimited basic users. It does not expire and needs no card. There are no per-host charges. The cap is hard: going over pauses ingest until you upgrade or the month resets. Retention is at least 8 days. The pricing page was last updated on 20 Aug 2026. — [New Relic pricing](https://newrelic.com/info/pricing); [New Relic: what is included in free tier](https://newrelic.com/info/blog/solution-recommendation/what-is-included-in-the-new-relic-free-tier)
- Overage costs $0.40/GB, or $0.60/GB for Data Plus. Core users cost $49 each. Full platform users on Pro cost $349 per user per month billed annually. **Conflict:** SigNoz's guide lists a $10 Standard first user, a figure the other sources don't confirm. — [SigNoz New Relic pricing guide](https://signoz.io/guides/new-relic-pricing/); [New Relic blog](https://newrelic.com/info/blog/solution-recommendation/new-relic-pricing-explained-what-you-actually-pay-per-gb-of-data-ingest)

**Better Stack (Telemetry)**
- Free tier: 3 GB of logs with 3-day retention, plus 30 GB of metrics. **Conflict:** one older page lists 1 GB of logs. — [agentdeals.dev Better Stack logs](https://agentdeals.dev/vendor/better-stack-logs); [Hyperping Better Stack pricing 2026](https://hyperping.com/blog/betterstack-pricing); [CubeAPM Better Stack review](https://cubeapm.com/blog/betterstack-pricing-review/)
- Paid pay-as-you-go costs about $0.10-0.35/GB to ingest, depending on region, with retention billed separately. One source gives $0.15/GB ingest and $0.08/GB/month retention. Bundle prices conflict between sources: one gives Nano $25, Micro $100, Mega $210 and Tera $420 per month (annual), and another gives Micro at $150/month. Better Stack also bundles uptime monitoring and on-call, which overlaps another researcher's scope. — [Hyperping](https://hyperping.com/blog/betterstack-pricing); [nurbak](https://nurbak.com/en/blog/betterstack-pricing/); [modern-datatools](https://www.modern-datatools.com/tools/better-stack/pricing)

**Netdata Cloud**
- Business costs $4.50/node/month billed annually, or about $6 monthly. Billing is based on p90 peak concurrent nodes. Homelab costs $90/year for unlimited nodes, non-commercial use only. Enterprise On-Prem starts at 200 nodes. **Conflict:** Makerstack lists Business at $12/node and Homelab at $4.50/node; this looks like an outlier. — [monitoringcost.com Netdata](https://monitoringcost.com/netdata-pricing); [CubeAPM Netdata pricing 2026](https://cubeapm.com/blog/netdata-pricing-review/); [Makerstack review](https://makerstack.co/reviews/netdata-review/)

**Site24x7**
- Professional costs $42/month billed annually or $49 monthly, including 5 servers and 20 websites. **Conflict:** Capterra gives $39 for 10 monitors, and Toolradar gives $35. Enterprise is reported anywhere from $225 to $690/month. — [Motadata Site24x7 pricing](https://motadata.com/blog/site24x7-pricing); [CubeAPM Site24x7 review](https://cubeapm.com/blog/site24x7-pricing-review/); [Capterra](https://www.capterra.com/p/168192/Site24x7/pricing/)

**DigitalOcean Monitoring (provider-native)**
- Free, opt-in metrics agent that powers graphs and alert policies. Alerts can be set up in the control panel or through the API, and are sent by email or Slack. **Conflict on retention:** one guide says 14 days, another says 30 days. — [DigitalOcean Monitoring pricing doc (via search)](https://docs.digitalocean.com/products/monitoring/details/pricing/); [DO Monitoring product page](https://www.digitalocean.com/products/monitoring); [cloudpicked DO alerts guide 2026](https://cloudpicked.com/digitalocean-monitoring-alerts-en.html); [Zaira Labs](https://zairalabs.ai/guide/tools/digitalocean-monitoring/)

**Coolify built-in (Sentinel)**
- Coolify's Sentinel agent shows server CPU, memory, disk and network in the dashboard. Built-in notifications cover deployments, backups, scheduled-task failures and server reachability. A 2026 review says v4.4.0 adds traffic analytics from proxy JSON access logs. A third-party guide says Sentinel gives "baseline visibility" but not complex alert rules or external uptime checks. — [LumaDock Coolify monitoring](https://lumadock.com/tutorials/coolify-monitoring); [temps.sh Coolify review 2026](https://temps.sh/blog/coolify-review-2026); [Coolify changelog](https://coolify.io/changelog)

### Inferences
- **$0 SaaS path:** Grafana Cloud Free with Grafana Alloy plus the node/unix exporter on each VPS. 10 hosts × about 500-1,500 series each (node exporter, plus mysqld/postgres exporters) fits within 10k series if the metrics are pruned. That estimate is an inference: node exporter's default series count varies and was not verified.
- **New Relic Free** also covers infrastructure for ten hosts at $0. However, its single full user and hard cap make it fragile for a team, and it leans toward APM.
- **Datadog:** 10 hosts × $15 = $150/month minimum before logs. Poor value for this profile.
- **Dynatrace:** no pricing was gathered (see Gaps). It is enterprise-oriented and likely overkill, consistent with the brief's expectation.
- **Site24x7 Pro:** at about $42-49/month for 5 servers, it is a mid-priced all-in-one. It is useful mainly if the team wants a single vendor for both server and uptime monitoring.
- **Netdata Business:** 10 nodes × $4.50 = $45/month annually, or about $60 monthly. This is the cheapest polished commercial option with per-second metrics.
- **DigitalOcean Monitoring** should be enabled on every droplet regardless, since it is free and costs nothing to run. It is only a backstop, though: it covers DO droplets only, offers basic thresholds, and has no Telegram or WhatsApp alerts.

### Gaps
- Vultr's native instance monitoring and alerting: no search result covered it. Only CDN monitoring docs came up. Training knowledge suggests Vultr shows basic graphs (bandwidth, CPU, disk) without rich alert policies; this is unverified.
- Dynatrace pricing (per-host full-stack/infra-only rates) was not researched within the tool-call budget.
- Telegram and WhatsApp support in the SaaS tools was not verified individually. Grafana Cloud contact points and Better Stack are commonly reported to support Telegram, and WhatsApp generally requires Twilio or a webhook bridge. Both points are unverified here.
- Grafana Cloud's free-tier alerting limits were not confirmed because grafana.com was blocked.

## Log management (Loki, Better Stack Logs, Axiom, Papertrail, OpenObserve, SigNoz) and retention costs

### Takeaway
At agency volumes of a few GB to tens of GB per month, logs can be free. Axiom's free Personal plan gives 500 GB/month ingest and 30-day retention, and Grafana Cloud Free gives 50 GB with 14-day retention. Self-hosted Loki (with Alloy, since Promtail is EOL) is cheap on RAM but needs care with retention and auth.

### Cited Findings
- **Axiom:** The free Personal plan includes 500 GB/month of data loading, 10 GB-hours of query compute, 25 GB of storage and 30-day retention, with no card required. The Cloud plan costs $25/month and includes 1 TB of loading, 100 GB-hours of query compute and 100 GB of storage, with overage from $0.12/GB. **Conflict:** one older source cites a "Team $25 + $2/GB" plan, which looks outdated. — [outmano Axiom pricing 2026](https://outmano.com/tools/axiom/pricing); [whichdevtool Axiom](https://whichdevtool.com/tools/axiom/); [SigNoz Axiom alternatives](https://signoz.io/comparisons/axiom-alternatives/)
- **SigNoz Cloud** (official page): starts at $49/month, which includes $49 of usage. Logs and traces cost $0.30/GB ingested with 15-day retention. There is a trial but no permanent free tier. Self-hosting is open source. — [SigNoz pricing](https://signoz.io/pricing/)
- **OpenObserve Cloud:** a 14-day trial. Ingest costs $0.50/GB and query volume $0.01/GB, with 30-day retention included. **Conflict:** another source cites $0.30/GB with unlimited retention. Self-hosting is free under AGPL-3.0. — [CubeAPM OpenObserve review 2026](https://cubeapm.com/blog/openobserve-pricing-review/); [Dash0 OpenObserve alternatives](https://www.dash0.com/comparisons/best-openobserve-alternatives)
- **Papertrail** (SolarWinds): aggregator listings put the entry price at about $7/month flat, with a free trial. These are not official SolarWinds figures. — [Capterra Papertrail](https://capterra.com/p/180057/Papertrail/); [Software Advice](https://www.softwareadvice.com/product/144190-Papertrail/)
- **Better Stack Logs:** 3 GB free with 3-day retention, then about $0.10-0.35/GB ingest plus retention (details in the SaaS section above). — [Hyperping](https://hyperping.com/blog/betterstack-pricing)
- **Grafana Cloud Logs (Loki):** 50 GB free with 14-day retention, then about $0.50-0.55/GB on Pro. — [CubeAPM](https://cubeapm.com/blog/grafana-cloud-pricing-and-review/)
- **Datadog Logs:** $0.10/GB ingest plus $1.06-2.50 per 1M indexed events, depending on retention. — [Datadog pricing list](https://www.datadoghq.com/pricing/list/)
- **Self-hosted Loki:** Promtail reached end of life on 2 March 2026. Grafana Alloy replaces it and includes a config-conversion tool. One June 2026 article says the current release line is Loki 3.7.x. — [Grafana Promtail docs](https://grafana.com/docs/loki/latest/send-data/promtail/); [Elestio: Promtail is dead](https://blog.elest.io/promtail-is-dead-how-to-migrate-your-log-pipeline-to-grafana-alloy-before-it-breaks/)
- A single-VPS Loki stack is estimated at about 200-400 MB of RAM; this is a single unverified blog figure. Retention is set in the compactor with `retention_enabled: true` and a `retention_period` such as 720h, using TSDB schema v13 on filesystem storage. Loki with `auth_enabled: false` has no access protection, so put it behind a VPN, a private network or an authenticating proxy. — [virtua.cloud Loki on a VPS](https://www.virtua.cloud/learn/en/tutorials/grafana-loki-log-pipeline-vps); [computebox.de](https://computebox.de/tutorials/centralized-logging-with-loki-or-the-systemd-journal)

### Inferences
- Rough volume: 10 WordPress/Docker VPSs generating Nginx access and error logs, PHP-FPM, MySQL slow logs, auth.log and Docker logs will probably produce about 5-50 GB/month in total. This is an inference, not measured; high-traffic sites could produce more. On that basis, Axiom Free or Grafana Cloud Free covers it at $0, and Better Stack's 3 GB free tier is likely too small.
- Retention cost is driven by days kept. A 14-30 day window is usually enough for incident forensics. Long-term audit retention is cheaper on object storage, for example Loki with S3-compatible storage such as DO Spaces or Vultr Object Storage at about $5-6/month (training-knowledge prices, unverified).
- Self-hosted SigNoz (ClickHouse-based) and OpenObserve are both heavier to run than Loki. They make more sense if the team also wants traces and APM, which is another researcher's scope.

### Gaps
- No official Papertrail tier table for 2026 was found; SolarWinds may have folded it into SolarWinds Observability. Unverified.
- The official Loki minimum resource requirements were not found.
- No official source confirmed whether the Axiom free tier allows commercial use. The sources describe it as a "Personal" plan, so check the terms.

## Host-level security monitoring (CrowdSec, Wazuh, fail2ban, Lynis)

### Takeaway
For small WordPress/Docker VPSs, CrowdSec, with the Nginx bouncer and WordPress scenarios, is the modern default. fail2ban stays a fine minimal option. Wazuh is a SIEM that needs about 8 GB of RAM for its manager, so it is overkill unless a client contract demands compliance evidence. Lynis is a periodic audit tool, not a monitor.

### Cited Findings
- **fail2ban:** the lightest option at about 20-50 MB of RAM. It runs entirely locally with no external dependencies, and is the usual pick for a single server. — [pistack.xyz fail2ban vs SSHGuard vs CrowdSec 2026](https://www.pistack.xyz/posts/2026-04-24-fail2ban-vs-sshguard-vs-crowdsec-self-hosted-intrusion-prevention-2026/); [itrpoka fail2ban vs CrowdSec 2026](https://itrpoka.com/blog/fail2ban-vs-crowdsec/)
- **CrowdSec:** RAM estimates range from about 50 MB to 100-300 MB. Its community blocklist blocks IPs that attacked other users before they reach your server. It has Nginx and Cloudflare bouncers and WordPress attack detection. One source describes a 1 GB VPS running Nginx plus CrowdSec as comfortable, but says the trade-off changes below 512 MB. — [LumaDock CrowdSec vs fail2ban](https://lumadock.com/tutorials/crowdsec-vs-fail2ban); [VPS.DO CrowdSec](https://vps.do/crowdsec-vps-collaborative-threat-intelligence/); [edywerder.ch](https://edywerder.ch/fail2ban-vs-crowdsec/)
- **Wazuh:** a SIEM with file-integrity monitoring and compliance features (PCI, HIPAA, GDPR). One comparison lists a minimum of about 8 GB of RAM for the manager plus one host. — [OSSAlt Wazuh vs CrowdSec vs Suricata 2026](https://ossalt.com/guides/wazuh-vs-crowdsec-vs-suricata-2026); [DoHost comparison (Mar 2026)](https://dohost.us/index.php/2026/03/05/the-agentic-shift-comparing-fail2ban-with-crowdsec-and-wazuh-in-2026/)
- **Lynis:** no 2026 sources were returned by search.

### Inferences
- **Practical setup:**
  - CrowdSec on each VPS, with the Nginx bouncer or a Cloudflare bouncer if sites sit behind Cloudflare. The free CrowdSec Console can show alerts centrally (feature set unverified here).
  - Alternatively, fail2ban with jails for sshd, nginx and wp-login.
  - Ship auth.log and CrowdSec decisions into the log tool, and alert on spikes.
  - Run Lynis monthly or after changes, by cron, and send the report by email. It is free and open source, but this is training knowledge, unverified here.
- Coolify/Docker caveat: bouncers that act at the host firewall need care with Docker's iptables chains. This is a common community issue but was not verified in this session.

### Gaps
- Lynis was not covered by search results: current version, Lynis Enterprise pricing, and suggested cadence all remain open.
- The features and limits of CrowdSec Console's free versus paid tiers were not researched.
- How fail2ban and CrowdSec alerts route to Slack or Telegram was not verified. Both support custom notification actions or plugins (training knowledge).

## Recommended stack for 2-10 servers and cost estimate

### Takeaway
The cheapest robust stack is:
- **Metrics:** Beszel (self-hosted) or Grafana Cloud Free.
- **Logs:** Axiom Free or Grafana Cloud Free logs.
- **Security:** CrowdSec.
- **Backstop:** DigitalOcean Monitoring.
- **Alerts:** Telegram and Slack.

This costs about $0-6/month. A "paid but polished" option costs about $45-80/month with Netdata Business or Grafana Cloud Pro. Datadog would cost $150+/month for ten hosts and is not recommended.

### Cited Findings
- Beszel is recommended for 1-20 servers. — [pistack.xyz](https://www.pistack.xyz/posts/2026-05-02-beszel-lightweight-self-hosted-server-monitoring-guide/)
- Grafana Cloud Free: 10k series, 50 GB logs, 14-day retention. — [CloudZero](https://www.cloudzero.com/blog/grafana-cloud-pricing/)
- Axiom Free: 500 GB/month ingest with 30-day retention. — [outmano](https://outmano.com/tools/axiom/pricing)
- Netdata Business: $4.50/node/month annual. — [monitoringcost.com](https://monitoringcost.com/netdata-pricing)
- Datadog Infrastructure Pro: $15-18/host/month. — [Datadog](https://www.datadoghq.com/pricing/list/)
- DigitalOcean Monitoring: free, with email and Slack alerts. — [DO Monitoring](https://www.digitalocean.com/products/monitoring)
- Coolify Sentinel gives baseline metrics but not complex alerting. — [LumaDock](https://lumadock.com/tutorials/coolify-monitoring)

### Inferences (cost estimates for 10 VPSs, USD/month, late 2026)
| Option | Metrics + alerts | Logs | Security | Est. monthly |
|---|---|---|---|---|
| A. Lean self-hosted (recommended default) | Beszel hub on an existing VPS (or a $6 droplet) with Shoutrrr alerts to Telegram and Slack; DO Monitoring as backstop | Axiom Free (500 GB, 30 d) or Grafana Cloud Free logs | CrowdSec (free) + monthly Lynis | **$0-6** |
| B. Managed free tier | Grafana Cloud Free with Alloy on each host (node, mysqld and postgres exporters); Grafana alerting | Grafana Cloud Logs (50 GB, 14 d) | CrowdSec | **$0** (move to Pro at $19 + usage if over 10k series) |
| C. Polished paid | Netdata Business (10 × $4.50 annual; about $60 monthly billing) | Axiom Free, or Axiom Cloud at $25 | CrowdSec | **about $45-85** |
| D. All-in-one SaaS | Site24x7 Pro ($42-49 for 5 servers; add-ons for 10) | included or add-on | none | **about $50-100+** (unverified add-on pricing) |
| E. Enterprise (not advised) | Datadog Infra Pro (10 × $15-18) | Datadog Logs ($0.10/GB + indexing) | none | **$150-200+** |

- **Setup effort:**
  - Option A takes about half a day: a one-line agent install per host and a Docker hub that Coolify can deploy.
  - Option B takes about a day, mostly building Alloy configs and pruning series.
  - Option C takes about an hour.
  - A Prometheus/Alertmanager/Loki stack self-hosted from scratch takes several days, plus ongoing maintenance. It makes sense only if someone enjoys running it.
- **WhatsApp alerts:** none of the researched tools showed native WhatsApp support. Telegram is natively supported by Beszel through Shoutrrr. WhatsApp would need a Twilio or webhook bridge (inference).
- **Overlap note:** Better Stack and Site24x7 also bundle uptime checks and on-call. If the uptime researcher picks Better Stack, its 30 GB of free metrics could also absorb host metrics, which would reduce the number of vendors.

### Gaps
- Exact Grafana Cloud free-tier series consumption per host with default Alloy integrations was not measured.
- Site24x7 add-on pricing for servers beyond 5 is unconfirmed.
- Vultr-native alerting is unknown. If most servers are on Vultr, the free DigitalOcean backstop does not apply to them.
