'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

type Bookmark = {
    id: string
    user_id: string
    url: string
    title: string
    created_at: string
}

type BookmarkListProps = {
    initialBookmarks: Bookmark[]
    userId: string
}

export default function BookmarkList({ initialBookmarks, userId }: BookmarkListProps) {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks)
    const [url, setUrl] = useState('')
    const [title, setTitle] = useState('')
    const [isAdding, setIsAdding] = useState(false)
    const [error, setError] = useState('')
    const supabase = createClient()

    useEffect(() => {
        console.log('Setting up realtime subscription for user:', userId)

        // Set up real-time subscription
        const channel: RealtimeChannel = supabase
            .channel('bookmarks-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bookmarks',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    console.log('🔔 Realtime event received:', {
                        eventType: payload.eventType,
                        payload: payload
                    })

                    if (payload.eventType === 'INSERT') {
                        console.log('➕ Adding bookmark via realtime:', payload.new)
                        setBookmarks((current) => {
                            // Avoid duplicates
                            const exists = current.some(b => b.id === payload.new.id)
                            if (exists) {
                                console.log('⚠️ Bookmark already exists, skipping')
                                return current
                            }
                            return [payload.new as Bookmark, ...current]
                        })
                    } else if (payload.eventType === 'DELETE') {
                        console.log('🗑️ Deleting bookmark via realtime:', payload.old)
                        setBookmarks((current) => {
                            const filtered = current.filter((bookmark) => bookmark.id !== payload.old.id)
                            console.log('Bookmarks after delete:', filtered.length)
                            return filtered
                        })
                    }
                }
            )
            .subscribe((status) => {
                console.log('📡 Subscription status:', status)
            })

        return () => {
            console.log('Cleaning up realtime subscription')
            supabase.removeChannel(channel)
        }
    }, [supabase, userId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsAdding(true)

        // Basic URL validation
        try {
            new URL(url)
        } catch {
            setError('Please enter a valid URL')
            setIsAdding(false)
            return
        }

        if (!title.trim()) {
            setError('Please enter a title')
            setIsAdding(false)
            return
        }

        // Optimistic update - add bookmark to UI immediately
        const tempId = crypto.randomUUID()
        const optimisticBookmark: Bookmark = {
            id: tempId,
            url: url.trim(),
            title: title.trim(),
            user_id: userId,
            created_at: new Date().toISOString(),
        }

        setBookmarks((current) => [optimisticBookmark, ...current])
        setUrl('')
        setTitle('')

        const { data, error: insertError } = await supabase.from('bookmarks').insert({
            url: optimisticBookmark.url,
            title: optimisticBookmark.title,
            user_id: userId,
        }).select()

        if (insertError) {
            console.error('Insert error details:', {
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint,
                code: insertError.code,
                fullError: insertError
            })
            // Remove optimistic bookmark on error
            setBookmarks((current) => current.filter(b => b.id !== tempId))
            setError(`Failed to add bookmark: ${insertError.message || 'Unknown error'}`)
            setUrl(optimisticBookmark.url)
            setTitle(optimisticBookmark.title)
        } else {
            console.log('Bookmark added successfully:', data)
            // Replace optimistic bookmark with real one from database
            if (data && data[0]) {
                setBookmarks((current) =>
                    current.map(b => b.id === tempId ? data[0] : b)
                )
            }
        }

        setIsAdding(false)
    }

    const handleDelete = async (id: string) => {
        // Optimistic update - remove bookmark from UI immediately
        const bookmarkToDelete = bookmarks.find(b => b.id === id)
        setBookmarks((current) => current.filter((bookmark) => bookmark.id !== id))

        const { error: deleteError } = await supabase
            .from('bookmarks')
            .delete()
            .eq('id', id)

        if (deleteError) {
            console.error('Delete error:', deleteError)
            // Restore bookmark on error
            if (bookmarkToDelete) {
                setBookmarks((current) => [bookmarkToDelete, ...current])
            }
        } else {
            console.log('Bookmark deleted successfully')
        }
    }

    return (
        <div className="space-y-6">
            {/* Add Bookmark Form */}
            <div className="rounded-2xl bg-white/10 backdrop-blur-lg p-6 shadow-xl border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-4">Add New Bookmark</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="url" className="block text-sm font-medium text-gray-200 mb-2">
                            URL
                        </label>
                        <input
                            type="text"
                            id="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-200 mb-2">
                            Title
                        </label>
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="My Favorite Website"
                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            required
                        />
                    </div>
                    {error && (
                        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                            {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={isAdding}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isAdding ? 'Adding...' : 'Add Bookmark'}
                    </button>
                </form>
            </div>

            {/* Bookmarks List */}
            <div className="space-y-3">
                <h2 className="text-2xl font-bold text-white mb-4">
                    Your Bookmarks ({bookmarks.length})
                </h2>
                {bookmarks.length === 0 ? (
                    <div className="rounded-2xl bg-white/5 backdrop-blur-lg p-12 text-center border border-white/10">
                        <svg
                            className="w-16 h-16 text-gray-400 mx-auto mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                            />
                        </svg>
                        <p className="text-gray-400 text-lg">No bookmarks yet</p>
                        <p className="text-gray-500 text-sm mt-2">Add your first bookmark above!</p>
                    </div>
                ) : (
                    bookmarks.map((bookmark) => (
                        <div
                            key={bookmark.id}
                            className="group rounded-xl bg-white/10 backdrop-blur-lg p-5 shadow-lg border border-white/20 hover:bg-white/15 transition-all duration-200 hover:shadow-xl"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-semibold text-white mb-1 truncate">
                                        {bookmark.title}
                                    </h3>
                                    <a
                                        href={bookmark.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-purple-300 hover:text-purple-200 text-sm break-all transition-colors"
                                    >
                                        {bookmark.url}
                                    </a>
                                    <p className="text-gray-400 text-xs mt-2">
                                        Added {new Date(bookmark.created_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete(bookmark.id)}
                                    className="flex-shrink-0 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                                    aria-label="Delete bookmark"
                                >
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
