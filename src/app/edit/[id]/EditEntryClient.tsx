'use client'

import { useRef, useCallback } from 'react'
import { Check } from 'lucide-react'
import { EntryHeader } from '@/components/layouts/entry-header'
import { FooterNav } from '@/components/layouts/footer-nav'
import { PageLayout } from '@/components/layouts/page-layout'
import { EntryForm, type EntryFormHandle } from '@/features/entry/components/entry-form'
import { useEntryFormStore, selectCanSubmit } from '@/features/entry/stores/entry-form-store'
import type { Entry } from '@/lib/types/database'

interface EditEntryClientProps {
  entry: Entry
  userId: string
}

export function EditEntryClient({ entry, userId }: EditEntryClientProps) {
  const formRef = useRef<EntryFormHandle>(null)

  // Zustandストアから状態を取得
  const isSubmitting = useEntryFormStore((s) => s.isSubmitting)
  const canSubmit = useEntryFormStore(selectCanSubmit)

  const handleSubmit = useCallback(() => {
    formRef.current?.submit()
  }, [])

  return (
    <PageLayout
      header={<EntryHeader title="編集" />}
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
        mode="edit"
        initialEntry={entry}
        userId={userId}
        hideSubmitButton
      />
    </PageLayout>
  )
}
