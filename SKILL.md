---
name: jobspipe
description: Search live job postings and detect a company's tech stack with the JobsPipe API. Use when an agent needs real hiring data (open roles, hiring signals, sourcing, salary and location) or to identify which technologies a domain runs.
---

# JobsPipe

JobsPipe is a developer API with two functions over one host and one key:

1. **Job search** — live, normalized job postings from 30+ ATS and job-board
   sources (Workday, Greenhouse, Lever, Ashby, LinkedIn, and more), normalized
   into one JSON schema.
2. **Tech search (stack scan)** — detect the technologies a given domain runs
   (frameworks, CDNs, analytics, payments, and more), with confidence scores.

Base URL: `https://api.jobspipe.dev`

## When to use

- Find, list, or analyze open job postings (by title, skill/tech, location,
  remote, seniority, company, recency).
- Use open roles as a hiring/buying signal for a company.
- Identify which technologies a company or domain uses.

## Authentication

Every request needs an API key sent as a Bearer token. Keys start with
`jp_live_`. Get one free at https://jobspipe.dev/signup (free tier: 1,000
credits once, with no refill, 1 credit = 1 job returned. Paid plans are fixed
monthly packages, from $19.60 a month for 10,000 credits).

```
Authorization: Bearer jp_live_YOUR_KEY
```

Set it once:

```bash
export JOBSPIPE_API_KEY=jp_live_YOUR_KEY
```

## Install the CLI

Installing this skill does **not** install the CLI — `npx skills add` only
copies this file. Install the CLI once (global), so the `jobspipe` command is
on PATH, then set your key:

```bash
npm i -g jobspipe-cli
export JOBSPIPE_API_KEY=jp_live_YOUR_KEY
```

Then `jobspipe jobs ...` and `jobspipe stack ...` work directly. Run
`jobspipe --help` for every flag. Verify your key with `jobspipe jobs --limit 1`.
Can't install globally? Prefix any command with `npx -y`, e.g.
`npx -y jobspipe-cli jobs --limit 1`. No Node at all? Use the `curl` examples below.

## Function 1 — Job search

`POST /v1/jobs/search`. The body is a JSON object of filters. All fields are
optional and combine with AND. Array filters ending in `_or` match any value.
An empty body returns the most recent postings.

```bash
curl -s https://api.jobspipe.dev/v1/jobs/search \
  -H "Authorization: Bearer $JOBSPIPE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "job_title_or": ["software engineer", "backend engineer"],
    "job_country_code_or": ["US"],
    "remote": true,
    "posted_at_max_age_days": 7,
    "limit": 25,
    "include_total_results": true
  }'
```

CLI equivalent:

```bash
jobspipe jobs --title "software engineer" --title "backend engineer" \
  --country US --remote --max-age-days 7 --limit 25 --total
```

Pass a raw filter object for the full surface (overrides any flags, also read
from stdin):

```bash
jobspipe jobs '{"description_or":["rust"],"posted_at_max_age_days":7,"limit":10}'
```

Common filters: `job_title_or`, `job_title_not`, `description_or`
(match a skill or tech in the description), `description_not`,
`job_country_code_or`, `region_or` (US states and Canadian provinces as ISO
3166-2 codes, e.g. `["US-NY","CA-ON"]`), `city_or` (whole city names,
spellings normalised: `["Munich"]` also finds München), `remote`, `work_arrangement_or`
(any of `remote`, `hybrid`, `onsite` — partial coverage, see below),
`posted_at_max_age_days`, `posted_at_gte` and
`posted_at_lte` (`YYYY-MM-DD`), `company_name_or`,
`company_name_partial_match_or`, `job_seniority_or`, `employment_type_or`
(full-time, part-time, contract, temporary, internship) plus
`include_unlabeled_employment_type` to keep the 27% of postings that state no
type, `source_or`, `source_not`,
`min_salary_usd` (posted pay only, annual USD), `visa_sponsorship_or` (any of
`offers`, `no`, `citizenship_required`, parsed from the posting text),
`benefits_or` (benefit slugs, e.g. `["401k","health insurance"]`),
`metro_code_or` (US CBSA metro codes, e.g. `["35620"]` New York),
`max_applicant_count` (LinkedIn only, drops jobs without a count),
`has_recruiter_email`, `max_ghost_score` (0-100, unscored jobs always pass),
`esco_skill_id_or` (exact ESCO concept IDs),
`limit`, `offset`, `include_total_results`.

**`work_arrangement_or` matches only part of the corpus.** About 21% of postings
carry an arrangement, so the filter returns a real but partial slice and silently
drops the rest. Use `remote` for breadth, and `work_arrangement_or` when hybrid and
onsite must be told apart.

It is the right filter for "hybrid" or "onsite" / "on-site" /
"in office", because the `remote` boolean answers false for hybrid and onsite alike
and cannot tell them apart. Jobs whose arrangement is unknown never match it, which
makes it stricter than the boolean rather than a drop-in replacement.

```bash
jobspipe jobs --title "product manager" --remote --country US --limit 25

# Matches only postings that state an arrangement, about 21% of the corpus.
jobspipe jobs --work-arrangement hybrid --work-arrangement onsite --limit 25
```

Response:

