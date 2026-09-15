/**
 * PortFlow AI — Data Input Center
 *
 * Three sections:
 * 1. Demo Disruption Scenario loader (most prominent — gets the whole demo started)
 * 2. CSV bulk import (primary data ingestion story)
 * 3. Manual single-vessel entry form (for demo flexibility)
 * 4. Berth & crane status panel
 */

import { useRef, FormEvent, useEffect, useState, DragEvent } from 'react'
import {
  ApiRequestError,
  createVesselSchedule,
  DEFAULT_PORT_CODE,
  downloadCSVTemplate,
  fetchBerths,
  fetchCranes,
  loadDemoScenario,
  updateResourceStatus,
  uploadVesselScheduleCSV,
} from '../services/api'
import type {
  BerthItem,
  CraneItem,
  CSVImportResponse,
  VesselScheduleCreateRequest,
} from '../types/api'

const initialForm = (): Omit<VesselScheduleCreateRequest, 'port_code' | 'eta'> & { eta: string } => ({
  imo_number: '', vessel_name: '', operator_name: '', capacity_teu: 4000,
  length_m: 250, beam_m: 36, draft_m: 11, eta: '', expected_containers: 1200,
  priority: 3, cargo_type: 'containerised', preferred_berth_code: '',
})

function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    const detail = (error.body as { detail?: { message?: string } | string })?.detail
    return typeof detail === 'string' ? detail : detail?.message ?? 'The database could not save this record.'
  }
  return error instanceof Error ? error.message : 'The database could not save this record.'
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  operational: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  maintenance:  { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  unavailable:  { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500'    },
}

export default function DataInputPage() {
  const portCode = DEFAULT_PORT_CODE
  const [form, setForm] = useState(initialForm)
  const [berths, setBerths] = useState<BerthItem[]>([])
  const [cranes, setCranes] = useState<CraneItem[]>([])
  const [loadingResources, setLoadingResources] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Active dataset label (synced with localStorage)
  const [datasetLabel, setDatasetLabel] = useState<string>(() =>
    localStorage.getItem('portflow_dataset_label') ?? 'Demo dataset (synthetic)',
  )

  // CSV import state
  const [csvDragging, setCsvDragging] = useState(false)
  const [csvLoading, setCsvLoading] = useState(false)
  const [csvResult, setCsvResult] = useState<CSVImportResponse | null>(null)
  const [csvError, setCsvError] = useState<string | null>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  // Disruption scenario state
  const [scenarioLoading, setScenarioLoading] = useState(false)
  const [scenarioResult, setScenarioResult] = useState<string | null>(null)
  const [scenarioConfirm, setScenarioConfirm] = useState(false)

  const persistLabel = (label: string) => {
    setDatasetLabel(label)
    localStorage.setItem('portflow_dataset_label', label)
  }

  const loadResources = () => {
    setLoadingResources(true)
    Promise.all([fetchBerths(portCode), fetchCranes(portCode)])
      .then(([berthData, craneData]) => { setBerths(berthData.berths); setCranes(craneData.cranes) })
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoadingResources(false))
  }

  useEffect(loadResources, [portCode])

  const change = (field: keyof typeof form, value: string | number) => {
    setForm(current => ({ ...current, [field]: value }))
  }

  // ── Manual vessel submit ─────────────────────────────────────────────────────
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true); setError(null); setMessage(null)
    try {
      await createVesselSchedule({
        ...form,
        port_code: portCode,
        eta: new Date(form.eta).toISOString(),
        preferred_berth_code: form.preferred_berth_code || undefined,
      })
      setMessage(`Vessel "${form.vessel_name}" saved to the planning database.`)
      setForm(initialForm())
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // ── Resource status update ────────────────────────────────────────────────────
  const updateStatus = async (
    resource: 'berths' | 'cranes', id: string, status: string,
  ) => {
    setUpdatingId(id); setError(null); setMessage(null)
    try {
      await updateResourceStatus(resource, id, status)
      setMessage(`Status updated to "${status}".`)
      loadResources()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setUpdatingId(null)
    }
  }

  // ── CSV import ─────────────────────────────────────────────────────────────────
  const processCSVFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setCsvError('Please upload a .csv file.')
      return
    }
    setCsvLoading(true); setCsvError(null); setCsvResult(null)
    try {
      const result = await uploadVesselScheduleCSV(file, portCode)
      setCsvResult(result)
      persistLabel(result.dataset_label)
      if (result.imported > 0) {
        setMessage(`${result.imported} vessels imported successfully.`)
      }
    } catch (err) {
      setCsvError(errorMessage(err))
    } finally {
      setCsvLoading(false)
    }
  }

  const handleCSVDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setCsvDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processCSVFile(file)
  }

  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processCSVFile(file)
    e.target.value = ''
  }

  // ── Disruption scenario ────────────────────────────────────────────────────────
  const handleLoadScenario = async () => {
    setScenarioLoading(true); setScenarioResult(null)
    try {
      const result = await loadDemoScenario(portCode)
      setScenarioResult(result.message)
      persistLabel(result.scenario_label)
      setScenarioConfirm(false)
      loadResources() // refresh berth/crane status since some went to maintenance
    } catch (err) {
      setScenarioResult(`Error: ${errorMessage(err)}`)
    } finally {
      setScenarioLoading(false)
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Dataset label + disclaimer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Data Input Center</h1>
          <p className="body-text mt-1">Import vessel schedules and manage port resources.</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-portflow-amberSoft border border-portflow-amber/30 text-xs font-semibold text-portflow-amber">
            <span className="w-2 h-2 rounded-full bg-portflow-amber" />
            {datasetLabel}
          </div>
          <p className="text-[10px] text-[#6F6761]">
            Production path: CSV, database, or port-system API ingestion
          </p>
        </div>
      </div>

      {/* ── Section 1: Disruption Scenario ─────────────────────────────── */}
      <div className="card-main bg-gradient-to-br from-[#1B2F4B] to-[#213657] p-5 text-white">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 text-2xl flex items-center justify-center shrink-0">⚠️</div>
            <div>
              <h2 className="text-lg font-bold text-white">Load Demo Disruption Scenario</h2>
              <p className="text-white/70 text-sm mt-1 max-w-xl">
                Loads 24 pre-built vessels over 72 hours including 2 large deep-draft vessels arriving within
                2 hours of each other. Sets 2 cranes and 1 berth to maintenance.
                Then navigate to the <strong className="text-white">Optimizer</strong> to see the before/after impact.
              </p>
              {scenarioResult && (
                <div className={`mt-3 text-sm px-3 py-2 rounded-lg ${scenarioResult.startsWith('Error') ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                  {scenarioResult}
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0">
            {!scenarioConfirm ? (
              <button
                id="load-scenario-btn"
                onClick={() => setScenarioConfirm(true)}
                className="bg-portflow-amber text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-portflow-amberHover transition-colors whitespace-nowrap shadow-lg"
              >
                ⚡ Load Disruption Scenario
              </button>
            ) : (
              <div className="flex flex-col gap-2 items-end">
                <p className="text-white/80 text-xs max-w-[200px] text-right">
                  This replaces current imported data. Synthetic seed data remains.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setScenarioConfirm(false)}
                    className="text-xs px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-load-scenario-btn"
                    onClick={handleLoadScenario}
                    disabled={scenarioLoading}
                    className="text-xs px-4 py-2 rounded-lg bg-portflow-amber hover:bg-portflow-amberHover font-semibold text-white transition-colors disabled:opacity-60"
                  >
                    {scenarioLoading ? 'Loading...' : 'Confirm →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 2: CSV Import ─────────────────────────────────────────── */}
      <div className="card-main bg-white p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E7DED4] pb-3">
          <div>
            <h2 className="section-title">Import Vessel Schedules (CSV)</h2>
            <p className="text-xs text-[#6F6761] mt-1">Bulk-upload vessel arrival data. Validates each row before saving.</p>
          </div>
          <button
            id="download-template-btn"
            onClick={downloadCSVTemplate}
            className="text-xs btn-secondary px-3 py-1.5 shrink-0"
          >
            ⬇ Download Template
          </button>
        </div>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${csvDragging ? 'border-portflow-amber bg-portflow-amberSoft' : 'border-[#E7DED4] hover:border-portflow-amber hover:bg-portflow-amberSoft/30'}`}
          onDragOver={e => { e.preventDefault(); setCsvDragging(true) }}
          onDragLeave={() => setCsvDragging(false)}
          onDrop={handleCSVDrop}
          onClick={() => csvInputRef.current?.click()}
          role="button"
          aria-label="Upload CSV file"
        >
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCSVFileChange}
          />
          {csvLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-portflow-amber border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#6F6761]">Validating and importing...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl">📂</span>
              <p className="text-sm font-semibold text-[#231F20]">Drop CSV here or click to browse</p>
              <p className="text-xs text-[#6F6761]">
                Required columns: vessel_name, imo_number, operator_name, capacity_teu, length_m, beam_m, draft_m, eta, expected_containers, priority, cargo_type
              </p>
            </div>
          )}
        </div>

        {/* CSV result */}
        {csvError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            {csvError}
          </div>
        )}
        {csvResult && (
          <div className="space-y-3">
            <div className={`rounded-xl p-4 border ${csvResult.imported > 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <p className="font-semibold text-[#231F20] text-sm mb-1">
                {csvResult.imported > 0 ? '✓' : '⚠️'} Import Complete
              </p>
              <p className="text-sm text-[#6F6761]">{csvResult.message}</p>
              <div className="flex gap-4 mt-2 text-xs font-semibold">
                <span className="text-green-700">✓ {csvResult.imported} imported</span>
                {csvResult.skipped > 0 && <span className="text-amber-700">⚠ {csvResult.skipped} skipped</span>}
              </div>
            </div>
            {csvResult.errors.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-[#E7DED4]">
                <table className="w-full text-xs">
                  <thead className="bg-[#F7F4EE] text-[#6F6761] font-semibold">
                    <tr>
                      <th className="text-left px-3 py-2">Row</th>
                      <th className="text-left px-3 py-2">IMO</th>
                      <th className="text-left px-3 py-2">Vessel</th>
                      <th className="text-left px-3 py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7DED4]">
                    {csvResult.errors.map(e => (
                      <tr key={e.row} className="text-red-700 hover:bg-red-50">
                        <td className="px-3 py-2">Row {e.row}</td>
                        <td className="px-3 py-2">{e.imo_number ?? '—'}</td>
                        <td className="px-3 py-2">{e.vessel_name ?? '—'}</td>
                        <td className="px-3 py-2">{e.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Section 3: Manual Entry Form ──────────────────────────────────── */}
      <div className="card-main bg-white p-5 space-y-5">
        <div className="border-b border-[#E7DED4] pb-3">
          <h2 className="section-title">Manual Vessel Entry</h2>
          <p className="text-xs text-[#6F6761] mt-1">
            Add individual vessel calls not yet in the schedule. Saved to planning database immediately.
          </p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
            ✓ {message}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(
              [
                { id: 'vessel_name', label: 'Vessel Name', type: 'text', placeholder: 'MV OCEAN PIONEER' },
                { id: 'imo_number', label: 'IMO Number', type: 'text', placeholder: 'IMO9876543' },
                { id: 'operator_name', label: 'Operator Name', type: 'text', placeholder: 'Ocean Lines Ltd' },
                { id: 'eta', label: 'ETA (local datetime)', type: 'datetime-local', placeholder: '' },
              ] as const
            ).map(f => (
              <div key={f.id} className="space-y-1.5">
                <label className="text-xs font-semibold text-[#231F20]" htmlFor={f.id}>
                  {f.label}
                </label>
                <input
                  id={f.id}
                  required
                  type={f.type}
                  placeholder={f.placeholder}
                  value={form[f.id]}
                  onChange={e => change(f.id, e.target.value)}
                  className="w-full text-sm bg-[#F7F4EE] border border-[#E7DED4] rounded-xl px-3 py-2.5 text-[#231F20] placeholder-[#B0A99F] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            ))}

            {(
              [
                { id: 'capacity_teu', label: 'Capacity (TEU)', min: 100, max: 50000, step: 100 },
                { id: 'length_m', label: 'Length (m)', min: 50, max: 600, step: 1 },
                { id: 'beam_m', label: 'Beam (m)', min: 10, max: 100, step: 0.5 },
                { id: 'draft_m', label: 'Draft (m)', min: 3, max: 35, step: 0.1 },
                { id: 'expected_containers', label: 'Expected Containers', min: 0, max: 100000, step: 50 },
              ] as const
            ).map(f => (
              <div key={f.id} className="space-y-1.5">
                <label className="text-xs font-semibold text-[#231F20]" htmlFor={f.id}>
                  {f.label}
                </label>
                <input
                  id={f.id}
                  required
                  type="number"
                  min={f.min} max={f.max} step={f.step}
                  value={form[f.id]}
                  onChange={e => change(f.id, Number(e.target.value))}
                  className="w-full text-sm bg-[#F7F4EE] border border-[#E7DED4] rounded-xl px-3 py-2.5 text-[#231F20] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#231F20]" htmlFor="priority">Priority (1=Critical, 5=Low)</label>
              <select
                id="priority"
                value={form.priority}
                onChange={e => change('priority', Number(e.target.value))}
                className="w-full text-sm bg-[#F7F4EE] border border-[#E7DED4] rounded-xl px-3 py-2.5 text-[#231F20] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                {[1, 2, 3, 4, 5].map(p => (
                  <option key={p} value={p}>
                    {p} — {['Critical', 'High', 'Normal', 'Low', 'Minimal'][p - 1]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#231F20]" htmlFor="cargo_type">Cargo Type</label>
              <select
                id="cargo_type"
                value={form.cargo_type}
                onChange={e => change('cargo_type', e.target.value)}
                className="w-full text-sm bg-[#F7F4EE] border border-[#E7DED4] rounded-xl px-3 py-2.5 text-[#231F20] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                {['containerised', 'bulk', 'liquid', 'ro-ro', 'general'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#231F20]" htmlFor="preferred_berth_code">
                Preferred Berth (optional)
              </label>
              <select
                id="preferred_berth_code"
                value={form.preferred_berth_code}
                onChange={e => change('preferred_berth_code', e.target.value)}
                className="w-full text-sm bg-[#F7F4EE] border border-[#E7DED4] rounded-xl px-3 py-2.5 text-[#231F20] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="">Auto-assign (recommended)</option>
                {berths.filter(b => b.status === 'operational').map(b => (
                  <option key={b.berth_id} value={b.berth_code}>
                    {b.berth_code} — {b.berth_name} (max {b.max_length_m}m / {b.max_draft_m}m draft)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              id="save-vessel-btn"
              type="submit"
              disabled={saving}
              className="btn-primary text-sm px-8 py-2.5 disabled:opacity-60"
            >
              {saving ? 'Saving...' : '+ Add Vessel to Schedule'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Section 4: Berth & Crane Status ───────────────────────────────── */}
      {!loadingResources && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Berths */}
          <div className="card-main bg-white p-5 space-y-3">
            <h2 className="section-title border-b border-[#E7DED4] pb-3">Berth Status</h2>
            <div className="space-y-3">
              {berths.map(b => {
                const colors = STATUS_COLORS[b.status] ?? STATUS_COLORS['unavailable']
                return (
                  <div key={b.berth_id} className={`flex items-center justify-between rounded-xl px-4 py-3 ${colors.bg} border border-${colors.dot.replace('bg-', '')}/20`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                      <div>
                        <p className="font-semibold text-[#231F20] text-sm">{b.berth_code} — {b.berth_name}</p>
                        <p className="text-xs text-[#6F6761]">Max {b.max_length_m}m · Draft {b.max_draft_m}m · {b.max_cranes} cranes</p>
                      </div>
                    </div>
                    <select
                      disabled={updatingId === b.berth_id}
                      value={b.status}
                      onChange={e => updateStatus('berths', b.berth_id, e.target.value)}
                      className="text-xs bg-white border border-[#E7DED4] rounded-lg px-2 py-1.5 text-[#231F20] focus:outline-none disabled:opacity-60"
                    >
                      <option value="operational">Operational</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Cranes */}
          <div className="card-main bg-white p-5 space-y-3">
            <h2 className="section-title border-b border-[#E7DED4] pb-3">Crane Status</h2>
            <div className="space-y-3">
              {cranes.map(c => {
                const colors = STATUS_COLORS[c.status] ?? STATUS_COLORS['unavailable']
                return (
                  <div key={c.crane_id} className={`flex items-center justify-between rounded-xl px-4 py-3 ${colors.bg}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                      <div>
                        <p className="font-semibold text-[#231F20] text-sm">{c.crane_code}</p>
                        <p className="text-xs text-[#6F6761]">
                          {c.berth_code ? `Home berth: ${c.berth_code}` : 'Mobile'} · {c.moves_per_hour} moves/hr
                        </p>
                      </div>
                    </div>
                    <select
                      disabled={updatingId === c.crane_id}
                      value={c.status}
                      onChange={e => updateStatus('cranes', c.crane_id, e.target.value)}
                      className="text-xs bg-white border border-[#E7DED4] rounded-lg px-2 py-1.5 text-[#231F20] focus:outline-none disabled:opacity-60"
                    >
                      <option value="operational">Operational</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
