import { useEffect, useState } from 'react'
import { INITIAL_POLLS } from '../data/initialData'
import { loadFromStorage, saveToStorage } from '../utils/storage'
import type { Poll } from '../types'

export default function Polls() {
  const [polls, setPolls] = useState<Poll[]>([])

  useEffect(() => {
    setPolls(loadFromStorage('polls', INITIAL_POLLS))
  }, [])

  const vote = (pollId: string, optionId: string) => {
    const updated = polls.map((poll) => {
      if (poll.id !== pollId) return poll
      if (poll.userVote) return poll // already voted

      return {
        ...poll,
        userVote: optionId,
        options: poll.options.map((opt) =>
          opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
        ),
      }
    })
    setPolls(updated)
    saveToStorage('polls', updated)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Polls</h1>
        <p className="text-zinc-400 text-sm">Vote on group decisions</p>
      </div>

      {/* Poll Cards */}
      <div className="space-y-4">
        {polls.map((poll) => {
          const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0)
          const hasVoted = !!poll.userVote

          return (
            <div key={poll.id} className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-white font-medium text-base leading-snug">{poll.question}</h2>
                {hasVoted && (
                  <span className="text-xs bg-green-900 text-green-400 px-2 py-1 rounded-full flex-shrink-0">
                    Voted
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {poll.options.map((option) => {
                  const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0
                  const isSelected = poll.userVote === option.id

                  return (
                    <button
                      key={option.id}
                      onClick={() => vote(poll.id, option.id)}
                      disabled={hasVoted}
                      className={`w-full rounded-xl p-3 text-left transition-all relative overflow-hidden ${
                        isSelected
                          ? 'border-2 border-blue-500 bg-blue-950'
                          : hasVoted
                          ? 'border border-zinc-700 bg-zinc-800 opacity-70'
                          : 'border border-zinc-700 bg-zinc-800 active:scale-95'
                      }`}
                    >
                      {/* Progress bar background */}
                      {hasVoted && (
                        <div
                          className={`absolute inset-y-0 left-0 rounded-xl transition-all ${
                            isSelected ? 'bg-blue-600/20' : 'bg-zinc-700/30'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      )}
                      <div className="relative flex items-center justify-between">
                        <span className={`text-sm ${isSelected ? 'text-blue-300 font-medium' : 'text-zinc-300'}`}>
                          {option.text}
                        </span>
                        {hasVoted && (
                          <span className={`text-sm font-bold ${isSelected ? 'text-blue-400' : 'text-zinc-400'}`}>
                            {pct}%
                          </span>
                        )}
                      </div>
                      {hasVoted && (
                        <p className="relative text-xs text-zinc-500 mt-0.5">
                          {option.votes} vote{option.votes !== 1 ? 's' : ''}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>

              <p className="text-zinc-600 text-xs">{totalVotes} total votes</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
