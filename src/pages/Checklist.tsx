import { useEffect, useState } from 'react'
import { INITIAL_TASKS } from '../data/initialData'
import { loadFromStorage, saveToStorage } from '../utils/storage'
import type { Task } from '../types'

const CATEGORY_ICONS: Record<string, string> = {
  Flights: '✈️',
  Airbnb: '🏠',
  Transportation: '🚗',
  Food: '🍕',
  Wedding: '💒',
  Baby: '👶',
  Dogs: '🐶',
  Admin: '📋',
}

export default function Checklist() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('All')

  useEffect(() => {
    setTasks(loadFromStorage('tasks', INITIAL_TASKS))
  }, [])

  const toggleTask = (id: string) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    setTasks(updated)
    saveToStorage('tasks', updated)
  }

  const categories = ['All', ...Array.from(new Set(tasks.map((t) => t.category)))]

  const filteredTasks =
    activeCategory === 'All' ? tasks : tasks.filter((t) => t.category === activeCategory)

  const completedCount = tasks.filter((t) => t.completed).length
  const totalCount = tasks.length
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Checklist</h1>
        <p className="text-zinc-400 text-sm">{completedCount} of {totalCount} tasks done</p>
      </div>

      {/* Progress */}
      <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Overall progress</span>
          <span className="text-white font-medium">{completionPct}%</span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {cat !== 'All' && CATEGORY_ICONS[cat] ? `${CATEGORY_ICONS[cat]} ` : ''}{cat}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filteredTasks.map((task) => (
          <button
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className="w-full flex items-center gap-4 bg-zinc-900 rounded-2xl p-4 border border-zinc-800 active:scale-95 transition-transform text-left"
          >
            <div
              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                task.completed
                  ? 'bg-green-500 border-green-500'
                  : 'border-zinc-600'
              }`}
            >
              {task.completed && <span className="text-white text-sm">✓</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${task.completed ? 'line-through text-zinc-500' : 'text-white'}`}>
                {task.title}
              </p>
              {activeCategory === 'All' && (
                <p className="text-zinc-600 text-xs mt-0.5">
                  {CATEGORY_ICONS[task.category]} {task.category}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
