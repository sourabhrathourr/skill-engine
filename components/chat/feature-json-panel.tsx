"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FeatureSet } from "@/lib/agent/schemas";
import {
  CheckIcon,
  ClipboardTextIcon,
  DownloadSimpleIcon,
  FileCodeIcon,
} from "@phosphor-icons/react";

type FeatureJsonPanelProps = {
  featureSet: FeatureSet | null;
};

function toPrettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function downloadJson(filename: string, value: unknown): void {
  const json = toPrettyJson(value);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function FeatureJsonPanel({ featureSet }: FeatureJsonPanelProps) {
  const [copied, setCopied] = useState(false);

  const json = useMemo(
    () => (featureSet ? toPrettyJson(featureSet) : ""),
    [featureSet]
  );

  const handleCopy = async () => {
    if (!json) {
      return;
    }

    await navigator.clipboard.writeText(json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const handleDownload = () => {
    if (!featureSet) {
      return;
    }

    downloadJson("feature-set.json", featureSet);
  };

  return (
    <Card className="h-full rounded-2xl border-border/80 bg-card/90">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileCodeIcon className="size-4 text-muted-foreground" />
            <CardTitle className="font-semibold text-base text-balance">
              Feature Set JSON
            </CardTitle>
          </div>
          <Badge variant="secondary" className="tabular-nums">
            {featureSet?.selected.length ?? 0} selected
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleCopy}
            disabled={!featureSet}
          >
            {copied ? (
              <>
                <CheckIcon className="size-4" />
                Copied
              </>
            ) : (
              <>
                <ClipboardTextIcon className="size-4" />
                Copy
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={!featureSet}
          >
            <DownloadSimpleIcon className="size-4" />
            Download
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {featureSet ? (
          <pre className="max-h-[26rem] overflow-auto rounded-xl border border-border/70 bg-background p-3 font-mono text-xs leading-relaxed">
            <code>{json}</code>
          </pre>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 p-4 text-muted-foreground text-sm text-pretty">
            Run the workflow to populate a validated feature set JSON.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
