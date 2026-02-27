import { spawn } from "node:child_process";
import path from "node:path";

const SCRIPT_COMMANDS = {
  "score-features": ["node", "scripts/score-features.mjs"],
  "validate-feature-set": ["node", "scripts/validate-feature-set.mjs"],
} as const;

export type ScriptId = keyof typeof SCRIPT_COMMANDS;

export type RunAllowlistedScriptInput = {
  scriptId: ScriptId;
  input: Record<string, unknown>;
};

function parseAllowedScripts(rawValue: string): Set<ScriptId> {
  const normalized = rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const allowed = new Set<ScriptId>();

  for (const value of normalized) {
    if (value in SCRIPT_COMMANDS) {
      allowed.add(value as ScriptId);
    }
  }

  return allowed;
}

async function runCommand(
  cwd: string,
  command: readonly [string, ...string[]],
  payload: Record<string, unknown>
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const [bin, ...args] = command;
    const child = spawn(bin, args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Script failed with exit code ${code}. ${stderr.trim() || "No stderr output."}`
          )
        );
        return;
      }

      const trimmed = stdout.trim();
      if (!trimmed) {
        resolve({ ok: true });
        return;
      }

      try {
        resolve(JSON.parse(trimmed));
      } catch {
        resolve({ text: trimmed });
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

export class ScriptPolicy {
  private readonly allowedScripts: Set<ScriptId>;

  constructor(
    private readonly projectRoot: string,
    allowedScriptsCsv: string
  ) {
    this.allowedScripts = parseAllowedScripts(allowedScriptsCsv);
  }

  isAllowed(scriptId: ScriptId): boolean {
    return this.allowedScripts.has(scriptId);
  }

  async run(input: RunAllowlistedScriptInput): Promise<unknown> {
    if (!this.isAllowed(input.scriptId)) {
      throw new Error(`Script '${input.scriptId}' is not allowed.`);
    }

    const command = SCRIPT_COMMANDS[input.scriptId];
    const cwd = path.resolve(this.projectRoot);

    return runCommand(cwd, command, input.input);
  }
}
