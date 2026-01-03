'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Loader2, Users } from 'lucide-react'
import { searchUsers } from '../api/user-search'
import { FollowButton } from './follow-button'
import type { PublicUserInfo } from '../types'
import { useDebouncedCallback } from 'use-debounce'
import { ANIMATION_CONFIG } from '../constants'

const containerVariants = {
  animate: {
    transition: { staggerChildren: 0.03 },
  },
}

const itemVariants = {
  initial: { opacity: 0, y: 5 },
  animate: {
    opacity: 1,
    y: 0,
    transition: ANIMATION_CONFIG.springDefault,
  },
  exit: { opacity: 0, y: -5 },
}

/**
 * ユーザー検索コンポーネント
 * ユーザー名または表示名で検索
 */
export function UserSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PublicUserInfo[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const performSearch = useDebouncedCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([])
      setHasSearched(false)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const result = await searchUsers(searchQuery)
    setIsSearching(false)
    setHasSearched(true)

    if (result.ok) {
      setResults(result.value.items)
    } else {
      setResults([])
    }
  }, 300)

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    performSearch(value)
  }

  return (
    <div className="relative">
      {/* 検索入力 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleQueryChange}
          placeholder="ユーザー検索"
          className="pl-9 h-9 rounded-lg text-sm"
        />
        <AnimatePresence>
          {isSearching && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 検索結果（検索時のみ表示） */}
      <AnimatePresence mode="wait">
        {hasSearched && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={ANIMATION_CONFIG.springDefault}
            className="absolute left-0 right-0 top-full mt-2 z-10"
          >
            <div className="p-3 rounded-xl border border-border bg-card shadow-lg">
              {results.length === 0 ? (
                <EmptySearchState />
              ) : (
                <motion.div
                  className="space-y-2 max-h-64 overflow-y-auto"
                  variants={containerVariants}
                  initial="initial"
                  animate="animate"
                >
                  {results.map((user) => (
                    <UserSearchResultItem key={user.id} user={user} />
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface UserSearchResultItemProps {
  user: PublicUserInfo
}

function UserSearchResultItem({ user }: UserSearchResultItemProps) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex items-center justify-between p-2.5 rounded-lg transition-colors hover:bg-muted"
    >
      <div className="flex items-center gap-2.5">
        <Avatar className="size-8">
          <AvatarImage src={user.avatarUrl ?? undefined} alt={user.displayName} />
          <AvatarFallback className="bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400 text-xs">
            {user.displayName?.charAt(0) ?? user.username.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">{user.displayName}</p>
          <p className="text-xs text-muted-foreground">@{user.username}</p>
        </div>
      </div>
      <FollowButton userId={user.id} size="sm" />
    </motion.div>
  )
}

// 検索結果が空の場合
function EmptySearchState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-4"
    >
      <Users className="size-5 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">見つかりませんでした</p>
    </motion.div>
  )
}
