/**
 * PortFlow AI — Copilot Page (Standalone AI Copilot Terminal)
 *
 * Full-featured conversational AI terminal for port operations analysis.
 * Supports interactive chat, operational quick-queries, scenario switching,
 * and structured context inspection.
 */

import { useState } from 'react'
import { fetchCopilotAsk, DEFAULT_PORT_CODE, ApiRequestError } from '../services/api'
import type { CopilotAskResponse, ScenarioId, CopilotContextSnapshot } from '../types/api'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  method?: string
  context?: CopilotContextSnapshot
}

const QUICK_PROMPTS = [
  'What is our primary congestion bottleneck right now?',
  'Should we consider routing vessels to an alternate port?',
  'Which vessel has the highest predicted waiting time and why?',
  'What are the 3 top operational recommendations?',
  'How is crane capacity affecting current turnaround times?',
]

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

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        `Hello! I am your PortFlow AI Operations Copilot for Port **${portCode}**.\n\n` +
        `I analyze real-time berth occupancy, vessel arrivals, waiting times, and routing options to provide clear operational explanations and recommendations.\n\n` +
        `Select a quick query below or type your operational question.`,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">AI Operations Copilot Terminal</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Natural-language operational reasoning and bottleneck analysis · Port <span className="text-teal-400 font-semibold">{portCode}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMessages([messages[0]])}
            className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 bg-slate-900 rounded transition-colors"
          >
            Clear History
          </button>
          <span className="px-2.5 py-1 text-xs font-medium bg-amber-900/30 text-amber-300 border border-amber-700 rounded">
            Synthetic demo data
          </span>
        </div>
      </div>

      {/* Scenario selector */}
      <div className="flex items-center gap-2 flex-wrap bg-slate-900/70 border border-slate-800 p-2.5 rounded-lg">
        <span className="text-xs font-semibold text-slate-400 mr-1">Active Scenario:</span>
        {SCENARIOS.map(s => (
          <button
            key={s.id}
            onClick={() => setScenario(s.id)}
            className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
              scenario === s.id
                ? 'bg-teal-600 border-teal-400 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Main Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Stream (2 cols) */}
        <div className="lg:col-span-2 space-y-4 flex flex-col h-[650px]">
          {/* Messages list */}
          <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-lg p-4 overflow-y-auto space-y-4 shadow-inner">
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-teal-900 border border-teal-600 text-teal-300 flex items-center justify-center text-xs font-bold shrink-0">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-lg p-3.5 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-indigo-700 text-white font-medium'
                      : 'bg-slate-800/90 border border-slate-700 text-slate-200 shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400 border-t border-slate-700/50 pt-1.5">
                    <span>{m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {m.method && (
                      <span className="font-mono text-teal-400">Engine: {m.method}</span>
                    )}
                  </div>
                </div>
                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-indigo-900 border border-indigo-600 text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0">
                    OP
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-7 h-7 rounded-full bg-teal-900 border border-teal-600 text-teal-300 flex items-center justify-center text-xs font-bold shrink-0 animate-pulse">
                  AI
                </div>
                <div className="bg-slate-800/90 border border-slate-700 rounded-lg p-3 text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                  Analyzing port state and formulating recommendations…
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Suggested Questions:</span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => handleAsk(p)}
                  disabled={isLoading}
                  className="px-2.5 py-1 text-[11px] bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 hover:border-teal-500/50 transition-colors text-left"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <div className="space-y-1.5">
            <div className="flex gap-2">
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
                placeholder="Ask about waiting times, congestion drivers, or routing recommendations…"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 shadow-inner"
              />
              <button
                onClick={() => handleAsk(inputQuery)}
                disabled={isLoading || !inputQuery.trim()}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors shadow-md whitespace-nowrap"
              >
                {isLoading ? 'Thinking…' : 'Ask Copilot'}
              </button>
            </div>
            {validationError && (
              <p className="text-amber-400 text-xs">{validationError}</p>
            )}
          </div>
        </div>

        {/* Right Inspector Column: Context Snapshot */}
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                Structured Context Inspector
              </h3>
              <span className="text-[10px] text-teal-400 font-mono">POST /copilot/ask</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              The Copilot operates strictly on structured facts gathered from PortFlow backend services. It does not invent numbers or external weather conditions.
            </p>

            {inspectContext ? (
              <div className="space-y-2 text-xs">
                <div className="bg-slate-900/80 rounded p-2.5 border border-slate-800 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Port:</span>
                    <span className="text-teal-300">{inspectContext.port_name} ({inspectContext.port_code})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Scenario:</span>
                    <span className="text-amber-300">{inspectContext.scenario}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Peak Risk:</span>
                    <span className="text-red-400">{inspectContext.peak_risk_level.toUpperCase()} ({inspectContext.peak_congestion_risk_pct}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Top Vessel:</span>
                    <span className="text-slate-200">{inspectContext.top_waiting_vessel ?? 'None'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Highest Wait:</span>
                    <span className="text-slate-200">{inspectContext.top_waiting_hours ? `${inspectContext.top_waiting_hours.toFixed(1)}h` : '0h'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Routing Advice:</span>
                    <span className={inspectContext.routing_recommended ? 'text-green-400' : 'text-slate-300'}>
                      {inspectContext.routing_recommended ? 'Divert' : 'Stay'}
                    </span>
                  </div>
                </div>

                <details className="text-[11px] text-slate-400 cursor-pointer pt-1">
                  <summary className="hover:text-teal-300">View Raw Context JSON</summary>
                  <pre className="mt-2 bg-slate-950 p-2.5 rounded border border-slate-800 text-[10px] text-teal-400/90 overflow-x-auto font-mono max-h-56">
                    {JSON.stringify(inspectContext, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="p-4 bg-slate-900/40 rounded border border-slate-800 text-center text-xs text-slate-500">
                Submit a question to view the backend context payload snapshot.
              </div>
            )}
          </div>

          {/* Configuration disclosure card */}
          <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-4 text-xs space-y-2 text-slate-400">
            <h4 className="font-semibold text-slate-300 text-xs">Copilot Architecture</h4>
            <p className="text-[11px] leading-relaxed">
              When <code className="text-teal-400">COPILOT_PROVIDER=ibm_bob</code> is configured with credentials, inference runs on IBM Watson Machine Learning. Otherwise, deterministic rules fallback is used with zero external dependencies.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
