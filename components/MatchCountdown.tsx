'use client'

import { useState, useEffect } from 'react'

interface Props {
  matchDate: string
  teamA: string
  teamB: string
}

function getTimeLeft(matchDate: string) {
  const diff = new Date(matchDate).getTime() - Date.now()
  if (diff <= 0) return null
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds }
}

export default function MatchCountdown({ matchDate, teamA, teamB }: Props) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(matchDate))

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(matchDate))
    }, 1000)
    return () => clearInterval(timer)
  }, [matchDate])

  const locked = !timeLeft

  return (
    <div className={`rounded-xl border px-5 py-4 mb-6 ${locked ? 'bg-red-950 border-red-800' : 'bg-gray-900 border-gray-800'}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Next Match</p>
          <p className="text-white font-semibold">{teamA} vs {teamB}</p>
          <p className="text-gray-400 text-xs mt-0.5">
            {new Date(matchDate).toLocaleDateString('en-IN', {
              weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>

        {locked ? (
          <div className="text-red-400 font-semibold text-sm">
            Team Locked
          </div>
        ) : (
          <div className="flex gap-3 text-center">
            {timeLeft.days > 0 && (
              <div>
                <p className="text-white font-bold text-xl leading-none">{timeLeft.days}</p>
                <p className="text-gray-500 text-[10px] mt-1">DAYS</p>
              </div>
            )}
            <div>
              <p className="text-white font-bold text-xl leading-none">
                {String(timeLeft.hours).padStart(2, '0')}
              </p>
              <p className="text-gray-500 text-[10px] mt-1">HRS</p>
            </div>
            <div>
              <p className="text-white font-bold text-xl leading-none">
                {String(timeLeft.minutes).padStart(2, '0')}
              </p>
              <p className="text-gray-500 text-[10px] mt-1">MIN</p>
            </div>
            <div>
              <p className="text-white font-bold text-xl leading-none">
                {String(timeLeft.seconds).padStart(2, '0')}
              </p>
              <p className="text-gray-500 text-[10px] mt-1">SEC</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
