#!/usr/bin/env node
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DEFAULT_BASE_URL = "https://api.jobspipe.dev";

const BOOLEAN_FLAGS = new Set(["remote", "no-remote", "total", "help", "h"]);

const SUGAR_TO_FILTER = {
  title: "job_title_or",
  "exclude-title": "job_title_not",
  description: "description_or",
  "exclude-description": "description_not",
  country: "job_country_code_or",
  "exclude-country": "job_country_code_not",
  company: "company_name_or",
  "company-like": "company_name_partial_match_or",
  seniority: "job_seniority_or",
  "employment-type": "employment_type_or",
  source: "source_or",
};

const UPPERCASE_FLAGS = new Set(["country", "exclude-country"]);

export function parseArgs(argv) {
  const positionals = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (token.startsWith("--")) {
      const name = token.slice(2);
      if (BOOLEAN_FLAGS.has(name)) {
        (flags[name] ||= []).push(true);
      } else {
        (flags[name] ||= []).push(argv[++i]);
      }
    } else if (token.startsWith("-") && token.length > 1) {
      (flags[token.slice(1)] ||= []).push(true);
    } else {
      positionals.push(token);
    }
  }
  return { positionals, flags };
}

function values(flags, name) {
  return (flags[name] || []).filter((v) => typeof v === "string" && v.length > 0);
}

function lastValue(flags, name) {
  const list = values(flags, name);
  return list.length ? list[list.length - 1] : undefined;
}

