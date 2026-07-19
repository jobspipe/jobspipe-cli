# jobspipe-cli

The CLI and agent skill for the [JobsPipe](https://jobspipe.dev) API. Two
functions, one host, one key:

- **Job search** — live, normalized job postings from 30+ sources.
- **Tech search** — detect the tech stack a domain runs.

## Install

For AI coding agents (installs the skill in `SKILL.md`):

```bash
npx skills add jobspipe/jobspipe-cli
export JOBSPIPE_API_KEY=jp_live_YOUR_KEY
```

Or install the full [JobsPipe skill collection](https://skills.sh/jobspipe/skills) - job search, stack scan, MCP setup, webhooks, and agent discovery:

```bash
npx skills add jobspipe/skills
```

As a standalone CLI:

```bash
npx jobspipe-cli --help
export JOBSPIPE_API_KEY=jp_live_YOUR_KEY
```

Get a free key at https://jobspipe.dev/signup (free tier: 100 credits/month, 1 credit = 1 request).

## Usage

```bash
jobspipe jobs --title "software engineer" --country US --remote --limit 5
jobspipe jobs '{"description_or":["rust"],"posted_at_max_age_days":7,"limit":10}'
jobspipe stack stripe.com
jobspipe stack vercel.com --mode render
jobspipe --help
```

Both commands print JSON to stdout. Authenticate with `JOBSPIPE_API_KEY` (or
`--api-key`). Override the host with `--base-url` or `JOBSPIPE_BASE_URL`.

### Jobs flags

`--title`, `--exclude-title`, `--description`, `--country`, `--exclude-country`,
`--location`, `--company`, `--company-like`, `--seniority`, `--employment-type`, `--source`
(repeatable), `--remote` / `--no-remote`, `--max-age-days`, `--since`, `--until`,
`--limit`, `--offset`, `--total`. A raw filter object (positional arg or stdin)
overrides the flags and exposes the full API surface.

### Stack flags

`--mode auto|html|render` (default `auto`).

## Develop

```bash
node --test
```

## Resources

- [JobsPipe API docs](https://docs.jobspipe.dev)
- [JobsPipe developer portal](https://jobspipe.dev/developers)
- [JobsPipe OpenAPI spec](https://jobspipe.dev/openapi)
- [JobsPipe MCP server](https://jobspipe.dev/mcp-server)
- [API authentication](https://docs.jobspipe.dev/authentication)
