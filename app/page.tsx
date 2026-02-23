'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

type Driver = {
  id: string
  name: string
}

type Ride = {
  id: string
  date: string
  departure_time: string | null
  arrival_time: string | null
  customer_name: string
  from_location: string
  to_location: string
  chauffeur_id: string
  status: string
  notes: string | null
}

type RideForm = {
  id?: string
  date: string
  departure_time: string
  arrival_time: string
  customer_name: string
  from_location: string
  to_location: string
  chauffeur_id: string
  status: string
  notes: string
}

function timeLabel(t: string | null) {
  if (!t) return '--:--'
  return t.slice(0, 5)
}

function statusColor(status: string) {
  switch (status) {
    case 'onderweg':
      return 'bg-yellow-500'
    case 'aangekomen':
      return 'bg-sky-500'
    case 'afgerond':
      return 'bg-emerald-500'
    case 'geannuleerd':
      return 'bg-red-600'
    default:
      return 'bg-blue-600'
  }
}

function formatDateLong(d: Date) {
  return d.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function formatDateShort(d: Date) {
  return d.toLocaleDateString('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric'
  })
}

export default function Page() {
  const router = useRouter()

  const [authChecked, setAuthChecked] = useState(false)
  const [user, setUser] = useState<any>(null)

  const [drivers, setDrivers] = useState<Driver[]>([])
  const [rides, setRides] = useState<Ride[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<RideForm | null>(null)

  // ---------- AUTH ----------
  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        router.push('/login')
        return
      }

      setUser(data.user)
      setAuthChecked(true)
    }

    checkUser()
  }, [router])

  // ---------- DATA LADEN ----------
  useEffect(() => {
    if (!authChecked) return

    async function loadAll() {
      setLoading(true)
      await Promise.all([loadDrivers(), loadRides()])
      setLoading(false)
    }

    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, selectedDate])

  async function loadDrivers() {
    const { data, error } = await supabase
      .from('drivers')
      .select('id, name')
      .order('name', { ascending: true })

    if (error) {
      console.error('Fout bij laden chauffeurs', error)
      return
    }

    setDrivers(data || [])
  }

  async function loadRides() {
    const dateStr = selectedDate.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('date', dateStr)
      .order('departure_time', { ascending: true })

    if (error) {
      console.error('Fout bij laden ritten', error)
      return
    }

    setRides((data as Ride[]) || [])
  }

  // ---------- DAG WISSELEN ----------
  function changeDay(delta: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(d)
  }

  function goToday() {
    setSelectedDate(new Date())
  }

  // ---------- FORM OPENEN ----------
  function openNewRide() {
    const dateStr = selectedDate.toISOString().split('T')[0]
    const defaultDriver = drivers[0]?.id ?? ''

    setForm({
      date: dateStr,
      departure_time: '',
      arrival_time: '',
      customer_name: '',
      from_location: '',
      to_location: '',
      chauffeur_id: defaultDriver,
      status: 'gepland',
      notes: ''
    })
    setShowForm(true)
  }

  function openEditRide(ride: Ride) {
    setForm({
      id: ride.id,
      date: ride.date,
      departure_time: ride.departure_time?.slice(0, 5) ?? '',
      arrival_time: ride.arrival_time?.slice(0, 5) ?? '',
      customer_name: ride.customer_name,
      from_location: ride.from_location,
      to_location: ride.to_location,
      chauffeur_id: ride.chauffeur_id,
      status: ride.status,
      notes: ride.notes ?? ''
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setForm(null)
  }

  // ---------- FORM OPSLAAN ----------
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return

    if (
      !form.customer_name ||
      !form.from_location ||
      !form.to_location ||
      !form.departure_time ||
      !form.arrival_time ||
      !form.chauffeur_id
    ) {
      alert('Vul alle verplichte velden in.')
      return
    }

    setSaving(true)

    const payload = {
      date: form.date,
      customer_name: form.customer_name,
      from_location: form.from_location,
      to_location: form.to_location,
      departure_time: form.departure_time,
      arrival_time: form.arrival_time,
      chauffeur_id: form.chauffeur_id,
      status: form.status,
      notes: form.notes || null
    }

    let error
    if (form.id) {
      const res = await supabase.from('rides').update(payload).eq('id', form.id)
      error = res.error
    } else {
      const res = await supabase.from('rides').insert([payload])
      error = res.error
    }

    setSaving(false)

    if (error) {
      console.error('Fout bij opslaan rit', error)
      alert('Fout bij opslaan: ' + error.message)
      return
    }

    closeForm()
    await loadRides() // direct vernieuwen
  }

  function driverName(id: string) {
    return drivers.find((d) => d.id === id)?.name || 'Onbekende chauffeur'
  }

  function ridesForDriver(driverId: string) {
    return rides.filter((r) => r.chauffeur_id === driverId)
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        Bezig met laden...
      </div>
    )
  }

  if (!user) return null

  // ---------- LAYOUT ----------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="px-6 lg:px-10 pt-6 pb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">
            Ritplanning
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Dagoverzicht van alle chauffeurs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => changeDay(-1)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium"
          >
            ← Vorige dag
          </button>

          <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold">
            {formatDateLong(selectedDate)}
          </div>

          <button
            onClick={() => changeDay(1)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium"
          >
            Volgende dag →
          </button>

          <button
            onClick={goToday}
            className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-sm font-semibold"
          >
            Vandaag
          </button>

          <button
            onClick={openNewRide}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold"
          >
            + Nieuwe rit
          </button>
        </div>
      </header>

      {/* Lijst per chauffeur onder elkaar */}
      <main className="px-4 lg:px-10 pb-10">
        {loading ? (
          <div className="text-slate-400">Ritten laden...</div>
        ) : drivers.length === 0 ? (
          <div className="text-slate-400">
            Geen chauffeurs gevonden. Voeg chauffeurs toe in Supabase in de
            tabel <code className="text-xs">drivers</code>.
          </div>
        ) : rides.length === 0 ? (
          <div className="text-slate-400">Geen ritten voor deze dag.</div>
        ) : (
          <div className="space-y-6">
            {drivers.map((driver) => {
              const driverRides = ridesForDriver(driver.id)
              if (driverRides.length === 0) {
                return null
              }

              return (
                <section key={driver.id} className="space-y-3">
                  {/* Chauffeur kop + scheiding */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                      <h2 className="text-sm font-semibold text-slate-100">
                        {driver.name}
                      </h2>
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatDateShort(selectedDate)}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {driverRides.map((ride) => (
                      <button
                        key={ride.id}
                        type="button"
                        onClick={() => openEditRide(ride)}
                        className="w-full text-left rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 transition shadow-lg border border-slate-800 px-5 py-4"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="text-sm font-medium text-slate-200">
                            {timeLabel(ride.departure_time)} –{' '}
                            {timeLabel(ride.arrival_time)}
                          </div>
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide text-white ${statusColor(
                              ride.status
                            )}`}
                          >
                            {ride.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <div className="text-lg font-semibold">
                            {ride.customer_name}
                          </div>
                          <div className="text-xs text-slate-400">
                            Chauffeur: {driverName(ride.chauffeur_id)}
                          </div>
                        </div>

                        <div className="text-sm text-slate-200 mb-2">
                          {ride.from_location} → {ride.to_location}
                        </div>

                        {ride.notes && (
                          <div className="flex items-start gap-2 text-xs text-slate-300">
                            <span>📝</span>
                            <span>{ride.notes}</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* visuele scheiding tussen chauffeurs */}
                  <div className="border-b border-slate-800 pt-2" />
                </section>
              )
            })}
          </div>
        )}
      </main>

      {/* Pop-up formulier */}
      {showForm && form && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center px-4">
          <div className="w-full max-w-2xl bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {form.id ? 'Rit bewerken' : 'Nieuwe rit'}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="text-slate-400 hover:text-slate-100 text-sm"
              >
                Sluiten ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Datum
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                    value={form.date}
                    onChange={(e) =>
                      setForm({ ...form, date: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Chauffeur
                  </label>
                  <select
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                    value={form.chauffeur_id}
                    onChange={(e) =>
                      setForm({ ...form, chauffeur_id: e.target.value })
                    }
                  >
                    <option value="">Kies chauffeur</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Vertrek
                  </label>
                  <input
                    type="time"
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                    value={form.departure_time}
                    onChange={(e) =>
                      setForm({ ...form, departure_time: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Aankomst
                  </label>
                  <input
                    type="time"
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                    value={form.arrival_time}
                    onChange={(e) =>
                      setForm({ ...form, arrival_time: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Klantnaam
                  </label>
                  <input
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                    value={form.customer_name}
                    onChange={(e) =>
                      setForm({ ...form, customer_name: e.target.value })
                    }
                    placeholder="Bijv. Tyrepoint"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    <option value="gepland">Gepland</option>
                    <option value="onderweg">Onderweg</option>
                    <option value="aangekomen">Aangekomen</option>
                    <option value="afgerond">Afgerond</option>
                    <option value="geannuleerd">Geannuleerd</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Van
                  </label>
                  <input
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                    value={form.from_location}
                    onChange={(e) =>
                      setForm({ ...form, from_location: e.target.value })
                    }
                    placeholder="Vertreklocatie"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Naar
                  </label>
                  <input
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                    value={form.to_location}
                    onChange={(e) =>
                      setForm({ ...form, to_location: e.target.value })
                    }
                    placeholder="Bestemming"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Notitie
                </label>
                <textarea
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm min-h-[80px]"
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  placeholder="Kenteken, referentie, bijzonderheden..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold disabled:opacity-60"
                >
                  {saving
                    ? 'Opslaan...'
                    : form.id
                    ? 'Rit opslaan'
                    : 'Rit aanmaken'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}