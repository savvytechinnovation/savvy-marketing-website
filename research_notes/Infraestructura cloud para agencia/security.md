# Infrastructure Security for a Small/Medium Marketing + Web Dev Agency (VPS vs IaaS vs PaaS) — Research Notes (as of Oct 2026)

Method note: these notes come from web searches run on 2026-10-29. Direct page fetches were blocked in this session (patchstack.com and vercel.com hosts did not resolve), so most figures come from search-result snippets of the cited pages. Several sources are vendor blogs or secondary coverage, and are flagged where that matters. Items marked "practitioner baseline" in Inferences are standard industry practice that I did not re-verify against a source this session.

## 1. Shared responsibility: what the agency must secure in VPS/VDS vs IaaS vs PaaS

### Takeaway
The less of the stack the provider runs, the more the agency owns. On a VPS or IaaS VM, the agency is responsible for the OS and everything above it: patching, host firewall, TLS, WAF, intrusion prevention, secrets and backups. On a PaaS, the OS and runtime move to the provider. The agency still always owns identities and access, application code and dependencies, secrets/env-var hygiene, data, and configuration. The 2026 Vercel incident is the cautionary case: env vars not flagged "sensitive" were exposed.

### Cited Findings
- IaaS: the customer carries the most responsibility, covering OS patching, firewall/security-group rules, encryption, IAM and logging — [Kaseya](https://www.kaseya.com/blog/cloud-shared-responsibility-model/)
- For Azure VMs, Microsoft puts patch management, OS hardening and OS-level controls on the customer — [Microsoft Learn: Shared responsibility in the cloud](https://learn.microsoft.com/en-ca/Azure/security/fundamentals/shared-responsibility)
- PaaS: the provider runs the OS and runtime. The customer still owns data security, access control, application configuration and application code security. Microsoft provides baseline network security, and the customer configures application-level network controls — [Microsoft Learn](https://learn.microsoft.com/en-in/azure/security/fundamentals/shared-responsibility)
- SaaS: the customer still handles identities, access settings and data, plus endpoint protection and compliance on client devices — [Microsoft Learn](https://learn.microsoft.com/en-in/azure/security/fundamentals/shared-responsibility)
- Customers often wrongly assume the provider also protects their data, including backups — [Kaseya](https://www.kaseya.com/blog/cloud-shared-responsibility-model/)
- In every model, the provider handles physical facilities, hardware and the hypervisor — [Microsoft Learn](https://learn.microsoft.com/en-in/azure/security/fundamentals/shared-responsibility)
- PaaS caveat: in the April 2026 Vercel incident, secrets stored as non-"sensitive" env vars were exposed through a provider-side compromise. Vars marked "sensitive" showed no evidence of access. The fix is to flag secrets as sensitive and rotate them — [GitGuardian](https://blog.gitguardian.com/vercel-april-2026-incident-non-sensitive-environment-variables-need-investigation-too); [Trend Micro](https://trendmicro.com/en_us/research/26/d/vercel-breach-oauth-supply-chain.html)

### Inferences
Responsibility matrix (synthesized from the sources above plus practitioner baseline):

| Control | Unmanaged VPS/VDS (Hetzner, DO Droplet, Contabo, Vultr) | IaaS (AWS EC2, GCP CE, Azure VM) | PaaS (Vercel, Netlify, Render, Railway, Fly, Heroku, managed WP like Kinsta/WP Engine) |
|---|---|---|---|
| Physical/hypervisor | Provider | Provider | Provider |
| OS patching and kernel | **Agency** | **Agency** (SSM Patch Manager etc. helps) | Provider |
| Host firewall | **Agency** (UFW/nftables; some VPS offer cloud firewalls) | **Agency** (security groups/NACLs, on top of provider tooling) | Provider (agency sets app-level rules: IP allowlists, preview protection) |
| TLS certs | **Agency** (Let's Encrypt/Caddy/certbot) or Cloudflare edge | **Agency** (ACM/LB) | Usually automatic (provider) |
| WAF | **Agency** (Cloudflare, ModSecurity/Coraza, Wordfence) | **Agency** (AWS WAF, Cloudflare) | Partial: some platforms include a firewall, the agency configures rules |
| DDoS | Basic L3/4 from provider varies; L7 = **Agency** (Cloudflare) | AWS Shield Standard L3/4; L7 = agency | Mostly provider at the edge, though bot/L7 abuse rules are often the agency's |
| Secrets | **Agency** fully | **Agency** (Secrets Manager/KMS available) | Shared: provider stores them, the agency must flag/scope/rotate |
| App code and dependencies, CMS plugins | **Agency** | **Agency** | **Agency** (always) |
| Identity/MFA/access for team | **Agency** | **Agency** | **Agency** |
| Backups | **Agency** (provider snapshots are not enough) | **Agency** | **Agency** for data/DB. Managed DB backups help, but export copies off-platform |
| Logging/monitoring | **Agency** | **Agency** (CloudTrail etc.) | Shared: the agency must enable and retain logs |
- A small agency running many client sites on unmanaged VPSs carries the full IaaS-level burden without IaaS tooling. A managed panel or host can shift OS patching back to the provider: for example Ploi, RunCloud or SpinupWP on a VPS, or a managed WP host.

### Gaps
- AWS's and Google's own shared responsibility pages were not retrieved. Their split matches Azure in general but is not verified here.
- I did not verify which VPS providers include L3/4 DDoS mitigation by default (Hetzner, DigitalOcean, Vultr etc. differ).

## 2. Server hardening baseline for VPS and container security

### Takeaway
Harden SSH first, following the CIS Ubuntu benchmark: keys only, no root login, no password auth. Then add a default-deny host firewall, automatic security updates, and an intrusion-prevention layer. CrowdSec adds crowd-sourced blocklists over fail2ban. An IPS does not replace CIS-style config hardening.

### Cited Findings
- fail2ban pairs a regex filter with an action (usually iptables) configured in INI files. CrowdSec splits detection into parsers, YAML scenarios, a local API and separate "bouncers" that enforce at the firewall or web server — [LumaDock: CrowdSec vs fail2ban](https://lumadock.com/tutorials/crowdsec-vs-fail2ban)
- CrowdSec's main practical advantage is community threat intelligence, which blocks known-bad IPs before they reach SSH — [LumaDock](https://lumadock.com/tutorials/crowdsec-vs-fail2ban)
- One practitioner reports that moving from fail2ban to CrowdSec cut SSH/HTTP attack noise by about 99%. This is an anecdote, not a controlled measurement — [DEV Community](https://dev.to/patrickbloemit/goodbye-fail2ban-hardening-netbird-caddy-with-crowdsec-29g6)
- The fail2ban repository is still maintained, but its last tagged release (1.1.0) was in April 2024 — [LumaDock](https://lumadock.com/tutorials/crowdsec-vs-fail2ban)
- Brute force is constant against WordPress: Wordfence blocked 19.2B brute-force attempts in Q3 2025 and 13.8B in Q4 2025 — [Wordfence Q3 2025](https://www.wordfence.com/blog/2025/10/quarterly-wordpress-threat-intelligence-report-q3-2025/); [Wordfence Q4 2025](https://www.wordfence.com/blog/2026/02/quarterly-wordpress-threat-intelligence-report-q4-2025/)
- 2026 DBIR (secondary coverage): vulnerability exploitation is now the top initial access vector at 31% of breaches, up 55% YoY. Credential abuse fell to 13%, and the report notes a widening remediation gap. This argues for fast patching and auto-updates — [TechRepublic](https://www.techrepublic.com/article/news-verizon-dbir-vulnerability-exploitation-2026/); [eSecurity Planet](https://www.esecurityplanet.com/threats/2026-verizon-dbir-the-new-era-of-cyber-threats/)
- 2026 DBIR coverage quotes Team Cymru on a 240% YoY rise in RMM-tool abuse, which is relevant to agencies using remote-access tools — [eSecurity Planet](https://www.esecurityplanet.com/threats/2026-verizon-dbir-the-new-era-of-cyber-threats/)

### Inferences
Practitioner baseline (not re-verified this session; check against CIS Ubuntu 24.04 / Debian 12 Benchmark and Lynis):
- **SSH:** ed25519 keys only. Set `PasswordAuthentication no`, `PermitRootLogin no`, `KbdInteractiveAuthentication no` and `AllowUsers`/`AllowGroups`. Use a non-root sudo user. Optionally put SSH behind Tailscale/WireGuard or Cloudflare Access/Tunnel so port 22 is closed to the internet.
- **Firewall:** UFW (a front end to nftables on Ubuntu 24.04) default deny inbound, allowing only 80/443 (or only Cloudflare IP ranges if proxied) and SSH from a VPN/allowlist. Pair it with the provider's cloud firewall for defense in depth. Docker publishes ports by writing iptables rules that bypass UFW, so bind containers to 127.0.0.1 or use the provider firewall.
- **Updates:** enable `unattended-upgrades` for security pockets, with automatic reboots in a maintenance window or livepatch. Ubuntu Pro is free for up to 5 machines and gives ESM and Livepatch.
- **IPS:** CrowdSec (with firewall + nginx/Caddy bouncers) or fail2ban for sshd and wp-login/xmlrpc.
- **Audit:** run Lynis, or OpenSCAP/`usg` (Ubuntu Security Guide) against the CIS Level 1 Server profile. Add auditd, file integrity checking (AIDE) and time sync.
- **Least services:** remove unused packages and run PHP-FPM pools per site under separate Unix users, so one hacked WP site can't read the others. Disable PHP execution in uploads.
- **Containers:** use minimal or distroless images pinned by digest, run as non-root with read-only rootfs, drop capabilities, and set `no-new-privileges`. Don't mount docker.sock into app containers, and never put secrets in images. Scan images with Trivy or Grype in CI, use Dependabot/Renovate for base images, and consider rootless Docker/Podman. Use OWASP Docker Security Cheat Sheet and CIS Docker Benchmark as references.
- Because exploitation now leads breach vectors (DBIR 2026), patch latency is the highest-leverage metric. Target critical CVEs and plugin patches within 24–72h, or use virtual patching (Patchstack/WAF) where no fix exists.

### Gaps
- I could not fetch the CIS Ubuntu 24.04 benchmark text, which requires a CIS registration. Exact control IDs are not cited.
- I found no authoritative benchmark comparing CrowdSec vs fail2ban effectiveness.

## 3. Edge protection: Cloudflare (WAF, DDoS, Zero Trust/Tunnel) and alternatives

### Takeaway
Cloudflare's Free plan already gives unmetered DDoS mitigation and a basic WAF/managed ruleset, and Zero Trust is free for up to 50 users. That makes it the default edge layer for a small agency. Cloudflare Tunnel plus Access lets the agency hide origin IPs and admin panels (wp-admin, SSH, dashboards) without opening inbound ports. Paid tiers add more rules and the full OWASP managed set.

### Cited Findings
- Cloudflare's comparison lists unmetered DDoS protection and a WAF on the Free plan, with no cap or throttling threshold on DDoS — [Andrew Baker review, Feb 2026](https://andrewbaker.ninja/2026/02/24/cloudflare-free-tier-review-why-it-works-for-enterprise/); [SpotSaaS review](https://www.spotsaas.com/blog/cloudflare-review)
- Free users get a limited number of custom WAF rules (one tutorial says 5), and paid tiers raise the limits — [FastComet tutorial](https://www.fastcomet.com/tutorials/cloudflare/security-settings); [BetterLink pricing comparison](https://blog.eastondev.com/en/posts/dev/20251201-cloudflare-pricing-compare)
- Cloudflare Zero Trust has a free plan for teams under 50 users — [Andrew Baker](https://andrewbaker.ninja/2026/02/24/cloudflare-free-tier-review-why-it-works-for-enterprise/); [free-for-dev list mirror](https://git.hackliberty.org/Git-Mirrors/free-for-dev/commit/efc201e32b87e66df8597f568f3f3b06f0bad4c7)
- Quick Tunnels expose a local HTTP port on a random trycloudflare.com subdomain without an account. These are for testing, and production uses named tunnels on your own domain — [free-for-dev mirror](https://git.hackliberty.org/Git-Mirrors/free-for-dev/commit/efc201e32b87e66df8597f568f3f3b06f0bad4c7)
- All of the above are secondary sources, so verify current limits on cloudflare.com/plans.

### Inferences
- Recommended edge pattern per client site: proxy DNS through Cloudflare (orange cloud), use Full (strict) TLS with an Origin CA cert, and allow only Cloudflare IP ranges at the origin firewall, or use Tunnel and close 80/443 entirely. Add bot fight mode/rate limits on `/wp-login.php` and `/xmlrpc.php` and put Cloudflare Access in front of `/wp-admin` for agency staff.
- Alternatives (not verified this session): Bunny.net (CDN + Shield WAF), Fastly (Next-Gen WAF), Akamai, AWS CloudFront + WAF + Shield, Sucuri (WP-focused WAF + malware cleanup), and Imperva. For zero-trust access, the main alternatives are Tailscale, NetBird and Twingate.
- Edge WAFs can't see authenticated WP plugin logic well. Patchstack and Wordfence argue that host/edge WAFs miss many plugin-specific exploits, so layer an application-level virtual-patching tool for WP.

### Gaps
- Official Cloudflare plan limits (managed ruleset contents on Free, Zero Trust log retention) were not confirmed from cloudflare.com.
- A Colorlib page attributes to Patchstack the claim that hosting WAFs block only about 12% of WP attacks. I could not confirm it against the Patchstack primary report, so treat it as unverified.

## 4. WordPress-specific threats (plugin vulns, Wordfence/Patchstack, supply chain)

### Takeaway
WordPress risk is almost entirely third-party plugins and themes, not core. Volumes are rising fast (11,334 new vulns in 2025, +42%). Many are unpatched at disclosure, and exploitation can begin within hours. 2026 also brought several plugin supply-chain compromises (backdoored updates after ownership changes or vendor breaches). Auto-updating is therefore necessary but not sufficient. Agencies need plugin minimization, virtual patching, integrity monitoring and fast response.

### Cited Findings
- Patchstack (State of WP Security 2026, 2025 data): 11,334 new vulnerabilities, +42% vs 2024. 91% were in plugins, 9% in themes, and only 6 in core (low priority). 4,124 (36%) were serious enough to need Patchstack mitigation rules — [Patchstack](https://patchstack.com/?p=25568)
- Secondary summaries of the Patchstack report say 46% of vulnerabilities had no patch at disclosure, highly exploitable vulns rose 113% YoY, and the weighted median time from disclosure to mass exploitation for heavily exploited flaws was about 5 hours. These figures are not verified against the primary report — [web60.ie](https://web60.ie/blog/wordpress-plugin-vulnerabilities-surge-2026); [Colorlib](https://colorlib.com/wp/wordpress-hacking-statistics/)
- Wordfence 2024 annual report: disclosed vulns rose 68% vs 2023, plugins accounted for 96%, and about 35% of 2024 vulns remained unpatched into 2025 — [Wordfence 2024 Annual Report](https://www.wordfence.com/blog/2025/04/2024-annual-wordpress-security-report-by-wordfence/)
- Wordfence Q3 2025: 9.7B WAF attacks blocked, 19.2B brute-force blocked, 1,857 vulns published. Q4 2025: 9.1B WAF, 13.8B brute force, 2,213 vulns — [Q3](https://www.wordfence.com/blog/2025/10/quarterly-wordpress-threat-intelligence-report-q3-2025/); [Q4](https://www.wordfence.com/blog/2026/02/quarterly-wordpress-threat-intelligence-report-q4-2025/)
- **Essential Plugin supply-chain compromise (April 2026):** after the vendor was acquired, a dormant backdoor was added to its plugins and activated in April 2026. About 20,000+ active installs were affected, investigators found 31 plugins compromised, and WordPress.org closed all of them — [TechCrunch](https://techcrunch.com/2026/04/14/someone-planted-backdoors-in-dozens-of-wordpress-plugins-used-in-thousands-of-websites/); [Patchstack analysis](https://patchstack.com/articles/critical-supply-chain-compromise-on-20-plugins-by-essentialplugin/)
- Reported 2026 attacks on BuddyBoss, Gravity Forms and Groundhogg (discovered by Sansec) delivered backdoored updates with valid vendor signatures, exposing over 1M installs. 309 BuddyBoss sites were confirmed compromised. This comes from a single aggregator, so verify it — [rfxn research](https://www.rfxn.com/research/wordpress-supply-chain-attacks); [Infosecurity Magazine](https://infosecurity-magazine.com/news/wordpress-plugin-supply-chain)
- Plugins compromised after an ownership change are a recognized pattern. WordPress.org cannot reliably flag ownership transfers, and site owners usually aren't notified — [SC World](https://www.scworld.com/brief/wordpress-plugins-compromised-after-acquisition-leading-to-backdoor-installation); [TechSpot](https://www.techspot.com/community/topics/popular-wordpress-plugins-backdoored-after-ownership-change-putting-thousands-of-websites-at-risk.297167/)
- Historical precedent: the AccessPress compromise backdoored 40 themes and 53 plugins, affecting about 360k sites. That was 2022, and the date was not shown in the snippet — [IT-Connect](https://www.it-connect.fr/une-attaque-supply-chain-cible-wordpress-93-themes-et-plugins-infectes/)

### Inferences
WP agency baseline:
- Keep a plugin inventory across all client sites using MainWP, ManageWP or WP Umbrella, or WP-CLI scripts. Standardize on a short approved-plugin list and remove abandoned or closed plugins.
- Run vulnerability intelligence and virtual patching: Patchstack (agency plans, vPatching) or the Wordfence Premium/Care WAF plus scanner. Use WPScan or the Wordfence Intelligence API for CI checks.
- Enable auto-updates for minor/security releases with staging and visual regression checks for majors. Given supply-chain attacks, add a short delay or canary for non-security updates, plus file-integrity monitoring (`wp core verify-checksums`, Wordfence scan) and alerts on new admin users.
- Hardening: set `DISALLOW_FILE_EDIT`, block PHP in uploads, enable 2FA for all admins (WP 2FA, Wordfence 2FA or SSO via Cloudflare Access), disable XML-RPC if unused, enforce least privilege on roles, and give each site its own DB user and Unix user.
- Isolate sites so one compromised client doesn't infect others (per-site containers or PHP-FPM pools).

### Gaps
- The Patchstack 2026 report PDF could not be fetched, so the 46%, 113% and 5-hour figures remain secondary.
- The Awesome Motive (OptinMonster etc.) "1.2M sites" backdoor claim appeared in search summaries without a date or primary source. Excluded as unverified.
- No Wordfence 2025 annual report was found as of this search; only the quarterly reports are available.

## 5. Secrets management, access control (SSO/MFA, least privilege, offboarding), client credentials

### Takeaway
Credentials and third parties are central: third-party involvement in breaches rose to 30% (DBIR 2025) and reportedly 48% (DBIR 2026). Agencies hold keys to many client accounts, so a compromise of the agency becomes a multi-client breach. Use a business password manager with shared vaults per client, SSO + phishing-resistant MFA, named accounts (never shared logins) on client platforms, secret scanning in repos, and a documented offboarding checklist.

### Cited Findings
- DBIR 2025: credential abuse was the top initial vector at 22% of breaches (exploitation 20%), and third-party involvement doubled from 15% to 30% — [Verizon 2025 DBIR news](https://verizon.com/about/news/2025-data-breach-investigations-report); [ASIS](https://www.asisonline.org/security-management-magazine/latest-news/today-in-security/2025/april/verizon-dbir-2025/)
- DBIR 2026 (secondary): credential abuse fell to 13%, third-party involvement reached 48%, ransomware appeared in 48% of breaches, and the human element in 62% — [eSecurity Planet](https://www.esecurityplanet.com/threats/2026-verizon-dbir-the-new-era-of-cyber-threats/); [TechRepublic](https://www.techrepublic.com/article/news-verizon-dbir-vulnerability-exploitation-2026/)
- The Vercel April 2026 incident started at a third-party AI tool (Context.ai): its Google Workspace OAuth app was compromised and used to take over a Vercel employee's account. That led to customer env vars not marked "sensitive." The initial compromise reportedly dates to February 2026 — [Trend Micro](https://trendmicro.com/en_us/research/26/d/vercel-breach-oauth-supply-chain.html); [Trunk.io](https://trunk.io/blog/vercel-april-2026-incident)
- A ShinyHunters-affiliated actor claimed to sell the data (about $2M ask), which is unverified. Vercel engaged IR firms and law enforcement — [Security Boulevard](https://securityboulevard.com/2026/04/vercel-confirms-breach-as-hackers-claim-to-be-selling-stolen-data/)
- GitGuardian argues that even "non-sensitive" env vars need investigation and rotation after such incidents — [GitGuardian](https://blog.gitguardian.com/vercel-april-2026-incident-non-sensitive-environment-variables-need-investigation-too)
- Shai-Hulud npm worm: wave 1 hit in September 2025 and "2.0" began on 24 Nov 2025. It steals maintainer and CI secrets, exfiltrates them via rogue GitHub Actions workflows, and republishes packages with stolen npm tokens. The 2.0 variant runs at pre-install and has a destructive home-directory wipe fallback. CISA acknowledged it — [CybelAngel](https://cybelangel.com/blog/the-shai-hulud-malware-attack-on-npm-supply-chain-flash-report/); [Gurucul](https://gurucul.com/latest-threats/shai-hulud-worm-compromises-npm-ecosystem-in-supply-chain-attack/); [Cycode](https://cycode.com/blog/shai-hulud-npm-supply-chain-attack/)
- August 2026: a compromised maintainer GitHub account led to malicious versions of npm packages (keyv, flat-cache, file-entry-cache), which spread to hundreds more — [eSecurity Planet](https://www.esecurityplanet.com/de/threats/github-account-breach-fuels-shai-hulud-npm-supply-chain-attack/)

### Inferences
- **Secrets:** never commit `.env` files. Use a secrets manager (Doppler, Infisical (OSS), 1Password Secrets Automation/Connect, AWS Secrets Manager, or SOPS + age for GitOps). Mark PaaS env vars as sensitive, scope them per environment, and keep preview deployments from getting production secrets. Turn on GitHub secret scanning + push protection, or gitleaks/trufflehog in CI. Use short-lived OIDC credentials from CI to cloud instead of static keys.
- **Dependency supply chain:** use lockfiles and `npm ci`, and consider `--ignore-scripts` or pnpm/bun with lifecycle scripts restricted. Pin GitHub Actions to SHAs, run Renovate/Dependabot with a minimum release-age delay, and add Socket.dev or OSV-Scanner checks.
- **Identity:** use Google Workspace or M365 as the IdP with phishing-resistant MFA (passkeys/FIDO2 keys) for admins. Enforce SSO into GitHub, Cloudflare, hosting, password manager and analytics where possible. Review third-party OAuth app grants in Workspace, since that was the Vercel entry vector.
- **Client accounts:** request delegated or partner access instead of client passwords (Google Ads MCC, Meta Business Manager partner access, GA4/GTM user roles, Cloudflare member invites, registrar delegate access, GitHub org membership). Where credentials must be shared, keep them in a per-client vault (1Password/Bitwarden Teams) with access logging. Never send them over email or Slack.
- **Least privilege and offboarding:** use role-based groups, quarterly access reviews and break-glass accounts. Keep an offboarding checklist: disable the IdP account (which cascades via SSO), remove from the password manager, rotate any shared secrets the person saw, remove SSH keys from servers (or use short-lived SSH certificates via Tailscale SSH or Teleport), and revoke PATs and OAuth tokens. When a client relationship ends, hand over or delete client data and remove agency access.

### Gaps
- No agency-specific breach statistics (e.g., "% of agency breaches via shared client credentials") were found.

## 6. Backups (3-2-1, immutable/offsite), DR, RPO/RTO

### Takeaway
Provider snapshots on the same account are not a backup strategy. Use 3-2-1-1-0: 3 copies, 2 media, 1 offsite, 1 immutable/air-gapped, 0 restore-test errors. Store backups off-provider with object lock (WORM) and credentials that cannot delete. Ransomware appears in 48% of breaches (DBIR 2026), which makes immutability essential.

### Cited Findings
- Backblaze B2 Object Lock provides WORM storage that can't be changed or deleted. Per Retrospect, not even the root account can delete a file before retention ends. Retrospect also warns against setting a default bucket retention in days — [Backblaze](https://www.backblaze.com/cloud-storage/landing/ad/ransomware); [Retrospect KB](https://www.retrospect.com/support/kb/immutable_backups_on_backblaze_b2)
- 3-2-1-1-0 adds an immutable or air-gapped copy and zero restore-verification errors to 3-2-1 (vendor framing) — [Backblaze/Veeam blog](https://www.backblaze.com/blog/connect-veeam-to-the-b2-cloud-using-morro-data-cloudnas/); [WebsiteRating](https://www.websiterating.com/storage/best-ransomware-proof-cloud-backup)
- For restic: run `restic check --read-data`, enforce retention, and test restores on a schedule. This is a non-official wiki, so treat it as a lead — [restic immutable backup wiki](https://moltchat-agent-commons.onrender.com/wiki/implementing-immutable-backup-with-restic_skill_(Anthropic-Cybersecurity-Skills).md)
- Ransomware was present in 48% of breaches per DBIR 2026 coverage — [eSecurity Planet](https://www.esecurityplanet.com/threats/2026-verizon-dbir-the-new-era-of-cyber-threats/)

### Inferences
Practitioner baseline:
- **Layers:** (1) provider snapshots daily for fast whole-server rollback; (2) app-level backups (DB dumps + `wp-content`/uploads) with restic, Borg or Kopia to S3-compatible storage with Object Lock at another provider/region (B2, Wasabi, Cloudflare R2 (check lock support), AWS S3 Object Lock); (3) for WP, optionally UpdraftPlus/BlogVault/Jetpack as a client-visible extra copy.
- Use append-only keys: the server's backup credentials can write but not delete, and retention/pruning runs from a separate trusted host.
- **RPO/RTO tiers** (to agree contractually per client):
  - Brochure sites: RPO 24h, RTO 8–24h.
  - Lead-gen/ecommerce: RPO 1h or less (DB binlog/PITR), RTO 1–4h.
  - Managed DB PITR (RDS, Neon, Supabase etc.) gives minute-level RPO.
- **DR runbook:** Infrastructure-as-Code (Terraform/Ansible) or documented server builds so a host can be rebuilt on another provider. Keep DNS on Cloudflare for fast cutover, and run quarterly restore drills that are timed against the RTO.
- Back up the agency's own SaaS too (Google Workspace, GitHub repos, password-manager export to an encrypted offline copy).

### Gaps
- Official restic and Backblaze docs on configuring restic with B2 Object Lock were not retrieved.

## 7. Monitoring, logging, uptime, vulnerability scanning

### Takeaway
A small agency can cover uptime, errors, metrics/logs, and vulns with a mostly OSS/free-tier stack:
- Uptime Kuma or Better Stack for uptime, status pages and on-call
- Sentry for app errors
- Grafana + Prometheus/Loki/Alloy (or Grafana Cloud free) for metrics and logs
- Wazuh or CrowdSec for host security events
- Patchstack/WPScan, Trivy and OWASP ZAP for vulnerability scanning

### Cited Findings
- Exploitation is now the leading breach vector (31%) and the remediation gap is widening (DBIR 2026). Continuous vulnerability scanning and patch tracking therefore matter more — [Tenable discussion](https://connect.tenable.com/discussions/vulnerability-watch/key-findings-from-the-verizon-dbir-2026-slower-vulnerability-remediation-meets-f/111972); [TechRepublic](https://www.techrepublic.com/article/news-verizon-dbir-vulnerability-exploitation-2026/)
- WP-specific feeds publish weekly vulnerability reports usable for alerting — [Wordfence weekly reports](https://www.wordfence.com/blog/2025/12/wordfence-intelligence-weekly-wordpress-vulnerability-report-december-1-2025-to-december-7-2025/)

### Inferences
Practitioner baseline (tools named in the brief; features and pricing not re-verified this session):

| Need | Self-hosted / free | SaaS |
|---|---|---|
| Uptime + SSL/domain expiry + status page | Uptime Kuma | Better Stack Uptime (incl. on-call), UptimeRobot |
| Errors/APM | Sentry self-hosted (heavy) or GlitchTip | Sentry SaaS |
| Metrics/logs | Prometheus + node_exporter + Grafana, Loki + Alloy/Promtail; Netdata | Grafana Cloud free tier, Better Stack Logs |
| Host security (SIEM/HIDS/FIM) | Wazuh, CrowdSec console, auditd | — |
| Vuln scanning | Trivy (images/IaC), OSV-Scanner, OpenVAS/Greenbone, Nuclei, OWASP ZAP (DAST), WPScan CLI | Patchstack, Wordfence Central, Snyk, GitHub Dependabot |
| External attack surface | Mozilla Observatory, SSL Labs, securityheaders | Cloudflare Security Center |

- Centralize logs off-host, so an attacker on the box can't wipe them, with retention that matches legal needs (e.g., 90 days–1 year). Alert on new WP admin users, sudo/SSH logins, file changes in core and plugins, and spikes in 4xx/5xx errors.
- Also monitor domain/DNS and TLS certificate expiry for all client domains. This is a frequent agency outage cause.

### Gaps
- Current pricing and free-tier limits for Better Stack, Grafana Cloud and Sentry were not verified this session.

## 8. Compliance: GDPR, CCPA, LatAm data protection laws, data residency, PCI DSS, client DPAs

### Takeaway
An agency that collects and processes client lead data (forms, CRMs, ad audiences) is usually a **processor/encargado** on behalf of each client (controller/responsable). It needs a DPA with every client, a list of sub-processors (hosting, email, CRM, analytics), documented security measures, and an incident-notification flow fast enough for the strictest regime it touches: 72h under GDPR, 3 business days under Brazil's LGPD. The LatAm picture is shifting:
- Mexico has a new LFPDPPP (in force 21 Mar 2025).
- Chile's Law 21.719 takes effect 1 Dec 2026, with a bill pending to delay it to 2027.
- Colombia and Argentina reforms are still pending.

On ecommerce, PCI DSS 4.0.1 SAQ A now requires confirming the whole site is not susceptible to script attacks.

### Cited Findings
**Mexico (new LFPDPPP 2025)**
- Published in the DOF on 20 Mar 2025 and in force the next day, repealing the 2010 law — [Hogan Lovells](https://www.hoganlovells.com/es/publications/mexicos-new-federal-data-protection-law-what-it-means-for-companies); [Crowe México](https://www.crowe.com/mx/noticias/ley_federal_pdppp_consultoria)
- INAI was dissolved and its oversight moved to the Secretaría Anticorrupción y Buen Gobierno — [Littler](https://www.littler.com/news-analysis/asap/mexico-tiene-nueva-ley-en-materia-de-proteccion-de-datos-personales); [Hogan Lovells](https://www.hoganlovells.com/es/publications/mexicos-new-federal-data-protection-law-what-it-means-for-companies)
- The new law's definition of responsable broadens who is obligated, now including encargados (processors), which directly affects agencies. The integral privacy notice no longer has to describe transfers — [Hogan Lovells](https://www.hoganlovells.com/es/publications/mexicos-new-federal-data-protection-law-what-it-means-for-companies)
- Consent must be free, specific and informed. Tacit consent is generally still valid, but sensitive data needs express written consent. ARCO requests must be answered in 20 business days and executed in 15 more. Fines reach up to 320,000× UMA and can double for sensitive data. These figures come from a single consultancy source — [Usercentrics](https://usercentrics.com/es/knowledge-hub/lfpdppp-mexico/)
- Recommended action: review and update privacy policies and notices — [Garrigues](https://www.garrigues.com/es_ES/noticia/mexico-nueva-ley-federal-proteccion-datos-personales-posesion-particulares-introduce)

**Brazil (LGPD)**
- Resolution CD/ANPD 15/2024 sets mandatory incident notification to the ANPD (and data subjects) within 3 business days when an incident is confirmed, involves personal data and poses relevant risk. Filings go through the SUPER platform — [IBA](https://www.ibanet.org/reporting-security-incidents-Brazil-data%20protection); [Legalmondo](https://www.legalmondo.com/?p=32170)
- Resolution CD/ANPD 19/2024 governs international transfers and introduced Brazilian SCCs. EU SCCs alone are reportedly insufficient for transfers out of Brazil. Sources conflict on whether a Brazil–EU adequacy decision exists in 2026 — [Barbieri Advogados](https://barbieriadvogados.com/?p=8824); [Tozzini Freire](https://tozzinifreire.com.br/en/artigos/8-anos-da-lgpd-e-o-que-ainda-vem-pela-frente)

**Chile (Law 21.719)**
- Published on 13 Dec 2024 and in force from 1 Dec 2026. It creates the Agencia de Protección de Datos Personales — [Diario Constitucional (Jun 2026)](https://www.diarioconstitucional.cl/2026/06/12/la-ley-21-719-entra-en-vigor-el-1-de-diciembre-y-expone-vacios-en-regulacion-de-pequenas-empresas/); [Academia Judicial](https://academiajudicial.cl/recursos/actualizaciones-normativas/ley-21-719-que-regula-la-proteccion-y-el-tratamiento-de-los-datos-personales-y-crea-la-agencia-de-proteccion-de-datos-personales/)
- The government filed a bill on 1 Sep 2026 (boletín 18.623-07) to postpone entry into force to 1 Dec 2027. As of the latest sources it is still in first reading, so check its current status — [Carey](https://www.carey.cl/api/archivo/gobierno-ingresa-proyecto-de-ley-que-posterga-en-un-ano-entrada-en-vigor-de-la-ley-sobre-proteccion-de-datos-personales?lang=es); [Ecosistema Startup](https://ecosistemastartup.com/?p=104145)
- The Agency is not operational yet: the Senate rejected the proposed council nominees on 20 May 2026. For the first 12 months, the Agency may replace fines with written warnings for smaller companies — [IAPP](https://www.iapp.org/news/a/d-a-de-la-pdp-en-chile-estamos-preparados-para-la-entrada-en-vigor-de-la-normativa); [Diario Constitucional](https://www.diarioconstitucional.cl/cartas-al-director/la-agencia-de-proteccion-de-datos-personales/)

**Colombia (Ley 1581/2012)**
- Reform bills 214/2025 and 274/2025 were consolidated and are pending in Congress. They would extend the law to some foreign controllers/processors (with a local representative) and add new legal bases — [Allende & Brea](https://allende.com/en/privacy-and-cybersecurity/new-bill-to-amend-colombias-personal-data-protection-law-introduced-in-congress-09-15-2025/)
- Colombia reportedly adopted the RIPD (Ibero-American Network) model contractual clauses for international transfers in March 2026. This is unverified against SIC text — [Allende & Brea](https://allende.com/privacidad-y-ciberseguridad/)

**Argentina (Ley 25.326)**
- The AAIP published a draft update in 2022, and I found no evidence it was enacted. A Feb 2026 US–Argentina trade agreement includes a personal-data chapter — [Baker McKenzie](https://insightplus.bakermckenzie.com/bm/data-technology/argentina-data-protection-authority-publishes-draft-bill-to-update-personal-data-protection-law-no-25326); [Allende & Brea](https://allende.com/privacidad-y-ciberseguridad/)
- Conflict: one compliance-vendor page claims Argentina enacted a new law in March 2025. That appears to confuse it with Mexico and has no corroboration — [ConsentStack](https://www.consentstack.io/regulations/ar-pdpa)
- New Ibero-American Data Protection Standards were approved on 26 June 2026 — [Allende & Brea](https://allende.com/privacidad-y-ciberseguridad/)

**PCI DSS (ecommerce)**
- PCI DSS 4.0.1 removed requirements 6.4.3 (payment-page script inventory/authorization) and 11.6.1 (change/tamper detection) from SAQ A. They still apply to SAQ D and onsite-assessed merchants — [Adyen docs](https://docs.adyen.com/development-resources/pci-dss-compliance-guide/saq-a-eligibility)
- In exchange, the January 2025 SAQ A revision added an eligibility condition: the merchant must confirm its site is not susceptible to script-based attacks, and this covers the whole site, not just the payment page. PCI SSC FAQ 1588 allows meeting it via 6.4.3/11.6.1-style techniques or via TPSP/processor confirmation. Iframes or redirects alone are not enough — [Report URI FAQ](https://blog.report-uri.com/pci-dss-4-0-1-saq-a-and-client-side-security-a-plain-english-faq/); [Akamai](https://www.akamai.com/blog/security/pci-dss-v4-0-1-changes-qualify-saq-a); [cside](https://cside.com/blog/how-to-be-a-pci-dss-saq-a-company)

### Inferences
- **GDPR/CCPA** (not re-researched this session, well established):
  - GDPR Art. 28 requires a written processor contract (DPA), Art. 32 requires appropriate security, and Art. 33 requires notifying the authority within 72h, with processors notifying controllers "without undue delay."
  - CCPA/CPRA requires a service-provider/contractor contract restricting use of personal information, plus reasonable security.
  - Agencies running ad audiences or retargeting must watch the "sale/sharing" definitions under CPRA.
- **Agency compliance kit:**
  - A template DPA/contrato de encargo that covers GDPR, LGPD (Brazil SCC clauses if data leaves Brazil), Mexico's LFPDPPP (encargado obligations) and Chile 21.719.
  - A public sub-processor list.
  - A security annex (TOMs) describing the controls in sections 2–7.
  - Incident SLA: notify the client within 24–48h so the client can meet GDPR's 72h and LGPD's 3 business days.
  - Data retention/deletion at contract end, and cooperation on data-subject requests (ARCO/DSAR).
  - Insurance (cyber/E&O).
- **Data residency:** none of the LatAm laws found impose strict localization. Cross-border transfers need a legal mechanism (Brazil SCCs, RIPD clauses, consent/contract). Hosting EU-client data in the EU (Hetzner DE/FI, AWS eu-*) simplifies GDPR, while US-hosted PaaS relies on the EU–US Data Privacy Framework (status not re-verified).
- **Lead data minimization:** don't store form submissions in WP DB plugins indefinitely. Push them to the client CRM and purge, use TLS everywhere, and encrypt backups.
- **PCI:** prefer hosted checkout or iframe from a PCI-compliant PSP (Stripe, Mercado Pago, Adyen) to stay at SAQ A. Then add CSP + SRI/script monitoring (e.g., Report URI, cside, Cloudflare Page Shield) to satisfy the new "not susceptible to script attacks" condition. Never store card data in WooCommerce.

### Gaps
- I could not verify the official text of Mexico's 2025 LFPDPPP on breach notification and security-measure obligations. Sources found reflected the 2010 law/2011 Reglamento, and the status of a new Reglamento is unknown.
- Whether Chile's postponement bill (18.623-07) has passed as of late Oct 2026 is unconfirmed.
- Brazil–EU adequacy status in 2026 is contested between sources.
- No official texts for Argentina/Colombia reform status. The GDPR/CCPA specifics in Inferences were not re-sourced this session.

## 9. Recent notable incidents relevant to agencies

### Takeaway
The 2025–2026 pattern is supply chain and third-party compromise, not direct server hacks:
- A PaaS provider breached via a third-party OAuth app (Vercel, Apr 2026)
- Backdoored WordPress plugins via acquisition or vendor compromise (Essential Plugin, Apr 2026, and others)
- Self-propagating npm worms stealing CI and cloud secrets (Shai-Hulud 2025, Aug 2026 wave)

All of these hit agencies hard because they manage many client sites and secrets.

### Cited Findings
- **Vercel (disclosed 19 Apr 2026):** a third party (Context.ai) Google Workspace OAuth app was compromised, leading to takeover of a Vercel employee account and access to customer env vars not marked sensitive. Initial compromise was around Feb 2026, and the scope was a limited subset of customers, later expanded slightly — [Trend Micro](https://trendmicro.com/en_us/research/26/d/vercel-breach-oauth-supply-chain.html); [Trunk.io](https://trunk.io/blog/vercel-april-2026-incident); [Prowler](https://prowler.com/blog/secure-vercel-apps-prowler-april-2026-breach); [Security Boulevard](https://securityboulevard.com/2026/04/vercel-confirms-breach-as-hackers-claim-to-be-selling-stolen-data/)
- **Essential Plugin WordPress backdoor (Apr 2026):** 31 plugins, 20k+ active installs, all closed on wp.org — [TechCrunch](https://techcrunch.com/2026/04/14/someone-planted-backdoors-in-dozens-of-wordpress-plugins-used-in-thousands-of-websites/); [Patchstack](https://patchstack.com/articles/critical-supply-chain-compromise-on-20-plugins-by-essentialplugin/); [TechRepublic](https://techrepublic.com/article/news-malicious-wordpress-plugins-backdoor-april-2026)
- **BuddyBoss / Gravity Forms / Groundhogg signed-update backdoors (reported Mar–Jun 2026):** single aggregator source — [rfxn](https://www.rfxn.com/research/wordpress-supply-chain-attacks)
- **Shai-Hulud npm worm** (Sep 2025, Nov 2025 "2.0") and the **Aug 2026 keyv/flat-cache compromise** — [CybelAngel](https://cybelangel.com/blog/the-shai-hulud-malware-attack-on-npm-supply-chain-flash-report/); [eSecurity Planet](https://www.esecurityplanet.com/de/threats/github-account-breach-fuels-shai-hulud-npm-supply-chain-attack/)
- DBIR 2026 context: third-party involvement in 48% of breaches and exploitation at 31% — [eSecurity Planet](https://www.esecurityplanet.com/threats/2026-verizon-dbir-the-new-era-of-cyber-threats/)

### Inferences
- Lessons for the agency:
  - Mark all PaaS secrets sensitive and rotate them on vendor incidents.
  - Audit OAuth apps connected to Google Workspace/GitHub.
  - Treat plugin and npm updates as untrusted code: delay non-security updates, monitor integrity, keep lockfiles.
  - Keep a vendor/sub-processor inventory with an incident-response contact list, so the agency can tell clients quickly which of their sites and data are affected.

### Gaps
- Primary vendor bulletins (Vercel KB, Patchstack article) could not be fetched directly. Details rely on search snippets and secondary analyses.
