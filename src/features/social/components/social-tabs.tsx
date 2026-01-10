'use client'

import { useState, useMemo, useSyncExternalStore } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Users, Bell } from 'lucide-react'
import { useTabSwipe, type SocialTabValue } from '../hooks/use-tab-swipe'
import { tabSlideTransition } from '@/lib/animations'

// Hydration対応用
const emptySubscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

interface SocialTabsProps {
  profileContent: React.ReactNode
  socialFeedContent: React.ReactNode
  notificationsContent: React.ReactNode
}

/**
 * ソーシャルページのタブコンポーネント
 * 「プロフィール」「みんな」「通知」の3タブを提供
 * スワイプ操作でタブ切り替え可能
 */
export function SocialTabs({
  profileContent,
  socialFeedContent,
  notificationsContent,
}: SocialTabsProps) {
  const [activeTab, setActiveTab] = useState<SocialTabValue>('profile')

  // Hydration mismatch回避: クライアント側でマウント後にTabsをレンダリング
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot)

  // スワイプハンドラー
  const { handlers, activeIndex } = useTabSwipe({
    activeTab,
    onTabChange: setActiveTab,
  })

  // タブコンテンツ配列をメモ化
  const tabContents = useMemo(
    () => [
      { key: 'profile' as const, content: profileContent },
      { key: 'social' as const, content: socialFeedContent },
      { key: 'notifications' as const, content: notificationsContent },
    ],
    [profileContent, socialFeedContent, notificationsContent]
  )

  // マウント前は初期コンテンツのみ表示（Tabsなし）
  if (!mounted) {
    return (
      <div className="w-full">
        {/* タブリストのスケルトン */}
        <div className="w-full grid grid-cols-3 p-4 h-10 bg-muted rounded-lg" />
        {/* 初期タブのコンテンツ */}
        <div className="px-4">{profileContent}</div>
      </div>
    )
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as SocialTabValue)}
      className="relative h-full"
    >
      {/* タブナビゲーション（絶対配置でコンテンツの上に重なる） */}
      <TabsList className="absolute top-0 left-0 right-0 z-10 w-full grid grid-cols-3 p-4 h-auto rounded-none bg-background/40 backdrop-blur-md">
        <TabsTrigger value="profile" className="flex items-center gap-1.5">
          <Settings className="size-4" />
          <span>設定</span>
        </TabsTrigger>
        <TabsTrigger value="social" className="flex items-center gap-1.5">
          <Users className="size-4" />
          <span>みんな</span>
        </TabsTrigger>
        <TabsTrigger value="notifications" className="flex items-center gap-1.5">
          <Bell className="size-4" />
          <span>通知</span>
        </TabsTrigger>
      </TabsList>

      {/* スワイプ可能なコンテンツ領域 */}
      <div {...handlers} className="h-full overflow-hidden">
        <motion.div
          className="flex h-full"
          animate={{ x: `-${activeIndex * 100}%` }}
          transition={tabSlideTransition}
        >
          {tabContents.map(({ key, content }) => (
            <div
              key={key}
              className="w-full flex-shrink-0 h-full overflow-y-auto px-4 pt-16 pb-6"
              aria-hidden={activeTab !== key}
              style={{
                // 非アクティブ時はポインターイベント無効化
                pointerEvents: activeTab === key ? 'auto' : 'none',
              }}
            >
              {content}
            </div>
          ))}
        </motion.div>
      </div>
    </Tabs>
  )
}
