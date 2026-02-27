export interface SkillMetadata {
  name: string;
  description: string;
  path: string;
  slug: string;
}

export interface SkillDocument {
  name: string;
  description: string;
  slug: string;
  skillDirectory: string;
  content: string;
}

export interface SkillReferenceFrontmatter {
  feature_id?: string;
  title?: string;
  category?: string;
  priority_hint?: "core" | "high" | "medium" | "low";
  dependencies?: string[];
  tags?: string[];
}

export interface SkillReferenceDocument {
  path: string;
  relativePath: string;
  content: string;
  metadata: SkillReferenceFrontmatter;
}

export interface SkillBundle {
  skill: SkillDocument;
  references: SkillReferenceDocument[];
}

export interface SkillStore {
  discoverSkills(): Promise<SkillMetadata[]>;
  loadSkill(skillName: string): Promise<SkillDocument>;
  loadReferences(skillName: string): Promise<SkillReferenceDocument[]>;
  readFile(path: string): Promise<string>;
}
