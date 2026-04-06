"use client";

import { Loader2 } from "lucide-react";

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  state: "result" | "pending" | string;
  result?: unknown;
}

interface ToolInvocationBadgeProps {
  tool: ToolInvocation;
}

export function getToolDescription(toolName: string, args?: Record<string, unknown>): string {
  if (toolName === "str_replace_editor" && args) {
    const command = args.command as string;
    const path = args.path as string;

    switch (command) {
      case "create":
        return `Creating file: ${path}`;
      case "str_replace":
        return `Editing file: ${path}`;
      case "insert":
        return `Adding to file: ${path}`;
      case "view":
        return `Viewing file: ${path}`;
      default:
        return `File operation: ${path}`;
    }
  }

  return toolName;
}

export function ToolInvocationBadge({ tool }: ToolInvocationBadgeProps) {
  const description = getToolDescription(tool.toolName, tool.args);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {tool.state === "result" && tool.result ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-neutral-700">{description}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{description}</span>
        </>
      )}
    </div>
  );
}
