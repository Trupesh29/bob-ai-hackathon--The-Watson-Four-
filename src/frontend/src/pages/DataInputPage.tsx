import { FormEvent, useEffect, useState } from 'react'
import {
  ApiRequestError,
  createVesselSchedule,
  DEFAULT_PORT_CODE,
  fetchBerths,
  fetchCranes,
  updateResourceStatus,
} from '../services/api'
import type { BerthItem, CraneItem, VesselScheduleCreateRequest } from '../types/api'

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
      setMessage('Saved. This vessel now appears in Vessels and will be included when you run the optimizer.')
      setForm(initialForm())
    } catch (err) {
      setError(errorMessage(err))
    } finally { setSaving(false) }
  }

  const setResourceStatus = async (kind: 'berths' | 'cranes', id: string, status: string) => {
    setUpdatingId(id); setError(null); setMessage(null)
    try {
      const result = await updateResourceStatus(kind, id, status)
      setMessage(result.message + ' Run the optimizer again to use the new availability.')
      loadResources()
    } catch (err) { setError(errorMessage(err)) } finally { setUpdatingId(null) }
  }

  return (
    <div className="space-y-6 lg:space-y-8 pb-12">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-portflow-purple">Planning database</span>
        <h1 className="page-title mt-1">Data Input Center</h1>
        <p className="body-text mt-1 max-w-3xl">Enter a new vessel call or update resource availability before generating a schedule.</p>
      </div>

      <div className="rounded-2xl border border-portflow-amber/40 bg-portflow-amberSoft px-5 py-4 text-sm text-portflow-ink">
        <strong>Demo environment:</strong> the original records are synthetic. Records you add here are saved to your local planning database and are clearly treated as supervisor input. This project has no live port/AIS integration yet.
      </div>
      {message && <div role="status" className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">{message}</div>}
      {error && <div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <form onSubmit={submit} className="xl:col-span-2 card-main p-6 bg-white space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-portflow-border pb-4">
            <div><h2 className="section-title">Add vessel schedule</h2><p className="text-sm text-portflow-muted mt-1">Fields marked with * are required. Times are stored in UTC.</p></div>
            <span className="text-xs font-semibold rounded-full bg-portflow-purpleSoft text-portflow-purple px-3 py-1">New planning record</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Vessel name *"><input required value={form.vessel_name} onChange={e => change('vessel_name', e.target.value)} placeholder="e.g. Ocean Pioneer" className="input" /></Field>
            <Field label="IMO number *"><input required value={form.imo_number} onChange={e => change('imo_number', e.target.value)} placeholder="e.g. IMO9876543" className="input" /></Field>
            <Field label="Operator *"><input required value={form.operator_name} onChange={e => change('operator_name', e.target.value)} placeholder="e.g. Example Shipping" className="input" /></Field>
            <Field label="ETA (UTC) *"><input required type="datetime-local" value={form.eta} onChange={e => change('eta', e.target.value)} className="input" /></Field>
            <Field label="Expected containers *"><input required min="0" type="number" value={form.expected_containers} onChange={e => change('expected_containers', Number(e.target.value))} className="input" /></Field>
            <Field label="Priority *"><select value={form.priority} onChange={e => change('priority', Number(e.target.value))} className="input"><option value={1}>1 — Critical</option><option value={2}>2 — High</option><option value={3}>3 — Normal</option><option value={4}>4 — Low</option><option value={5}>5 — Deferred</option></select></Field>
            <Field label="Capacity (TEU) *"><input required min="1" type="number" value={form.capacity_teu} onChange={e => change('capacity_teu', Number(e.target.value))} className="input" /></Field>
            <Field label="Cargo type *"><input required value={form.cargo_type} onChange={e => change('cargo_type', e.target.value)} className="input" /></Field>
            <Field label="Length (m) *"><input required min="1" step="0.1" type="number" value={form.length_m} onChange={e => change('length_m', Number(e.target.value))} className="input" /></Field>
            <Field label="Beam (m) *"><input required min="1" step="0.1" type="number" value={form.beam_m} onChange={e => change('beam_m', Number(e.target.value))} className="input" /></Field>
            <Field label="Draft (m) *"><input required min="1" step="0.1" type="number" value={form.draft_m} onChange={e => change('draft_m', Number(e.target.value))} className="input" /></Field>
            <Field label="Preferred berth"><select value={form.preferred_berth_code} onChange={e => change('preferred_berth_code', e.target.value)} className="input"><option value="">Let optimizer decide</option>{berths.map(b => <option key={b.berth_id} value={b.berth_code}>{b.berth_code} — max {b.max_length_m}m / {b.max_draft_m}m draft</option>)}</select></Field>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-portflow-border pt-5"><p className="text-xs text-portflow-muted">A compatibility check prevents a vessel being assigned to an unsuitable preferred berth.</p><button disabled={saving} className="btn-primary px-6 py-3 text-sm">{saving ? 'Saving to database…' : 'Save vessel schedule'}</button></div>
        </form>

        <section className="card-main p-6 bg-white h-fit"><h2 className="section-title">What happens next?</h2><ol className="mt-4 space-y-4 text-sm text-portflow-muted"><li><strong className="text-portflow-ink">1. Save:</strong> the vessel call is stored in PostgreSQL.</li><li><strong className="text-portflow-ink">2. Review:</strong> open Vessels to confirm its ETA and priority.</li><li><strong className="text-portflow-ink">3. Plan:</strong> run Optimizer to include it in the berth and crane plan.</li><li><strong className="text-portflow-ink">4. Approve:</strong> review the proposed plan before accepting it.</li></ol></section>
      </div>

      <section className="card-main p-6 bg-white"><div className="flex flex-wrap items-baseline justify-between gap-2"><div><h2 className="section-title">Resource availability</h2><p className="text-sm text-portflow-muted mt-1">Record maintenance or outages before planning.</p></div><span className="text-xs text-portflow-muted">{loadingResources ? 'Loading resources…' : `${berths.length} berths · ${cranes.length} cranes`}</span></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5"><ResourceList title="Berths" items={berths} kind="berths" updatingId={updatingId} onChange={setResourceStatus} /><ResourceList title="Cranes" items={cranes} kind="cranes" updatingId={updatingId} onChange={setResourceStatus} /></div>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string, children: React.ReactNode }) { return <label className="block text-sm font-semibold text-portflow-ink space-y-1.5"><span>{label}</span>{children}</label> }

function ResourceList({ title, items, kind, updatingId, onChange }: { title: string, items: (BerthItem | CraneItem)[], kind: 'berths' | 'cranes', updatingId: string | null, onChange: (kind: 'berths' | 'cranes', id: string, status: string) => Promise<void> }) {
  return <div className="rounded-xl border border-portflow-border overflow-hidden"><h3 className="font-bold text-sm p-3 bg-portflow-canvas border-b border-portflow-border">{title}</h3>{items.map(item => { const id = kind === 'berths' ? (item as BerthItem).berth_id : (item as CraneItem).crane_id; const label = kind === 'berths' ? `${(item as BerthItem).berth_code} — ${(item as BerthItem).berth_name}` : `${(item as CraneItem).crane_code} — ${(item as CraneItem).berth_code ?? 'Movable'}`; return <div key={id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 border-b last:border-0 border-portflow-border"><span className="text-sm font-medium text-portflow-ink">{label}</span><select aria-label={`${label} status`} disabled={updatingId === id} value={item.status} onChange={e => void onChange(kind, id, e.target.value)} className="input !w-auto !py-1.5 text-xs"><option value="operational">Operational</option><option value="maintenance">Maintenance</option><option value="unavailable">Unavailable</option></select></div> })}</div>
}
