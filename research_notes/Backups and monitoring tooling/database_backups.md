# Database Backup Solutions for a Small Web/Marketing Agency (research as of 2026-10-29)

Research method notes: Direct page fetches to supabase.com and developers.cloudflare.com were blocked by this session's network allowlist (DNS failure). Everything below comes from search-result snippets of official docs and pricing pages, plus third-party roundups. Where only a third-party source exists it is flagged. Items drawn from background knowledge are kept under Inferences or Gaps, never under Cited Findings.

## PostgreSQL: pgBackRest, WAL-G, Barman, pg_dump schedulers; PITR setup complexity

### Takeaway
For the self-hosted Coolify Postgres, WAL-G is the most practical way to add PITR. It is a single Go binary built for object storage, and it covers archive_command plus a scheduled base backup. pgBackRest is the most capable and was rescued by a sponsor coalition in May 2026 after nearly being abandoned. Barman fits a dedicated backup host, which is overkill for one VPS. pg_dump schedulers (Coolify built-in, SimpleBackups) remain a useful second, logical copy, but their RPO is only as good as their schedule.

### Cited Findings
- pgBackRest near-abandonment: in April 2026, maintainer David Steele said he had archived the project and would stop maintaining it for lack of sponsorship — [LWN](https://lwn.net/Articles/1071760/); [The Register, 2026-05-20](https://www.theregister.com/databases/2026/05/20/postgresql-backup-tool-gets-some-backup-of-its-own-after-sole-maintainer-sounds-alarm/5242822)
- pgBackRest rescue: on 18 May 2026 the maintainer announced the project would continue, funded by a coalition of sponsors. Named sponsors include AWS, Supabase, pgEdge, Tiger Data and Percona — [pgbackrest.org news](https://pgbackrest.org/news.html); [LWN](https://lwn.net/Articles/1073470/)
- Percona (19 May 2026) committed dedicated maintainer time for bug fixes, feature work and reviews, plus engineering help to onboard a new maintainer — [GlobeNewswire / Percona](https://www.globenewswire.com/de/news-release/2026/05/19/3297383/0/en/Open-Source-Stays-Open-Percona-Sponsors-pgBackRest-to-Keep-PostgreSQL-Backups-Running.html)
- Conflict: a Russian-language report described the repo as archived, with v2.58.0 (Jan 2026) as the last stable release. It predates or ignores the May rescue — [tproger.ru](https://tproger.ru/news/pgbackrest-perestali-podderzhivat-glavnyj-open-source-bekap-po)
- pgBackRest strengths: `pgbackrest verify` re-reads the repository to check integrity, and it can write to local disk and S3 at the same time with different retention on each. It is rated best for granularity and performance — [kunalganglani.com 2026 comparison](https://www.kunalganglani.com/blog/postgresql-backup-tools-compared.md)
- WAL-G: originally a Yandex project, written in Go and designed around object storage. Rated the simplest option for cloud-native teams running several databases — [kunalganglani.com](https://www.kunalganglani.com/blog/postgresql-backup-tools-compared.md); [chat2db comparison](https://chat2db.ai/resources/blog/pgbackrest-vs-barman-vs-wal-g)
- Barman: a dedicated Barman host pulls backups from one or more Postgres servers. Its block-level incremental is available via rsync mode but is weaker than pgBackRest's. It is positioned for enterprise fleet management and EDB customers — [kunalganglani.com](https://www.kunalganglani.com/blog/postgresql-backup-tools-compared.md)
- WAL-G PITR setup pattern:
  - Put S3 credentials and prefix in an env directory.
  - Set `archive_command` to `wal-g wal-push`, then take the first base backup with `wal-g backup-push`.
  - To restore, use `restore_command = wal-g wal-fetch` plus `recovery_target_time`. The timezone must match the original instance, usually UTC.
  - Source: [Supabase blog (2020; Postgres 12, date-flagged)](https://supabase.com/blog/continuous-postgresql-backup-walg)
- Containerized WAL-G needs a custom Postgres image (or a binary mounted in), `archive_command` set via config, and S3 settings in env — [OneUptime, Feb 2026 (Kubernetes)](https://oneuptime.com/blog/post/2026-02-09-postgresql-pitr-walg-kubernetes/view)
- Practitioner advice: "the part that actually saves you is rehearsing the restore" on a scratch data directory (Postgres 15–17 guide) — [StackHarbor](https://stackharbor.com/en/knowledge-base/postgres-wal-g-backup-restore/)
- Other 2026 roundups also list newer tools such as Databasus — [DEV Community](https://dev.to/piteradyson/postgresql-backup-tools-comparison-databasus-wal-g-pgbackrest-and-barman-2kg); [DEV 2026 top tools](https://dev.to/dmetrovich/top-postgresql-backup-tools-in-2026-5h07)

### Inferences
- RPO and RTO by tool:
  - pg_dump every N hours gives an RPO of N hours. RTO is roughly the time to load the dump, which is minutes for agency-sized DBs under a few GB.
  - WAL-G or pgBackRest give an RPO of about one WAL segment, or `archive_timeout` (e.g. 60s). RTO is base-backup download plus WAL replay.
- Setup complexity on Coolify: Coolify's managed Postgres container does not ship WAL-G. Options are a custom image (postgres + wal-g), or running that Postgres as a Docker Compose "service" with the image overridden. Either way you configure `archive_mode=on`, `archive_command`, and a cron or sidecar for `backup-push` plus `delete retain`. Estimated effort is half a day to a day, including a restore drill. A Coolify-specific guide was not found.
- WAL-G with Object Lock: retention and deletion (`wal-g delete`) clash with compliance-mode locks. Either set lock retention to at least the WAL-G retention window and let deletes fail or expire, or use a separate locked bucket fed by replication or a copy job. Verify this before you rely on it.
- Recommendation: keep Coolify's scheduled pg_dump to R2/B2 as the logical copy. Add WAL-G only for Postgres apps where losing more than an hour of data matters.

### Gaps
- I found no Coolify- or Dokploy-specific WAL-G/pgBackRest integration docs.
- pgBackRest S3 Object Lock compatibility and current (late 2026) release numbers are unverified.
- I found no 2026 head-to-head restore-time benchmark.

## MySQL/MariaDB: mysqldump, mydumper, Percona XtraBackup, MariaDB Backup, binlog-based PITR

### Takeaway
For typical WordPress databases (MBs to a few GB), a nightly or hourly `mysqldump --single-transaction` is adequate and is what the panels do. mydumper speeds up larger DBs. XtraBackup and mariadb-backup are physical hot backups, and their main benefit is PITR when combined with binlogs. Binlog PITR means restoring the base backup and replaying binlogs from the recorded position. It is achievable but rarely worth it for brochure WordPress sites. Consider it for WooCommerce or membership sites.

### Cited Findings
- In Percona's benchmark, XtraBackup was fastest for combined backup plus restore, and its key value is supporting PITR. It is commonly used for building replicas and for full-server recovery — [Percona blog](https://www.percona.com/blog/backup-restore-performance-conclusion-mysqldump-vs-mysql-shell-utilities-vs-mydumper-vs-mysqlpump-vs-xtrabackup/); [Percona Remote DBA tools](https://www.percona.com/blog/mysql-backup-tools-used-by-percona-remote-dba-for-mysql/)
- mydumper is a logical tool that is much faster than mysqldump. Percona warns not to rely on it for schemas (views, triggers, procedures) and pairs it with mysqldump for schema — [Percona Remote DBA tools](https://www.percona.com/blog/mysql-backup-tools-used-by-percona-remote-dba-for-mysql/)
- mysqldump is the slowest for large DBs. Its `--master-data` (newer: `--source-data`) option records the binlog position, which is the starting point for PITR replay — [OpsTree 2024 (date-flagged)](https://opstree.com/blog/comparison-between-mydumper-mysqldump-xtrabackup/); [CSDN guide](https://damodev.csdn.net/6a4332da662f9a54cb862c06.html)

### Inferences
- For MariaDB (the default on many WP panel stacks), `mariadb-backup` is the physical equivalent. XtraBackup 8.x targets MySQL 8 and does not support recent MariaDB. Confirm this against the MariaDB docs.
- Binlog PITR on panel servers needs several things:
  - Enable `log_bin`, use `binlog_format=ROW`, and set `binlog_expire_logs_seconds`.
  - Ship the binlogs off-box, for example with `mysqlbinlog --read-from-remote-server --raw --stop-never`, or by syncing the binlog directory with rclone or restic every 5–15 minutes.
  - To restore, load the dump, then run `mysqlbinlog --start-position=... --stop-datetime=...`.
  - Panels are not designed for this, and panel-managed my.cnf may be overwritten.
- Practical agency tiers:
  - Tier 1 (most sites): daily dump via panel or plugin.
  - Tier 2 (ecommerce): hourly dumps.
  - Tier 3 (high-value): binlog shipping.

### Gaps
- Official MariaDB `mariadb-backup` docs and the XtraBackup/MariaDB compatibility statement were not retrieved.
- I found no current panel documentation on whether SpinupWP, Ploi or RunCloud allow custom binlog config.

## File-level/general tools and SaaS: restic, Borg/BorgBase, Kopia, rclone; SimpleBackups, SnapShooter, Ottomatik; panel built-in backups

### Takeaway
restic (or Kopia) piping DB dumps to B2 or R2 gives encrypted, deduplicated, versioned backups with S3 Object Lock as the immutability layer. Borg needs a Borg server, so it pairs with BorgBase's append-only repos instead of S3. SaaS orchestrators (SimpleBackups, Ottomatik, SnapShooter) trade money for a dashboard, alerts and no scripting. SnapShooter's scope has been narrowing under DigitalOcean. Panel backups are convenient, but they live inside the same management account, so treat them as copy #2, not the immutable copy.

### Cited Findings
- restic and Kopia treat the target as dumb storage, which works directly on object storage. Borg needs a Borg process remotely, which suits a server you run yourself — [StackHarbor comparison](https://stackharbor.com/en/knowledge-base/restic-borg-kopia-duplicacy-comparison/)
- Deletion control differs by tool. Borg has true append-only via SSH forced command, Kopia has server-mediated ACLs, and restic can use S3 Object Lock "if you wire it" — [StackHarbor](https://stackharbor.com/en/knowledge-base/restic-borg-kopia-duplicacy-comparison/)
- restic and Kopia are both formally pre-1.0. Recent versions cited are restic v0.19.1, Kopia v0.23.1 and Borg 1.4.5 — [StackHarbor](https://stackharbor.com/en/knowledge-base/restic-borg-kopia-duplicacy-comparison/); [WZ-IT (German)](https://wz-it.com/blog/restic-borg-kopia-backup-vergleich/)
- A March 2026 benchmark (370 MB dataset) found Kopia about 2x faster than Borg and restic, Borg fastest at local restore, and Borg peak memory around 75 MB. The sample is small — [computingforgeeks](https://computingforgeeks.com/borg-restic-kopia-comparison/); [WZ-IT](https://wz-it.com/en/blog/restic-borg-kopia-backup-comparison/)
- BorgBase:
  - From $2/month, with 10 GB and 2 repos free forever and append-only mode secured with 2FA.
  - Small $24/yr (250 GB), Medium $90/yr (1 TB), Large $165/yr.
  - Billed on stored data after compression and dedup.
  - Source: [BorgBase homepage](https://www.borgbase.com/). The freetier.co listing conflicts with this and appears wrong: [freetier.co](https://freetier.co/directory/products/borgbase)
- SimpleBackups:
  - Overage is $10/month per extra 1 TB of serverless transfer or 100 GB of SimpleStorage.
  - The subscription excludes external storage provider fees.
  - A "Startup" plan exists, but no tier prices were found.
  - Source: [SimpleBackups support](https://support.simplebackups.com/en/articles/6453230-understanding-simplebackups-pricing). Capterra's "€34/user/month" looks unreliable: [Capterra](https://www.capterra.com/p/184422/SimpleBackups/)
- SnapShooter (owned by DigitalOcean):
  - Connecting other cloud providers' accounts is deprecated for new users.
  - Exoscale support was dropped on 1 May 2024.
  - The features page was verified 17 Jun 2025, and the DO volume backup guide was edited 11 Feb 2026, so the service is still active but shrinking in scope.
  - Sources: [DO docs connect-other-accounts](https://docs.digitalocean.com/products/snapshooter/how-to/connect-other-accounts/index.html.md); [Exoscale release note](https://docs.digitalocean.com/notes/2024/snapshooter-exoscale); [SnapShooter features](https://docs.digitalocean.com/products/snapshooter/details/features/); [Back up volumes](https://docs.digitalocean.com/products/snapshooter/how-to/back-up-volumes); [Channel Futures acquisition](https://channelfutures.com/mergers-acquisitions/digitalocean-buys-backup-and-recovery-provider-snapshooter)
- Ottomatik:
  - Supports MySQL/MariaDB, PostgreSQL and MongoDB.
  - Targets include S3, GCS, DO Spaces, Backblaze, Wasabi, Dropbox and Filebase.
  - Pricing is "contact vendor", with a free trial.
  - Sources: [Capterra](https://www.capterra.com/p/252617/Ottomatik/); [AZDIGI tutorial](https://azdigi.com/en/blog/tool/ottomatik-convenient-automatic-backup-for-mysql-and-files-on-the-server)
- SpinupWP:
  - Essentials is about $12/month and Advanced about $19/month (per server; aggregator data).
  - Essentials has one daily backup.
  - Backups go to user-supplied S3-compatible storage, including Backblaze B2 and Wasabi.
  - Sources: [ZoftwareHub](https://zoftwarehub.com/en-ae/products/spinupwp/overview); [SpinupWP docs (updated Dec 2024)](https://spinupwp.com/?p=100572)

### Inferences
- A suggested DIY pattern per VPS:
  - Cron runs `mysqldump` or `pg_dump`, piped to `restic backup --stdin`, then pushes to a B2 or R2 bucket with Object Lock and a restic key that can't delete.
  - `restic forget --prune` runs from a separate, privileged admin host.
  - rclone suits copying finished dumps or replicating bucket to bucket (B2 to R2) for a second provider. It is not a backup tool on its own, since it has no encryption-at-rest dedup snapshots unless you use a crypt remote.
- Panel built-ins: I believe Ploi and RunCloud offer DB/site backups to S3-compatible storage, Cloudways offers server-level backups on its own storage with optional off-site add-ons, and SpinupWP backs up to your own S3-compatible bucket. This could not be verified with sources here.

### Gaps
- Ploi, RunCloud and Cloudways backup feature and pricing pages were not returned by search.
- SimpleBackups tier prices, SnapShooter current pricing and Ottomatik prices were not found.
- I found no tested guide for restic plus B2/R2 Object Lock interplay (restic `prune` against locked objects).

## WordPress plugins: UpdraftPlus, BlogVault, Jetpack/VaultPress Backup, WPvivid, ManageWP

### Takeaway
For an agency, off-site SaaS backups (BlogVault, ManageWP) avoid putting load on the client server and give one dashboard. UpdraftPlus agency tiers are cheapest per site but run on-server. Jetpack VaultPress Backup gives real-time backups per site but is priced per site. Plugins duplicate what the panel or server backups do. Use them selectively, for example on sites where clients need self-service restore, or as an independent second channel.

### Cited Findings
- UpdraftPlus:
  - Free version available.
  - Premium Personal (2 sites) is $70/yr (another 2026 roundup says about $91), and Gold is $399/yr.
  - Agency (35 sites) is about $188/yr or $145, and Enterprise (unlimited) about $253/yr or $195. Sources conflict on these figures.
  - Sources: [InstaWP](https://instawp.com/best-wordpress-backup-plugins-as-updraftplus-alternatives/); [Mantrabrain 2026](https://mantrabrain.com/blog/wordpress-backup-plugins/); [fs-code 2026](https://www.fs-code.com/blog/best-wordpress-backup-plugins)
- Jetpack VaultPress Backup has no free backup tier. One 2026 roundup gives an introductory price around €4.95/month for the first year. Scheduling is daily or real-time — [Mantrabrain 2026](https://mantrabrain.com/blog/wordpress-backup-plugins/); [UpdraftPlus vs Jetpack (vendor-authored, 2024)](https://teamupdraft.com/blog/updraftplus-vs-jetpack-which-is-the-best-wordpress-backup-plugin)
- BlogVault:
  - Paid only. Personal (1 site) is about $99/yr, with plans from about $7.40/month.
  - Basic, Plus and Advanced plans, plus separate agency/developer plans.
  - Sources: [fs-code 2026](https://www.fs-code.com/blog/best-wordpress-backup-plugins); [BlogVault comparison (vendor)](https://blogvault.net/updraftplus-vs-jetpack/)
- General comparisons are at [WPBeginner](https://www.wpbeginner.com/showcase/7-best-wordpress-backup-plugins-compared-pros-and-cons/)

### Inferences
- Background knowledge, unverified here:
  - WPvivid has a free core and a Pro version with staging and incremental backups.
  - ManageWP's backup add-on is roughly $2/site/month, with monthly free backups and paid daily or hourly backups.
- Plugin backups are usually WP-specific (DB plus wp-content) and restore easily through the WP UI. That helps RTO for single-site incidents such as a hack or bad update. Server-level dumps are better for bulk disaster recovery.

### Gaps
- No verified 2026 pricing for WPvivid, ManageWP backups, or BlogVault agency plans.
- No vendor pricing pages were fetched directly.

## Managed DB native backups/PITR: Neon, Supabase, DigitalOcean Managed, RDS; whether to export off-provider

### Takeaway
Managed providers cover short-window PITR, but their retention caps and their tie to the account (deletion, suspension, billing lapse, compromise) mean you should also export off-provider. A nightly logical dump to your own locked B2 or R2 bucket is cheap insurance for every managed DB.

### Cited Findings
- Neon:
  - Restore window: Free is 6 hours (capped at 1 GB of history). Launch defaults to 1 day, with a 7-day maximum. Scale defaults to 1 day, with a 30-day maximum.
  - Instant restore storage costs $0.20/GB-month on Launch and Scale.
  - Configured per project with `history_retention_seconds`. Setting it to 0 disables instant restore and Time Travel.
  - Sources: [Neon history window docs](https://neon.com/docs/postgres/backup-restore/history-window); [Neon pricing](https://neon.com/pricing); [Neon usage-based pricing blog](https://neon.com/blog/new-usage-based-pricing)
  - Older figures (Launch $19 and Scale $69 with 7- and 14-day windows) are outdated: [Orb blog](https://www.withorb.com/blog/neon-pricing)
- Supabase:
  - The PITR add-on is listed at $100/month per 7 days of retention. Third parties give $200/mo for 14 days and $400/mo for 28 days.
  - Billed hourly in arrears, and billing stops when the add-on is removed.
  - Daily backups are kept 7 days on Pro, 14 on Team and up to 30 on Enterprise (third-party).
  - Sources: [Supabase pricing](https://supabase.com/pricing.md); [Supabase PITR usage docs](https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery); [wearefounders 2026](https://www.wearefounders.uk/supabase-pricing-2026-every-tier-explained-for-indie-hackers/). The fetch of the official page was blocked, so verify live.
  - Background knowledge, unverified: PITR also requires at least a Small compute add-on.
- SimpleBackups argues that Supabase PITR is only needed when the RPO is under 24h — [SimpleBackups blog](https://simplebackups.com/blog/when-supabase-pitr-needed)
- DigitalOcean Managed Databases:
  - Daily backups with PITR are included.
  - Third parties say retention is 7 days for PostgreSQL and MySQL.
  - Sources: [DO Managed Databases docs](https://docs.digitalocean.com/products/databases); [SimpleBackups blog](https://simplebackups.com/blog/backup-digitalocean-managed-databases)
  - Conflict: whether PITR is limited to higher tiers. SimpleBackups says higher-tier only; [Temperstack](https://www.temperstack.com/learn/digitalocean/automate-database-backups/) says most plans.
  - Third-party claim: native backups can't be exported, so run your own dumps for long-term retention.
- AWS RDS:
  - Automated backup retention goes up to 35 days.
  - Transaction logs ship to S3 every 5 minutes. PITR can restore to any second, with the latest restorable time typically about 5 minutes back.
  - Sources: [AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/backup-recovery/rds.html); [AWS Storage Blog (AWS Backup continuous backup)](https://aws.amazon.com/blogs/storage/point-in-time-recovery-and-continuous-backup-for-amazon-rds-with-aws-backup/)
  - Default retention is 7 days — [Catalyst](https://www.catalyst.net.nz/postgresql-pitr-in-aws-tips-and-usage/)

### Inferences
- Off-provider export is strongly recommended for all managed DBs. The usual causes of loss are account-level: deleted project, suspended account, ransomware with stolen credentials, or provider outage. Provider PITR does not protect against these.
- A cheap approach is a nightly GitHub Action or Coolify scheduled task that runs `pg_dump` against Neon, Supabase or DO and pushes to a B2 or R2 bucket with Object Lock.
- Cost comparison: Supabase PITR at $100+/month per project is expensive for agency client projects. Neon includes PITR via the history window at $0.20/GB-month, which is much cheaper for small DBs.

### Gaps
- DO Managed DB current retention and tier limits were not confirmed from official pages.
- Supabase PITR compute prerequisite and current retention options were not confirmed (fetch blocked).

## Object storage targets with immutability: B2 Object Lock, R2 bucket locks, Wasabi, S3 Glacier; pricing and egress

### Takeaway
Backblaze B2 is about $6.95/TB/month, with full S3 Object Lock (governance and compliance, legal hold), free egress up to 3x stored data, and no minimum duration. That makes it the default immutable target. R2 costs about $15/TB/month with zero egress, and its "bucket locks" are prefix-based retention rules rather than full S3 Object Lock. It is a good second provider for fast restores. Wasabi has a 90-day minimum charge on Pay-Go. Glacier Deep Archive is the cheapest at about $1/TB/month, but has a 180-day minimum and 12–48h retrieval, so it only suits long-term archives.

### Cited Findings
- Backblaze B2:
  - $6.95/TB/month (as of July 2026), with free transactions.
  - Free egress up to 3x average monthly storage, then $0.01/GB.
  - Object Lock supports governance and compliance modes, legal hold, and bucket default retention. There is no minimum storage duration.
  - Sources: [tech-insider B2 vs Wasabi vs S3 2026](https://tech-insider.org/backblaze-b2-vs-wasabi-vs-s3-2026/); [thewearify](https://thewearify.com/backblaze-b2-vs-wasabi/); [sliplane 2026](https://sliplane.io/blog/backblaze-b2-alternatives). Third-party only; the official page was not fetched. Capterra's $6/TB is outdated.
- Cloudflare R2:
  - $0.015/GB-month storage, Class A operations $4.50/million, zero egress.
  - Free tier of 10 GB and 1M Class A operations per month.
  - Source: [Cloudflare R2 product page](https://cloudflare.com/en-ca/products/r2)
  - Infrequent Access is $0.01/GB-month plus $0.01/GB retrieval, and Class B operations are $0.36/million — [Spendbase (third-party)](https://www.spendbase.co/?p=35561)
- Wasabi:
  - Pay-Go is $6.99/TB/month, rising to $7.99/TB on 1 July 2026 per a May 2026 notice cited by a third party.
  - Minimum storage duration is 90 days on Pay-Go and 30 days on Reserved Capacity. Deleting early incurs a "Timed Deleted Storage" charge.
  - Free egress only while downloads stay at or below the stored volume.
  - Sources: [Wasabi docs, minimum storage duration](https://docs.wasabi.com/docs/how-does-wasabis-minimum-storage-duration-policy-work); [Wasabi pricing FAQ](https://wasabi.com/?p=4612); [tech-insider](https://tech-insider.org/backblaze-b2-vs-wasabi-vs-s3-2026/)
- Example for 5 TB stored and 10 TB downloaded: B2 about $34.75 vs Wasabi about $39.95 — [tech-insider](https://tech-insider.org/backblaze-b2-vs-wasabi-vs-s3-2026/)
- Veeam community warns that Wasabi's minimum duration is not a recycle bin, so it is no substitute for immutability — [Veeam community](https://community.veeam.com/blogs-and-podcasts-57/wasabi-minimum-storage-duration-policy-3074)
- S3 Glacier Deep Archive:
  - $0.00099/GB-month in us-east-1, with a 180-day minimum.
  - Retrieval: Standard $0.02/GB (about 12h), Bulk $0.0025/GB (about 48h).
  - Sources: [AWS News Blog](https://aws.amazon.com/blogs/aws/happy-10th-anniversary-amazon-s3-glacier-a-decade-of-cold-storage-in-the-cloud/); [usage.ai](https://www.usage.ai/blogs/aws/storage-cost/glacier-deep-archive-pricing/); [AWS re:Post](https://repost.aws/knowledge-center/s3-manage-data-retrieval)
  - AWS S3 Standard is about $0.023/GB-month, with egress about $0.09/GB after 100 GB free — [Spendbase](https://www.spendbase.co/?p=35561)

### Inferences
- R2 bucket locks, from background knowledge (official docs fetch blocked):
  - These are bucket-level retention rules applied by prefix, with a duration or an indefinite period. They prevent deletion or overwrite while active, and are configured via dashboard, Wrangler or API.
  - They are not the per-object S3 Object Lock API. Tools that expect S3 Object Lock headers (restic, Veeam, etc.) may not use them natively.
  - Verify against developers.cloudflare.com/r2/buckets/bucket-locks/ before relying on this.
- Recommended layout:
  - Primary immutable copy on B2 with Object Lock in compliance mode (e.g. 30 days) and lifecycle rules.
  - Optional secondary on R2 with bucket-lock rules, replicated via rclone for a provider-diverse copy and egress-free restores.
- Use separate, restricted credentials: the backup writer gets put only, with no delete. A different admin account manages retention.

### Gaps
- R2 bucket lock details and any cost were not confirmed (official docs host blocked in this session).
- The official Backblaze pricing page was not fetched, so the $6.95 figure relies on third-party 2026 sources.

## Restore testing automation, encryption best practices, 3-2-1-1-0

### Takeaway
3-2-1-1-0 means 3 copies, on 2 media, with 1 off-site, 1 immutable or air-gapped, and 0 errors after verified restore tests. The "0" is where small agencies usually fail. Automate a scheduled restore of the latest dump into a throwaway container, run sanity queries, and alert on failure.

### Cited Findings
- 3-2-1-1-0 adds an immutable or air-gapped copy and "0 errors after verified recovery testing" to 3-2-1 — [Zmanda](https://www.zmanda.com/blog/understanding-the-3-2-1-1-0-backup-rule/); [Veeam](https://www.veeam.com/blog/what-is-3-2-1-backup-rule.html); [AvePoint](https://www.avepoint.com/blog/backup/what-is-the-3-2-1-backup-rule)
- Immutability is usually via WORM or Object Lock. Vendors claim even admin credentials can't bypass it, which depends on using compliance mode — [Scality, Jul 2026](https://www.solved.scality.com/3-2-1-1-0-backup-strategy-explained/)
- Recommended practices are automated checksum validation, audit logs, and scheduled restore tests — [Scality](https://www.solved.scality.com/3-2-1-1-0-backup-strategy-explained/)
- Pitfall: verification is often disabled or only covers new chunks, so jobs show "OK" while bit rot is first found during a real restore — [datazone.de](https://datazone.de/en/aktuelles/3-2-1-1-0-backup-formel/)
- pgBackRest `verify` re-reads the repo to check integrity — [kunalganglani.com](https://www.kunalganglani.com/blog/postgresql-backup-tools-compared.md)
- Rehearse restores on a scratch data directory — [StackHarbor](https://stackharbor.com/en/knowledge-base/postgres-wal-g-backup-restore/)

### Inferences
- Restore test automation pattern (weekly):
  1. A CI job or cron on a separate VPS pulls the latest dump with restic or rclone.
  2. Start `docker run mariadb` or `postgres`, then import the dump.
  3. Run checks: table counts, `SELECT max(post_date) FROM wp_posts` within the expected age, `wp db check` or `mysqlcheck`, and `pg_restore --list`.
  4. Post the result to a healthcheck service (Healthchecks.io, Uptime Kuma push monitors) so a missing run alerts too.
  5. Also run `restic check --read-data-subset=5%`.
- Encryption:
  - Encrypt client-side before upload, using restic or Kopia repo encryption, rclone crypt, or `age`/`gpg` on dumps.
  - Keep the repo passwords and keys in a password manager or vault outside the backed-up servers. Losing the key makes the immutable backups useless.
  - Use TLS in transit and server-side encryption as defense in depth.
- Agency mapping:
  - Copy 1: live DB.
  - Copy 2: panel or local snapshot (provider snapshots).
  - Copy 3: encrypted restic dump to B2 with Object Lock (the off-site immutable copy).
  - Optional copy 4: R2 or BorgBase on a different provider.
  - "0": automated weekly restore tests with alerting.

### Gaps
- I found no independent (non-vendor) 2026 study on restore-testing frequency for SMBs. Most 3-2-1-1-0 material is vendor marketing.
