/**
 * useDeleteQueue フックのユニットテスト
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { useDeleteQueue } from '../use-delete-queue'

describe('useDeleteQueue', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('初期状態', () => {
    it('deletingIdsが空であること', () => {
      // Arrange
      const onDeleteComplete = jest.fn()

      // Act
      const { result } = renderHook(() =>
        useDeleteQueue({ onDeleteComplete })
      )

      // Assert
      expect(result.current.deletingIds.size).toBe(0)
    })
  })

  describe('addToDeletingQueue', () => {
    it('IDが追加されること', () => {
      // Arrange
      const onDeleteComplete = jest.fn()
      const { result } = renderHook(() =>
        useDeleteQueue({ onDeleteComplete })
      )

      // Act
      act(() => {
        result.current.addToDeletingQueue('item-1')
      })

      // Assert
      expect(result.current.deletingIds.has('item-1')).toBe(true)
      expect(result.current.deletingIds.size).toBe(1)
    })

    it('複数のIDが追加できること', () => {
      // Arrange
      const onDeleteComplete = jest.fn()
      const { result } = renderHook(() =>
        useDeleteQueue({ onDeleteComplete })
      )

      // Act
      act(() => {
        result.current.addToDeletingQueue('item-1')
        result.current.addToDeletingQueue('item-2')
        result.current.addToDeletingQueue('item-3')
      })

      // Assert
      expect(result.current.deletingIds.size).toBe(3)
      expect(result.current.deletingIds.has('item-1')).toBe(true)
      expect(result.current.deletingIds.has('item-2')).toBe(true)
      expect(result.current.deletingIds.has('item-3')).toBe(true)
    })
  })

  describe('isDeletingItem', () => {
    it('削除予定のIDに対してtrueを返すこと', () => {
      // Arrange
      const onDeleteComplete = jest.fn()
      const { result } = renderHook(() =>
        useDeleteQueue({ onDeleteComplete })
      )

      act(() => {
        result.current.addToDeletingQueue('item-1')
      })

      // Act & Assert
      expect(result.current.isDeletingItem('item-1')).toBe(true)
    })

    it('削除予定でないIDに対してfalseを返すこと', () => {
      // Arrange
      const onDeleteComplete = jest.fn()
      const { result } = renderHook(() =>
        useDeleteQueue({ onDeleteComplete })
      )

      act(() => {
        result.current.addToDeletingQueue('item-1')
      })

      // Act & Assert
      expect(result.current.isDeletingItem('item-2')).toBe(false)
    })
  })

  describe('アニメーション完了後の動作', () => {
    it('デフォルトの300ms後にonDeleteCompleteが呼ばれること', () => {
      // Arrange
      const onDeleteComplete = jest.fn()
      const { result } = renderHook(() =>
        useDeleteQueue({ onDeleteComplete })
      )

      // Act
      act(() => {
        result.current.addToDeletingQueue('item-1')
      })

      // Assert: まだ呼ばれていない
      expect(onDeleteComplete).not.toHaveBeenCalled()

      // 300ms経過
      act(() => {
        jest.advanceTimersByTime(300)
      })

      // Assert: 呼ばれた
      expect(onDeleteComplete).toHaveBeenCalledWith('item-1')
      expect(onDeleteComplete).toHaveBeenCalledTimes(1)
    })

    it('カスタムanimationDuration後にonDeleteCompleteが呼ばれること', () => {
      // Arrange
      const onDeleteComplete = jest.fn()
      const { result } = renderHook(() =>
        useDeleteQueue({
          onDeleteComplete,
          animationDuration: 500,
        })
      )

      // Act
      act(() => {
        result.current.addToDeletingQueue('item-1')
      })

      // 300ms経過（まだ呼ばれない）
      act(() => {
        jest.advanceTimersByTime(300)
      })
      expect(onDeleteComplete).not.toHaveBeenCalled()

      // さらに200ms経過（合計500ms）
      act(() => {
        jest.advanceTimersByTime(200)
      })
      expect(onDeleteComplete).toHaveBeenCalledWith('item-1')
    })

    it('アニメーション完了後にIDがクリアされること', () => {
      // Arrange
      const onDeleteComplete = jest.fn()
      const { result } = renderHook(() =>
        useDeleteQueue({ onDeleteComplete })
      )

      // Act
      act(() => {
        result.current.addToDeletingQueue('item-1')
      })

      expect(result.current.deletingIds.has('item-1')).toBe(true)

      act(() => {
        jest.advanceTimersByTime(300)
      })

      // Assert
      expect(result.current.deletingIds.has('item-1')).toBe(false)
      expect(result.current.deletingIds.size).toBe(0)
    })

    it('複数のアイテムが順次処理されること', () => {
      // Arrange
      const onDeleteComplete = jest.fn()
      const { result } = renderHook(() =>
        useDeleteQueue({ onDeleteComplete })
      )

      // Act: 3つのアイテムを追加（同時）
      act(() => {
        result.current.addToDeletingQueue('item-1')
        result.current.addToDeletingQueue('item-2')
        result.current.addToDeletingQueue('item-3')
      })

      expect(result.current.deletingIds.size).toBe(3)

      // 300ms後に全て完了
      act(() => {
        jest.advanceTimersByTime(300)
      })

      // Assert
      expect(onDeleteComplete).toHaveBeenCalledTimes(3)
      expect(onDeleteComplete).toHaveBeenCalledWith('item-1')
      expect(onDeleteComplete).toHaveBeenCalledWith('item-2')
      expect(onDeleteComplete).toHaveBeenCalledWith('item-3')
      expect(result.current.deletingIds.size).toBe(0)
    })
  })

  describe('filterOutDeleting', () => {
    it('削除予定のアイテムを除外すること', () => {
      // Arrange
      const onDeleteComplete = jest.fn()
      const { result } = renderHook(() =>
        useDeleteQueue({ onDeleteComplete })
      )

      const items = [
        { id: 'item-1', name: 'Item 1' },
        { id: 'item-2', name: 'Item 2' },
        { id: 'item-3', name: 'Item 3' },
      ]

      act(() => {
        result.current.addToDeletingQueue('item-2')
      })

      // Act
      const filtered = result.current.filterOutDeleting(items)

      // Assert
      expect(filtered.length).toBe(2)
      expect(filtered.map((i) => i.id)).toEqual(['item-1', 'item-3'])
    })

    it('削除予定がない場合は全てのアイテムを返すこと', () => {
      // Arrange
      const onDeleteComplete = jest.fn()
      const { result } = renderHook(() =>
        useDeleteQueue({ onDeleteComplete })
      )

      const items = [
        { id: 'item-1', name: 'Item 1' },
        { id: 'item-2', name: 'Item 2' },
      ]

      // Act
      const filtered = result.current.filterOutDeleting(items)

      // Assert
      expect(filtered.length).toBe(2)
      expect(filtered).toEqual(items)
    })

    it('全てのアイテムが削除予定の場合は空配列を返すこと', () => {
      // Arrange
      const onDeleteComplete = jest.fn()
      const { result } = renderHook(() =>
        useDeleteQueue({ onDeleteComplete })
      )

      const items = [
        { id: 'item-1', name: 'Item 1' },
        { id: 'item-2', name: 'Item 2' },
      ]

      act(() => {
        result.current.addToDeletingQueue('item-1')
        result.current.addToDeletingQueue('item-2')
      })

      // Act
      const filtered = result.current.filterOutDeleting(items)

      // Assert
      expect(filtered.length).toBe(0)
    })

    it('空配列に対しては空配列を返すこと', () => {
      // Arrange
      const onDeleteComplete = jest.fn()
      const { result } = renderHook(() =>
        useDeleteQueue({ onDeleteComplete })
      )

      // Act
      const filtered = result.current.filterOutDeleting([])

      // Assert
      expect(filtered).toEqual([])
    })
  })

  describe('コールバック安定性', () => {
    it('onDeleteCompleteが変わってもaddToDeletingQueueが正しく動作すること', () => {
      // Arrange
      const onDeleteComplete1 = jest.fn()
      const onDeleteComplete2 = jest.fn()

      const { result, rerender } = renderHook(
        ({ onDeleteComplete }) => useDeleteQueue({ onDeleteComplete }),
        { initialProps: { onDeleteComplete: onDeleteComplete1 } }
      )

      // Act: 最初のアイテムを追加
      act(() => {
        result.current.addToDeletingQueue('item-1')
      })

      // コールバックを変更
      rerender({ onDeleteComplete: onDeleteComplete2 })

      // 2つ目のアイテムを追加
      act(() => {
        result.current.addToDeletingQueue('item-2')
      })

      // 300ms経過
      act(() => {
        jest.advanceTimersByTime(300)
      })

      // Assert: 最初のコールバックでitem-1が呼ばれる
      expect(onDeleteComplete1).toHaveBeenCalledWith('item-1')
      // 新しいコールバックでitem-2が呼ばれる
      expect(onDeleteComplete2).toHaveBeenCalledWith('item-2')
    })
  })

  describe('同じIDの重複追加', () => {
    it('同じIDを複数回追加してもSetなので1つになること', () => {
      // Arrange
      const onDeleteComplete = jest.fn()
      const { result } = renderHook(() =>
        useDeleteQueue({ onDeleteComplete })
      )

      // Act
      act(() => {
        result.current.addToDeletingQueue('item-1')
        result.current.addToDeletingQueue('item-1')
        result.current.addToDeletingQueue('item-1')
      })

      // Assert
      expect(result.current.deletingIds.size).toBe(1)
    })
  })
})
