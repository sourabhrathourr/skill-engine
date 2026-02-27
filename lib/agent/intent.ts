import { generateText, Output } from "ai";
import { z } from "zod";

export type RequestIntent = "workflow" | "general";

const classificationSchema = z.object({
  intent: z.enum(["workflow", "general"]),
  confidence: z.number().min(0).max(1),
});

const greetingPattern =
  /^(hi|hello|hey|yo|thanks|thank you|good (morning|afternoon|evening)|how are you|what'?s up)\b/i;

const workflowDomainTerms = [
  "product",
  "prd",
  "brd",
  "requirement",
  "requirements",
  "feature",
  "features",
  "mvp",
  "roadmap",
  "persona",
  "user story",
  "workflow",
  "business",
  "app",
  "application",
  "platform",
  "saas",
  "scope",
  "success metric",
  "constraint",
  "go-to-market",
];

const workflowActionTerms = [
  "build",
  "create",
  "design",
  "draft",
  "generate",
  "write",
  "plan",
  "prioritize",
  "convert",
  "define",
  "propose",
  "break down",
  "spec",
  "specify",
];

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function classifyWithHeuristics(rawText: string): RequestIntent | "unknown" {
  const text = normalizeText(rawText);
  if (!text) {
    return "general";
  }

  if (text.split(" ").length <= 5 && greetingPattern.test(text)) {
    return "general";
  }

  const hasWorkflowDomain = includesAny(text, workflowDomainTerms);
  const hasWorkflowAction = includesAny(text, workflowActionTerms);
  const isQuestion =
    rawText.includes("?") ||
    /^(what|why|how|when|where|who|can|could|should|is|are|do|does)\b/i.test(
      text
    );

  if (hasWorkflowDomain && hasWorkflowAction) {
    return "workflow";
  }

  if (isQuestion && !hasWorkflowDomain) {
    return "general";
  }

  if (!hasWorkflowDomain && !hasWorkflowAction && text.split(" ").length <= 10) {
    return "general";
  }

  return "unknown";
}

export function extractLatestUserText(messages: unknown[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] as {
      role?: string;
      content?: unknown;
      parts?: unknown[];
    };

    if (message.role !== "user") {
      continue;
    }

    if (typeof message.content === "string" && message.content.trim().length > 0) {
      return message.content.trim();
    }

    if (!Array.isArray(message.parts)) {
      continue;
    }

    const text = message.parts
      .map((part) => {
        if (!part || typeof part !== "object") {
          return "";
        }

        const value = part as { type?: string; text?: unknown };
        if (value.type !== "text" || typeof value.text !== "string") {
          return "";
        }

        return value.text;
      })
      .join("\n")
      .trim();

    if (text.length > 0) {
      return text;
    }
  }

  return "";
}

export async function detectRequestIntent({
  model,
  latestUserText,
}: {
  model: string;
  latestUserText: string;
}): Promise<RequestIntent> {
  const heuristicDecision = classifyWithHeuristics(latestUserText);
  if (heuristicDecision !== "unknown") {
    return heuristicDecision;
  }

  const { output } = await generateText({
    model,
    output: Output.object({ schema: classificationSchema }),
    prompt: [
      "Classify the user message for routing in a product strategy assistant.",
      "Return workflow when the message asks to create/plan/specify a product, PRD, feature set, requirements, MVP scope, or business workflow output.",
      "Return general for greetings, chit-chat, definitions, troubleshooting questions, or generic Q&A that do not ask for a PRD/feature-planning workflow.",
      "If ambiguous, choose general.",
      "",
      `Message: ${latestUserText}`,
    ].join("\n"),
  });

  if (output.confidence < 0.55) {
    return "general";
  }

  return output.intent;
}

export function buildGeneralAssistantPrompt(): string {
  return [
    "You are Skill Engine Agent in general chat mode.",
    "Identity rules:",
    "- If asked who you are, identify as 'Skill Engine Agent'.",
    "- Do not say you are ChatGPT or a general OpenAI assistant.",
    "- If asked about your model/provider, state you are powered by an OpenAI model through this app's Vercel AI SDK setup.",
    "Answer the user directly and concisely.",
    "Use a professional, clear tone and avoid emojis.",
    "Do not fabricate tool calls.",
    "If the user asks for product planning or PRD creation, ask for a brief problem statement and constraints, then suggest switching to workflow mode.",
  ].join("\n");
}
