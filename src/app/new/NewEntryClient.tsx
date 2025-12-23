'use client'

import { useRef, useCallback } from 'react'
import { Check } from 'lucide-react'
import { EntryHeader } from '@/components/layouts/entry-header'
import { FooterNav } from '@/components/layouts/footer-nav'
import { PageLayout } from '@/components/layouts/page-layout'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { EntryForm, type EntryFormHandle } from '@/features/entry/components/entry-form'
import { useEntryFormStore, selectCanSubmit } from '@/features/entry/stores/entry-form-store'

interface NewEntryClientProps {
  userId: string
}

// 内部コンポーネント（QueryProviderの中で使用）
function NewEntryContent({ userId }: { userId: string }) {
  const formRef = useRef<EntryFormHandle>(null)

  // Zustandストアから状態を取得
  const isSubmitting = useEntryFormStore((s) => s.isSubmitting)
  const isOptimisticPending = useEntryFormStore((s) => s.isSubmitting) // 楽観的UI時も同じ状態を参照
  const canSubmit = useEntryFormStore(selectCanSubmit)

  const handleSubmit = useCallback(() => {
    formRef.current?.submit()
  }, [])

  return (
    <PageLayout
      header={<EntryHeader title="記録" />}
      footer={
        <FooterNav
          centerButton={{
            icon: Check,
            onClick: handleSubmit,
            disabled: !canSubmit,
            isLoading: isSubmitting || isOptimisticPending,
          }}
        />
      }
      wrapWithMain={false}
    >
      <EntryForm
        ref={formRef}
        mode="create"
        userId={userId}
        hideSubmitButton
      />
    </PageLayout>
  )
}

export function NewEntryClient({ userId }: NewEntryClientProps) {
  return (
    <QueryProvider>
      <NewEntryContent userId={userId} />
    </QueryProvider>
  )
}
