# 02 · Admin screens

[← Index](README.md)

Every screen of the Case Studies module, what it shows and how it behaves.
Wireframes for the main screens are in FigJam (see the FigJam board linked in the [README](README.md)).
Roles are Admin, Editor, Author and Viewer; the full matrix is in
the FigJam board (section 3, "Permissions on this screen").

## Navigation

The sidebar shows **Case Studies** as a group:

```
Case Studies
├── Overview
├── All case studies
├── Review queue        (badge: number waiting)
├── Metrics
├── Charts
├── Clients
├── Industries & categories
└── Settings            (Admin only)
```

---

## S1 · Dashboard / Overview

**Purpose:** see the state of the module at a glance and jump to work that needs attention.

| Widget | Content | Click goes to |
| --- | --- | --- |
| Status counts | Draft · In review · Scheduled · Published · Archived | List filtered by that status |
| Needs attention | In review (oldest first), changes requested, scheduled in next 7 days, website refresh failures | The case study |
| Recently updated | Last 5 edited, with author and time | Editor |
| Content health | Published case studies missing: SEO description, cover alt text, testimonial, at least 1 metric | List filtered by the issue |
| Coverage by industry | Count of published case studies per industry (simple bar list) | List filtered by industry |

Primary button: **+ New case study**.

---

## S2 · Case Studies list

**Purpose:** find, sort and act on case studies.

### Layout

- Header: title, **+ New case study** button.
- Status tabs: All · Draft · In review · Scheduled · Published · Archived (with counts).
- Toolbar: search box, **Filters** button (with active-filter count), column
  toggle, rows-per-page selector.
- Active filters shown as removable chips under the toolbar, plus **Clear all**.
- Table.
- Footer: "Showing 1–25 of 84", pagination.

### Columns

| Column | Content | Sortable | Default visible | Notes |
| --- | --- | --- | --- | --- |
| Checkbox | Row selection | — | Yes | For bulk actions |
| Case study title | Title + small slug below; cover thumbnail | Yes (A–Z) | Yes | Click opens editor (or view-only page for Viewer) |
| Client | Client display name | Yes | Yes | "Anonymous" tag if hidden |
| Industry | Primary industry | Yes | Yes | |
| Status | Badge: Draft, In review, Changes requested, Scheduled (with date), Published, Archived | Yes (by workflow order) | Yes | Badges use text + shape, not only color |
| Author | Avatar + name | Yes | Yes | |
| Created | Date | Yes | No | Relative on hover ("3 days ago") |
| Updated | Date | Yes | Yes | **Default sort: Updated, newest first** |
| Published | Date or "—" | Yes | Yes | Scheduled date shown in Status |
| Featured | Star icon | Yes | No | |
| Actions | Row menu | — | Yes | See below |

### Row actions

Shown in a "⋯" menu. Only actions that are valid for the row's status **and**
allowed for the user appear.

| Action | Draft | In review | Scheduled | Published | Archived |
| --- | --- | --- | --- | --- | --- |
| View (read-only) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit | ✓ | ✓¹ | ✓ | ✓ | — (restore first) |
| Preview | ✓ | ✓ | ✓ | ✓ | ✓ |
| View on website | — | — | — | ✓ | — |
| Duplicate | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submit for review | ✓ | — | — | — | — |
| Publish / Schedule | ✓ | ✓ | Publish now | — | — |
| Unpublish | — | — | Cancel schedule | ✓ | — |
| Archive | ✓ | ✓ | ✓ | ✓ | — |
| Restore | — | — | — | — | ✓ |
| Delete | ✓ | — | — | — | ✓ |

¹ Editing an "In review" case study as its author moves it back to Draft (the reviewer is told).

Destructive or public-facing actions (Publish, Unpublish, Archive, Delete) open a
confirmation modal that names the case study and states the effect
("This removes the page from the website.").

### Search

- One box; searches **title, client name, industry name, and keywords**
  (tags, SEO keywords, summary).
- Starts after 2 characters, 400 ms after typing stops.
- Case-insensitive, accent-insensitive, matches partial words.
- Search text is kept in the URL (`?search=roof`) so a search can be shared.
- Phase 2 (only if needed at scale): full-text index or a search engine.

### Filters

| Filter | Control | Behavior |
| --- | --- | --- |
| Industry | Multi-select | Matches primary industry |
| Status | Multi-select | Same as tabs; tab and filter stay in sync |
| Client | Searchable select | |
| Author | Multi-select | "Me" shortcut at the top |
| Date range | Field (Created / Updated / Published) + From / To | Inclusive; presets: last 7 / 30 / 90 days, this year |
| Featured | Yes / No / Any | |
| Content issues | Missing SEO / Missing alt text / No metrics | Matches the dashboard "Content health" links |

