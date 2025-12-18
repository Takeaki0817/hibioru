'use client'

import { Moon, Sun, Monitor, Check } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // SSR対策: クライアントサイドでのみレンダリング
  // SSRでのハイドレーション不一致を防ぐため、初回マウント後にmountedをtrueに設定
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled>
        <Sun className="h-4 w-4 text-muted-foreground" />
        <span className="sr-only">テーマを切り替え</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-4 w-4 rotate-0 scale-100 text-foreground transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 text-foreground transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">テーマを切り替え</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4 text-foreground" />
          <span>ライト</span>
          {theme === 'light' && <Check className="ml-auto h-4 w-4 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4 text-foreground" />
          <span>ダーク</span>
          {theme === 'dark' && <Check className="ml-auto h-4 w-4 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4 text-foreground" />
          <span>システム</span>
          {theme === 'system' && <Check className="ml-auto h-4 w-4 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
