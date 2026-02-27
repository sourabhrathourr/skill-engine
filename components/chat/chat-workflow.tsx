"use client";

import type { DynamicToolUIPart, ToolUIPart, UIMessage } from "ai";
import { useState } from "react";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { FeatureJsonPanel } from "@/components/chat/feature-json-panel";
import { ToolActivityPanel } from "@/components/chat/tool-activity-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  ClockCounterClockwiseIcon,
  MagicWandIcon,
  PaperPlaneTiltIcon,
  RobotIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import {
  featureSetSchema,
  type FeatureSet,
  type RequestContext,
} from "@/lib/agent/schemas";

const starterPrompts = [
  "I want to build an AI customer support co-pilot for small SaaS teams.",
  "Help me design a B2B procurement workflow platform for remote finance teams.",
  "I need an internal compliance assistant for HR policy Q&A and approvals.",
] as const;

type ToolPart = ToolUIPart | DynamicToolUIPart;

function isToolPart(part: UIMessage["parts"][number]): part is ToolPart {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

function extractFeatureSet(messages: UIMessage[]): FeatureSet | null {
  for (const message of [...messages].reverse()) {
    for (const part of message.parts) {
      if (
        part.type === "tool-emitFeatureSet" &&
        part.state === "output-available" &&
        part.output &&
        typeof part.output === "object" &&
        "featureSet" in part.output
      ) {
        const parsed = featureSetSchema.safeParse(part.output.featureSet);
        if (parsed.success) {
          return parsed.data;
        }
      }
    }

    if (message.role !== "assistant") {
      continue;
    }

    const text = getMessageText(message);
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/i);
    if (!jsonMatch?.[1]) {
      continue;
    }

    try {
      const parsedJson = JSON.parse(jsonMatch[1]);
      const parsed = featureSetSchema.safeParse(parsedJson);
      if (parsed.success) {
        return parsed.data;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function buildContext(
  productType: string,
  audience: string,
  successMetric: string,
  constraints: string
): RequestContext {
  const normalizedConstraints = constraints
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    productType: productType.trim() || undefined,
    audience: audience.trim() || undefined,
    successMetric: successMetric.trim() || undefined,
    constraints: normalizedConstraints.length ? normalizedConstraints : undefined,
  };
}

function getReadableErrorMessage(error: Error | undefined): string {
  if (!error) {
    return "";
  }

  const raw = error.message?.trim();
  if (!raw) {
    return "Request failed.";
  }

  try {
    const parsed = JSON.parse(raw) as { message?: string; error?: string };
    return parsed.message || parsed.error || raw;
  } catch {
    return raw;
  }
}

export function ChatWorkflow() {
  const [productType, setProductType] = useState("SaaS application");
  const [audience, setAudience] = useState("Operations and product teams");
  const [successMetric, setSuccessMetric] = useState(
    "Weekly active teams and task completion rate"
  );
  const [constraints, setConstraints] = useState(
    "Ship MVP in 8 weeks\nSmall engineering team\nMust include role-based access"
  );
  const [input, setInput] = useState("");
  const [toolOpenState, setToolOpenState] = useState<Record<string, boolean>>({});

  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const readableError = getReadableErrorMessage(error);

  const featureSet = extractFeatureSet(messages);

  const isToolOpen = (part: ToolPart): boolean => {
    if (part.state !== "output-available") {
      return true;
    }

    return toolOpenState[part.toolCallId] ?? false;
  };

  const handleSubmit = async ({ text }: { text: string }) => {
    if (!text.trim()) {
      return;
    }

    await sendMessage(
      {
        text,
      },
      {
        body: {
          context: buildContext(productType, audience, successMetric, constraints),
        },
      }
    );

    setInput("");
  };

  return (
    <main className="min-h-dvh bg-background px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1540px] gap-5 xl:grid-cols-[22rem_minmax(0,1fr)_22rem]">
        <Card className="h-fit rounded-2xl border-border/80 bg-card/90 xl:sticky xl:top-5">
          <CardHeader className="space-y-3">
            <Badge variant="secondary" className="w-fit">
              Guided Brief
            </Badge>
            <CardTitle className="font-semibold text-balance text-xl">
              Product Context
            </CardTitle>
            <p className="text-muted-foreground text-pretty text-sm">
              Set operating context once. Each message reuses this context so the
              PRD and feature selection stay consistent.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Product Type</FieldLabel>
                <Input
                  value={productType}
                  onChange={(event) => setProductType(event.target.value)}
                  placeholder="e.g. B2B collaboration platform"
                />
              </Field>
              <Field>
                <FieldLabel>Target Audience</FieldLabel>
                <Input
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                  placeholder="e.g. Startup founders"
                />
              </Field>
              <Field>
                <FieldLabel>Primary Success Metric</FieldLabel>
                <Input
                  value={successMetric}
                  onChange={(event) => setSuccessMetric(event.target.value)}
                  placeholder="e.g. Weekly retention"
                />
              </Field>
              <Field>
                <FieldLabel>Constraints</FieldLabel>
                <Textarea
                  value={constraints}
                  onChange={(event) => setConstraints(event.target.value)}
                  rows={4}
                  placeholder="One per line"
                />
              </Field>
            </FieldGroup>
            <Separator />
            <div className="space-y-2">
              <p className="font-medium text-sm">Starter prompts</p>
              <div className="space-y-2">
                {starterPrompts.map((prompt) => (
                  <button
                    type="button"
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="w-full rounded-lg border border-border/70 px-3 py-2 text-left text-muted-foreground text-sm transition-colors duration-150 hover:bg-muted"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="flex min-h-[74dvh] flex-col rounded-2xl border border-border/80 bg-card/90">
          <header className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <RobotIcon className="size-4 text-muted-foreground" />
              <p className="font-semibold text-base">Skill Engine Agent</p>
            </div>
            <Badge variant="outline" className="tabular-nums">
              {status}
            </Badge>
          </header>

          <Conversation>
            <ConversationContent className="gap-5 p-5">
              {messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 p-5">
                  <div className="flex items-start gap-3">
                    <MagicWandIcon className="mt-0.5 size-5 text-muted-foreground" />
                    <div className="space-y-1.5">
                      <p className="font-semibold text-balance text-base">
                        Start with a product problem statement
                      </p>
                      <p className="text-muted-foreground text-pretty text-sm">
                        The agent will load relevant skills, generate a structured
                        PRD, and emit validated feature JSON.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  const text = getMessageText(message);
                  const toolParts = message.parts.filter(isToolPart);

                  return (
                    <Message key={message.id} from={message.role}>
                      <MessageContent>
                        {text ? <MessageResponse>{text}</MessageResponse> : null}
                        {toolParts.map((part) => (
                          <Tool
                            key={part.toolCallId}
                            open={isToolOpen(part)}
                            onOpenChange={(open) => {
                              setToolOpenState((previous) => ({
                                ...previous,
                                [part.toolCallId]: open,
                              }));
                            }}
                          >
                            {part.type === "dynamic-tool" ? (
                              <ToolHeader
                                type={part.type}
                                state={part.state}
                                toolName={part.toolName}
                              />
                            ) : (
                              <ToolHeader type={part.type} state={part.state} />
                            )}
                            <ToolContent>
                              <ToolInput input={part.input} />
                              <ToolOutput
                                output={part.output}
                                errorText={part.errorText}
                              />
                            </ToolContent>
                          </Tool>
                        ))}
                      </MessageContent>
                    </Message>
                  );
                })
              )}
            </ConversationContent>
            <ConversationScrollButton aria-label="Scroll to latest message" />
          </Conversation>

          <div className="sticky bottom-0 z-10 border-t border-border/70 bg-card/95 p-4 pb-[max(env(safe-area-inset-bottom),1rem)] supports-[backdrop-filter]:bg-card/85">
            <PromptInput
              onSubmit={(message) => handleSubmit({ text: message.text })}
              className="rounded-xl border border-border/80 bg-background shadow-none"
            >
              <PromptInputBody>
                <PromptInputTextarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Describe the product problem you want to solve..."
                  className="min-h-12"
                  disabled={status === "submitted" || status === "streaming"}
                />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputTools>
                  {error ? (
                    <p className="text-destructive text-sm text-pretty">
                      {readableError}
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
                      <SparkleIcon className="size-4" />
                      Context-aware PRD + feature selection
                    </p>
                  )}
                </PromptInputTools>
                <PromptInputSubmit
                  status={status}
                  onStop={stop}
                  aria-label={status === "streaming" ? "Stop generation" : "Submit message"}
                  disabled={!input.trim() && status === "ready"}
                >
                  {status === "streaming" ? (
                    <ClockCounterClockwiseIcon className="size-4" />
                  ) : (
                    <PaperPlaneTiltIcon className="size-4" />
                  )}
                </PromptInputSubmit>
              </PromptInputFooter>
            </PromptInput>
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-5 xl:h-fit">
          <ToolActivityPanel messages={messages} />
          <FeatureJsonPanel featureSet={featureSet} />
        </aside>
      </div>
    </main>
  );
}
