#!/usr/bin/env node

import process from "node:process";

const PRIORITIES = new Set(["P0", "P1", "P2"]);

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8").trim();
}

function isString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateFeatureSet(value) {
  const errors = [];

  if (!value || typeof value !== "object") {
    return ["Input must be an object."];
  }

  if (!Array.isArray(value.selected) || value.selected.length === 0) {
    errors.push("selected must be a non-empty array.");
  }

  if (!Array.isArray(value.deferred)) {
    errors.push("deferred must be an array.");
  }

  if (Array.isArray(value.selected)) {
    for (const [index, item] of value.selected.entries()) {
      if (!item || typeof item !== "object") {
        errors.push(`selected[${index}] must be an object.`);
        continue;
      }

      if (!isString(item.featureId)) {
        errors.push(`selected[${index}].featureId is required.`);
      }

      if (!isString(item.title)) {
        errors.push(`selected[${index}].title is required.`);
      }

      if (!PRIORITIES.has(item.priority)) {
        errors.push(`selected[${index}].priority must be P0, P1, or P2.`);
      }

      if (!isString(item.rationale)) {
        errors.push(`selected[${index}].rationale is required.`);
      }

      if (
        item.dependencies !== undefined &&
        (!Array.isArray(item.dependencies) ||
          item.dependencies.some((dep) => !isString(dep)))
      ) {
        errors.push(`selected[${index}].dependencies must be a string array.`);
      }
    }
  }

  if (Array.isArray(value.deferred)) {
    for (const [index, item] of value.deferred.entries()) {
      if (!item || typeof item !== "object") {
        errors.push(`deferred[${index}] must be an object.`);
        continue;
      }

      if (!isString(item.featureId)) {
        errors.push(`deferred[${index}].featureId is required.`);
      }

      if (!isString(item.reason)) {
        errors.push(`deferred[${index}].reason is required.`);
      }
    }
  }

  return errors;
}

async function main() {
  const raw = await readStdin();
  const parsed = raw ? JSON.parse(raw) : {};
  const errors = validateFeatureSet(parsed);

  process.stdout.write(
    JSON.stringify(
      {
        ok: errors.length === 0,
        errors,
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
