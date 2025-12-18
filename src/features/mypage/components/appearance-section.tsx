'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export function AppearanceSection() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">外観設定</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>テーマ</Label>
            <p className="text-sm text-muted-foreground">
              ライト、ダーク、またはシステム設定に合わせます
            </p>
          </div>
          <ThemeToggle />
        </div>
      </CardContent>
    </Card>
  )
}
