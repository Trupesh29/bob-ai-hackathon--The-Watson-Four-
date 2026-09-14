import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  SurfaceCard,
  MetricCard,
  StatusBadge,
  Button,
  PageHeader,
  SectionHeader,
  DataTable,
  EmptyState,
  LoadingState,
  ErrorState,
  ConfirmationDialog,
  InsightCard,
} from '../components/ui'

describe('PortFlow UI Components Library', () => {
  it('SurfaceCard renders title, subtitle, accent and children', () => {
    render(
      <SurfaceCard
        title="Quay Operations"
        subtitle="Berths 1 through 6"
        accent="navy"
        testId="surface-card"
      >
        <p>Operational Content</p>
      </SurfaceCard>
    )

    expect(screen.getByText('Quay Operations')).toBeInTheDocument()
    expect(screen.getByText('Berths 1 through 6')).toBeInTheDocument()
    expect(screen.getByText('Operational Content')).toBeInTheDocument()
    expect(screen.getByTestId('surface-card')).toHaveClass('border-t-portflow-navy')
  })

  it('MetricCard renders label, value, tone and supporting context', () => {
    render(
      <MetricCard
        label="Active vessels"
        value="12"
        change="+2"
        tone="navy"
        supportingText="8 arriving in next 24 hours"
        icon={<span data-testid="metric-icon">🚢</span>}
      />
    )

    expect(screen.getByText('Active vessels')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
    expect(screen.getByText('8 arriving in next 24 hours')).toBeInTheDocument()
    expect(screen.getByTestId('metric-icon')).toBeInTheDocument()
  })

  it('StatusBadge renders semantic color states correctly', () => {
    const { rerender } = render(<StatusBadge status="low" />)
    expect(screen.getByText('Low')).toBeInTheDocument()

    rerender(<StatusBadge status="critical" />)
    expect(screen.getByText('Critical')).toBeInTheDocument()

    rerender(<StatusBadge status="active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()

    rerender(<StatusBadge status="proposed" />)
    expect(screen.getByText('Proposed')).toBeInTheDocument()

    rerender(<StatusBadge status="unscheduled" />)
    expect(screen.getByText('Unscheduled')).toBeInTheDocument()
  })

  it('Button supports variants, click handling, disabled and loading states', () => {
    const onClick = vi.fn()
    const { rerender } = render(
      <Button variant="primary" onClick={onClick}>
        Approve Plan
      </Button>
    )

    const btn = screen.getByRole('button', { name: 'Approve Plan' })
    expect(btn).toHaveClass('min-h-[44px]')
    expect(btn).toHaveClass('bg-portflow-amber')
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledTimes(1)

    // Disabled state
    rerender(
      <Button variant="secondary" disabled onClick={onClick}>
        Secondary Action
      </Button>
    )
    const disabledBtn = screen.getByRole('button', { name: 'Secondary Action' })
    expect(disabledBtn).toBeDisabled()

    // Loading state
    rerender(
      <Button variant="ai" isLoading>
        AI Action
      </Button>
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('PageHeader and SectionHeader render structured titles and descriptions', () => {
    render(
      <div>
        <PageHeader
          title="Berth Allocations"
          subtitle="Real-time berth assignments"
          actions={<button>Action</button>}
        />
        <SectionHeader
          title="Upcoming Arrivals"
          subtitle="Next 24-hour window"
        />
      </div>
    )

    expect(screen.getByText('Berth Allocations')).toBeInTheDocument()
    expect(screen.getByText('Real-time berth assignments')).toBeInTheDocument()
    expect(screen.getByText('Upcoming Arrivals')).toBeInTheDocument()
    expect(screen.getByText('Next 24-hour window')).toBeInTheDocument()
  })

  it('DataTable renders rows and handles row clicks or empty messages', () => {
    const onRowClick = vi.fn()
    const data = [
      { id: '1', name: 'Ever Given', berth: 'B-01' },
      { id: '2', name: 'MSC Oscar', berth: 'B-02' },
    ]
    const columns = [
      { key: 'name', header: 'Vessel Name' },
      { key: 'berth', header: 'Assigned Berth' },
    ]

    const { rerender } = render(
      <DataTable
        columns={columns}
        data={data}
        keyField="id"
        onRowClick={onRowClick}
      />
    )

    expect(screen.getByText('Ever Given')).toBeInTheDocument()
    expect(screen.getByText('MSC Oscar')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Ever Given'))
    expect(onRowClick).toHaveBeenCalledWith(data[0])

    rerender(
      <DataTable
        columns={columns}
        data={[]}
        emptyMessage="No vessels in harbor"
      />
    )
    expect(screen.getByText('No vessels in harbor')).toBeInTheDocument()
  })

  it('EmptyState, LoadingState, and ErrorState display expected content', () => {
    const onRetry = vi.fn()
    render(
      <div>
        <EmptyState title="No Alerts" description="Quay is running smoothly." />
        <LoadingState message="Connecting to optimization engine…" />
        <ErrorState message="Failed to fetch ETA data." onRetry={onRetry} />
      </div>
    )

    expect(screen.getByText('No Alerts')).toBeInTheDocument()
    expect(screen.getByText('Connecting to optimization engine…')).toBeInTheDocument()
    expect(screen.getByText('Failed to fetch ETA data.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry Request' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('ConfirmationDialog supports confirmation and cancellation workflows', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    const { rerender } = render(
      <ConfirmationDialog
        isOpen={true}
        title="Approve Operations Plan?"
        description="This will make the reviewed synthetic-demo plan active."
        details={{
          'Supervisor ID': 'DEMO-SUPERVISOR',
          Plan: '72-hour berth and crane assignment',
        }}
        confirmLabel="Approve Plan"
        cancelLabel="Keep Reviewing"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )

    expect(screen.getByText('Approve Operations Plan?')).toBeInTheDocument()
    expect(screen.getByText(/This will make the reviewed synthetic-demo plan active/i)).toBeInTheDocument()
    expect(screen.getByText('Supervisor ID:')).toBeInTheDocument()
    expect(screen.getByText('DEMO-SUPERVISOR')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Approve Plan' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Keep Reviewing' }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    // Closed dialog
    rerender(
      <ConfirmationDialog
        isOpen={false}
        title="Approve Operations Plan?"
        description="Closed"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    expect(screen.queryByText('Approve Operations Plan?')).not.toBeInTheDocument()
  })

  it('InsightCard renders IBM Bob purple styling and recommendation items', () => {
    render(
      <InsightCard
        title="Berth Bottleneck Mitigated"
        content="Shifting Vessel 3 to Quay B reduces estimated quay turnaround by 42 minutes."
        recommendations={[
          'Prioritize Crane 3 maintenance at 14:00 UTC',
          'Notify terminal dispatch of revised berthing order',
        ]}
        timestamp="10:42 UTC"
      />
    )

    expect(screen.getByText('IBM Bob Insight')).toBeInTheDocument()
    expect(screen.getByText('Berth Bottleneck Mitigated')).toBeInTheDocument()
    expect(screen.getByText(/Shifting Vessel 3 to Quay B/i)).toBeInTheDocument()
    expect(screen.getByText('Prioritize Crane 3 maintenance at 14:00 UTC')).toBeInTheDocument()
    expect(screen.getByText('10:42 UTC')).toBeInTheDocument()
  })
})
