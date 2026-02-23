'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function DriverPage() {
  const [drivers, setDrivers] = useState<any[]>([])
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null)
  const [rides, setRides] = useState<any[]>([])

  useEffect(() => {
    fetchDrivers()
  }, [])

  useEffect(() => {
    if (selectedDriver) {
      fetchRides(selectedDriver)
    }
  }, [selectedDriver])

  async function fetchDrivers() {
    const { data } = await supabase.from('drivers').select('*')
    setDrivers(data || [])
  }

  async function fetchRides(driverId: string) {
    const { data } = await supabase
      .from('rides')
      .select('*')
      .eq('chauffeur_id', driverId)
      .order('created_at', { ascending: false })

    setRides(data || [])
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('rides').update({ status }).eq('id', id)
    if (selectedDriver) fetchRides(selectedDriver)
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Chauffeur App</h1>

      {!selectedDriver && (
        <div>
          <h2 className="text-xl mb-4">Selecteer jouw naam</h2>
          {drivers.map((driver) => (
            <button
              key={driver.id}
              onClick={() => setSelectedDriver(driver.id)}
              className="block w-full bg-blue-600 text-white p-3 rounded mb-3"
            >
              {driver.name}
            </button>
          ))}
        </div>
      )}

      {selectedDriver && (
        <div>
          <button
            onClick={() => setSelectedDriver(null)}
            className="mb-4 text-sm text-gray-500"
          >
            ← Terug
          </button>

          <h2 className="text-xl font-semibold mb-4">Mijn Ritten</h2>

          {rides.length === 0 && (
            <div className="text-gray-500">Geen ritten toegewezen</div>
          )}

          {rides.map((ride) => (
            <div key={ride.id} className="bg-white p-4 rounded shadow mb-4">
              <div className="font-semibold">{ride.customer_name}</div>
              <div className="text-sm text-gray-500 mb-2">
                {ride.from_location} → {ride.to_location}
              </div>

              <div className="mb-3">
                Status: <strong>{ride.status}</strong>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => updateStatus(ride.id, 'onderweg')}
                  className="bg-yellow-500 text-white px-3 py-1 rounded text-sm"
                >
                  Onderweg
                </button>
                <button
                  onClick={() => updateStatus(ride.id, 'aangekomen')}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                >
                  Aangekomen
                </button>
                <button
                  onClick={() => updateStatus(ride.id, 'afgerond')}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                >
                  Afgerond
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}