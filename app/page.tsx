'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

function getStatusStyle(status: string) {
  switch (status) {
    case 'onderweg':
      return 'bg-yellow-100 text-yellow-800'
    case 'afgerond':
      return 'bg-green-100 text-green-800'
    case 'geannuleerd':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-blue-100 text-blue-800'
  }
}

export default function Planner() {
  const [drivers, setDrivers] = useState<any[]>([])
  const [rides, setRides] = useState<any[]>([])
  const [completedRides, setCompletedRides] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activeCell, setActiveCell] = useState<any>(null)
  const [editingRide, setEditingRide] = useState<any>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  useEffect(() => {
    loadDrivers()
  }, [])

  useEffect(() => {
    loadRides()
  }, [selectedDate])

  async function loadDrivers() {
    const { data } = await supabase
      .from('drivers')
      .select('*')
      .eq('role', 'chauffeur')

    setDrivers(data || [])
  }

  async function loadRides() {
    const formatted = selectedDate.toISOString().split('T')[0]

    const { data } = await supabase
      .from('rides')
      .select('*')
      .eq('date', formatted)

    setRides(data || [])
  }

  async function loadCompletedRides() {
    const { data } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'afgerond')
      .order('date', { ascending: false })

    setCompletedRides(data || [])
    setShowCompleted(true)
  }

  function exportToExcel() {
    const formattedData = completedRides.map((ride) => ({
      Datum: ride.date,
      Chauffeur: drivers.find(d => d.id === ride.chauffeur_id)?.name || '',
      Klant: ride.customer_name,
      Van: ride.from_location,
      Naar: ride.to_location,
      Vertrek: ride.departure_time?.slice(0,5),
      Aankomst: ride.arrival_time?.slice(0,5),
      Notitie: ride.notes || ''
    }))

    const worksheet = XLSX.utils.json_to_sheet(formattedData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Afgeronde Ritten')
    XLSX.writeFile(workbook, 'afgeronde_ritten.xlsx')
  }

  function ridesFor(driverId: string) {
    return rides
      .filter(r => r.chauffeur_id === driverId)
      .sort((a, b) =>
        (a.departure_time || '').localeCompare(b.departure_time || '')
      )
  }

  function changeDay(amount: number) {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + amount)
    setSelectedDate(newDate)
  }

  async function handleCreate(e: any) {
    e.preventDefault()
    const form = new FormData(e.target)
    const formatted = selectedDate.toISOString().split('T')[0]

    await supabase.from('rides').insert([
      {
        customer_name: form.get('customer'),
        from_location: form.get('from'),
        to_location: form.get('to'),
        notes: form.get('notes'),
        chauffeur_id: activeCell.driverId,
        date: formatted,
        departure_time: form.get('departure') + ':00',
        arrival_time: form.get('arrival') + ':00',
        status: form.get('status') || 'gepland'
      }
    ])

    setActiveCell(null)
    loadRides()
  }

  async function handleUpdate(e: any) {
    e.preventDefault()
    const form = new FormData(e.target)

    await supabase
      .from('rides')
      .update({
        customer_name: form.get('customer'),
        from_location: form.get('from'),
        to_location: form.get('to'),
        notes: form.get('notes'),
        departure_time: form.get('departure') + ':00',
        arrival_time: form.get('arrival') + ':00',
        status: form.get('status')
      })
      .eq('id', editingRide.id)

    setEditingRide(null)
    loadRides()
  }

  async function handleDelete() {
    await supabase.from('rides').delete().eq('id', editingRide.id)
    setEditingRide(null)
    loadRides()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">

      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-bold">Ritplanning</h1>

        <div className="flex items-center gap-4">
          <button
            onClick={loadCompletedRides}
            className="px-4 py-2 bg-green-700 rounded hover:bg-green-600"
          >
            Afgeronde ritten
          </button>

          <button
            onClick={() => changeDay(-1)}
            className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700"
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
            className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700"
          >
            →
          </button>
        </div>
      </div>

      <div className="space-y-10">
        {drivers.map(driver => (
          <div key={driver.id} className="bg-gray-900 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-6">{driver.name}</h2>

            <button
              onClick={() => setActiveCell({ driverId: driver.id })}
              className="text-sm text-blue-400 mb-3"
            >
              + Nieuwe Rit
            </button>

            {ridesFor(driver.id).map(ride => (
              <div
                key={ride.id}
                onClick={() => setEditingRide(ride)}
                className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition cursor-pointer mb-3"
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="font-semibold">
                    {ride.departure_time?.slice(0,5)} – {ride.arrival_time?.slice(0,5)}
                  </div>

                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusStyle(ride.status)}`}>
                    {ride.status}
                  </span>
                </div>

                <div>{ride.customer_name}</div>

                <div className="text-sm text-gray-400">
                  {ride.from_location} → {ride.to_location}
                </div>

                {ride.notes && (
                  <div className="text-xs text-gray-400 mt-2 italic">
                    📝 {ride.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {showCompleted && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center">
          <div className="bg-white text-black p-8 rounded-2xl w-[700px] max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between mb-6">
              <h2 className="text-2xl font-bold">Afgeronde ritten</h2>
              <div className="flex gap-2">
                <button
                  onClick={exportToExcel}
                  className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  Download Excel
                </button>
                <button
                  onClick={() => setShowCompleted(false)}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Sluiten
                </button>
              </div>
            </div>

            {completedRides.map(ride => (
              <div key={ride.id} className="border-b py-3">
                <div className="font-semibold">
                  {ride.date} – {ride.customer_name}
                </div>
                <div className="text-sm text-gray-600">
                  {ride.from_location} → {ride.to_location}
                </div>
                {ride.notes && (
                  <div className="text-sm text-gray-500 italic">
                    📝 {ride.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeCell && (
        <Popup title="Nieuwe Rit" onSubmit={handleCreate} onClose={() => setActiveCell(null)} />
      )}

      {editingRide && (
        <Popup
          title="Rit Bewerken"
          ride={editingRide}
          onSubmit={handleUpdate}
          onDelete={handleDelete}
          onClose={() => setEditingRide(null)}
        />
      )}
    </div>
  )
}

function Popup({ title, ride, onSubmit, onDelete, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center">
      <form onSubmit={onSubmit} className="bg-white text-black p-6 rounded w-96">
        <h2 className="text-lg font-bold mb-6">{title}</h2>

        <div className="space-y-4">

          <div>
            <label className="block text-sm font-semibold mb-1">Klantnaam</label>
            <input name="customer" defaultValue={ride?.customer_name} className="border p-2 w-full rounded" required />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Van locatie</label>
            <input name="from" defaultValue={ride?.from_location} className="border p-2 w-full rounded" required />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Naar locatie</label>
            <input name="to" defaultValue={ride?.to_location} className="border p-2 w-full rounded" required />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Notitie</label>
            <textarea name="notes" defaultValue={ride?.notes} className="border p-2 w-full rounded" />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Vertrektijd</label>
            <input name="departure" type="time" defaultValue={ride?.departure_time?.slice(0,5)} className="border p-2 w-full rounded" required />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Aankomsttijd</label>
            <input name="arrival" type="time" defaultValue={ride?.arrival_time?.slice(0,5)} className="border p-2 w-full rounded" required />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Status</label>
            <select name="status" defaultValue={ride?.status || 'gepland'} className="border p-2 w-full rounded">
              <option value="gepland">Gepland</option>
              <option value="onderweg">Onderweg</option>
              <option value="afgerond">Afgerond</option>
              <option value="geannuleerd">Geannuleerd</option>
            </select>
          </div>

        </div>

        <div className="flex justify-between mt-6">
          <button type="button" onClick={onClose} className="bg-gray-300 px-3 py-1 rounded">
            Annuleren
          </button>

          <div className="flex gap-2">
            {onDelete && (
              <button type="button" onClick={onDelete} className="bg-red-600 text-white px-3 py-1 rounded">
                Verwijderen
              </button>
            )}
            <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">
              Opslaan
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}