/**
 * Minimal fetch wrapper for the PortFlow AI backend.
 *
 * VITE_API_BASE_URL defaults to the Vite dev-proxy path so the browser
 * never makes a cross-origin request during development.
 */

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1'

export async function apiFetch<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${response.statusText}`)
  }
  return response.json() as Promise<T>
}
