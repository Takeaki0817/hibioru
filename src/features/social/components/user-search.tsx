'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Loader2 } from 'lucide-react'
import { searchUsers } from '../api/user-search'
import { FollowButton } from './follow-button'
import type { PublicUserInfo } from '../types'
import { useDebouncedCallback } from 'use-debounce'

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
    <div className="space-y-4">
      {/* 検索入力 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleQueryChange}
          placeholder="ユーザー名または表示名で検索"
          className="pl-10"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* 検索結果 */}
      {hasSearched && (
        <div className="space-y-2">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              ユーザーが見つかりませんでした
            </p>
          ) : (
            results.map((user) => (
              <UserSearchResultItem key={user.id} user={user} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface UserSearchResultItemProps {
  user: PublicUserInfo
}

function UserSearchResultItem({ user }: UserSearchResultItemProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-3">
        <Avatar className="size-10">
          <AvatarImage src={user.avatarUrl ?? undefined} alt={user.displayName} />
          <AvatarFallback>
            {user.displayName?.charAt(0) ?? user.username.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{user.displayName}</p>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
        </div>
      </div>
      <FollowButton userId={user.id} />
    </div>
  )
}
