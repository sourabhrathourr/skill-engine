import { tool } from "ai";
import { z } from "zod";

import { featureSetSchema, type FeatureSet, type RequestContext } from "@/lib/agent/schemas";
import { SkillService } from "@/lib/skills/service";
import type { SkillMetadata } from "@/lib/skills/types";
import {
  type RunAllowlistedScriptInput,
  type ScriptId,
  ScriptPolicy,
} from "@/lib/security/script-policy";

const runAllowlistedScriptInputSchema = z.object({
  scriptId: z.enum(["score-features", "validate-feature-set"]),
  input: z.record(z.string(), z.unknown()).default({}),
});

export type FeatureSetState = {
  featureSet: FeatureSet | null;
};

export type AgentRuntimeContext = {
  skillsMetadata: SkillMetadata[];
  skillRootPath: string;
  requestContext?: RequestContext;
  skillService: SkillService;
  scriptPolicy: ScriptPolicy;
  featureSetState: FeatureSetState;
};

function getContext(experimentalContext: unknown): AgentRuntimeContext {
  return experimentalContext as AgentRuntimeContext;
}

async function runAllowlistedScript(
  scriptPolicy: ScriptPolicy,
  input: RunAllowlistedScriptInput
): Promise<unknown> {
  return scriptPolicy.run(input);
}

export function createAgentTools() {
  return {
    loadSkill: tool({
      description: "Load a full SKILL.md body for a skill name.",
      inputSchema: z.object({
        name: z.string().min(1).describe("Exact skill name from available list"),
      }),
      execute: async ({ name }, { experimental_context }) => {
        const context = getContext(experimental_context);
        const skill = await context.skillService.loadSkill(name);

        return {
          skillDirectory: skill.skillDirectory,
          content: skill.content,
        };
      },
    }),

    loadSkillReferences: tool({
      description:
        "Load markdown reference files for a previously selected skill.",
      inputSchema: z.object({
        name: z.string().min(1).describe("Skill name to load references for"),
      }),
      execute: async ({ name }, { experimental_context }) => {
        const context = getContext(experimental_context);
        const references = await context.skillService.loadReferences(name);

        return {
          referenceCount: references.length,
          references: references.map((reference) => ({
            path: reference.relativePath,
            metadata: reference.metadata,
            content: reference.content,
          })),
        };
      },
    }),

    runAllowlistedScript: tool({
      description:
        "Run one of the approved local scripts with JSON input for deterministic checks.",
      inputSchema: runAllowlistedScriptInputSchema,
      execute: async (input, { experimental_context }) => {
        const context = getContext(experimental_context);
        const scriptId = input.scriptId as ScriptId;
        const result = await runAllowlistedScript(context.scriptPolicy, {
          scriptId,
          input: input.input ?? {},
        });

        return {
          scriptId,
          result,
        };
      },
    }),

    emitFeatureSet: tool({
      description:
        "Validate and persist the final feature set JSON before responding.",
      inputSchema: featureSetSchema,
      execute: async (input, { experimental_context }) => {
        const context = getContext(experimental_context);
        const validated = featureSetSchema.parse(input);
        context.featureSetState.featureSet = validated;

        return {
          ok: true,
          featureSet: validated,
          selectedCount: validated.selected.length,
          deferredCount: validated.deferred.length,
        };
      },
    }),
  };
}
