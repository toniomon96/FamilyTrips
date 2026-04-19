import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TRIP_INFO, INITIAL_TASKS, INITIAL_POLLS } from '../data/initialData'
import { loadFromStorage } from '../utils/storage'
import type { Task, Poll } from '../types'

function getDaysUntil(dateStr: string): number {
  const now = new Date()
  const target = new Date(dateStr)
  const diff = target.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [polls, setPolls] = useState<Poll[]>([])

  useEffect(() => {
    setTasks(loadFromStorage('tasks', INITIAL_TASKS))
    setPolls(loadFromStorage('polls', INITIAL_POLLS))
  }, [])

  const completedCount = tasks.filter((t) => t.completed).length
  const totalCount = tasks.length
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const daysUntil = getDaysUntil(TRIP_INFO.startDate)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-bold text-white">{TRIP_INFO.name}</h1>
        <p className="text-zinc-400 text-lg">📍 {TRIP_INFO.location}</p>
        <p className="text-zinc-500 text-sm">
          {formatDate(TRIP_INFO.startDate)} — {formatDate(TRIP_INFO.endDate)}
        </p>
      </div>

      {/* Countdown */}
      <div className="bg-blue-600 rounded-2xl p-6 text-center shadow-lg">
        <p className="text-blue-200 text-sm mb-1">Trip starts in</p>
        <p className="text-6xl font-bold text-white">{daysUntil}</p>
        <p className="text-blue-200 text-sm mt-1">days</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Checklist */}
        <Link to="/checklist" className="bg-zinc-900 rounded-2xl p-4 space-y-2 border border-zinc-800 active:scale-95 transition-transform">
          <div className="flex items-center justify-between">
            <span className="text-2xl">✅</span>
            <span className="text-2xl font-bold text-white">{completionPct}%</span>
          </div>
          <p className="text-zinc-400 text-sm">Checklist</p>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <p className="text-zinc-500 text-xs">{completedCount}/{totalCount} done</p>
        </Link>

        {/* Polls */}
        <Link to="/polls" className="bg-zinc-900 rounded-2xl p-4 space-y-2 border border-zinc-800 active:scale-95 transition-transform">
          <div className="flex items-center justify-between">
            <span className="text-2xl">🗳️</span>
            <span className="text-2xl font-bold text-white">{polls.length}</span>
          </div>
          <p className="text-zinc-400 text-sm">Active Polls</p>
          <p className="text-zinc-500 text-xs">Tap to vote</p>
        </Link>

        {/* Airbnb */}
        <div className="bg-zinc-900 rounded-2xl p-4 space-y-2 border border-zinc-800">
          <span className="text-2xl">🏠</span>
          <p className="text-zinc-400 text-sm">Airbnb</p>
          <p className="text-green-400 text-sm font-medium">✓ Booked</p>
        </div>

        {/* Flights */}
        <div className="bg-zinc-900 rounded-2xl p-4 space-y-2 border border-zinc-800">
          <span className="text-2xl">✈️</span>
          <p className="text-zinc-400 text-sm">Flights</p>
          <p className="text-yellow-400 text-sm font-medium">⏳ Pending</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="space-y-2">
        <h2 className="text-zinc-400 text-sm uppercase tracking-wide">Quick Actions</h2>
        <Link
          to="/costs"
          className="flex items-center justify-between bg-zinc-900 rounded-2xl p-4 border border-zinc-800 active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <span className="text-white">Cost Tracker</span>
          </div>
          <span className="text-zinc-500">›</span>
        </Link>
        <Link
          to="/info"
          className="flex items-center justify-between bg-zinc-900 rounded-2xl p-4 border border-zinc-800 active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <span className="text-white">Trip Info</span>
          </div>
          <span className="text-zinc-500">›</span>
        </Link>
      </div>
    </div>
  )
}
