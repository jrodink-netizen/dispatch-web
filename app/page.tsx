'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Page() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [rides, setRides] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [editingRide, setEditingRide] = useState<any>(null)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) loadRides()
  }, [selectedDate, user])

  async function checkUser() {
    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      router.push('/login')
    } else {
      setUser(data.user)
    }

    setLoading(false)
  }

  async function loadRides() {
    const formatted = selectedDate.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('date', formatted)
      .order('departure_time', { ascending: true })

    if (!error) setRides(data || [])
  }

  function changeDay(amount: number) {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + amount)
    setSelectedDate(newDate)
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

  async function updateRide() {
    await supabase
      .from('rides')
      .update({
        status: editingRide.status,
        notes: editingRide.notes,
        departure_time: editingRide.departure_time,
        arrival_time: editingRide.arrival_time
      })
      .eq('id', editingRide.id)

    setEditingRide(null)
    loadRides()
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

        {rides.map((ride) => {
          const isOwnRide =
            ride.chauffeur_id &&
            user &&
            ride.chauffeur_id === user.id

          return (
            <div
              key={ride.id}
              onClick={() => {
                if (isOwnRide) {
                  setEditingRide(ride)
                }
              }}
              className={`p-4 rounded shadow ${
                getStatusColor(ride.status)
              } ${isOwnRide ? 'cursor-pointer' : 'opacity-70 cursor-default'}`}
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

              {!isOwnRide && (
                <div className="text-xs mt-2 italic opacity-60">
                  Alleen lezen
                </div>
              )}
            </div>
          )
        })}
      </div>

      {editingRide && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded w-96">
            <h2 className="text-xl mb-4">Rit bewerken</h2>

            <label className="text-sm">Vertrek</label>
            <input
              type="time"
              value={editingRide.departure_time || ''}
              onChange={e =>
                setEditingRide({
                  ...editingRide,
                  departure_time: e.target.value
                })
              }
              className="w-full mb-3 p-2 bg-gray-700 rounded"
            />

            <label className="text-sm">Aankomst</label>
            <input
              type="time"
              value={editingRide.arrival_time || ''}
              onChange={e =>
                setEditingRide({
                  ...editingRide,
                  arrival_time: e.target.value
                })
              }
              className="w-full mb-3 p-2 bg-gray-700 rounded"
            />

            <label className="text-sm">Status</label>
            <select
              value={editingRide.status}
              onChange={e =>
                setEditingRide({
                  ...editingRide,
                  status: e.target.value
                })
              }
              className="w-full mb-3 p-2 bg-gray-700 rounded"
            >
              <option value="gepland">Gepland</option>
              <option value="onderweg">Onderweg</option>
              <option value="afgerond">Afgerond</option>
              <option value="geannuleerd">Geannuleerd</option>
            </select>

            <label className="text-sm">Notitie</label>
            <textarea
              value={editingRide.notes || ''}
              onChange={e =>
                setEditingRide({
                  ...editingRide,
                  notes: e.target.value
                })
              }
              className="w-full mb-4 p-2 bg-gray-700 rounded"
            />

            <div className="flex justify-between">
              <button
                onClick={() => setEditingRide(null)}
                className="px-4 py-2 bg-gray-600 rounded"
              >
                Annuleren
              </button>

              <button
                onClick={updateRide}
                className="px-4 py-2 bg-blue-600 rounded"
              >
                Opslaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}