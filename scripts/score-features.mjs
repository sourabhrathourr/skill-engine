#!/usr/bin/env node

import process from "node:process";

const PRIORITY_BASE = {
  core: 100,
  high: 70,
  medium: 45,
  low: 20,
};

function parseInput(raw) {
  if (!raw || typeof raw !== "object") {
    return { candidates: [] };
  }

  const candidates = Array.isArray(raw.candidates) ? raw.candidates : [];

  return {
    candidates,
  };
}

function scoreCandidate(candidate) {
  const priorityHint =
    typeof candidate.priorityHint === "string" ? candidate.priorityHint : "low";
  const base = PRIORITY_BASE[priorityHint] ?? PRIORITY_BASE.low;

  const dependencies = Array.isArray(candidate.dependencies)
    ? candidate.dependencies.length
    : 0;

  const complexityPenalty = Math.min(20, dependencies * 4);

  return {
    ...candidate,
    score: Math.max(0, base - complexityPenalty),
  };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8").trim();
}

async function main() {
  const raw = await readStdin();
  const parsed = raw ? JSON.parse(raw) : {};
  const input = parseInput(parsed);

  const scored = input.candidates
    .map(scoreCandidate)
    .sort((a, b) => b.score - a.score);

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        scored,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  process.stderr.write(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
