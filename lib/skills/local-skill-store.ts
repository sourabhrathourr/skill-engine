import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  parseReferenceDocument,
  parseSkillMetadata,
  stripFrontmatter,
} from "@/lib/skills/parse";
import type {
  SkillDocument,
  SkillMetadata,
  SkillReferenceDocument,
  SkillStore,
} from "@/lib/skills/types";

function ensureWithinRoot(rootDir: string, targetPath: string): string {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(targetPath);

  if (
    resolvedTarget !== resolvedRoot &&
    !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    throw new Error(`Path is outside of skills root: ${targetPath}`);
  }

  return resolvedTarget;
}

export class LocalFileSkillStore implements SkillStore {
  readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir);
  }

  private resolvePath(inputPath: string): string {
    if (path.isAbsolute(inputPath)) {
      return ensureWithinRoot(this.rootDir, inputPath);
    }

    return ensureWithinRoot(this.rootDir, path.join(this.rootDir, inputPath));
  }

  private async resolveSkillMetadata(skillName: string): Promise<SkillMetadata> {
    const skills = await this.discoverSkills();
    const skill = skills.find(
      (entry) => entry.name.toLowerCase() === skillName.toLowerCase()
    );

    if (!skill) {
      throw new Error(`Skill '${skillName}' not found`);
    }

    return skill;
  }

  async readFile(inputPath: string): Promise<string> {
    const resolvedPath = this.resolvePath(inputPath);
    return readFile(resolvedPath, "utf-8");
  }

  async discoverSkills(): Promise<SkillMetadata[]> {
    const directoryEntries = await readdir(this.rootDir, { withFileTypes: true });
    const sortedDirectories = directoryEntries
      .filter((entry) => entry.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name));

    const discovered: SkillMetadata[] = [];
    const seenNames = new Set<string>();

    for (const entry of sortedDirectories) {
      const skillDir = this.resolvePath(entry.name);
      const skillFile = path.join(skillDir, "SKILL.md");

      try {
        const content = await readFile(skillFile, "utf-8");
        const metadata = parseSkillMetadata(content, skillDir);
        const dedupeKey = metadata.name.toLowerCase();

        if (seenNames.has(dedupeKey)) {
          continue;
        }

        seenNames.add(dedupeKey);
        discovered.push(metadata);
      } catch {
        continue;
      }
    }

    return discovered;
  }

  async loadSkill(skillName: string): Promise<SkillDocument> {
    const metadata = await this.resolveSkillMetadata(skillName);
    const skillFile = path.join(metadata.path, "SKILL.md");
    const content = await readFile(skillFile, "utf-8");

    return {
      name: metadata.name,
      description: metadata.description,
      slug: metadata.slug,
      skillDirectory: metadata.path,
      content: stripFrontmatter(content),
    };
  }

  async loadReferences(skillName: string): Promise<SkillReferenceDocument[]> {
    const metadata = await this.resolveSkillMetadata(skillName);
    const referencesDir = path.join(metadata.path, "references");

    let referenceEntries;
    try {
      referenceEntries = await readdir(referencesDir, { withFileTypes: true });
    } catch {
      return [];
    }

    const markdownFiles = referenceEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .sort((a, b) => a.name.localeCompare(b.name));

    const references: SkillReferenceDocument[] = [];

    for (const entry of markdownFiles) {
      const absolutePath = path.join(referencesDir, entry.name);
      const relativePath = path.join("references", entry.name);
      const content = await readFile(absolutePath, "utf-8");

      references.push(parseReferenceDocument(content, absolutePath, relativePath));
    }

    return references;
  }
}
