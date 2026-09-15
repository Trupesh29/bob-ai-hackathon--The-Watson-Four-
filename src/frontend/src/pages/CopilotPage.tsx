/**
 * PortFlow AI — Copilot Page
 *
 * Conversational assistant grounded in active plan and port data.
 * Dynamic quick prompts reference actual vessel names from last optimizer run.
 */

import { useState, useMemo } from 'react'
import { fetchCopilotAsk, DEFAULT_PORT_CODE, ApiRequestError } from '../services/api'
import type { CopilotAskResponse, ScenarioId, CopilotContextSnapshot, PlanContext } from '../types/api'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  method?: string
  context?: CopilotContextSnapshot
}

interface StoredPlan {
  plan_id: string
  scenario: string
  top_vessel: string | null
  wait_saved_hours: number
  assignments_summary: string
  timestamp: string
}

const SCENARIOS: { id: ScenarioId; label: string }[] = [
  { id: 'baseline', label: 'Baseline' },
  { id: 'arrival_surge', label: 'Arrival Surge' },
  { id: 'crane_outage', label: 'Crane Outage' },
  { id: 'berth_closure', label: 'Berth Closure' },
  { id: 'handling_slowdown', label: 'Handling Slowdown' },
]

export default function CopilotPage() {
  const portCode = DEFAULT_PORT_CODE
  const [scenario, setScenario] = useState<ScenarioId>('baseline')
  const [inputQuery, setInputQuery] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [inspectContext, setInspectContext] = useState<CopilotContextSnapshot | null>(null)

  // Load last optimizer plan from localStorage for plan-grounded prompts
  const lastPlan = useMemo<StoredPlan | null>(() => {
    try {
      const raw = localStorage.getItem('portflow_last_plan')
      return raw ? (JSON.parse(raw) as StoredPlan) : null
    } catch { return null }
  }, [])

  const planContext = useMemo<PlanContext | null>(() => {
    if (!lastPlan) return null
    return {
      plan_id: lastPlan.plan_id,
      scenario: lastPlan.scenario,
      top_vessel: lastPlan.top_vessel,
      wait_saved_hours: lastPlan.wait_saved_hours,
      assignments_summary: lastPlan.assignments_summary,
    }
  }, [lastPlan])

  const quickPrompts = useMemo(() => {
    return [
      'What does the optimizer recommend?',
      lastPlan?.top_vessel
        ? `Why did ${lastPlan.top_vessel} have the longest wait in the plan?`
        : 'Which vessel has the highest predicted wait?',
      'Why is congestion high in the next 24 hours?',
      'What should the port do about high-risk vessels?',
      'How many cranes are operational right now?',
    ]
  }, [lastPlan])

  const welcomeMessage = lastPlan
    ? `Hello! I am IBM Bob, PortFlow AI Operations Copilot for Port **${portCode}**.\n\nI have context from your last optimizer run (${lastPlan.scenario} scenario · ${lastPlan.wait_saved_hours}h saved vs FIFO). Try the plan-specific questions below.\n\nAll answers are derived from your planning database — no invented metrics.`
    : `Hello! I am IBM Bob, PortFlow AI Operations Copilot for Port **${portCode}**.\n\nI analyze berth occupancy, vessel arrivals, waiting times, and routing options. Run the **Optimizer** first for plan-specific answers.\n\nSelect a question below or type your own.`

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: welcomeMessage,
      timestamp: new Date(),
      method: 'rules_fallback',
    },
  ])

  const handleAsk = async (questionText: string) => {
    const trimmed = questionText.trim()
    if (!trimmed) {
      setValidationError('Please type a question before submitting.')
      return
    }
    if (trimmed.length < 3) {
      setValidationError('Question must be at least 3 characters.')
      return
    }
    setValidationError(null)

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInputQuery('')
    setIsLoading(true)

    try {
      const resp: CopilotAskResponse = await fetchCopilotAsk({
        port_code: portCode,
        question: trimmed,
        scenario,
        ...(planContext ? { plan_context: planContext } : {}),
      })

      const assistantMsg: ChatMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: resp.answer,
        timestamp: new Date(),
        method: resp.method,
        context: resp.context_snapshot,
      }

      setMessages(prev => [...prev, assistantMsg])
      if (resp.context_snapshot) {
        setInspectContext(resp.context_snapshot)
      }
    } catch (err) {
      let msg = 'Failed to get answer from Copilot.'
      if (err instanceof ApiRequestError) {
        msg = err.status === 0
          ? 'Backend unavailable — ensure FastAPI is running.'
          : `API error ${err.status}: ${JSON.stringify(err.body)}`
      } else if (err instanceof Error) {
        msg = err.message
      }

      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: `⚠️ **Error:** ${msg}`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            IBM Bob Copilot
            <span className="badge-copilot">AI</span>
            {lastPlan && (
              <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                Plan loaded ✓
              </span>
            )}
          </h1>
          <p className="body-text mt-1 max-w-2xl">
            Natural-language operational reasoning for Port {portCode}
            {lastPlan ? ` · Active plan: ${lastPlan.scenario} scenario · ${lastPlan.wait_saved_hours}h saved` : ' · Run Optimizer to enable plan-specific answers'}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMessages([{
              id: 'welcome',
              role: 'assistant',
              content: welcomeMessage,
              timestamp: new Date(),
              method: 'rules_fallback',
            }])}
            className="text-sm font-medium text-[#7656B8] hover:text-[#5D4291] bg-[#F1ECFB] hover:bg-[#E5DBF8] px-4 py-2 rounded-xl transition-colors"
          >
            Clear History
          </button>
        </div>
      </div>

      {/* Scenario selector */}
      <div className="flex items-center gap-3 flex-wrap bg-white border border-[#E7DED4] p-4 rounded-xl shadow-sm">
        <span className="text-sm font-bold text-[#231F20]">Context Scenario:</span>
        {SCENARIOS.map(s => (
          <button
            key={s.id}
            onClick={() => setScenario(s.id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              scenario === s.id
                ? 'bg-[#7656B8] text-white shadow-sm'
                : 'bg-[#F7F4EE] text-[#6F6761] hover:bg-white hover:border-[#7656B8] border border-transparent'
            }`}
          >
            {s.label}
          </button>
        ))}
        {lastPlan && (
          <span className="ml-auto text-xs text-[#6F6761] font-mono">
            Last plan: {new Date(lastPlan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Main Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

        {/* Chat Stream (2 cols) */}
        <div className="lg:col-span-2 flex flex-col h-[700px] card-main bg-[#F7F4EE] overflow-hidden border-[#E7DED4]">
          {/* Messages list */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-[#7656B8] text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[85%] ${
                    m.role === 'user'
                      ? 'bg-[#E9EEF5] text-[#213657] font-medium rounded-2xl rounded-tr-sm p-4 shadow-sm'
                      : 'bg-white border-l-4 border-l-[#7656B8] rounded-2xl rounded-tl-sm p-5 shadow-sm text-[#231F20]'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-[15px] leading-relaxed font-medium">
                    {m.content}
                  </div>
                  {m.role === 'assistant' && (
                    <div className="mt-4 pt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[#6F6761] border-t border-[#E7DED4] font-medium uppercase tracking-wider">
                      <span>
                        Provider: {m.method === 'ibm_bob_llm' || m.method === 'ibm_bob' ? '✓ IBM Bob provider (Watsonx)' : 'PortFlow rules engine (Rules fallback)'}
                      </span>
                      <span>Data: Planning database</span>
                      {planContext && m.id !== 'welcome' && (
                        <span className="text-green-600">Plan context: ✓ Active</span>
                      )}
                    </div>
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-[#213657] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                    OP
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4 justify-start items-center">
                <div className="w-8 h-8 rounded-full bg-[#7656B8] text-white flex items-center justify-center text-sm font-bold shrink-0 animate-pulse shadow-sm">
                  AI
                </div>
                <div className="bg-white border-l-4 border-l-[#7656B8] rounded-2xl rounded-tl-sm p-4 text-sm text-[#7656B8] font-medium flex items-center gap-3 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#7656B8] animate-ping" />
                  Thinking… Analyzing port state and formulating recommendations…
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 bg-white border-t border-[#E7DED4] space-y-4">
            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map(p => (
                <button
                  key={p}
                  onClick={() => handleAsk(p)}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#F1ECFB] text-[#7656B8] rounded-xl hover:bg-[#E5DBF8] transition-colors border border-transparent hover:border-[#7656B8]/30 text-left"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div className="flex gap-3">
              <input
                type="text"
                value={inputQuery}
                onChange={e => {
                  setInputQuery(e.target.value)
                  if (validationError && e.target.value.trim().length >= 3) {
                    setValidationError(null)
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAsk(inputQuery)
                }}
                placeholder="Ask IBM Bob about waiting times, the optimizer plan, or recommendations…"
                className="flex-1 bg-[#F7F4EE] border border-[#E7DED4] rounded-xl px-4 py-3 text-sm text-[#231F20] placeholder-[#6F6761] focus:outline-none focus:ring-2 focus:ring-[#7656B8]/40 focus:bg-white transition-colors"
              />
              <button
                onClick={() => handleAsk(inputQuery)}
                disabled={isLoading || !inputQuery.trim()}
                className="px-6 py-3 bg-[#7656B8] hover:bg-[#5D4291] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors shadow-sm whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#7656B8]/50"
              >
                {isLoading ? 'Thinking…' : 'Ask'}
              </button>
            </div>
            {validationError && (
              <p className="text-[#C94B43] text-xs font-medium">{validationError}</p>
            )}
          </div>
        </div>

        {/* Right Inspector Column: Context Snapshot */}
        <div className="space-y-6">
          <div className="card-standard bg-white overflow-hidden flex flex-col h-full max-h-[700px]">
            <div className="p-5 border-b border-[#E7DED4] bg-[#F7F4EE] flex items-center justify-between">
              <h3 className="font-bold text-[#231F20] text-sm uppercase tracking-wide">
                Context Inspector
              </h3>
              <span className="text-xs text-[#7656B8] font-mono font-bold bg-[#F1ECFB] px-2 py-1 rounded">POST /copilot/ask</span>
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
              <p className="text-sm text-[#6F6761] leading-relaxed mb-4">
                IBM Bob operates strictly on structured facts from PortFlow backend services. No invented metrics or schedules.
              </p>

              {lastPlan && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-xs">
                  <p className="font-bold text-green-700 mb-1">Active Plan Context</p>
                  <p className="text-green-600">Scenario: {lastPlan.scenario}</p>
                  <p className="text-green-600">Saved vs FIFO: {lastPlan.wait_saved_hours}h</p>
                  {lastPlan.top_vessel && (
                    <p className="text-green-600">Top vessel: {lastPlan.top_vessel}</p>
                  )}
                </div>
              )}

              {inspectContext ? (
                <div className="space-y-4">
                  <div className="bg-[#F7F4EE] rounded-xl p-4 border border-[#E7DED4] space-y-3 font-mono text-xs">
                    {[
                      ['Port', `${inspectContext.port_name} (${inspectContext.port_code})`],
                      ['Scenario', inspectContext.scenario],
                      ['Peak Risk', `${inspectContext.peak_risk_level.toUpperCase()} (${Math.round(inspectContext.peak_congestion_risk_pct)}%)`],
                      ['Top Vessel', inspectContext.top_waiting_vessel ?? 'None'],
                      ['Highest Wait', inspectContext.top_waiting_hours ? `${inspectContext.top_waiting_hours.toFixed(1)}h` : '0h'],
                      ['Routing', inspectContext.routing_recommended ? 'Divert recommended' : 'Stay at port'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-[#E7DED4] pb-2 last:border-0 last:pb-0">
                        <span className="text-[#6F6761] font-semibold">{k}:</span>
                        <span className="text-[#213657] font-bold text-right">{v}</span>
                      </div>
                    ))}
                  </div>

                  <details className="text-sm text-[#6F6761] cursor-pointer group">
                    <summary className="font-semibold group-hover:text-[#213657]">View Raw JSON Payload</summary>
                    <pre className="mt-3 bg-[#231F20] p-4 rounded-xl text-xs text-[#E3F3EA] overflow-x-auto font-mono max-h-64 shadow-inner">
                      {JSON.stringify(inspectContext, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <div className="p-6 bg-[#F7F4EE] rounded-xl border border-[#E7DED4] text-center text-sm text-[#6F6761] font-medium">
                  Submit a question to view the backend context payload.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