Filters are applied with an **Apply** button, combine with AND, and are kept in
the session and in the URL. Changing filters clears the row selection.

### Sorting

- One column at a time; click the header to toggle ascending / descending.
- Default: Updated, newest first. Ties broken by ID.
- Sort is kept in the URL and the session.

### Pagination

- Server-side. Page sizes 10 / **25 (default)** / 50 / 100.
- Page number kept in the URL. Changing search, filters or sort returns to page 1.
- If a bulk action empties the current page, go to the previous page.

### Bulk actions

Appear in a bar when one or more rows are selected ("3 selected · Select all 84
matching"):

| Bulk action | Who | Rule |
| --- | --- | --- |
| Publish | Admin, Editor | Only rows that pass the publish checklist are published |
| Unpublish | Admin, Editor | Published rows only |
| Archive | Admin, Editor | Any non-archived row |
| Restore | Admin, Editor | Archived rows only |
| Change industry / category | Admin, Editor | |
| Set / remove featured | Admin, Editor | Respects max featured from Settings |
| Export CSV | Admin, Editor | Current selection or all matching rows |
| Delete | Admin | Draft and Archived rows only; moves to Trash |

Bulk actions run each row through the same Action class as the single action.
Rows that cannot be processed are skipped and listed in the result:
"Published 7 · Skipped 2 (missing cover image: *Roofing Co.*, *Smile Dental*)".
More than 50 rows run as a background job with a progress notification.

### Permission restrictions on this screen

- **Viewer:** sees the list, cannot select rows; only View and Preview.
- **Author:** sees all case studies; can edit, submit and delete **only their own drafts**; no publish, unpublish, archive, bulk publish.
- **Editor:** everything except Delete of other people's content and Settings.
- **Admin:** everything.

### Empty, loading and error states

| State | Shows |
| --- | --- |
| No case studies yet | Illustration-free message "No case studies yet" + **Create the first one** |
| No results for search/filters | "No case studies match these filters" + **Clear filters** |
| Loading | Skeleton rows (keeps column widths) |
| Action failed | Toast with reason and **Retry** |

---

## S3 · Create / Edit case study (editor)

**Purpose:** fill in a structured form, section by section. Create and Edit use
the same screen; Create starts empty with status Draft.

### Layout

- **Header:** breadcrumb (Case Studies › Edit), title, status badge, **Preview**,
  **Save** (primary). Unsaved-changes dot next to Save.
- **Left / main:** tabs, one per section.
- **Right sidebar** (always visible): Publishing panel, Readiness checklist, Details.
- Leaving with unsaved changes shows a confirmation.
- Tabs with validation errors show a red count ("SEO ·2").

```
Case Study Editor
├── 1. Basic information
├── 2. The challenge
├── 3. Our approach
├── 4. Results & metrics
├── 5. Charts
├── 6. What we learned
├── 7. Client testimonial
├── 8. SEO
└── 9. Settings & relations
```

Required column: **D** = required to save a draft, **P** = required to publish.

### Tab 1 · Basic information

| Field | Type | Req. | Validation / help |
| --- | --- | --- | --- |
| Title | Text | D | 10–120 chars. "Write the result, not the client: *How a roofing company booked 38% more jobs*" |
| Slug | Text (auto from title) | P | Lowercase, hyphens, unique. Editable; changing it on a published case study creates a redirect |
| Client | Select + "Create client" | P | From Clients |
| Show client name | Toggle | — | Off = anonymous; then **Display name** is required ("A home services company") |
| Display name | Text | P if anonymous | |
| Primary industry | Select | P | From Industries |
| Extra categories | Multi-select | — | Services or tags (e.g. SEO, Paid Ads, Local) |
| Location | City, State/Region, Country | P (city + state) | Free text city, select for state and country |
| Engagement period | Start month, End month or "Ongoing" | — | Shown on page as "Mar 2025 – Jun 2026" |
| Summary | Textarea | P | 120–280 chars. Used on cards and as SEO fallback |
| Cover image | Image upload + crop | P | ≥ 1600 × 900, 16:9. **Alt text required** |
| Client logo | Image | — | Taken from Client; can override |
| Headline metrics | Pick up to 3 metrics from tab 4 | — | Shown in the hero strip and on cards |

### Tab 2 · The challenge

| Field | Type | Req. | Validation / help |
| --- | --- | --- | --- |
| Section title | Text | — | Default "The challenge" |
| Challenge | Rich text (paragraphs, bold, italic, lists, links) | P | 300–1500 chars recommended; no headings above H3 |
| Key pain points | Repeater of short text (max 5) | — | Shown as a bullet list |

### Tab 3 · Our approach (Growth System)

| Field | Type | Req. | Validation / help |
| --- | --- | --- | --- |
| Section title | Text | — | Default "Our approach" |
| Approach summary | Rich text | P | |
| Growth System pillars used | Multi-select from Growth Pillars | P (≥ 1) | Links to the Growth System page on the website |
| Per-pillar notes | Repeater: pillar, what we did (rich text), order | — | One row per selected pillar |
| Timeline | Repeater: phase name, period, description | — | Optional; max 6 |

### Tab 4 · Results & metrics

| Field | Type | Req. | Validation / help |
| --- | --- | --- | --- |
| Results summary | Rich text | P | |
| Metrics | Repeater (see below) | P (≥ 1) | Max 8. Drag to reorder |

Metric row:

| Field | Type | Req. | Notes |
| --- | --- | --- | --- |
| Metric | Select from Metric definitions, or "Custom" | Yes | Definition brings label, unit and direction |
| Label | Text | Yes | e.g. "Booked jobs per week" |
| Value | Number | Yes | |
| Unit | Select: %, $, ×, number, custom | Yes | Formats the value ("+38%", "$1.2M", "3.4×") |
| Direction | Increase / Decrease | Yes | Decrease can be good (e.g. cost per lead); shown with the right arrow |
| Before value | Number | — | Enables "from X to Y" |
| Period / comparison | Text | — | "vs. same months of 2025" |
| Source | Text | — | "Measured in CRM" |
| Highlight | Toggle | — | Max 3 highlighted (used in hero) |

### Tab 5 · Charts

List of charts in this case study (title, type, last edited), **+ Add chart**,
drag to reorder. Max 4 per case study. Each chart opens in a side panel or modal:

| Field | Type | Req. | Notes |
| --- | --- | --- | --- |
| Title | Text | Yes | "Booked jobs per week, by month" |
| Chart type | Choice cards: Paired bars (before/after), Bars, Line, Donut, Big number | Yes | Paired bars is the default; matches the site style |
| Series | 1–3 series, each with name and role (Baseline / With Savvy / Other) | Yes | Role sets the color automatically (baseline light gray, Savvy dark) |
| Data | Spreadsheet-like table: one row per category (month), one column per series | Yes | 2–12 rows. Paste from Excel/Sheets, or **Import CSV** |
| Unit / Y-axis label | Text | — | "jobs per week" |
| X-axis caption | Text | — | "Jan → Sep (each pair: 2025 left, 2026 right)" |
| Source note | Text | P | "Measured in CRM" |
| Text summary | Textarea | P | Read by screen readers and used when the chart cannot render. A suggestion is generated from the data ("2026 was higher than 2025 in all 9 months…") |
| Show trend arrows | Toggle | — | Up/down arrows next to bars |
| Placement | Select: After results summary / After metrics / End of results | — | Default: After results summary |

The panel shows a **live preview** in the website's style. Validation: all cells
numeric, no empty cells (use 0), same number of values per series.

### Tab 6 · What we learned

| Field | Type | Req. | Notes |
| --- | --- | --- | --- |
| Section title | Text | — | Default "What we learned" |
| Lessons | Repeater: headline + short text | — | Max 5 |
| Closing paragraph | Rich text | — | |

### Tab 7 · Client testimonial

| Field | Type | Req. | Notes |
| --- | --- | --- | --- |
| Testimonial | Select existing (filtered by client) or **Create new** | — | Recommended; flagged on dashboard if missing |
| Quote | Textarea | Yes (if new) | ≤ 400 chars |
| Person name | Text | Yes (if new) | |
| Role / title | Text | — | |
| Photo | Image | — | Alt text required |
| Approved by client | Toggle + date | Yes to publish with testimonial | Legal check |

### Tab 8 · SEO

| Field | Type | Req. | Notes |
| --- | --- | --- | --- |
| Meta title | Text | — | Falls back to Title. Counter, warning above 60 chars |
| Meta description | Textarea | P | 70–160 chars, counter. Falls back to Summary only for drafts |
| Focus keywords | Tags | — | Also used by admin search |
| Social image | Image | — | Falls back to Cover image |
| Canonical URL | URL | — | Only if republished elsewhere |
| Hide from search engines | Toggle | — | Adds `noindex` |
| Search preview | Read-only | — | Google-style snippet preview |

### Tab 9 · Settings & relations

| Field | Type | Notes |
| --- | --- | --- |
| Featured | Toggle | Appears on Home and top of Results page; max from Settings |
| Display order | Number | For manual ordering on the Results page |
| Related case studies | Multi-select (max 3) | Empty = automatic (same industry) |
| Call to action | Select: Explore Partnership (default) / Are We a Fit? / Custom | Custom = label + link |
| Internal notes | Textarea | Never published |

### Right sidebar

**Publishing panel**

- Status badge and what it means ("Draft · only visible in the CMS").
- Buttons by status and role: **Submit for review**, **Approve & publish**,
  **Request changes**, **Publish**, **Schedule…**, **Unpublish**, **Archive**.
- Published at / Scheduled for / Last published by.
- "View on website" link when published.

**Readiness checklist** (live, ticks as fields are filled)

- Title, slug, client, industry, location
- Summary, cover image with alt text
- Challenge, approach (+ at least one pillar), results summary
- At least one metric
- Every chart has a source note and text summary
- Meta description
- Testimonial approved by client (if a testimonial is attached)

Publish is disabled until every item passes; hovering the button lists what's
missing.

**Details:** author (Admins can reassign), created, updated, revision count with
**History** link.

### Revision history

Side panel listing revisions (who, when, status change, short summary). Select
one to see a field-by-field comparison with the current version and **Restore
this version** (creates a new revision; never overwrites history).

### Concurrent editing

When another person opens the same case study, a banner shows
"Maria is also editing". On save, if the record changed since it was opened,
the save is blocked with **Review changes** / **Overwrite** (Overwrite: Admin
and Editor only).

---

## S4 · Preview

- Opened from the editor, the list, or the review queue. Opens in a new tab.
- Shows the real website page with a fixed top banner:
  "Preview · Draft · last saved 14:32 by Ana · [Back to editor] [Desktop | Tablet | Mobile]".
- Shows the last saved version. Link valid 60 minutes.
- Works for every status, including Archived.
- Viewers can preview; preview links can be copied for internal sharing only (they expire).

---

## S5 · Publishing management (Review queue & schedule)

**Purpose:** one place for the review and publishing work.

Tabs:

| Tab | Table columns | Actions |
| --- | --- | --- |
| Waiting for review | Title, author, submitted at, waiting time | Open, Preview, Approve & publish, Request changes |
| Changes requested | Title, author, reviewer comment, requested at | Open |
| Scheduled | Title, scheduled for, scheduled by | Publish now, Change date, Cancel schedule |
| Recently published | Title, published at, by, website refresh status | View on website, Unpublish, Retry refresh |

**Request changes** opens a modal with a required comment; the author gets a
notification and sees the comment at the top of the editor.

---

## S6 · Metrics management

**Purpose:** keep metric names, units and formats consistent across case studies.

- **Metric definitions** table: label, unit, direction (higher is better / lower
  is better), format example, used in N case studies, active.
- Create / edit definition in a modal. Definitions in use cannot be deleted, only deactivated.
- **All metric values** view (read-only): every metric across case studies with
  filters by definition and industry. Useful for the Results page summary and
  sales ("average lift in booked jobs").

---

## S7 · Charts management

**Purpose:** overview of every chart, and the shared chart style.

- **All charts** table: chart title, case study, type, status of the case study,
  last edited, missing source/summary flags. Click opens the chart inside its case study.
- **Chart presets** (Admin): named starting points (e.g. "Before / After by
  month", "Monthly trend") with default type, series roles and captions. Used by
  **+ Add chart → Start from preset**.
- **Style** (read-only for non-developers): shows the brand palette and fonts the
  website uses. Colors are not chosen per chart; they come from series roles.

---

## S8 · Clients

Table: name, logo, industry, case studies count, website. Form: name, logo
(alt text), website, primary industry, location, "can be named publicly"
(default for new case studies), internal contact notes. Clients with case
studies cannot be deleted.

## S9 · Industries & categories

Two simple ordered lists (drag to reorder):

- **Industries** (shared with the website's Industries section): name, slug,
  short description, icon, active, order. Deactivating hides the filter on the
  website; case studies keep their value.
- **Categories / services**: name, slug, active, order.
- **Growth pillars** (shared with the Growth System section): name, slug, short
  description, order.

Deleting is blocked while in use; the screen offers **Merge into…** instead.

## S10 · Module settings (Admin only)

| Setting | Default |
| --- | --- |
| Website URL prefix | `/results` |
| Require review before publishing | On |
| Who can approve | Editor and Admin roles |
| Max featured case studies | 3 |
| Max highlighted metrics per case study | 3 |
| Max charts per case study | 4 |
| Items per page on website list | 9 |
| Default call to action | Explore Partnership |
| Default social image | (upload) |
| Trash retention | 30 days |
| Notifications | Email on: submitted for review, changes requested, published, refresh failed |
