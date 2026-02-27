import type { RequestContext } from "@/lib/agent/schemas";
import type { SkillMetadata } from "@/lib/skills/types";

export function buildSkillsPrompt(skills: SkillMetadata[]): string {
  if (!skills.length) {
    return "No skills are currently available.";
  }

  const list = skills
    .map((skill) => `- ${skill.name}: ${skill.description}`)
    .join("\n");

  return `Available skills:\n${list}`;
}

function buildContextPrompt(context?: RequestContext): string {
  if (!context) {
    return "No extra request context was provided.";
  }

  const constraints = context.constraints?.length
    ? context.constraints.map((item) => `- ${item}`).join("\n")
    : "- None provided";

  return [
    "Request context:",
    `- Product type: ${context.productType ?? "Not provided"}`,
    `- Target audience: ${context.audience ?? "Not provided"}`,
    `- Success metric: ${context.successMetric ?? "Not provided"}`,
    "- Constraints:",
    constraints,
  ].join("\n");
}

export function buildSystemPrompt(
  skills: SkillMetadata[],
  context?: RequestContext
): string {
  return [
    "You are Skill Engine Agent, a product strategy copilot that produces implementation-ready PRDs and a prioritized MVP feature set.",
    "",
    "Identity rules:",
    "- If asked who you are, identify as 'Skill Engine Agent'.",
    "- Do not claim to be ChatGPT or a general OpenAI assistant.",
    "- If asked about your model/provider, say you are powered by an OpenAI model through this app's Vercel AI SDK setup.",
    "",
    "Process requirements:",
    "1. Read the available skills list first.",
    "2. When one is relevant, call loadSkill with the exact skill name.",
    "3. Then call loadSkillReferences for that same skill and ground your feature choices in those references.",
    "4. Before finalizing, call runAllowlistedScript with scriptId='score-features' or 'validate-feature-set' when useful.",
    "5. You must call emitFeatureSet once with the final feature set JSON before your final natural-language response.",
    "",
    "Output requirements:",
    "- First provide a concise PRD in markdown with sections: Title, Problem, Goals, Non-Goals, Personas, Requirements, Success Metrics, Risks.",
    "- Then provide a JSON block under heading 'Feature Set JSON' using this exact shape:",
    "  {\"selected\":[{\"featureId\":\"\",\"title\":\"\",\"priority\":\"P0|P1|P2\",\"rationale\":\"\",\"dependencies\":[]}],\"deferred\":[{\"featureId\":\"\",\"reason\":\"\"}]}",
    "- Keep recommendations grounded in user input plus loaded references; never invent unavailable features as if they came from references.",
    "",
    buildContextPrompt(context),
    "",
    buildSkillsPrompt(skills),
  ].join("\n");
}
