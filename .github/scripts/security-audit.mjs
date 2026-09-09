#!/usr/bin/env node
// Security-audit gate for the backend CI workflow (.github/workflows/ci.yaml).
//
// Runs `npm audit` against the PRODUCTION dependency tree (--omit=dev) and
// fails the build when a HIGH or CRITICAL advisory is reported for a package
// that is not explicitly allowlisted. Development-only toolchains (Vitest /
// Vite / esbuild) are excluded entirely because they are pruned by --omit=dev
// and their fixes require breaking major upgrades.
//
// The allowlist below is the ONLY exception to the high/critical gate. Every
// entry is a package that npm reports as HIGH purely because of the Prisma CLI
// shipped inside the production `@prisma/client` dependency; that CLI is never
// executed by the server at runtime, and fixing it requires a breaking Prisma
// upgrade. Any NEW high/critical advisory — including on @prisma/client or a
// future Prisma release — is NOT masked by this list and will fail the build.
//
// Run locally from the backend directory:
//   node ../.github/scripts/security-audit.mjs

import { spawnSync } from "node:child_process";

const SEVERITY_ORDER = ["low", "moderate", "high", "critical"];
const THRESHOLD = "high";

const ALLOWLIST = new Map([
  [
    "deepmerge-ts",
    "Reachable only via the Prisma CLI chain (prisma / @prisma/config) inside the " +
      "production @prisma/client dependency. The CLI is never executed at runtime; " +
      "fixing requires a breaking Prisma/deepmerge-ts major upgrade. (GHSA-ggr8-5vv4-36mx)",
  ],
  [
    "@prisma/config",
    "Prisma CLI config loading (see deepmerge-ts reason).",
  ],
  ["prisma", "Prisma CLI, not executed at runtime (see deepmerge-ts reason)."],
]);

function runAudit() {
  const options = { encoding: "utf8", timeout: 120_000 };
  if (process.platform === "win32") {
    // npm.cmd cannot be spawned directly on Windows, so run it through the
    // shell. The command line is a static, trusted string with no
    // user-controlled arguments.
    return spawnSync("npm audit --json --omit=dev", { ...options, shell: true });
  }
  return spawnSync("npm", ["audit", "--json", "--omit=dev"], options);
}

function severityIndex(severity) {
  const index = SEVERITY_ORDER.indexOf(severity);
  return index === -1 ? 0 : index;
}

function main() {
  const result = runAudit();
  if (result.error) {
    console.error(`Security audit: FAILED to run npm audit (${result.error.message})`);
    process.exit(1);
  }

  let audit;
  try {
    audit = JSON.parse(result.stdout);
  } catch {
    console.error("Security audit: FAILED to parse npm audit output.");
    console.error((result.stderr || result.stdout).trim());
    process.exit(1);
  }

  const vulnerabilities = audit?.vulnerabilities ?? {};
  const counts = audit?.metadata?.vulnerabilities ?? {};

  const findings = Object.entries(vulnerabilities).map(([name, info]) => ({
    name,
    severity: info?.severity ?? "unknown",
  }));
  findings.sort(
    (a, b) =>
      severityIndex(b.severity) - severityIndex(a.severity) || a.name.localeCompare(b.name),
  );

  console.log("Security audit (production dependency tree):");
  if (findings.length === 0) {
    console.log("  No vulnerabilities reported.");
  } else {
    for (const finding of findings) {
      console.log(`  ${finding.severity.padEnd(9)} ${finding.name}`);
    }
  }
  console.log(`  ${counts.info ?? 0} info, ${counts.low ?? 0} low, ${counts.moderate ?? 0} moderate, ` +
    `${counts.high ?? 0} high, ${counts.critical ?? 0} critical`);

  const blocking = findings.filter(
    (finding) =>
      severityIndex(finding.severity) >= severityIndex(THRESHOLD) &&
      !ALLOWLIST.has(finding.name),
  );

  if (blocking.length > 0) {
    console.error(
      `Security audit: FAIL — ${blocking.length} HIGH/CRITICAL advisory(ies) in the ` +
        `production tree (${blocking.map((f) => f.name).join(", ")}).`,
    );
    process.exit(1);
  }

  for (const [name, reason] of ALLOWLIST) {
    if (findings.some((finding) => finding.name === name)) {
      console.log(`  allowlisted: ${name} — ${reason}`);
    }
  }

  console.log("Security audit: PASS (no un-allowlisted HIGH/CRITICAL advisories).");
}

main();