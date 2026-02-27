import path from "node:path";

import {
  convertToModelMessages,
  createAgentUIStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { z } from "zod";

import {
  callOptionsSchema,
  createSkillEngineAgent,
} from "@/lib/agent/create-agent";
import {
  buildGeneralAssistantPrompt,
  detectRequestIntent,
  extractLatestUserText,
} from "@/lib/agent/intent";
import { requestContextSchema } from "@/lib/agent/schemas";
import { getEnv } from "@/lib/config/env";
import { LocalFileSkillStore } from "@/lib/skills/local-skill-store";
import { SkillService } from "@/lib/skills/service";
import { ScriptPolicy } from "@/lib/security/script-policy";

export const runtime = "nodejs";
export const maxDuration = 60;

const chatRequestSchema = z.object({
  messages: z.array(z.unknown()),
  context: requestContextSchema.optional(),
});

type RuntimeResources = {
  skillRootPath: string;
  skillService: SkillService;
  scriptPolicy: ScriptPolicy;
  agent: ReturnType<typeof createSkillEngineAgent>;
};

let runtimeResources: RuntimeResources | null = null;

function getRuntimeResources(): RuntimeResources {
  if (runtimeResources) {
    return runtimeResources;
  }

  const env = getEnv();
  const skillRootPath = path.resolve(process.cwd(), env.SKILLS_ROOT_DIR);
  const skillStore = new LocalFileSkillStore(skillRootPath);
  const skillService = new SkillService(skillStore, env.SKILLS_CACHE_TTL_MS);
  const scriptPolicy = new ScriptPolicy(process.cwd(), env.AGENT_ALLOWED_SCRIPTS);
  const agent = createSkillEngineAgent(env.SKILL_ENGINE_MODEL);

  runtimeResources = {
    skillRootPath,
    skillService,
    scriptPolicy,
    agent,
  };

  return runtimeResources;
}

export async function POST(request: Request) {
  try {
    const { skillRootPath, skillService, scriptPolicy, agent } =
      getRuntimeResources();
    const env = getEnv();
    const json = await request.json();
    const parsed = chatRequestSchema.safeParse(json);

    if (!parsed.success) {
      return Response.json(
        {
          error: "Invalid request",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const uiMessages = parsed.data.messages as UIMessage[];
    const latestUserText = extractLatestUserText(parsed.data.messages);
    const intent = await detectRequestIntent({
      model: env.SKILL_ENGINE_MODEL,
      latestUserText,
    });

    if (intent === "general") {
      const result = streamText({
        model: env.SKILL_ENGINE_MODEL,
        system: buildGeneralAssistantPrompt(),
        messages: await convertToModelMessages(uiMessages),
      });

      return result.toUIMessageStreamResponse({
        originalMessages: uiMessages,
      });
    }

    const skillsMetadata = await skillService.discoverSkillMetadata();

    const options = callOptionsSchema.parse({
      skillsMetadata,
      skillRootPath,
      requestContext: parsed.data.context,
      skillService,
      scriptPolicy,
      featureSetState: { featureSet: null },
    });

    return createAgentUIStreamResponse({
      agent,
      uiMessages,
      options,
      onStepFinish: ({ finishReason, usage, stepNumber, toolCalls }) => {
        // Server-side instrumentation for demo observability.
        console.info("[skill-engine:step]", {
          finishReason,
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          stepNumber,
          toolCalls: toolCalls.length,
        });
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return Response.json(
      {
        error: "Failed to process chat request",
        message,
      },
      { status: 500 }
    );
  }
}
