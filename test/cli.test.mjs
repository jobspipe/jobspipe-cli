import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFilters, parseArgs } from "../bin/jobspipe.mjs";

test("parseArgs separates command, repeatable values and boolean flags", () => {
  const { positionals, flags } = parseArgs([
    "jobs",
    "--title", "a",
    "--title", "b",
    "--remote",
    "--limit", "5",
  ]);
  assert.deepEqual(positionals, ["jobs"]);
  assert.deepEqual(flags.title, ["a", "b"]);
  assert.deepEqual(flags.remote, [true]);
  assert.deepEqual(flags.limit, ["5"]);
});

test("parseArgs treats -- as end of flags", () => {
  const { positionals } = parseArgs(["stack", "--", "--weird.com"]);
  assert.deepEqual(positionals, ["stack", "--weird.com"]);
});

test("buildFilters maps sugar flags to the API filter object", () => {
  const { flags } = parseArgs([
    "--title", "software engineer",
    "--exclude-title", "manager",
    "--description", "rust",
    "--country", "us",
    "--country", "gb",
    "--company-like", "acme",
    "--remote",
    "--max-age-days", "7",
    "--limit", "25",
    "--total",
  ]);
  assert.deepEqual(buildFilters(flags), {
    job_title_or: ["software engineer"],
    job_title_not: ["manager"],
    description_or: ["rust"],
    job_country_code_or: ["US", "GB"],
    company_name_partial_match_or: ["acme"],
    remote: true,
    posted_at_max_age_days: 7,
    limit: 25,
    include_total_results: true,
  });
});

test("buildFilters honors --no-remote", () => {
  const { flags } = parseArgs(["--no-remote"]);
  assert.deepEqual(buildFilters(flags), { remote: false });
});

test("buildFilters returns an empty object with no flags", () => {
  assert.deepEqual(buildFilters({}), {});
});
