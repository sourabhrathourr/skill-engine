"use client";

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useState } from "react";

export type CodeBlockProps = ComponentProps<"div"> & {
  code: string;
  language?: string;
};

export function CodeBlock({
  code,
  language = "text",
  className,
  ...props
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className={cn("overflow-hidden rounded-md border border-border/70", className)} {...props}>
      <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-3 py-2">
        <span className="font-mono text-muted-foreground text-xs uppercase tracking-wide">
          {language}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleCopy}
          aria-label="Copy code"
        >
          {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
        </Button>
      </div>
      <pre className="max-h-72 overflow-auto bg-background p-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
