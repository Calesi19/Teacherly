import { describeServer } from "./index";

/**
 * Entry point placeholder. A real stdio server must not write anything but
 * protocol frames to stdout, so this reports to stderr and exits non-zero
 * rather than pretending to be a working server.
 */
const info = describeServer();
process.stderr.write(
  `${info.name} ${info.version}: no tools registered — the MCP server lands in a later chunk.\n`,
);
process.exit(1);
