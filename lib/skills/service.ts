import type {
  SkillBundle,
  SkillDocument,
  SkillMetadata,
  SkillReferenceDocument,
  SkillStore,
} from "@/lib/skills/types";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class SkillService {
  private metadataCache: CacheEntry<SkillMetadata[]> | null = null;
  private readonly skillCache = new Map<string, CacheEntry<SkillDocument>>();
  private readonly referencesCache = new Map<
    string,
    CacheEntry<SkillReferenceDocument[]>
  >();

  constructor(
    private readonly store: SkillStore,
    private readonly ttlMs = 30_000
  ) {}

  private isFresh(entry: CacheEntry<unknown> | null | undefined): boolean {
    return !!entry && entry.expiresAt > Date.now();
  }

  private createEntry<T>(value: T): CacheEntry<T> {
    return {
      value,
      expiresAt: Date.now() + this.ttlMs,
    };
  }

  async discoverSkillMetadata(): Promise<SkillMetadata[]> {
    if (this.isFresh(this.metadataCache)) {
      return this.metadataCache!.value;
    }

    const discovered = await this.store.discoverSkills();
    this.metadataCache = this.createEntry(discovered);
    return discovered;
  }

  async loadSkill(name: string): Promise<SkillDocument> {
    const cacheKey = name.toLowerCase();
    const existing = this.skillCache.get(cacheKey);

    if (this.isFresh(existing)) {
      return existing!.value;
    }

    const skill = await this.store.loadSkill(name);
    this.skillCache.set(cacheKey, this.createEntry(skill));
    return skill;
  }

  async loadReferences(name: string): Promise<SkillReferenceDocument[]> {
    const cacheKey = name.toLowerCase();
    const existing = this.referencesCache.get(cacheKey);

    if (this.isFresh(existing)) {
      return existing!.value;
    }

    const references = await this.store.loadReferences(name);
    this.referencesCache.set(cacheKey, this.createEntry(references));
    return references;
  }

  async loadSkillBundle(name: string): Promise<SkillBundle> {
    const [skill, references] = await Promise.all([
      this.loadSkill(name),
      this.loadReferences(name),
    ]);

    return { skill, references };
  }

  clearCache(): void {
    this.metadataCache = null;
    this.skillCache.clear();
    this.referencesCache.clear();
  }
}
