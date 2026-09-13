import { EmptyState } from '../components/EmptyState'

/**
 * Copilot — AI Copilot page (standalone).
 *
 * The full Copilot panel is embedded in the Dashboard.
 * This page explains the copilot feature and directs users there.
 *
 * The copilot does NOT calculate assignments or approve plans.
 * It calls POST /api/v1/copilot/ask and explains model outputs.
 */
export default function CopilotPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-100 mb-1">Copilot</h1>
      <p className="text-slate-400 text-sm mb-8">
        Plain-language explanations of congestion risk, vessel wait times, and
        routing recommendations — powered by a rule-based fallback (always available)
        or IBM Bob LLM (when configured via{' '}
        <code className="text-teal-400">COPILOT_PROVIDER=ibm_bob</code>).
      </p>
      <div className="mb-6 rounded border border-amber-700/40 bg-amber-900/20 px-4 py-3 text-amber-300 text-sm">
        <strong>Note:</strong> The copilot explains model outputs only from synthetic demo data.
        It does not calculate berth or crane assignments, generate schedules, approve plans,
        or invent facts outside the supplied context. All data is labelled synthetic.
      </div>
      <EmptyState
        title="Use the Copilot panel on the Dashboard"
        description="The Copilot panel is embedded in the main Dashboard page. Select a suggested question or type your own to get a plain-language explanation of current port conditions."
      />
      <div className="mt-6 text-slate-500 text-xs space-y-1">
        <p><strong className="text-slate-400">POST /api/v1/copilot/ask</strong> — backend endpoint</p>
        <p>method = <code className="text-teal-400">rules_fallback</code> when no provider configured (default)</p>
        <p>method = <code className="text-teal-400">ibm_bob_llm</code> when <code className="text-teal-400">COPILOT_PROVIDER=ibm_bob</code> + credentials set</p>
        <p className="text-slate-600">Never logs or returns API keys. See <code>src/backend/.env.example</code> for configuration.</p>
      </div>
    </div>
  )
}
