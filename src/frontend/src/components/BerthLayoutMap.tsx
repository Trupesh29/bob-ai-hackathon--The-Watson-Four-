/**
 * PortFlow AI — Berth Layout Map
 *
 * Renders a schematic SVG grid of berths coloured by occupancy status and
 * congestion risk level. No real geolocation — purely from API berth data.
 *
 * DISCLAIMER: "Synthetic / demo operational data — not live AIS / GPS tracking."
 */

import { useState } from 'react'
import type { BerthItem } from '../types/api'

// ── Colour mapping (exported for tests) ──────────────────────────────────────

export type BerthDisplayStatus = 'available' | 'occupied' | 'high-risk' | 'critical' | 'maintenance'

export function berthDisplayStatus(
  berth: BerthItem,
  highRiskBerthCodes: Set<string>,
  criticalBerthCodes: Set<string>,
): BerthDisplayStatus {
  if (berth.occupancy_status === 'maintenance') return 'maintenance'
  if (criticalBerthCodes.has(berth.berth_code)) return 'critical'
  if (highRiskBerthCodes.has(berth.berth_code)) return 'high-risk'
  if (berth.occupancy_status === 'occupied') return 'occupied'
  return 'available'
}

export function berthStatusColour(status: BerthDisplayStatus): string {
  switch (status) {
    case 'critical':    return '#dc2626'   // red
    case 'high-risk':  return '#d97706'   // amber
    case 'occupied':   return '#3b82f6'   // blue
    case 'maintenance': return '#64748b'  // slate
    default:           return '#16a34a'   // green
  }
}

export function berthStatusLabel(status: BerthDisplayStatus): string {
  switch (status) {
    case 'critical':    return 'Critical'
    case 'high-risk':  return 'High risk'
    case 'occupied':   return 'Occupied'
    case 'maintenance': return 'Maintenance'
    default:           return 'Available'
  }
}

// ── Legend item ───────────────────────────────────────────────────────────────

const LEGEND: { status: BerthDisplayStatus; label: string }[] = [
  { status: 'available',   label: 'Available' },
  { status: 'occupied',    label: 'Occupied' },
  { status: 'high-risk',  label: 'High risk' },
  { status: 'critical',    label: 'Critical' },
  { status: 'maintenance', label: 'Maintenance' },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface BerthLayoutMapProps {
  berths: BerthItem[]
  /** berth_codes that have a high-risk congestion flag from the congestion horizon */
  highRiskBerthCodes?: Set<string>
  /** berth_codes that have a critical congestion flag */
  criticalBerthCodes?: Set<string>
}

interface TooltipState {
  berth: BerthItem
  x: number
  y: number
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BerthLayoutMap({
  berths,
  highRiskBerthCodes = new Set(),
  criticalBerthCodes = new Set(),
}: BerthLayoutMapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  if (berths.length === 0) {
    return (
      <div
        data-testid="berth-map-empty"
        className="flex items-center justify-center h-28 text-slate-500 text-xs"
      >
        No berth data available.
      </div>
    )
  }

  // Layout: up to 4 berths per row
  const COLS = Math.min(4, berths.length)
  const CELL_W = 72
  const CELL_H = 48
  const GAP = 10
  const PAD = 12
  const totalCols = COLS
  const totalRows = Math.ceil(berths.length / COLS)
  const svgW = PAD * 2 + totalCols * CELL_W + (totalCols - 1) * GAP
  const svgH = PAD * 2 + totalRows * CELL_H + (totalRows - 1) * GAP

  return (
    <div data-testid="berth-map" className="relative">
      {/* Synthetic data label */}
      <p className="text-[10px] text-amber-500/80 mb-1.5">
        Synthetic / demo operational data — not GPS-tracked vessel positions
      </p>

      {/* SVG berth grid */}
      <svg
        width="100%"
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="overflow-visible"
        style={{ maxHeight: 200 }}
        aria-label="Berth layout diagram"
      >
        {berths.map((b, i) => {
          const col = i % COLS
          const row = Math.floor(i / COLS)
          const x = PAD + col * (CELL_W + GAP)
          const y = PAD + row * (CELL_H + GAP)
          const status = berthDisplayStatus(b, highRiskBerthCodes, criticalBerthCodes)
          const fill = berthStatusColour(status)

          return (
            <g
              key={b.berth_id}
              data-testid={`berth-block-${b.berth_code}`}
              onMouseEnter={() => {
                setTooltip({
                  berth: b,
                  x: x + CELL_W / 2,
                  y: y + CELL_H + 4,
                })
              }}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Berth block */}
              <rect
                x={x}
                y={y}
                width={CELL_W}
                height={CELL_H}
                rx={4}
                fill={fill}
                fillOpacity={0.22}
                stroke={fill}
                strokeWidth={1.5}
              />
              {/* Berth code */}
              <text
                x={x + CELL_W / 2}
                y={y + CELL_H / 2 - 5}
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize={10}
                fontWeight="600"
              >
                {b.berth_code}
              </text>
              {/* Status label */}
              <text
                x={x + CELL_W / 2}
                y={y + CELL_H / 2 + 8}
                textAnchor="middle"
                fill={fill}
                fontSize={8}
              >
                {berthStatusLabel(status)}
              </text>
              {/* Crane count */}
              <text
                x={x + CELL_W / 2}
                y={y + CELL_H - 5}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize={7}
              >
                {b.crane_count} crane{b.crane_count !== 1 ? 's' : ''}
              </text>
            </g>
          )
        })}

        {/* Quay line at bottom */}
        <line
          x1={PAD}
          y1={svgH - 4}
          x2={svgW - PAD}
          y2={svgH - 4}
          stroke="#334155"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <text x={PAD} y={svgH - 1} fill="#475569" fontSize={7}>
          Quayside
        </text>
      </svg>

      {/* Hover tooltip */}
      {tooltip && (
        <div
          data-testid="berth-tooltip"
          className="absolute z-10 bg-slate-900 border border-slate-600 rounded p-2 text-[10px] pointer-events-none shadow-lg"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            top: 60,
          }}
        >
          <p className="text-slate-200 font-semibold">{tooltip.berth.berth_name}</p>
          <p className="text-slate-400">Code: {tooltip.berth.berth_code}</p>
          <p className="text-slate-400">
            Status:{' '}
            <span
              style={{
                color: berthStatusColour(
                  berthDisplayStatus(tooltip.berth, highRiskBerthCodes, criticalBerthCodes)
                ),
              }}
            >
              {berthStatusLabel(
                berthDisplayStatus(tooltip.berth, highRiskBerthCodes, criticalBerthCodes)
              )}
            </span>
          </p>
          <p className="text-slate-400">Draft: {tooltip.berth.max_draft_m}m</p>
          <p className="text-slate-400">Cranes: {tooltip.berth.crane_count}</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {LEGEND.map(l => (
          <span key={l.status} className="flex items-center gap-1 text-[9px] text-slate-400">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm border"
              style={{
                background: berthStatusColour(l.status) + '38',
                borderColor: berthStatusColour(l.status),
              }}
            />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}
