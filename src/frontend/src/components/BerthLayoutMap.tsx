/**
 * PortFlow AI — Berth Layout Map
 *
 * Renders a schematic SVG grid of berths coloured by occupancy status and
 * congestion risk level. When optimizer assignments are passed in, shows
 * the vessel name assigned to each berth for the selected time window.
 */

import { useState, useMemo } from 'react'
import type { BerthItem, BerthAssignment } from '../types/api'

// ── Colour mapping (exported for tests) ──────────────────────────────────────

export type BerthDisplayStatus = 'available' | 'occupied' | 'high-risk' | 'critical' | 'maintenance' | 'scheduled'

export function berthDisplayStatus(
  berth: BerthItem,
  highRiskBerthCodes: Set<string> = new Set(),
  criticalBerthCodes: Set<string> = new Set(),
  assignedBerthCodes: Set<string> = new Set(),
): BerthDisplayStatus {
  if (berth.occupancy_status === 'maintenance') return 'maintenance'
  if (criticalBerthCodes?.has(berth.berth_code)) return 'critical'
  if (highRiskBerthCodes?.has(berth.berth_code)) return 'high-risk'
  if (assignedBerthCodes?.has(berth.berth_code)) return 'scheduled'
  if (berth.occupancy_status === 'occupied') return 'occupied'
  return 'available'
}

export function berthStatusColors(status: BerthDisplayStatus) {
  switch (status) {
    case 'critical':    return { bg: '#FCE8E6', border: '#C94B43', text: '#C94B43' }
    case 'high-risk':  return { bg: '#FDE6DB', border: '#D85F2B', text: '#D85F2B' }
    case 'occupied':   return { bg: '#E4E7ED', border: '#213657', text: '#213657' }
    case 'scheduled':  return { bg: '#FFF8E8', border: '#D99119', text: '#B97710' }
    case 'maintenance': return { bg: '#FCE8E6', border: '#C94B43', text: '#C94B43' }
    default:           return { bg: '#E3F3EA', border: '#2E7D5B', text: '#2E7D5B' }
  }
}

export function berthStatusLabel(status: BerthDisplayStatus): string {
  switch (status) {
    case 'critical':    return 'At risk'
    case 'high-risk':  return 'Near capacity'
    case 'occupied':   return 'Occupied'
    case 'scheduled':  return 'Scheduled'
    case 'maintenance': return 'Closed'
    default:           return 'Available'
  }
}

const LEGEND: { status: BerthDisplayStatus; label: string }[] = [
  { status: 'available',   label: 'Available' },
  { status: 'scheduled',   label: 'Scheduled (Plan)' },
  { status: 'occupied',    label: 'Occupied' },
  { status: 'high-risk',  label: 'Near capacity' },
  { status: 'critical',    label: 'At risk' },
  { status: 'maintenance', label: 'Closed' },
]

const TIME_OFFSETS: { label: string; hoursOffset: number }[] = [
  { label: 'Now', hoursOffset: 0 },
  { label: '+12h', hoursOffset: 12 },
  { label: '+24h', hoursOffset: 24 },
  { label: '+48h', hoursOffset: 48 },
]

interface BerthLayoutMapProps {
  berths: BerthItem[]
  highRiskBerthCodes?: Set<string>
  criticalBerthCodes?: Set<string>
  assignments?: BerthAssignment[]
}

interface TooltipState {
  berth: BerthItem
  assignedVessel: BerthAssignment | null
  x: number
  y: number
}

