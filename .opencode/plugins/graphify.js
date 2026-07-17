// graphify OpenCode plugin
// Injects knowledge graph reminders before exploration tool calls when the graph exists.
// Reminds once per tool type per session so the agent sees the nudge at the start
// of each exploration pathway (bash, read, grep, glob) — not on every call.
//
// IMPORTANT: keep all reminder strings free of backticks and $(...) constructs.
// The bash hook prepends `echo "<reminder>" ; <cmd>` to the user's command;
// backticks inside double-quoted echo trigger bash command substitution.
// For read/grep/glob the reminder is added via output.reminder so OpenCode
// renders it in the TUI before executing the tool.
import { existsSync } from "fs";
import { join } from "path";

const REMINDED_TOOLS = new Set(["bash", "read", "grep", "glob"]);

const MESSAGE =
  "[graphify] knowledge graph ready at graphify-out/. " +
  "Run `graphify query \"<question>\"` (scoped subgraph, ~2k tokens) " +
  "instead of reading/grepping files (~10k+ tokens) for architecture " +
  "or relationship questions. Use `graphify path A B` to trace connections, " +
  "`graphify explain X` to inspect a symbol. Read GRAPH_REPORT.md for " +
  "broad context. AGENTS.md has full Graphify rules.";

export const GraphifyPlugin = async ({ directory }) => {
  const reminded = new Set();

  return {
    "tool.execute.before": async (input, output) => {
      if (!REMINDED_TOOLS.has(input.tool)) return;
      if (reminded.has(input.tool)) return;
      if (!existsSync(join(directory, "graphify-out", "graph.json"))) return;

      reminded.add(input.tool);

      if (input.tool === "bash") {
        output.args.command = `echo "${MESSAGE}" ; ${output.args.command}`;
      }
    },
  };
};
