import { PageLayout } from '@/components/layouts/page-layout'
import { PlansHeader } from '@/features/billing/components/plans-header'
import { PlanSelection } from '@/features/billing/components/plan-selection'

export default function PlansPage() {
  return (
    <PageLayout header={<PlansHeader />} mainClassName="pt-6">
      <div className="mx-auto max-w-3xl px-4 pb-6">
        <PlanSelection />
      </div>
    </PageLayout>
  )
}