```json
{
  "metadata": {
    "total_results": 412,
    "truncated_results": 25,
    "next_cursor": "eyJvZmZzZXQiOjI1fQ"
  },
  "data": [
    {
      "id": "jp_3958211043",
      "job_title": "Backend Engineer",
      "company": "Acme Inc",
      "company_domain": "acme.com",
      "location": "Remote · United States",
      "country_code": "US",
      "remote": true,
      "work_arrangement": "remote",
      "seniority": "senior",
      "is_manager": false,
      "job_function": "Engineering",
      "min_annual_salary_usd": 150000,
      "max_annual_salary_usd": 190000,
      "date_posted": "2026-06-18",
      "last_seen_at": "2026-06-24 06:01:02",
      "verified_at": "2026-06-24 06:36:28",
      "status": "active",
      "technology_slugs": ["go", "postgres"],
      "url": "https://job-boards.greenhouse.io/acme/jobs/3958211043",
      "source_url": "https://job-boards.greenhouse.io/acme/jobs/3958211043",
      "final_url": null,
      "sources": [
        {
          "provider": "greenhouse",
          "url": "https://job-boards.greenhouse.io/acme/jobs/3958211043",
          "seen_at": "2026-06-24T06:01:02.697258+00:00"
        }
      ]
    }
  ]
}
```

`limit` is capped by your plan (free 25, builder 100, scale 500). Paginate with
`offset` (or follow `metadata.next_cursor`) until fewer than `limit` rows return.

## Function 2 — Tech search (stack scan)

`POST /v1/stack/scan`. Give a domain and get the technologies detected on it.
`mode` is optional: `auto` (default, fast HTTP then headless render if thin),
`html`, or `render`.

```bash
curl -s https://api.jobspipe.dev/v1/stack/scan \
  -H "Authorization: Bearer $JOBSPIPE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "domain": "stripe.com" }'
```

CLI equivalent:

```bash
jobspipe stack stripe.com
jobspipe stack vercel.com --mode render
```

Response:

```json
{
  "domain": "stripe.com",
  "scanned_at": "2026-06-25T12:00:00.000Z",
  "http_status": 200,
  "render_path": "curl_cffi",
  "detected": [
    {
      "slug": "react",
      "name": "React",
      "categories": ["JavaScript frameworks"],
      "confidence": 95,
      "version": null,
      "signals": [{ "kind": "script", "match": "react.production.min.js" }],
      "website": "https://react.dev",
      "pricing": ["open source"],
      "saas": false,
      "oss": true
    }
  ]
}
```

Scans are cached for about 14 days. A repeat within that window is served from
cache and costs 3 credits. A live scan that detects a technology costs 5. A scan
that detects nothing costs nothing.

## Errors

Both functions return `{ "error": "..." }` with these statuses:

- `400` — invalid domain (stack scan only).
- `401` — missing or invalid API key.
- `402` — monthly request quota exceeded.
- `429` — per-second rate limit exceeded. Slow down and retry.
- `502` — scanner failed (stack scan). Retry or try `--mode render`.
- `504` — upstream timed out. Retry.

## Notes

- Jobs are keyed per source: a role posted to two boards is two records with two
  `id`s, each with its own single-entry `sources`. An `id` is stable over time, so
  it can be stored and re-looked-up.
- Salary is parsed into structured ranges (`*_annual_salary*`) when present.
  `salary_source` says where it came from (`source` / `description`).
- `estimated_min/avg/max_annual_salary_usd` are corpus benchmarks (25th/median/75th
  percentile for the occupation and location), published beside any observed pay and
  never replacing it. `salary_type` is `observed` when the posting states pay,
  `estimated` when only the benchmark exists.
- `ghost_score` (0-100, `null` until scored) rates how likely a posting is stale or
  evergreen rather than a live vacancy. Filter with `max_ghost_score`. Unscored jobs
  always pass it.
- More enrichment fields on each job: `visa_sponsorship` (`offers` / `no` /
  `citizenship_required`), `benefits[]`, `applicant_count` (LinkedIn),
  `recruiter_emails[]`, `listing_type`, `expires_at`, `metro_code` + `metro_label`
  (US CBSA), `esco_skills[{id,label}]`, `work_arrangement_source`,
  `seniority_source`, and `company_object.founded`.
- Apply links are `url` and `source_url`, populated on every job. `final_url` is
  the employer's own apply page (usually its ATS) when the board links off-site,
  and `null` otherwise. Prefer it when set, else send the user to `url`.
- `seniority` is one of `entry_level`, `mid_level`, `senior`, `director`,
  `executive`, or `null` (about 55% of postings state no level).
- `work_arrangement` (`remote` / `hybrid` / `onsite`) is the field-level counterpart
  of `work_arrangement_or`. About 21% of postings carry one and the rest read
  `null`. Read `remote` for breadth.
- `is_manager` says whether the role manages people. Use it with `seniority`:
  `"director"` also covers staff and principal individual contributors.
- `last_seen_at` is when we last saw the posting live and `verified_at` is when
  we last updated its status. To tell if a posting is open, read `status`.
- `reposted` is `true`, and `date_reposted` holds the newest listed date, when
  LinkedIn re-listed a posting after we first saw it. `false` means no evidence
  of a re-listing, not proof there was none: every other source reads `false`.
- `easy_apply` is `true` when LinkedIn takes the application itself (Easy Apply)
  and `false` when it sends the applicant to the employer's site. Every other
  source reads `null`, and so does a LinkedIn posting whose page did not say or
  that has not been re-read since 2026-11-24.
- `hiring_team`, `matching_phrases` and `matching_words` are always empty. Do not
  branch on them.
- Full schema and guides: https://jobspipe.dev/docs
