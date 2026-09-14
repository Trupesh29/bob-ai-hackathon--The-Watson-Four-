/**
 * PortFlow AI — Berth Layout Map
 *
 * Renders a schematic SVG grid of berths coloured by occupancy status and
 * congestion risk level. No real geolocation — purely from API berth data.
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

export function berthStatusColors(status: BerthDisplayStatus) {
  switch (status) {
    case 'critical':    return { bg: '#FCE8E6', border: '#C94B43', text: '#C94B43' } // Soft red
    case 'high-risk':  return { bg: '#FDE6DB', border: '#D85F2B', text: '#D85F2B' } // Orange
    case 'occupied':   return { bg: '#E4E7ED', border: '#213657', text: '#213657' } // Soft navy
    case 'maintenance': return { bg: '#FCE8E6', border: '#C94B43', text: '#C94B43' } // Soft red / closed
    default:           return { bg: '#E3F3EA', border: '#2E7D5B', text: '#2E7D5B' } // Soft green
  }
}

export function berthStatusLabel(status: BerthDisplayStatus): string {
  switch (status) {
    case 'critical':    return 'At risk'
    case 'high-risk':  return 'Near capacity'
    case 'occupied':   return 'Occupied'
    case 'maintenance': return 'Closed'
    default:           return 'Available'
  }
}

const LEGEND: { status: BerthDisplayStatus; label: string }[] = [
  { status: 'available',   label: 'Available' },
  { status: 'occupied',    label: 'Occupied' },
  { status: 'high-risk',  label: 'Near capacity' },
  { status: 'critical',    label: 'At risk' },
  { status: 'maintenance', label: 'Closed' },
]

interface BerthLayoutMapProps {
  berths: BerthItem[]
  highRiskBerthCodes?: Set<string>
  criticalBerthCodes?: Set<string>
}

interface TooltipState {
  berth: BerthItem
  x: number
  y: number
}

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
        className="flex items-center justify-center h-28 text-[#6F6761] text-xs"
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
    <div data-testid="berth-map" className="relative w-full h-full flex flex-col items-center justify-center p-4">
      <svg
        width="100%"
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="overflow-visible"
        style={{ maxHeight: 250 }}
        aria-label="Berth layout diagram"
      >
        {berths.map((b, i) => {
          const col = i % COLS
          const row = Math.floor(i / COLS)
          const x = PAD + col * (CELL_W + GAP)
          const y = PAD + row * (CELL_H + GAP)
          const status = berthDisplayStatus(b, highRiskBerthCodes, criticalBerthCodes)
          const colors = berthStatusColors(status)

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
              <rect
                x={x}
                y={y}
                width={CELL_W}
                height={CELL_H}
                rx={8}
                fill={colors.bg}
                stroke={colors.border}
                strokeWidth={1.5}
              />
              <text
                x={x + CELL_W / 2}
                y={y + CELL_H / 2 - 4}
                textAnchor="middle"
                fill="#231F20"
                fontSize={10}
                fontWeight="700"
              >
                {b.berth_code}
              </text>
              <text
                x={x + CELL_W / 2}
                y={y + CELL_H / 2 + 8}
                textAnchor="middle"
                fill={colors.text}
                fontSize={8}
                fontWeight="600"
              >
                {berthStatusLabel(status)}
              </text>
              <text
                x={x + CELL_W / 2}
                y={y + CELL_H - 4}
                textAnchor="middle"
                fill="#6F6761"
                fontSize={7}
              >
                {b.crane_count} crane{b.crane_count !== 1 ? 's' : ''}
              </text>
            </g>
          )
        })}

        <line
          x1={PAD}
          y1={svgH - 4}
          x2={svgW - PAD}
          y2={svgH - 4}
          stroke="#213657"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <text x={PAD} y={svgH - 8} fill="#213657" fontSize={7} fontWeight="600">
          Terminal Quayside
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-6">
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
          className="absolute z-10 bg-white border border-[#E7DED4] shadow-lg rounded-xl p-3 text-xs pointer-events-none"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            top: 20,
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
                    berthDisplayStatus(tooltip.berth, highRiskBerthCodes, criticalBerthCodes)
                  ).text,
                }}
              >
                {berthStatusLabel(
                  berthDisplayStatus(tooltip.berth, highRiskBerthCodes, criticalBerthCodes)
                )}
              </span>
            </p>
            <p className="text-[#6F6761]">Draft: {tooltip.berth.max_draft_m}m</p>
            <p className="text-[#6F6761]">Cranes: {tooltip.berth.crane_count}</p>
          </div>
        </div>
      )}
    </div>
  )
}
