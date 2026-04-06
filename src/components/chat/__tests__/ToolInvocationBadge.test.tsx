import { describe, it, expect } from "vitest";
import { getToolDescription, ToolInvocationBadge } from "../ToolInvocationBadge";
import { render, screen } from "@testing-library/react";

describe("getToolDescription", () => {
  it("returns user-friendly message for create command", () => {
    const description = getToolDescription("str_replace_editor", {
      command: "create",
      path: "src/components/Button.tsx",
    });
    expect(description).toBe("Creating file: src/components/Button.tsx");
  });

  it("returns user-friendly message for str_replace command", () => {
    const description = getToolDescription("str_replace_editor", {
      command: "str_replace",
      path: "src/utils/helper.ts",
    });
    expect(description).toBe("Editing file: src/utils/helper.ts");
  });

  it("returns user-friendly message for insert command", () => {
    const description = getToolDescription("str_replace_editor", {
      command: "insert",
      path: "src/constants.ts",
    });
    expect(description).toBe("Adding to file: src/constants.ts");
  });

  it("returns user-friendly message for view command", () => {
    const description = getToolDescription("str_replace_editor", {
      command: "view",
      path: "package.json",
    });
    expect(description).toBe("Viewing file: package.json");
  });

  it("returns generic message for unknown command", () => {
    const description = getToolDescription("str_replace_editor", {
      command: "unknown_command",
      path: "test.ts",
    });
    expect(description).toBe("File operation: test.ts");
  });

  it("returns tool name for non-str_replace_editor tools", () => {
    const description = getToolDescription("file_manager", {});
    expect(description).toBe("file_manager");
  });

  it("returns tool name when no args provided", () => {
    const description = getToolDescription("str_replace_editor");
    expect(description).toBe("str_replace_editor");
  });
});

describe("ToolInvocationBadge", () => {
  it("renders completed tool invocation with checkmark", () => {
    const tool = {
      toolCallId: "call_123",
      toolName: "str_replace_editor",
      args: {
        command: "create",
        path: "Button.tsx",
      },
      state: "result" as const,
      result: { success: true },
    };

    render(<ToolInvocationBadge tool={tool} />);

    expect(screen.getByText("Creating file: Button.tsx")).toBeDefined();
  });

  it("renders in-progress tool invocation with spinner", () => {
    const tool = {
      toolCallId: "call_456",
      toolName: "str_replace_editor",
      args: {
        command: "str_replace",
        path: "utils.ts",
      },
      state: "pending" as const,
    };

    render(<ToolInvocationBadge tool={tool} />);

    expect(screen.getByText("Editing file: utils.ts")).toBeDefined();
  });

  it("displays correct message for file insertion", () => {
    const tool = {
      toolCallId: "call_789",
      toolName: "str_replace_editor",
      args: {
        command: "insert",
        path: "config.json",
      },
      state: "result" as const,
      result: { success: true },
    };

    render(<ToolInvocationBadge tool={tool} />);

    expect(screen.getByText("Adding to file: config.json")).toBeDefined();
  });

  it("handles tool without args gracefully", () => {
    const tool = {
      toolCallId: "call_999",
      toolName: "file_manager",
      args: {},
      state: "result" as const,
      result: { success: true },
    };

    render(<ToolInvocationBadge tool={tool} />);

    expect(screen.getByText("file_manager")).toBeDefined();
  });
});
