'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Page() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [rides, setRides] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      router.push('/login')
    } else {
      setUser(data.user)
      loadRides()
    }

    setLoading(false)
  }

  async function loadRides() {
    const formatted = selectedDate.toISOString().split('T')[0]

    const { data } = await supabase
      .from('rides')
      .select('*')
      .eq('date', formatted)
      .order('departure_time', { ascending: true })

    setRides(data || [])
  }

  function changeDay(amount: number) {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + amount)
    setSelectedDate(newDate)
    setTimeout(() => loadRides(), 100)
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'onderweg':
        return 'bg-yellow-500'
      case 'afgerond':
        return 'bg-green-600'
      case 'geannuleerd':
        return 'bg-red-600'
      default:
        return 'bg-blue-600'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Bezig met laden...
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-bold">Ritplanning</h1>

        <div className="flex items-center gap-4">
          <button
            onClick={() => changeDay(-1)}
            className="px-4 py-2 bg-gray-700 rounded"
          >
            ←
          </button>

          <div className="text-lg font-semibold">
            {selectedDate.toLocaleDateString('nl-NL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </div>

          <button
            onClick={() => changeDay(1)}
            className="px-4 py-2 bg-gray-700 rounded"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {rides.length === 0 && (
          <div className="text-gray-400">
            Geen ritten voor deze dag.
          </div>
        )}

        {rides.map((ride) => (
          <div
            key={ride.id}
            className={`p-4 rounded shadow ${getStatusColor(
              ride.status
            )}`}
          >
            <div className="text-sm">
              {ride.departure_time?.slice(0, 5)} -{' '}
              {ride.arrival_time?.slice(0, 5)}
            </div>

            <div className="text-lg font-semibold">
              {ride.customer_name}
            </div>

            <div className="text-sm">
              {ride.from_location} → {ride.to_location}
            </div>

            {ride.notes && (
              <div className="text-xs mt-2 opacity-80">
                📝 {ride.notes}
              </div>
            )}

            <div className="mt-2 text-xs">
              Status: {ride.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}