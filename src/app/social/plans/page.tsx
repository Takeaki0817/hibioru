import { PlansHeader } from '@/features/billing/components/plans-header'
import { PlanSelection } from '@/features/billing/components/plan-selection'
import { FooterNav } from '@/components/layouts/footer-nav'

export default function PlansPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PlansHeader />
      <main className="flex-1 pt-6 pb-24">
        <div className="mx-auto max-w-3xl px-4">
          <PlanSelection />
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-50">
        <FooterNav />
      </div>
    </div>
  )
}
