import { parse as parseYaml } from "yaml";

import type {
  SkillMetadata,
  SkillReferenceDocument,
  SkillReferenceFrontmatter,
} from "@/lib/skills/types";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export function stripFrontmatter(content: string): string {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match) {
    return content.trim();
  }

  return content.slice(match[0].length).trim();
}

export function parseFrontmatter<T extends Record<string, unknown>>(
  content: string
): T {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match?.[1]) {
    throw new Error("Missing frontmatter");
  }

  const parsed = parseYaml(match[1]);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid frontmatter");
  }

  return parsed as T;
}

export function parseSkillMetadata(content: string, path: string): SkillMetadata {
  const frontmatter = parseFrontmatter<{ name?: unknown; description?: unknown }>(
    content
  );

  if (typeof frontmatter.name !== "string" || !frontmatter.name.trim()) {
    throw new Error(`Skill at ${path} is missing a valid 'name'`);
  }

  if (
    typeof frontmatter.description !== "string" ||
    !frontmatter.description.trim()
  ) {
    throw new Error(`Skill at ${path} is missing a valid 'description'`);
  }

  const normalizedName = frontmatter.name.trim();

  return {
    name: normalizedName,
    description: frontmatter.description.trim(),
    path,
    slug: normalizedName
      .toLowerCase()
      .replace(/[^a-z0-9\-\s]/g, "")
      .replace(/\s+/g, "-"),
  };
}

export function parseReferenceDocument(
  content: string,
  path: string,
  relativePath: string
): SkillReferenceDocument {
  let metadata: SkillReferenceFrontmatter = {};

  try {
    const parsed = parseFrontmatter<Record<string, unknown>>(content);
    metadata = {
      feature_id:
        typeof parsed.feature_id === "string" ? parsed.feature_id.trim() : undefined,
      title: typeof parsed.title === "string" ? parsed.title.trim() : undefined,
      category:
        typeof parsed.category === "string" ? parsed.category.trim() : undefined,
      priority_hint:
        parsed.priority_hint === "core" ||
        parsed.priority_hint === "high" ||
        parsed.priority_hint === "medium" ||
        parsed.priority_hint === "low"
          ? parsed.priority_hint
          : undefined,
      dependencies: toStringArray(parsed.dependencies),
      tags: toStringArray(parsed.tags),
    };
  } catch {
    metadata = {};
  }

  return {
    path,
    relativePath,
    content: stripFrontmatter(content),
    metadata,
  };
}
