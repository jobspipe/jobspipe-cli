---
name: jobspipe
description: Search live job postings and detect a company's tech stack with the JobsPipe API. Use when an agent needs real hiring data (open roles, hiring signals, sourcing, salary and location) or to identify which technologies a domain runs.
---

# JobsPipe

JobsPipe is a developer API with two functions over one host and one key:

1. **Job search** — live, normalized job postings from 30+ ATS and job-board
   sources (Workday, Greenhouse, Lever, Ashby, LinkedIn, and more), deduplicated
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
`jp_live_`. Get one free at https://jobspipe.dev/signup (free tier: 5,000
requests/month, no card).

```
Authorization: Bearer jp_live_YOUR_KEY
```

Set it once:

```bash
export JOBSPIPE_API_KEY=jp_live_YOUR_KEY
```

## Install the CLI (required to run `jobspipe`)

The `jobspipe` commands in this skill need the CLI. Installing this skill does
**not** install it — `npx skills add` only copies this file. Before running any
`jobspipe` command, install the npm package globally and set your key:

```bash
npm i -g jobspipe-cli
export JOBSPIPE_API_KEY=jp_live_YOUR_KEY
```

Then `jobspipe jobs ...` and `jobspipe stack ...` are available. Run
`jobspipe --help` for every flag. Verify your key with `jobspipe jobs --limit 1`.
No install needed? Use the equivalent `curl` examples below instead.

## Function 1 — Job search

`POST /v1/jobs/search`. The body is a JSON object of filters; all fields are
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
`job_country_code_or`, `remote`, `posted_at_max_age_days`, `posted_at_gte` and
`posted_at_lte` (`YYYY-MM-DD`), `company_name_or`,
`company_name_partial_match_or`, `job_seniority_or`, `employment_type_or`
(full-time, part-time, contract, temporary, internship), `source_or`,
`limit`, `offset`, `include_total_results`.

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
      "seniority": "Mid-Senior",
      "min_annual_salary_usd": 150000,
      "max_annual_salary_usd": 190000,
      "date_posted": "2026-06-18",
      "technology_slugs": ["go", "postgres"],
      "final_url": "https://example.com/careers/3958211043"
    }
  ]
}
```

`limit` is capped by your plan (free 25, builder 100, scale 500). Paginate with
`offset` (or follow `metadata.next_cursor`) until fewer than `limit` rows return.

## Function 2 — Tech search (stack scan)

`POST /v1/stack/scan`. Give a domain; get the technologies detected on it.
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

Scans are cached for about 14 days; a repeat within that window is served from
cache and still counts as one request.

## Errors

Both functions return `{ "error": "..." }` with these statuses:

- `400` — invalid domain (stack scan only).
- `401` — missing or invalid API key.
- `402` — monthly request quota exceeded.
- `429` — per-second rate limit exceeded; slow down and retry.
- `502` — scanner failed (stack scan); retry or try `--mode render`.
- `504` — upstream timed out; retry.

## Notes

- Job records are deduplicated across sources; the same role appears once.
- Salary is parsed into structured ranges (`*_annual_salary*`) when present.
- Full schema and guides: https://jobspipe.dev/docs
