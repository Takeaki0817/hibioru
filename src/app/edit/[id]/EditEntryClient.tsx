'use client'

import { useRef, useState, useCallback } from 'react'
import { Check } from 'lucide-react'
import { EntryHeader } from '@/components/layouts/entry-header'
import { FooterNav } from '@/components/layouts/footer-nav'
import { EntryForm, type EntryFormHandle, type EntryFormState } from '@/features/entry/components/entry-form'
import type { Entry } from '@/lib/types/database'

interface EditEntryClientProps {
  entry: Entry
  userId: string
}

export function EditEntryClient({ entry, userId }: EditEntryClientProps) {
  const formRef = useRef<EntryFormHandle>(null)
  const [formState, setFormState] = useState<EntryFormState>({
    isSubmitting: false,
    canSubmit: false,
    isSuccess: false,
  })

  const handleStateChange = useCallback((state: EntryFormState) => {
    setFormState(state)
  }, [])

  const handleSubmit = useCallback(() => {
    formRef.current?.submit()
  }, [])

  return (
    <div className="flex h-dvh flex-col">
      <EntryHeader title="編集" />

      <EntryForm
        ref={formRef}
        mode="edit"
        initialEntry={entry}
        userId={userId}
        hideSubmitButton
        onStateChange={handleStateChange}
      />

      <FooterNav
        centerButton={{
          icon: Check,
          onClick: handleSubmit,
          disabled: !formState.canSubmit,
          isLoading: formState.isSubmitting,
        }}
      />
    </div>
  )
}
