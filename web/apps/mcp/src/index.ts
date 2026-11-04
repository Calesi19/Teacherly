import type { TeacherId } from "@teacherly/core";

/**
 * Stub. The MCP chunk turns this into a `@modelcontextprotocol/sdk` stdio
 * server. It is here now to hold the shape of the third shell: like
 * `apps/server`, it will construct repositories and call `packages/core`
 * services, and it will name a teacher only by the id its own auth resolved —
 * never by one an MCP client supplied.
 */

/** A tool this server will expose once the MCP chunk lands. */
export interface ToolDescriptor {
  name: string;
  description: string;
}

export interface ServerInfo {
  name: string;
  version: string;
  tools: readonly ToolDescriptor[];
}

export const SERVER_INFO: ServerInfo = {
  name: "teacherly-mcp",
  version: "0.1.0",
  tools: [],
};

/**
 * The context every future tool handler receives. The teacher id is resolved
 * once, by the server, exactly as the HTTP session middleware does it.
 */
export interface ToolContext {
  teacherId: TeacherId;
}

export class McpNotImplementedError extends Error {
  readonly code = "mcp_not_implemented" as const;

  constructor() {
    super("The MCP server registers no tools until a later chunk.");
    this.name = "McpNotImplementedError";
  }
}

export function describeServer(): ServerInfo {
  return SERVER_INFO;
}
