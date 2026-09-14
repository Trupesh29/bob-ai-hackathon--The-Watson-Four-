import type { ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T, index: number) => ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField?: keyof T | ((row: T) => string | number)
  emptyMessage?: string
  onRowClick?: (row: T) => void
  className?: string
  testId?: string
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  emptyMessage = 'No data available',
  onRowClick,
  className = '',
  testId,
}: DataTableProps<T>) {
  const getKey = (row: T, index: number): string | number => {
    if (typeof keyField === 'function') return keyField(row)
    if (keyField && row[keyField] !== undefined) return String(row[keyField])
    return index
  }

  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') return 'text-center'
    if (align === 'right') return 'text-right'
    return 'text-left'
  }

  return (
    <div
      data-testid={testId}
      className={`bg-portflow-surface rounded-2xl border border-portflow-border shadow-card overflow-hidden ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-portflow-border bg-portflow-canvas/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`table-label px-4 py-3.5 text-xs font-semibold text-portflow-muted uppercase tracking-wider ${getAlignClass(
                    col.align
                  )} ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-portflow-border/70 text-sm">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-portflow-muted text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={getKey(row, idx)}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-colors duration-150 ${
                    onRowClick
                      ? 'cursor-pointer hover:bg-portflow-canvas/80'
                      : 'hover:bg-portflow-canvas/40'
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-portflow-ink font-normal ${getAlignClass(
                        col.align
                      )} ${col.className ?? ''}`}
                    >
                      {col.render
                        ? col.render(row, idx)
                        : ((row as Record<string, unknown>)[col.key] as ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable
