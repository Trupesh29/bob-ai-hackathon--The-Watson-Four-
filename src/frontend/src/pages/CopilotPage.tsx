import { EmptyState } from '../components/EmptyState'

/**
 * Copilot — IBM Bob MCP-backed plain-language explanations.
 *
 * The copilot does NOT calculate assignments or approve plans.
 * It calls read-only MCP tools to explain model outputs.
 */
export default function CopilotPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-100 mb-1">Copilot</h1>
      <p className="text-slate-400 text-sm mb-8">
        Plain-language explanations of congestion risk scores and plan
        summaries, powered by IBM Bob via the PortFlow MCP server.
      </p>
      <div className="mb-6 rounded border border-amber-700/40 bg-amber-900/20 px-4 py-3 text-amber-300 text-sm">
        <strong>Note:</strong> The copilot explains model outputs only. It does
        not calculate berth or crane assignments, generate numerical schedules,
        or approve operations plans.
      </div>
      <EmptyState
        title="MCP server not connected"
        description="The PortFlow MCP server (IBM Bob) will be configured in a later plan. Connect a prediction or plan ID to receive a plain-language explanation."
      />
    </div>
  )
}