export default function BerthLayoutMap({
  berths,
  highRiskBerthCodes = new Set(),
  criticalBerthCodes = new Set(),
  assignments = [],
}: BerthLayoutMapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [timeOffsetHours, setTimeOffsetHours] = useState(0)

  // Which berths have a vessel scheduled at the selected time window?
  const assignedAtTime = useMemo(() => {
    if (assignments.length === 0) return new Map<string, BerthAssignment>()
    const windowStart = Date.now() + timeOffsetHours * 3600_000
    const windowEnd = windowStart + 12 * 3600_000
    const result = new Map<string, BerthAssignment>()
    for (const a of assignments) {
      const start = new Date(a.start_time).getTime()
      const end = new Date(a.end_time).getTime()
      // Overlaps with window
      if (start < windowEnd && end > windowStart) {
        result.set(a.berth_code, a)
      }
    }
    return result
  }, [assignments, timeOffsetHours])

  const assignedBerthCodes = useMemo(() => new Set(assignedAtTime.keys()), [assignedAtTime])

  if (berths.length === 0) {
    return (
      <div
        data-testid="berth-map-empty"
        className="flex items-center justify-center h-28 text-[#6F6761] text-xs"
      >
        No berth data available.
      </div>
    )
  }

  const COLS = Math.min(4, berths.length)
  const CELL_W = 130
  const CELL_H = 82
  const GAP = 22
  const PAD_X = 28
  const TOP_PAD = 24
  const ROW_GAP = 42
  const totalCols = COLS
  const totalRows = Math.ceil(berths.length / COLS)
  const svgW = PAD_X * 2 + totalCols * CELL_W + (totalCols - 1) * GAP
  const lastBerthBottom = TOP_PAD + totalRows * CELL_H + (totalRows - 1) * ROW_GAP
  const quayLabelY = lastBerthBottom + 22
  const quayY = lastBerthBottom + 32
  const svgH = quayY + 62

  return (
    <div data-testid="berth-map" className="relative w-full h-full flex flex-col items-center justify-center px-5 py-4">

      {/* Time selector — only shown when assignments are available */}
      {assignments.length > 0 && (
        <div className="flex items-center gap-2 mb-4 self-start">
          <span className="text-xs font-semibold text-[#231F20] mr-1">View at:</span>
          {TIME_OFFSETS.map(t => (
            <button
              key={t.hoursOffset}
              onClick={() => setTimeOffsetHours(t.hoursOffset)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                timeOffsetHours === t.hoursOffset
                  ? 'bg-[#D99119] text-white'
                  : 'bg-[#F7F4EE] text-[#6F6761] hover:bg-[#EEE7DA] border border-[#E7DED4]'
              }`}
            >
              {t.label}
            </button>
          ))}
          <span className="text-xs text-[#6F6761] ml-2 font-mono">
            {assignedAtTime.size > 0
              ? `${assignedAtTime.size} vessel${assignedAtTime.size !== 1 ? 's' : ''} at berth`
              : 'No assignments in window'}
          </span>
        </div>
      )}

      <svg
        width="100%"
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="overflow-visible shrink-0"
        style={{ maxHeight: 320 }}
        aria-label="Berth layout diagram"
      >
        {/* Water / vessel approach area below the quay */}
        <rect
          x={PAD_X}
          y={quayY + 2}
          width={svgW - PAD_X * 2}
          height={svgH - quayY - 2}
          rx={8}
          fill="#F2F7FB"
        />
        <text x={PAD_X + 12} y={quayY + 27} fill="#6F6761" fontSize={9} fontWeight="600">
          Vessel approach channel
        </text>

        {berths.map((b, i) => {
          const col = i % COLS
          const row = Math.floor(i / COLS)
          const x = PAD_X + col * (CELL_W + GAP)
          const y = TOP_PAD + row * (CELL_H + ROW_GAP)
          const status = berthDisplayStatus(b, highRiskBerthCodes, criticalBerthCodes, assignedBerthCodes)
          const colors = berthStatusColors(status)
          const assignedVessel = assignedAtTime.get(b.berth_code) ?? null

          // Truncate vessel name to fit in cell
          const vesselLabel = assignedVessel
            ? assignedVessel.vessel_name.length > 14
              ? assignedVessel.vessel_name.slice(0, 13) + '…'
              : assignedVessel.vessel_name
            : null

          return (
            <g
              key={b.berth_id}
              data-testid={`berth-block-${b.berth_code}`}
              onMouseEnter={() => {
                setTooltip({
                  berth: b,
                  assignedVessel,
                  x: x + CELL_W / 2,
                  y,
                })
              }}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x}
                y={y}
                width={CELL_W}
                height={CELL_H}
                rx={12}
                fill={colors.bg}
                stroke={colors.border}
                strokeWidth={assignedVessel ? 2.5 : 2}
              />
              {/* Berth code */}
              <text
                x={x + CELL_W / 2}
                y={y + 26}
                textAnchor="middle"
                fill="#231F20"
                fontSize={13}
                fontWeight="700"
              >
                {b.berth_code}
              </text>
              {/* Vessel name (if assigned) or status label */}
              <text
                x={x + CELL_W / 2}
                y={y + 45}
                textAnchor="middle"
                fill={colors.text}
                fontSize={9.5}
                fontWeight="700"
              >
                {vesselLabel ?? berthStatusLabel(status)}
              </text>
              {/* Crane count */}
              <text
                x={x + CELL_W / 2}
                y={y + CELL_H - 10}
                textAnchor="middle"
                fill="#6F6761"
                fontSize={9}
              >
                {assignedVessel
                  ? `${assignedVessel.cranes_assigned} crane${assignedVessel.cranes_assigned !== 1 ? 's' : ''} · P${assignedVessel.priority}`
                  : `${b.crane_count} crane${b.crane_count !== 1 ? 's' : ''}`}
              </text>
            </g>
          )
        })}

        {/* Mooring lines */}
        {Array.from({ length: totalCols }).map((_, col) => {
          const x = PAD_X + col * (CELL_W + GAP) + CELL_W / 2
          return (
            <line
              key={`mooring-${col}`}
              x1={x}
              y1={lastBerthBottom}
              x2={x}
              y2={quayY}
              stroke="#9FB1C6"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          )
        })}
        <text x={PAD_X} y={quayLabelY} fill="#213657" fontSize={10} fontWeight="700">
          Terminal Quayside
        </text>
        <line
          x1={PAD_X}
          y1={quayY}
          x2={svgW - PAD_X}
          y2={quayY}
          stroke="#213657"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
        {LEGEND.map(l => (
          <span key={l.status} className="flex items-center gap-1.5 text-xs text-[#6F6761] font-medium">
            <span
              className="inline-block w-3 h-3 rounded-sm border"
              style={{
                background: berthStatusColors(l.status).bg,
                borderColor: berthStatusColors(l.status).border,
              }}
            />
            {l.label}
          </span>
        ))}
      </div>

      {/* Hover tooltip */}
      {tooltip && (
        <div
          data-testid="berth-tooltip"
          className="absolute z-10 bg-white border border-[#E7DED4] shadow-lg rounded-xl p-3 text-xs pointer-events-none min-w-[160px]"
          style={{
            left: `${Math.max(18, Math.min(82, (tooltip.x / svgW) * 100))}%`,
            transform: 'translateX(-50%)',
            top: assignments.length > 0 ? 52 : 12,
          }}
        >
          <p className="text-[#231F20] font-bold mb-1">{tooltip.berth.berth_name}</p>
          <div className="space-y-0.5">
            <p className="text-[#6F6761]">Code: {tooltip.berth.berth_code}</p>
            <p className="text-[#6F6761]">
              Status:{' '}
              <span
                className="font-semibold"
                style={{
                  color: berthStatusColors(
                    berthDisplayStatus(tooltip.berth, highRiskBerthCodes, criticalBerthCodes, assignedBerthCodes)
                  ).text,
                }}
              >
                {berthStatusLabel(
                  berthDisplayStatus(tooltip.berth, highRiskBerthCodes, criticalBerthCodes, assignedBerthCodes)
                )}
              </span>
            </p>
            <p className="text-[#6F6761]">Draft limit: {tooltip.berth.max_draft_m}m</p>
            <p className="text-[#6F6761]">Length limit: {tooltip.berth.max_length_m}m</p>
            <p className="text-[#6F6761]">Cranes: {tooltip.berth.crane_count}</p>
            {tooltip.assignedVessel && (
              <>
                <div className="border-t border-[#E7DED4] pt-1 mt-1" />
                <p className="font-bold text-[#D99119]">
                  📦 {tooltip.assignedVessel.vessel_name}
                </p>
                <p className="text-[#6F6761]">
                  Cranes: {tooltip.assignedVessel.cranes_assigned} · Priority: {tooltip.assignedVessel.priority}
                </p>
                <p className="text-[#6F6761] font-mono text-[10px]">
                  {new Date(tooltip.assignedVessel.start_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  {' – '}
                  {new Date(tooltip.assignedVessel.end_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
