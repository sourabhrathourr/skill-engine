"use client";

import type { DynamicToolUIPart, ToolUIPart, UIMessage } from "ai";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WrenchIcon } from "@phosphor-icons/react";

type ToolPart = ToolUIPart | DynamicToolUIPart;

type ToolActivityItem = {
  id: string;
  name: string;
  state: ToolPart["state"];
};

function isToolPart(part: UIMessage["parts"][number]): part is ToolPart {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

function getToolName(part: ToolPart): string {
  if (part.type === "dynamic-tool") {
    return part.toolName;
  }

  return part.type.replace(/^tool-/, "");
}

function getStatusTone(state: ToolPart["state"]): "secondary" | "outline" {
  if (state === "output-available") {
    return "secondary";
  }

  return "outline";
}

function collectToolActivity(messages: UIMessage[]): ToolActivityItem[] {
  const map = new Map<string, ToolActivityItem>();

  for (const message of messages) {
    for (const part of message.parts) {
      if (!isToolPart(part)) {
        continue;
      }

      map.set(part.toolCallId, {
        id: part.toolCallId,
        name: getToolName(part),
        state: part.state,
      });
    }
  }

  return [...map.values()].reverse();
}

export function ToolActivityPanel({ messages }: { messages: UIMessage[] }) {
  const activity = collectToolActivity(messages);

  return (
    <Card className="rounded-2xl border-border/80 bg-card/90">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-semibold text-base">
          <WrenchIcon className="size-4 text-muted-foreground" />
          Tool Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!activity.length ? (
          <p className="text-muted-foreground text-sm text-pretty">
            Tool calls will appear here when the agent starts loading skills and
            validating output.
          </p>
        ) : (
          activity.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2"
            >
              <span className="truncate font-medium text-sm">{item.name}</span>
              <Badge variant={getStatusTone(item.state)} className="tabular-nums">
                {item.state}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
