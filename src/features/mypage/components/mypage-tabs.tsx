'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { User, Users, Bell } from 'lucide-react'

interface MypageTabsProps {
  profileContent: React.ReactNode
  socialFeedContent: React.ReactNode
  notificationsContent: React.ReactNode
  unreadCount?: number
}

/**
 * マイページのタブコンポーネント
 * 「プロフィール」「みんな」「通知」の3タブを提供
 */
export function MypageTabs({
  profileContent,
  socialFeedContent,
  notificationsContent,
  unreadCount = 0,
}: MypageTabsProps) {
  const [activeTab, setActiveTab] = useState('profile')
  const [mounted, setMounted] = useState(false)

  // Hydration mismatch回避: クライアント側でマウント後にTabsをレンダリング
  useEffect(() => {
    setMounted(true)
  }, [])

  // マウント前は初期コンテンツのみ表示（Tabsなし）
  if (!mounted) {
    return (
      <div className="w-full">
        {/* タブリストのスケルトン */}
        <div className="w-full grid grid-cols-3 mb-4 h-10 bg-muted rounded-lg" />
        {/* 初期タブのコンテンツ */}
        {profileContent}
      </div>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full grid grid-cols-3 mb-4">
        <TabsTrigger value="profile" className="flex items-center gap-1.5">
          <User className="size-4" />
          <span>プロフィール</span>
        </TabsTrigger>
        <TabsTrigger value="social" className="flex items-center gap-1.5">
          <Users className="size-4" />
          <span>みんな</span>
        </TabsTrigger>
        <TabsTrigger value="notifications" className="relative flex items-center gap-1.5">
          <Bell className="size-4" />
          <span>通知</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-0">
        {profileContent}
      </TabsContent>

      {/* forceMount: コンポーネントを常にDOMに保持し、TanStack Queryのキャッシュをアクティブに維持 */}
      {/* data-[state=inactive]:hidden: 非アクティブ時はCSSで非表示 */}
      <TabsContent value="social" className="mt-0 data-[state=inactive]:hidden" forceMount>
        {socialFeedContent}
      </TabsContent>

      <TabsContent value="notifications" className="mt-0 data-[state=inactive]:hidden" forceMount>
        {notificationsContent}
      </TabsContent>
    </Tabs>
  )
}
