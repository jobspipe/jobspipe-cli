# AGENTS.md — JobsPipe

Instructions for AI coding agents working with the JobsPipe API and this CLI.

JobsPipe is a developer API with two functions over one host and one key:

1. **Job search** — live, normalized job postings from 30+ ATS and job-board
   sources (Workday, Greenhouse, Lever, Ashby, LinkedIn, and more), keyed per
   source.
2. **Tech search (stack scan)** — detect the technologies a domain runs, with
   confidence scores.

## Install this skill

```bash
npx skills add jobspipe/jobspipe-cli
npm i -g jobspipe-cli
export JOBSPIPE_API_KEY=jp_live_YOUR_KEY
```

Get a free key at https://jobspipe.dev/signup. A new account gets 1,000 credits
once. They do not refill.

The full agent skill — every filter, response shape, and error code — is in
[`SKILL.md`](./SKILL.md). Read it before generating API calls.

## Commands

```bash
jobspipe jobs --title "software engineer" --country US --remote --limit 5
jobspipe jobs '{"description_or":["rust"],"posted_at_max_age_days":7,"limit":10}'
jobspipe stack stripe.com
jobspipe --help
```

Both print JSON to stdout. Authenticate with `JOBSPIPE_API_KEY` (or `--api-key`).

## Conventions for agents

- Prefer the CLI for one-off lookups. Call the REST API directly
  (`https://api.jobspipe.dev`) when integrating into code.
- A raw filter object (positional arg or stdin) overrides flags and exposes the
  full job-search surface — use it when a flag does not exist.
- Respect quota and rate limits: `402` means the account is out of credits, `429` means
  slow down and retry.
- Stack scans are cached for about 14 days. A live scan costs 5 credits and a
  cached one 3.

## Resources

- API docs: https://jobspipe.dev/docs
- OpenAPI spec: https://jobspipe.dev/openapi.json
- Authentication & agent auth: https://jobspipe.dev/auth.md
- MCP server: https://mcp.jobspipe.dev/mcp (send your key as `Authorization: Bearer jp_live_...`)
- Machine-readable index: https://jobspipe.dev/llms.txt
