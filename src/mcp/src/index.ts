#!/usr/bin/env node
/**
 * PortFlow AI — IBM Bob MCP Server
 *
 * Exposes three read-only tools that explain PortFlow API results
 * in plain language for use inside the IBM Bob IDE.
 *
 * Tools:
 *   get_risk_explanation      — congestion risk for a port/scenario window
 *   get_plan_summary          — operations plan summary (runs optimizer)
 *   get_waiting_time_context  — waiting-time forecast for a port
 *
 * Transport: stdio (spawned by IBM Bob as a child process)
 * Data:      all data is synthetic (seed=2026); labelled in every response
 *
 * CONFIGURATION
 *   PORTFLOW_API_BASE  — FastAPI base URL (default: http://localhost:8000/api/v1)
 *
 * LIMITATIONS
 *   - Backend must be running; tools return an error if unreachable.
 *   - All data is synthetic — not validated for real-world operations.
 *   - Tools are read-only; no writes to the database occur.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ── Configuration ─────────────────────────────────────────────────────────────

const API_BASE =
  process.env.PORTFLOW_API_BASE ?? "http://localhost:8000/api/v1";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch(path: string, opts?: RequestInit): Promise<unknown> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status} at ${url}: ${body}`);
  }
  return res.json();
}

function syntheticNote(): string {
  return (
    "\n\n⚠️  SYNTHETIC DATA — All figures are derived from seed=2026 " +
    "synthetic data. Not validated for real-world port operations. " +
    "Human review required before acting on any recommendation."
  );
}

// ── Server ────────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "portflow-mcp",
  version: "0.1.0",
});

// ── Tool 1: get_risk_explanation ──────────────────────────────────────────────

server.tool(
  "get_risk_explanation",
  "Explains the congestion risk forecast for a port over the 72-hour horizon. " +
    "Returns a plain-language summary of risk levels, peak windows, and key drivers. " +
    "All data is synthetic.",
  {
    port_code: z
      .string()
      .default("FKPFL")
      .describe("Port code (e.g. FKPFL — the only seeded port)"),
    scenario: z
      .enum([
        "baseline",
        "arrival_surge",
        "crane_outage",
        "berth_closure",
        "handling_slowdown",
      ])
      .default("baseline")
      .describe("Scenario name"),
    mode: z
      .enum(["baseline", "ml"])
      .default("baseline")
      .describe("baseline = rule-based; ml = trained RandomForest (503 if artifact absent)"),
  },
  async ({ port_code, scenario, mode }) => {
    try {
      const params = new URLSearchParams({
        port_code,
        scenario,
        horizon_hours: "72",
        mode,
      });
      const data = (await apiFetch(
        `/dashboard/congestion?${params}`
      )) as Record<string, unknown>;

      const windows = (data.windows ?? []) as Array<Record<string, unknown>>;
      const peakWindow = windows.reduce(
        (best: Record<string, unknown> | null, w) =>
          best === null ||
          (w.risk_probability as number) > (best.risk_probability as number)
            ? w
            : best,
        null
      );

      const highWindows = windows.filter(
        (w) => w.risk_level === "high" || w.risk_level === "critical"
      );

      const lines: string[] = [
        `## Congestion Risk Explanation — ${port_code} (${scenario}, ${mode})`,
        "",
        `Calculation method: ${data.calculation_method ?? "unknown"}`,
        `Horizon: ${data.horizon_hours ?? 72} hours | Windows: ${windows.length}`,
        "",
        "### Peak Window",
      ];

      if (peakWindow) {
        lines.push(
          `  Start:       ${peakWindow.window_start}`,
          `  Risk level:  ${String(peakWindow.risk_level).toUpperCase()}`,
          `  Probability: ${Math.round((peakWindow.risk_probability as number) * 100)}%`,
          `  Queue:       ${peakWindow.estimated_queue_count} vessels`,
          `  Drivers:     ${(peakWindow.rule_drivers as string[]).join("; ")}`
        );
      } else {
        lines.push("  No windows returned.");
      }

      lines.push(
        "",
        `### High/Critical Windows: ${highWindows.length} of ${windows.length}`,
        ""
      );

      if (mode === "ml" && data.limitations) {
        lines.push(`ML limitations: ${data.limitations}`, "");
      }

      lines.push(
        "### What this means",
        peakWindow && (peakWindow.risk_probability as number) > 0.6
          ? "Port congestion is elevated. Consider pre-positioning cranes and reviewing berth allocations."
          : "Congestion risk is moderate or low. No immediate action required — continue monitoring.",
        syntheticNote()
      );

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching congestion data: ${msg}\n\nEnsure the PortFlow FastAPI backend is running at ${API_BASE}.`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool 2: get_plan_summary ──────────────────────────────────────────────────

server.tool(
  "get_plan_summary",
  "Runs the CP-SAT berth-and-crane optimizer for a port and returns a " +
    "plain-language summary of the assignment plan, metrics, and key assumptions. " +
    "IMPORTANT: results require human approval before any operational use. " +
    "All data is synthetic.",
  {
    port_code: z
      .string()
      .default("FKPFL")
      .describe("Port code"),
    horizon_hours: z
      .number()
      .int()
      .min(6)
      .max(168)
      .default(72)
      .describe("Planning horizon in hours"),
  },
  async ({ port_code, horizon_hours }) => {
    try {
      const data = (await apiFetch("/operations-plan", {
        method: "POST",
        body: JSON.stringify({
          port_code,
          horizon_hours,
          solve_limit_seconds: 5,
        }),
      })) as Record<string, unknown>;

      const metrics = data.metrics as Record<string, unknown> | null;
      const assignments = (data.assignments ?? []) as Array<
        Record<string, unknown>
      >;
      const unscheduled = (data.unscheduled ?? []) as Array<
        Record<string, unknown>
      >;

      const lines: string[] = [
        `## Operations Plan Summary — ${port_code}`,
        "",
        `Plan ID:      ${data.plan_id}`,
        `Horizon:      ${data.horizon_hours} hours`,
        `Approval:     REQUIRED before any operational use`,
        "",
      ];

      if (metrics) {
        lines.push(
          "### Optimizer Metrics",
          `  Solve status:        ${metrics.solve_status}`,
          `  Scheduled:           ${metrics.scheduled_count} / ${metrics.total_vessels} vessels`,
          `  Unscheduled:         ${metrics.unscheduled_count}`,
          `  Optimizer wait:      ${metrics.opt_total_wait_minutes} min total`,
          `  FIFO baseline wait:  ${metrics.fifo_total_wait_minutes} min total`,
          `  Wait reduction:      ${metrics.wait_reduction_minutes} min`,
          `  Avg wait:            ${metrics.avg_wait_minutes} min`,
          `  Berth utilisation:   ${metrics.berth_utilization_pct}%`,
          `  Crane utilisation:   ${metrics.crane_utilization_pct}%`,
          `  Wall time:           ${metrics.solve_wall_seconds}s`,
          ""
        );
      }

      if (assignments.length > 0) {
        lines.push("### Assignments");
        for (const a of assignments.slice(0, 10)) {
          lines.push(`  ${a.explanation}`);
        }
        if (assignments.length > 10) {
          lines.push(`  … and ${assignments.length - 10} more assignments.`);
        }
        lines.push("");
      }

      if (unscheduled.length > 0) {
        lines.push("### Unscheduled Vessels");
        for (const u of unscheduled) {
          lines.push(
            `  ${u.vessel_name} (priority ${u.priority}): ${u.reason}`
          );
        }
        lines.push("");
      }

      if (Array.isArray(data.assumptions) && (data.assumptions as string[]).length > 0) {
        lines.push(
          "### Key Assumptions",
          ...(data.assumptions as string[]).map((a: string) => `  - ${a}`),
          ""
        );
      }

      lines.push(
        "### Next Step",
        `To approve this plan, POST to: ${API_BASE}/operations-plan/${data.plan_id}/approve`,
        syntheticNote()
      );

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error generating operations plan: ${msg}\n\nEnsure the PortFlow FastAPI backend is running at ${API_BASE}.`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool 3: get_waiting_time_context ──────────────────────────────────────────

server.tool(
  "get_waiting_time_context",
  "Returns a plain-language explanation of the waiting-time forecast for " +
    "all scheduled vessels at a port. Includes risk levels, primary causes, " +
    "and model method. All data is synthetic.",
  {
    port_code: z
      .string()
      .default("FKPFL")
      .describe("Port code"),
    mode: z
      .enum(["baseline", "ml"])
      .default("baseline")
      .describe("baseline = historical records; ml = RandomForest regression"),
  },
  async ({ port_code, mode }) => {
    try {
      const params = new URLSearchParams({
        port_code,
        horizon_hours: "72",
        mode,
      });
      const data = (await apiFetch(
        `/waiting-times?${params}`
      )) as Record<string, unknown>;

      const vessels = (data.vessels ?? []) as Array<Record<string, unknown>>;

      const lines: string[] = [
        `## Waiting-Time Forecast — ${port_code} (${mode})`,
        "",
        `Method: ${data.calculation_method}`,
        `Total vessels: ${data.total}`,
        `Mode: ${data.mode}`,
        "",
      ];

      if (vessels.length === 0) {
        lines.push("No vessels in the forecast horizon.", syntheticNote());
        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      }

      const high = vessels.filter(
        (v) => v.risk_level === "high" || v.risk_level === "medium"
      );
      lines.push(
        `High/medium risk vessels: ${high.length} of ${vessels.length}`,
        ""
      );

      lines.push("### Vessel Forecast (sorted by predicted wait, highest first)");
      for (const v of vessels.slice(0, 10)) {
        const waitStr =
          (v.predicted_waiting_hours as number) < 1
            ? `${Math.round((v.predicted_waiting_hours as number) * 60)} min`
            : `${(v.predicted_waiting_hours as number).toFixed(1)} h`;

        const cause = v.primary_cause
          ? ` | cause: ${v.primary_cause}`
          : "";
        lines.push(
          `  ${v.vessel_name} — ${waitStr} wait | risk: ${String(v.risk_level).toUpperCase()} | priority: ${v.priority}${cause}`
        );
      }

      if (vessels.length > 10) {
        lines.push(`  … and ${vessels.length - 10} more vessels.`);
      }

      lines.push(
        "",
        "### Risk Thresholds",
        "  LOW < 6 h  |  MEDIUM 6–12 h  |  HIGH > 12 h",
        "",
        `Limitations: ${data.limitations}`,
        syntheticNote()
      );

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching waiting-time data: ${msg}\n\nEnsure the PortFlow FastAPI backend is running at ${API_BASE}.`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Start ─────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `PortFlow MCP server running on stdio | API base: ${API_BASE}`
  );
}

main().catch((error) => {
  console.error("Fatal error in PortFlow MCP server:", error);
  process.exit(1);
});
