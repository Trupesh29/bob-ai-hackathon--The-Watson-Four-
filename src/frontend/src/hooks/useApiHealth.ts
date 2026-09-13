import { useEffect, useState } from 'react'
import { apiFetch } from '../services/api'
import type { HealthResponse } from '../types/api'

export type HealthState =
  | { status: 'loading' }
  | { status: 'healthy'; version: string }
  | { status: 'unreachable' }

/**
 * Polls GET /health once on mount and returns the API health state.
 * No polling interval — this is a connection indicator, not a live monitor.
 */
export function useApiHealth(): HealthState {
  const [state, setState] = useState<HealthState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    apiFetch<HealthResponse>('/health')
      .then((data) => {
        if (!cancelled) {
          setState({ status: 'healthy', version: data.version })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: 'unreachable' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