function toInt(value) {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

export function buildFilters(flags) {
  const filters = {};
  for (const [flag, field] of Object.entries(SUGAR_TO_FILTER)) {
    let list = values(flags, flag);
    if (UPPERCASE_FLAGS.has(flag)) list = list.map((c) => c.toUpperCase());
    if (list.length) filters[field] = list;
  }
  if (flags["remote"]) filters.remote = true;
  if (flags["no-remote"]) filters.remote = false;
  const maxAge = toInt(lastValue(flags, "max-age-days"));
  if (maxAge !== undefined) filters.posted_at_max_age_days = maxAge;
  const since = lastValue(flags, "since");
  if (since) filters.posted_at_gte = since;
  const until = lastValue(flags, "until");
  if (until) filters.posted_at_lte = until;
  const limit = toInt(lastValue(flags, "limit"));
  if (limit !== undefined) filters.limit = limit;
  const offset = toInt(lastValue(flags, "offset"));
  if (offset !== undefined) filters.offset = offset;
  if (flags["total"]) filters.include_total_results = true;
  return filters;
}

function readStdin() {
  try {
    if (process.stdin.isTTY) return "";
    return readFileSync(0, "utf8").trim();
  } catch {
    return "";
  }
}

function rawJsonFrom(positionals) {
  const inline = positionals.find((p) => p.trim().startsWith("{"));
  const source = inline || readStdin();
  if (!source) return {};
  try {
    const parsed = JSON.parse(source);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    fail(`could not parse JSON filter: ${source.slice(0, 80)}`);
  }
  return {};
}

function config(flags) {
  const apiKey = lastValue(flags, "api-key") || process.env.JOBSPIPE_API_KEY;
  const rawBase = lastValue(flags, "base-url") || process.env.JOBSPIPE_BASE_URL || DEFAULT_BASE_URL;
  let url;
  try {
    url = new URL(rawBase);
  } catch {
    fail(`invalid base URL: ${rawBase}`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    fail(`base URL must use http or https: ${rawBase}`);
  }
  return { apiKey, baseUrl: url.origin + url.pathname.replace(/\/$/, "") };
}

function fail(message) {
  process.stderr.write(`jobspipe: ${message}\n`);
  process.exit(1);
}

function hintForStatus(status) {
  if (status === 401) return "check JOBSPIPE_API_KEY (free key: https://jobspipe.dev/signup)";
  if (status === 402) return "monthly request quota exceeded for your plan";
  if (status === 429) return "per-second rate limit exceeded, slow down and retry";
  if (status === 502) return "scanner failed, retry or try --mode render";
  if (status === 504) return "upstream timed out, retry the request";
  return "";
}

async function request(baseUrl, apiKey, path, body) {
  if (!apiKey) {
    fail("missing API key: export JOBSPIPE_API_KEY=jp_live_... (free key: https://jobspipe.dev/signup)");
  }
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    fail(`request failed: ${error.message}`);
  }
  const text = await response.text();
  if (!response.ok) {
    const hint = hintForStatus(response.status);
    const detail = text || response.statusText;
    fail(`${response.status} ${detail}${hint ? ` — ${hint}` : ""}`);
  }
  return text;
}

function output(text) {
  try {
    process.stdout.write(`${JSON.stringify(JSON.parse(text), null, 2)}\n`);
  } catch {
    process.stdout.write(`${text}\n`);
  }
}

async function runJobs(flags, positionals) {
  const filters = { ...buildFilters(flags), ...rawJsonFrom(positionals) };
  const { baseUrl, apiKey } = config(flags);
  output(await request(baseUrl, apiKey, "/v1/jobs/search", filters));
}

async function runStack(flags, positionals) {
  const domain = positionals.find((p) => !p.trim().startsWith("{"));
  if (!domain) fail("usage: jobspipe stack <domain> [--mode auto|html|render]");
  const body = { domain };
  const mode = lastValue(flags, "mode");
  if (mode) body.mode = mode;
  const { baseUrl, apiKey } = config(flags);
  output(await request(baseUrl, apiKey, "/v1/stack/scan", body));
}

const HELP = `jobspipe — search jobs and scan tech stacks via the JobsPipe API

Usage:
  jobspipe jobs [filters-json] [flags]     POST /v1/jobs/search
  jobspipe stack <domain> [--mode MODE]    POST /v1/stack/scan

Auth:
  export JOBSPIPE_API_KEY=jp_live_...      free key: https://jobspipe.dev/signup
  or pass --api-key jp_live_...

Jobs flags (repeatable where shown):
  --title T              match job titles
  --exclude-title T      exclude job titles
  --description T        match description text, e.g. a skill or tech
  --country CC           ISO country code, e.g. US
  --exclude-country CC   exclude ISO country code
  --company NAME         exact company name
  --company-like NAME    partial company name
  --seniority LEVEL      seniority level
  --employment-type T    full-time | part-time | contract | temporary | internship
  --source S             source platform, e.g. linkedin
  --remote | --no-remote
  --max-age-days N       only postings newer than N days
  --since YYYY-MM-DD --until YYYY-MM-DD
  --limit N --offset N --total
  filters-json           raw filter object that overrides the flags above
                         (also read from stdin), e.g.
                         jobspipe jobs '{"job_title_or":["data engineer"]}'

Stack flags:
  --mode auto|html|render   scan strategy (default auto)

Global:
  --base-url URL   override API host (default https://api.jobspipe.dev)
  -h, --help

Examples:
  jobspipe jobs --title "software engineer" --country US --remote --limit 5
  jobspipe jobs '{"description_or":["rust"],"posted_at_max_age_days":7,"limit":10}'
  jobspipe stack stripe.com
`;

function main() {
  const { positionals, flags } = parseArgs(process.argv.slice(2));
  const command = positionals.shift();
  if (!command || command === "help" || flags["help"] || flags["h"]) {
    process.stdout.write(HELP);
    process.exit(0);
  }
  if (command === "jobs") return runJobs(flags, positionals);
  if (command === "stack") return runStack(flags, positionals);
  fail(`unknown command "${command}" — run "jobspipe --help"`);
}

// ponytail: realpathSync resolves the bin symlink npm creates, else argv[1]
// (the symlink) never equals import.meta.url (the real path) and main() is skipped.
let invokedAsBin = false;
try {
  invokedAsBin = realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
} catch {}
if (invokedAsBin) main();
