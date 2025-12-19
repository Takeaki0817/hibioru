'use client'

import { useRef, useCallback } from 'react'
import { Check } from 'lucide-react'
import { EntryHeader } from '@/components/layouts/entry-header'
import { FooterNav } from '@/components/layouts/footer-nav'
import { PageLayout } from '@/components/layouts/page-layout'
import { EntryForm, type EntryFormHandle } from '@/features/entry/components/entry-form'
import { useEntryFormStore, selectCanSubmit } from '@/features/entry/stores/entry-form-store'

interface NewEntryClientProps {
  userId: string
}

export function NewEntryClient({ userId }: NewEntryClientProps) {
  const formRef = useRef<EntryFormHandle>(null)

  // Zustandストアから状態を取得
  const isSubmitting = useEntryFormStore((s) => s.isSubmitting)
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
            isLoading: isSubmitting,
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
