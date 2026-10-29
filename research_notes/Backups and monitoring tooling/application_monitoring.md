# Application Monitoring (APM, Error Tracking, RUM, Session Replay, Web Vitals) for a Small Agency

Research date: 2026-10-29. Method note: WebFetch was blocked for vendor domains in this session (sentry.io and vercel.com returned DNS/allowlist errors), so nearly all figures below come from search-result snippets of vendor pages, vendor docs, and third-party pricing trackers. Where only a third-party source exists, that is flagged. Verify every price on the vendor pricing page before purchase.

## Error tracking / APM: Sentry, Bugsnag, Rollbar, Honeybadger, AppSignal, Highlight.io, GlitchTip, Better Stack

### Takeaway
Sentry remains the default for a mixed PHP/Next.js/Node/React Native stack (widest SDKs, strongest RN source maps, EU region on all plans, $26/mo Team). The main cost-saving alternatives are Sentry-SDK-compatible backends: GlitchTip (free self-host or $15/mo for 100k events) and Better Stack (about $0.00005/exception). Highlight.io no longer exists as a standalone product (folded into LaunchDarkly Observability, Feb 28 2026).

### Cited Findings
**Sentry**
- Team plan $26/mo billed annually (about $29 monthly billing); Business $80/mo annually — [Rollbar blog, Sentry alternatives 2026](https://rollbar.com/blog/sentry-alternatives/); [Last9 Sentry pricing](https://last9.io/blog/sentry-pricing/) (third-party, both have commercial interests)
- Team quota reported as 50K errors, 5M spans, 50 replays, 5GB logs, 1 cron monitor, 1 uptime monitor, 1GB attachments; Business reportedly has the same base volume but higher overage rates for some categories — [Last9](https://last9.io/blog/sentry-pricing/); [CubeAPM Sentry pricing review](https://cubeapm.com/blog/sentry-pricing-review/) (third-party; unverified against sentry.io/pricing)
- Free Developer plan: 5,000 errors/month, 30-day retention, single user — [Drizz mobile error tracking tools](https://www.drizz.dev/post/cheapest-mobile-error-tracking-tools); [Capterra](https://www.capterra.com/p/165426/Sentry/pricing/)
- Overage per error reported inconsistently: ~$0.00029/event ([Drizz](https://www.drizz.dev/post/best-mobile-error-tracking-tools)) vs ~$0.00052 ([Dupple](https://dupple.com/learn/best-error-tracking-software)) vs $0.0003 used by Better Stack ([Better Stack](https://betterstack.com/error-tracking.md)). Conflict unresolved; likely tier-dependent.
- Events over quota and budget are dropped (not accepted) — [Last9](https://last9.io/blog/sentry-pricing/)
- Seer AI debugging is a separate add-on, reported at $40 per active contributor/month — [Last9](https://last9.io/blog/sentry-pricing/) (third-party)
- Sentry has the strongest React Native source-map workflow via sentry-cli — [Drizz](https://www.drizz.dev/post/best-mobile-error-tracking-tools)
- Self-hosted Sentry: errors-only profile ~2 cores/~7GB RAM for containers; feature-complete ~4 cores/~14GB (16GB host minimum per installer comments); ~20GB disk; ClickHouse needs SSE4.2 — [ZimaSpace summary of self-hosted installer](https://shop.zimaspace.com/pages/sentry-self-hosted-hardware-requirements) (hardware vendor page, not Sentry docs; verify in getsentry/self-hosted)
- WordPress: unofficial "Sentry for WordPress" plugin (slug wp-sentry-integration, by stayallive; renamed Sept 2025 after WordPress Foundation trademark claims) reports PHP and browser JS errors; DSNs set via wp-config.php constants; v8.10.0, PHP 7.2+ — [wordpress.org](https://wordpress.org/plugins/wp-sentry-integration/); [Packagist](https://root.packagist.org/packages/stayallive/wp-sentry)

**Bugsnag (SmartBear Insight Hub)**
- Rebranded to SmartBear Insight Hub Jan 2025, but Insight Hub pricing URL 301-redirects back to bugsnag.com/pricing — [Koji Bugsnag alternatives 2026](https://www.koji.so/blog/bugsnag-alternatives-2026)
- Free tier: 7.5K error events + 1M spans/month, 1 user, 7-day retention — [Koji](https://www.koji.so/blog/bugsnag-alternatives-2026); [CubeAPM](https://cubeapm.com/blog/bugsnag-pricing-and-review/)
- Paid: Select ~$20/mo, Preferred ~$33/mo (medium confidence) — [CostBench](https://www.costbench.com/software/error-tracking/bugsnag/); contradicted by [Capterra](https://www.capterra.com/p/265817/Bugsnag) ($65/user/mo, likely stale)

**Rollbar**
- Free, Essentials $15/mo, Advanced $32/mo — [CostBench Rollbar free plan](https://costbench.com/software/error-tracking/rollbar/free-plan/) (single third-party source)

**Honeybadger**
- Developer $0: 5,000 errors/month, 50MB/day logs; Team $26/mo: 50,000 errors, 100MB/day logs, 5 uptime monitors — [Checkthat](https://checkthat.ai/brands/appsignal/alternatives) via search; [CostBench](https://costbench.com/compare/honeybadger-vs-rollbar/) lists "custom" (conflict)

**AppSignal**
- Introduced a free plan (blog updated 21 Oct 2025); paid from ~$23/mo (may be stale). Free-plan limits not found — [AppSignal blog](https://blog.appsignal.com/2024/11/07/the-top-5-honeybadger-alternatives.html)

**Highlight.io**
- Acquired by LaunchDarkly April 2025; standalone services deprecated Feb 28, 2026; customers had to switch SDK snippets to LaunchDarkly Observability before March 1, 2026; new account required, data migration not provided — [Highlight migration post, Nov 13 2025](https://www.highlight.io/blog/launchdarkly-migration); [Bugsink](https://www.bugsink.com/is-highlight-io-shutting-down)
- LaunchDarkly offers a free Developer tier; Foundation plan billed per service connection and per observability unit; OSS repo remains but focus moved to LaunchDarkly — [Highlight migration post](https://www.highlight.io/blog/launchdarkly-migration); [CubeAPM](https://cubeapm.com/blog/highlight-io-pricing-and-review/)

**GlitchTip**
- Hosted: $0 up to 1k events/mo; $15 up to 100k; $50 up to 500k; $250 up to 3M; nonprofit/OSS from $5. Self-hosting always free — [GlitchTip pricing (official)](https://www.glitchtip.com/pricing)
- Uses existing Sentry SDKs; only DSN changes; self-host needs backend, workers, Redis, PostgreSQL, ~1GB RAM — [SSOJet](https://ssojet.com/blog/best-sentry-alternatives-error-tracking); [OpenAlternative](https://openalternative.co/glitchtip)
- Railway template claims ~$5-10/mo for self-hosted stack — [Railway](https://railway.com/deploy/replace-sentry-without-changing-a-line-of-code-glitchtip-on-railway--glitchtip-sentry-alternative) (vendor marketing)

**Better Stack (errors)**
- $0.000050 per exception (= $250 for 5M/mo), no per-seat fees; accepts Sentry SDKs (JS, Python, Go, Ruby, Java, .NET, PHP) by changing the destination — [Better Stack vs Sentry](https://betterstack.com/community/comparisons/better-stack-vs-sentry/); [Better Stack error tracking](https://betterstack.com/error-tracking.md) (vendor-authored)
- Free plan: 100,000 exceptions/mo, 5,000 session replays/mo, 10 monitors, 1 status page — [Better Stack Honeybadger alternatives](https://betterstack.com/community/comparisons/honeybadger-alternative/) (vendor); $29/mo entry per [SSOJet](https://ssojet.com/blog/best-sentry-alternatives-error-tracking)

### Inferences
- Because GlitchTip, Better Stack, and (via Relay/DSN) Sentry share the Sentry SDK protocol, the agency can standardize instrumentation on Sentry SDKs in every project and switch backends later with only a DSN change. This is the most important lock-in mitigation.
- Sentry's model (one organization, many projects, each project with its own DSN, teams, alert rules) maps well to "one project per client app"; quotas are pooled at the org level, so one noisy client can consume the whole quota — set per-project rate limits/spike protection. (Feature knowledge; not verified this session.)
- The 5k-error free tiers (Sentry, Honeybadger) are too small for 20-50 client projects; the Bugsnag free tier is single-user. Free-tier use per client org is possible but fragments management.

### Gaps
- Could not load sentry.io/pricing directly; exact 2026 overage rates, replay add-on pricing, and whether Team limits users are unconfirmed.
- AppSignal free-plan limits and current PHP support status not found (AppSignal historically lacks a PHP agent — unverified).
- Rollbar/Honeybadger multi-project policies not researched.

## Full APM / observability: New Relic, Datadog, Elastic, SigNoz/OTel, Grafana Cloud; PHP APM (Tideways, New Relic PHP); WordPress (Query Monitor)

### Takeaway
For PHP/WordPress server-side performance, New Relic's perpetual free tier (100GB/mo, 1 full user, no per-agent fees, native PHP agent) is the best-value APM; Tideways Flex (from €69/mo, unlimited apps, 5M PHP requests) is the PHP-specialist option. Datadog (~$31-40/host/mo for APM) is overkill on cost for an agency. Grafana Cloud's free tier (50GB traces) is the best OTel-native option.

### Cited Findings
- New Relic free: 100GB ingest/mo + 1 full-platform user, perpetual, no credit card; beyond that $0.40/GB (original) or $0.60/GB (Data Plus); basic users free, core users $49, full users from $10 (first Standard) to $349/yr (Pro); no per-host/agent/container charges; pricing page stamped 8/20/2026 — [New Relic pricing](https://newrelic.com/info/pricing); [New Relic free tier blog](https://newrelic.com/info/blog/solution-recommendation/inside-new-relic-s-free-tier-100-gb-of-data-one-full-user-and-no-time-limit) (vendor)
- Datadog APM ~$31/host/mo annual, $36 on-demand, APM Pro $35, Enterprise $40; each host includes 150GB ingested spans + 1M indexed spans (15-day retention); indexed overage $1.70/M; high-water-mark billing — [SigNoz Datadog pricing](https://signoz.io/blog/datadog-pricing/); [Last9](https://last9.io/blog/datadog-pricing-all-your-questions-answered.md) (third-party/competitor)
- Grafana Cloud free (permanent): 10k active metric series (14-day retention), 50GB each logs/traces/profiles, 3 users; Pro from $19/mo platform fee + PAYG (as of Sept 2026) — [Last9 Grafana Cloud pricing](https://last9.io/blog/grafana-cloud-pricing.md); older rates differ per [Vendr](https://www.vendr.com/marketplace/grafana)
- SigNoz: self-hosted Community edition free (Apache 2.0); cloud free tier disputed — no free tier, $19 Startups/$49 Teams per [CostBench](https://costbench.com/software/observability/signoz-cloud/), vs 10GB/mo free and ~$0.30/GB per [Modern Data Tools](https://www.modern-datatools.com/tools/signoz/pricing) (Apr 2026)
- Tideways Flex: unlimited applications, from €69/mo for 5M PHP requests across all apps; higher tiers €129 and €299; old per-app plans were €89+/project/mo, which Tideways itself called unrealistic for small sites such as WordPress blogs — [Tideways Flex blog](https://tideways.com/profiler/blog/use-tideways-for-applications-of-all-sizes-with-the-new-flex-plan); [Tideways pricing](https://tideways.com/profiler/pricing) (Team/Business/Enterprise tiers, 5-day vs 30-day lookback)

### Inferences
- Agencies host many low-traffic WordPress sites; per-host (Datadog) or per-app (old Tideways) pricing scales badly, while usage-based (New Relic GB, Tideways Flex request pool, Grafana) scales well.
- OpenTelemetry: Node APIs on Coolify and Next.js (which has built-in OTel instrumentation hooks) can export OTLP to Grafana Cloud, SigNoz, New Relic, or Sentry; PHP OTel auto-instrumentation exists but is less mature than New Relic's PHP agent (general knowledge, not verified this session).
- Query Monitor (free WordPress plugin) is a dev/staging debugging tool for slow queries/hooks, not production monitoring (general knowledge; not sourced this session).
- Elastic APM not researched in depth; self-managing Elasticsearch is heavy for a small team.

### Gaps
- Elastic APM pricing, Query Monitor details, and OTel PHP maturity not sourced this session.
- Tideways USD pricing and whether Flex still exists on the current pricing page in late 2026 unconfirmed.

## Frontend RUM / Core Web Vitals and session replay

### Takeaway
Use free tools first: Cloudflare Web Analytics (free, cookieless, LCP/INP/CLS from all page views) for WordPress sites, Vercel Speed Insights for Next.js, CrUX/PageSpeed for field data, Microsoft Clarity (free) or PostHog (5k free replays/mo) for session replay. Paid synthetic+RUM (DebugBear ~$79-125/mo) only for clients who pay for performance retainers.

### Cited Findings
- Vercel: Observability Plus enabled by default for teams created/upgraded to Paid Pro on/after April 3, 2026 and included in Monitoring at no extra cost; per-event rates listed: Speed Insights Events $0.65, Observability Plus Events $1.20 (unit not shown in snippet) — [Vercel docs limits and pricing](https://vercel.com/docs/observability/limits-and-pricing) (via search; fetch blocked)
- Third-party trackers report a Sept 2026 Speed Insights split into a free base tier (10,000 events/team/rolling 30 days) plus paid "Plus Events", and a Q2 2026 Observability Plus price cut — [PricingSaaS](https://pricingsaas.com/news/article/vercel-splits-speed-insights-into-free-and-paid-plus-events-tiers); [PricingSaaS Q2 2026](https://pricingsaas.com/companies/vercel/diffs/2026Q2). Conflicts with older $10/mo figures ([AppPricingLab](https://saas.apppricinglab.com/product/vercel/)). Unconfirmed.
- Cloudflare Web Analytics: free, no cookies/fingerprinting; collects Core Web Vitals (LCP, INP, CLS) from 100% of page views without sampling; auto for proxied sites, JS beacon otherwise — [Cloudflare docs](https://developers.cloudflare.com/web-analytics/llms-full.txt); [ConsentStack](https://www.consentstack.io/vendors/cloudflare-web-analytics). Competitor claims vitals are Chromium-only and 6-month lookback — [WireBoard](https://wireboard.io/en/blog/wireboard-vs-cloudflare-web-analytics-a-free-gauge-is-not-a-cockpit-2026) (unverified, competitor)
- PostHog free every month on all plans: 1M analytics events, 5,000 session recordings; overage $0.00005/event (1-2M) and $0.005/recording (5-15k); free volume kept after upgrading; EU cloud available — [PostHog pricing](https://posthog.com/pricing); [PostHog FAQ](https://posthog.com/faq); [PostHog EU](https://posthog.com/eu)
- Microsoft Clarity: enforces consent for EEA/UK/CH visitors since Oct 31, 2025; without consent, cookie-dependent features (session recordings, funnels) may be limited; Consent Mode on by default for those regions; ConsentV2 API recommended — [Microsoft Learn](https://learn.microsoft.com/en-us/clarity/setup-and-installation/consent-management); [PPC Land](https://ppc.land/microsoft-clarity-enforces-cookie-consent-requirements-across-europe/); [Complianz](https://complianz.io/microsoft-consent-mode/)
- LogRocket: free 1,000 sessions/mo; Team $69/mo; Professional $295 — [CostBench](https://costbench.com/compare/hotjar-vs-logrocket/); [G2](https://www.g2.com/compare/hotjar-by-contentsquare-vs-logrocket)
- Hotjar: free tier plus ~$49/mo Growth; 5 plans + 3 add-ons — [PricingSaaS Hotjar](https://pricingsaas.com/companies/hotjar)
- DebugBear: Starter $79/mo, Professional $125/mo, 14-day trial, no free plan — [Toolradar](https://toolradar.com/tools/debugbear/pricing); Capterra lists from $125 ([Capterra](https://www.capterra.co.uk/reviews/209820/debugbear))
- Sentry session replay quota on Team is small (50 replays) — [Last9](https://last9.io/blog/sentry-pricing/)

### Inferences
- PostHog is the best all-rounder for replay + product analytics with an EU region; Clarity is free but in the EU it becomes consent-gated, reducing coverage on EU client sites.
- Hotjar/LogRocket are priced per site/org and become expensive across many clients.

### Gaps
- SpeedCurve pricing not found. Google CrUX/PageSpeed API (free) not separately sourced this session. Clarity free status assumed (long-standing), not reconfirmed in 2026 results.

## Mobile: Crashlytics, Sentry mobile, Embrace, Bugsnag

### Takeaway
Firebase Crashlytics is free with no caps and fine for native crash reporting; for React Native, Sentry gives better JS stack traces/source maps and reuses the same tool as web. Embrace is for deeper mobile session observability with a disputed free tier.

### Cited Findings
- Crashlytics: completely free; crash reporting only (no Jira two-way sync, anomaly detection, or replay); reports RN JS errors as generic native crashes without clear cross-platform traces — [Drizz](https://www.drizz.dev/post/best-mobile-error-tracking-tools); [Dupple](https://dupple.com/learn/best-crash-reporting-tools)
- Sentry free 5k errors; Team $26 (50k); strongest RN source-map workflow — [Drizz](https://www.drizz.dev/post/best-mobile-error-tracking-tools)
- Embrace: free tier "1M sessions/yr" vs "1M sessions/month" (conflict); Pro ~$80 per 100k sessions; no native Jira integration — [Drizz](https://www.drizz.dev/post/best-alternatives-to-sentry-and-bugsnag-for-mobile-app-error-tracking); [FitGap](https://us.fitgap.com/products/embrace)
- Bugsnag free 7.5k events, 1 user — [Koji](https://www.koji.so/blog/bugsnag-alternatives-2026)

### Inferences
- Running Crashlytics (free, native crashes) plus Sentry (RN JS errors, releases) side by side is common and costs nothing extra.

### Gaps
- Embrace official pricing unverified.

## Privacy / compliance (PII scrubbing, EU/US residency)

### Takeaway
Sentry offers EU (Frankfurt) storage on all plans at the same price, but the region is fixed per organization, and Sentry has no EU contracting entity. PostHog has an EU cloud. Clarity is consent-gated in the EEA. Self-hosting GlitchTip/Sentry gives full residency control.

### Cited Findings
- Sentry EU region in Frankfurt, backups in EU; region selected at org creation and cannot change (new org needed); covers storage at rest only; uptime-check data may be stored outside region; available on all plans incl. free at same pricing; no EU legal entity for contracting; EU API domain de.sentry.io — [Sentry docs data storage location](https://docs.sentry.io/organization/data-storage-location/); [Sentry changelog](https://docs.sentry.io/changelog/data-storage-location-in-germany-is-generally-available/)
- Newer Sentry SDKs don't send PII by default (sendDefaultPii); some features require enabling it; use beforeSend/beforeSendTransaction to scrub; query strings sent but apiKey/token params removed server-side by default; server-side scrubbing rules and self-run Relay available — [Sentry scrubbing sensitive data](https://docs.sentry.io/platforms/javascript/guides/koa/data-management/sensitive-data/); [Sentry Next.js data collected](https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/data-collected/)
- Clarity EEA consent: see above — [Microsoft Learn](https://learn.microsoft.com/en-us/clarity/setup-and-installation/consent-management)
- Cloudflare Web Analytics cookieless, no consent banner needed for personal data processing per vendor directory — [ConsentStack](https://www.consentstack.io/vendors/cloudflare-web-analytics)

### Inferences
- Because Sentry region is per-organization, an agency with EU clients may need two Sentry orgs (US + EU) — doubling base plan cost — or put all clients in the EU org.
- Session replay on WooCommerce checkout needs input masking (default in most replay SDKs) and a DPA listing the agency as processor/sub-processor.

### Gaps
- PostHog EU residency specifics and LogRocket/Hotjar EU options not sourced.

## Recommended stack and cost estimate (~20-50 client projects)

### Takeaway
A layered stack of roughly $30-120/mo covers most needs: Sentry Team (or self-hosted GlitchTip) for errors across all platforms, New Relic free for PHP APM, free RUM (Cloudflare/Vercel/CrUX), PostHog or Clarity for replay, and Crashlytics for native crashes.

### Cited Findings
- Price inputs: Sentry Team $26/mo ([Last9](https://last9.io/blog/sentry-pricing/)); GlitchTip $15/mo for 100k events or free self-host ([GlitchTip](https://www.glitchtip.com/pricing)); Better Stack $0.00005/exception ([Better Stack](https://betterstack.com/community/comparisons/better-stack-vs-sentry/)); New Relic free 100GB ([New Relic](https://newrelic.com/info/pricing)); Tideways Flex €69 ([Tideways](https://tideways.com/profiler/blog/use-tideways-for-applications-of-all-sizes-with-the-new-flex-plan)); PostHog 5k free recordings ([PostHog](https://posthog.com/pricing)); Grafana Cloud free 50GB traces ([Last9](https://last9.io/blog/grafana-cloud-pricing.md)); Crashlytics free ([Drizz](https://www.drizz.dev/post/best-mobile-error-tracking-tools))

### Inferences (estimates, not quotes)
- Lean tier (~$0-15/mo): GlitchTip self-hosted on existing Coolify server (~1GB RAM) using Sentry SDKs everywhere + New Relic free + Cloudflare Web Analytics/Vercel Speed Insights free tier + Clarity + Crashlytics.
- Standard tier (~$30-100/mo): Sentry Team $26 + reserved extra error volume or spend cap (~$0-50) + New Relic free + PostHog free + Crashlytics. Add a second EU org if needed (+$26).
- Performance-retainer add-ons: Tideways Flex (~€69/mo pool) for heavy WooCommerce stores; DebugBear ($79-125/mo) for clients paying for Core Web Vitals work — bill through to clients.
- Avoid: Datadog (per-host, ~$31+/host), Hotjar/LogRocket per-client plans, Highlight.io (discontinued).
- Operational practice: one Sentry/GlitchTip project per client app, tag environment/release, set per-project rate limits and inbound filters (bots, browser extensions) to protect pooled quota.

### Gaps
- Real event volumes per client unknown; estimates assume mostly low-traffic marketing sites with occasional busy WooCommerce stores.
