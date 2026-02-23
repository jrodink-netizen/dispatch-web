'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

function getWeekDates() {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - today.getDay() + 1)

  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export default function DriverPage() {
  const params = useParams()
  const driverId = params.id as string

  const [driver, setDriver] = useState<any>(null)
  const [rides, setRides] = useState<any[]>([])
  const [weekDates, setWeekDates] = useState<Date[]>([])

  useEffect(() => {
    setWeekDates(getWeekDates())
    loadDriver()
    loadRides()
  }, [])

  async function loadDriver() {
    const { data } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', driverId)
      .single()

    setDriver(data)
  }

  async function loadRides() {
    const { data } = await supabase
      .from('rides')
      .select('*')
      .eq('chauffeur_id', driverId)

    setRides(data || [])
  }

  function ridesFor(date: Date) {
    const formatted = date.toISOString().split('T')[0]

    return rides
      .filter(r => r.date === formatted)
      .sort((a, b) =>
        (a.departure_time || '').localeCompare(b.departure_time || '')
      )
  }

  async function updateStatus(id: string, status: string) {
    await supabase
      .from('rides')
      .update({ status })
      .eq('id', id)

    loadRides()
  }

  if (!driver) return <div className="p-6 text-white">Laden...</div>

  return (
    <div className="bg-gray-900 min-h-screen text-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">
        Planning van {driver.name}
      </h1>

      <div className="grid grid-cols-7 gap-4">
        {weekDates.map((date, i) => (
          <div key={i} className="bg-gray-800 p-4 rounded-lg">
            <div className="font-semibold mb-2">
              {date.toLocaleDateString('nl-NL', {
                weekday: 'short',
                day: 'numeric',
                month: 'numeric'
              })}
            </div>

            {ridesFor(date).length === 0 && (
              <div className="text-gray-400 text-sm">
                Geen ritten
              </div>
            )}

            {ridesFor(date).map(ride => (
              <div
                key={ride.id}
                className="mb-3 p-3 rounded bg-gray-700"
              >
                <div className="text-xs font-semibold">
                  {ride.departure_time?.slice(0,5)} - {ride.arrival_time?.slice(0,5)}
                </div>

                <div className="text-sm font-medium">
                  {ride.customer_name}
                </div>

                <div className="text-xs text-gray-300">
                  {ride.from_location} → {ride.to_location}
                </div>

                <select
                  value={ride.status || 'gepland'}
                  onChange={(e) => updateStatus(ride.id, e.target.value)}
                  className="mt-2 text-black text-xs rounded px-1"
                >
                  <option value="gepland">Gepland</option>
                  <option value="onderweg">Onderweg</option>
                  <option value="afgerond">Afgerond</option>
                  <option value="geannuleerd">Geannuleerd</option>
                </select>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}