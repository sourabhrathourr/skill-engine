import { stepCountIs, ToolLoopAgent } from "ai";
import { z } from "zod";

import { buildSystemPrompt } from "@/lib/agent/prompts";
import { requestContextSchema } from "@/lib/agent/schemas";
import {
  createAgentTools,
  type AgentRuntimeContext,
  type FeatureSetState,
} from "@/lib/agent/tools";
import { SkillService } from "@/lib/skills/service";
import { ScriptPolicy } from "@/lib/security/script-policy";

export const skillMetadataSchema = z.object({
  name: z.string(),
  description: z.string(),
  path: z.string(),
  slug: z.string(),
});

export const callOptionsSchema = z.object({
  skillsMetadata: z.array(skillMetadataSchema),
  skillRootPath: z.string(),
  requestContext: requestContextSchema.optional(),
  skillService: z.custom<SkillService>(),
  scriptPolicy: z.custom<ScriptPolicy>(),
  featureSetState: z.custom<FeatureSetState>(),
});

export type AgentCallOptions = z.infer<typeof callOptionsSchema>;

const tools = createAgentTools();

export function createSkillEngineAgent(model: string) {
  return new ToolLoopAgent<AgentCallOptions, typeof tools>({
    model,
    tools,
    stopWhen: stepCountIs(12),
    callOptionsSchema,
    prepareCall: ({ options, ...settings }) => ({
      ...settings,
      instructions: buildSystemPrompt(options.skillsMetadata, options.requestContext),
      experimental_context: options as AgentRuntimeContext,
    }),
  });
}
