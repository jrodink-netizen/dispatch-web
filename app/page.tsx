'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

type Driver = {
  id: string
  name: string
}

type RideStatus = 'gepland' | 'onderweg' | 'afgerond' | 'geannuleerd'

type Ride = {
  id: string
  date: string
  departure_time: string | null
  arrival_time: string | null
  from_location: string
  to_location: string
  customer_name: string
  notes: string | null
  status: RideStatus
  chauffeur_id: string
}

type RideFormState = {
  id?: string
  chauffeur_id: string
  date: string
  departure_time: string
  arrival_time: string
  from_location: string
  to_location: string
  customer_name: string
  notes: string
  status: RideStatus
}

function formatTime(t: string | null) {
  if (!t) return '--:--'
  return t.slice(0, 5)
}

function statusLabel(status: RideStatus) {
  switch (status) {
    case 'gepland':
      return 'Gepland'
    case 'onderweg':
      return 'Onderweg'
    case 'afgerond':
      return 'Afgerond'
    case 'geannuleerd':
      return 'Geannuleerd'
  }
}

function statusClasses(status: RideStatus) {
  switch (status) {
    case 'gepland':
      return 'bg-blue-600/90 border-blue-500'
    case 'onderweg':
      return 'bg-yellow-500/90 border-yellow-400'
    case 'afgerond':
      return 'bg-emerald-600/90 border-emerald-500'
    case 'geannuleerd':
      return 'bg-red-600/90 border-red-500'
    default:
      return 'bg-blue-600/90 border-blue-500'
  }
}

export default function Page() {
  const router = useRouter()
  const [loadingUser, setLoadingUser] = useState(true)
  const [user, setUser] = useState<any>(null)

  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [rides, setRides] = useState<Ride[]>([])
  const [showCompleted, setShowCompleted] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalSaving, setModalSaving] = useState(false)
  const [form, setForm] = useState<RideFormState | null>(null)

  // ------ AUTH ------
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/login')
      } else {
        setUser(data.user)
      }
      setLoadingUser(false)
    })()
  }, [router])

  // ------ DATA LADEN ------
  useEffect(() => {
    if (!user) return
    void loadDrivers()
  }, [user])

  useEffect(() => {
    if (!user) return
    void loadRides()
  }, [user, selectedDate])

  async function loadDrivers() {
    const { data, error } = await supabase
      .from('drivers')
      .select('id, name')
      .order('name', { ascending: true })

    if (error) {
      console.error(error)
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
      console.error(error)
      return
    }
    setRides((data || []) as Ride[])
  }

  // ------ DATUM WISSELEN ------
  function changeDay(delta: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(d)
  }

  const niceDate = useMemo(
    () =>
      selectedDate.toLocaleDateString('nl-NL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
    [selectedDate]
  )

  // ---------- MODAL OPEN / FORM VULLEN ----------
  function openNewRideModal() {
    const dateStr = selectedDate.toISOString().split('T')[0]
    const firstDriverId = drivers[0]?.id ?? ''

    setForm({
      chauffeur_id: firstDriverId,
      date: dateStr,
      departure_time: '08:00',
      arrival_time: '09:00',
      from_location: '',
      to_location: '',
      customer_name: '',
      notes: '',
      status: 'gepland'
    })
    setModalOpen(true)
  }

  function openEditRideModal(ride: Ride) {
    setForm({
      id: ride.id,
      chauffeur_id: ride.chauffeur_id,
      date: ride.date,
      departure_time: ride.departure_time?.slice(0, 5) || '08:00',
      arrival_time: ride.arrival_time?.slice(0, 5) || '09:00',
      from_location: ride.from_location,
      to_location: ride.to_location,
      customer_name: ride.customer_name,
      notes: ride.notes || '',
      status: ride.status
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setForm(null)
  }

  function handleFormChange<K extends keyof RideFormState>(
    key: K,
    value: RideFormState[K]
  ) {
    if (!form) return
    setForm({ ...form, [key]: value })
  }

  // ---------- OPSLAAN ----------
  async function saveRide() {
    if (!form) return

    if (
      !form.customer_name.trim() ||
      !form.from_location.trim() ||
      !form.to_location.trim()
    ) {
      alert('Vul minimaal klant, van en naar in.')
      return
    }

    if (!form.departure_time || !form.arrival_time) {
      alert('Vertrek- en aankomsttijd zijn verplicht.')
      return
    }

    setModalSaving(true)

    try {
      if (form.id) {
        // update
        const { error } = await supabase
          .from('rides')
          .update({
            chauffeur_id: form.chauffeur_id,
            date: form.date,
            departure_time: form.departure_time,
            arrival_time: form.arrival_time,
            from_location: form.from_location,
            to_location: form.to_location,
            customer_name: form.customer_name,
            notes: form.notes,
            status: form.status
          })
          .eq('id', form.id)

        if (error) throw error

        setRides((prev) =>
          prev
            .map((r) =>
              r.id === form.id
                ? {
                    ...r,
                    chauffeur_id: form.chauffeur_id,
                    date: form.date,
                    departure_time: form.departure_time,
                    arrival_time: form.arrival_time,
                    from_location: form.from_location,
                    to_location: form.to_location,
                    customer_name: form.customer_name,
                    notes: form.notes,
                    status: form.status
                  }
                : r
            )
            .slice()
            .sort((a, b) =>
              (a.departure_time || '').localeCompare(b.departure_time || '')
            )
        )
      } else {
        // insert
        const { data, error } = await supabase
          .from('rides')
          .insert([
            {
              chauffeur_id: form.chauffeur_id,
              date: form.date,
              departure_time: form.departure_time,
              arrival_time: form.arrival_time,
              from_location: form.from_location,
              to_location: form.to_location,
              customer_name: form.customer_name,
              notes: form.notes,
              status: form.status
            }
          ])
          .select('*')
          .single()

        if (error) throw error

        setRides((prev) =>
          [...prev, data as Ride].sort((a, b) =>
            (a.departure_time || '').localeCompare(b.departure_time || '')
          )
        )
      }

      closeModal()
    } catch (e: any) {
      console.error(e)
      alert('Fout bij opslaan: ' + e.message)
    } finally {
      setModalSaving(false)
    }
  }

  // ------- STATUS DIRECT WIJZIGEN OP CARD -------
  async function updateRideStatus(id: string, status: RideStatus) {
    setRides((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    )

    const { error } = await supabase
      .from('rides')
      .update({ status })
      .eq('id', id)

    if (error) {
      console.error(error)
      alert('Fout bij updaten status.')
      // eventueel opnieuw laden
      void loadRides()
    }
  }

  // ------- EXPORT EXCEL -------
  function exportToExcel() {
    const rows = rides.map((r) => ({
      Datum: r.date,
      Chauffeur:
        drivers.find((d) => d.id === r.chauffeur_id)?.name || 'Onbekend',
      Vertrek: formatTime(r.departure_time),
      Aankomst: formatTime(r.arrival_time),
      Klant: r.customer_name,
      Van: r.from_location,
      Naar: r.to_location,
      Status: statusLabel(r.status),
      Notitie: r.notes || ''
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Ritten')
    XLSX.writeFile(wb, 'ritplanning.xlsx')
  }

  // ------- FILTER COMPLETED -------
  const visibleRides = useMemo(
    () =>
      showCompleted ? rides : rides.filter((r) => r.status !== 'afgerond'),
    [rides, showCompleted]
  )

  // ------- LAYOUT HELPERS -------
  function ridesForDriver(driverId: string) {
    return visibleRides.filter((r) => r.chauffeur_id === driverId)
  }

  if (loadingUser) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        Bezig met laden...
      </main>
    )
  }

  if (!user) return null

  // ---------- UI ----------
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      {/* Top bar */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Ritplanning
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Dagoverzicht per chauffeur. Klik op een kaart om te bewerken.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-slate-900/80 rounded-xl px-3 py-2 border border-slate-700">
            <button
              onClick={() => changeDay(-1)}
              className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
            >
              ←
            </button>
            <div className="px-2 text-sm font-medium">
              {niceDate.charAt(0).toUpperCase() + niceDate.slice(1)}
            </div>
            <button
              onClick={() => changeDay(1)}
              className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
            >
              →
            </button>
          </div>

          <button
            onClick={openNewRideModal}
            className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium shadow-lg shadow-emerald-600/40"
          >
            + Nieuwe rit
          </button>

          <button
            onClick={exportToExcel}
            className="h-9 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium border border-slate-600"
          >
            Exporteer naar Excel
          </button>

          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="accent-emerald-500"
            />
            Toon afgeronde ritten
          </label>
        </div>
      </header>

      {/* Board */}
      <section className="mt-4">
        {drivers.length === 0 ? (
          <div className="text-slate-500 text-sm">
            Nog geen chauffeurs aangemaakt in Supabase.
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div
              className="grid gap-4 min-w-[900px]"
              style={{
                gridTemplateColumns: `180px repeat(${drivers.length}, minmax(220px, 1fr))`
              }}
            >
              {/* Header row */}
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500 pt-3">
                Chauffeur
              </div>
              {drivers.map((driver) => (
                <div
                  key={driver.id}
                  className="text-xs uppercase tracking-[0.2em] text-slate-400 pt-3"
                >
                  {driver.name}
                </div>
              ))}

              {/* Body row (per driver kolommen) */}
              <div className="text-xs text-slate-500 pt-2">
                Tijd / ritten voor {niceDate}
              </div>
              {drivers.map((driver) => {
                const list = ridesForDriver(driver.id)
                return (
                  <div
                    key={driver.id}
                    className="space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800 p-3 min-h-[120px]"
                  >
                    {list.length === 0 ? (
                      <div className="text-xs text-slate-500 italic">
                        Geen ritten
                      </div>
                    ) : (
                      list.map((ride) => (
                        <div
                          key={ride.id}
                          onClick={() => openEditRideModal(ride)}
                          className={`group cursor-pointer rounded-2xl border px-3 py-2 text-xs shadow transition transform hover:-translate-y-0.5 hover:shadow-xl ${statusClasses(
                            ride.status
                          )}`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold">
                              {formatTime(ride.departure_time)} -{' '}
                              {formatTime(ride.arrival_time)}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/20">
                              {statusLabel(ride.status)}
                            </span>
                          </div>
                          <div className="text-sm font-semibold">
                            {ride.customer_name}
                          </div>
                          <div className="text-[11px] opacity-90">
                            {ride.from_location} → {ride.to_location}
                          </div>
                          {ride.notes && (
                            <div className="mt-1 text-[11px] opacity-80 flex items-center gap-1">
                              <span>📝</span>
                              <span className="truncate">{ride.notes}</span>
                            </div>
                          )}

                          {/* Quick status change */}
                          <div className="mt-2 flex items-center gap-2 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="opacity-70">Status:</span>
                            <select
                              value={ride.status}
                              onChange={(e) =>
                                updateRideStatus(
                                  ride.id,
                                  e.target.value as RideStatus
                                )
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="bg-black/30 border border-white/20 rounded-full px-2 py-0.5 text-[11px]"
                            >
                              <option value="gepland">Gepland</option>
                              <option value="onderweg">Onderweg</option>
                              <option value="afgerond">Afgerond</option>
                              <option value="geannuleerd">Geannuleerd</option>
                            </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* ---------- MODAL ---------- */}
      {modalOpen && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg bg-slate-950 border border-slate-700 rounded-3xl shadow-2xl p-6 md:p-7">
            <h2 className="text-xl font-semibold mb-4">
              {form.id ? 'Rit bewerken' : 'Nieuwe rit'}
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">
                    Datum
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      handleFormChange('date', e.target.value)
                    }
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">
                    Chauffeur
                  </label>
                  <select
                    value={form.chauffeur_id}
                    onChange={(e) =>
                      handleFormChange('chauffeur_id', e.target.value)
                    }
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 px-2 py-1.5 text-sm"
                  >
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Klantnaam
                </label>
                <input
                  value={form.customer_name}
                  onChange={(e) =>
                    handleFormChange('customer_name', e.target.value)
                  }
                  className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-1.5 text-sm"
                  placeholder="Bijv. Tyrepoint"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">
                    Van
                  </label>
                  <input
                    value={form.from_location}
                    onChange={(e) =>
                      handleFormChange('from_location', e.target.value)
                    }
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-1.5 text-sm"
                    placeholder="Bijv. Zwolle"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">
                    Naar
                  </label>
                  <input
                    value={form.to_location}
                    onChange={(e) =>
                      handleFormChange('to_location', e.target.value)
                    }
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-1.5 text-sm"
                    placeholder="Bijv. Den Ham"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">
                    Vertrek
                  </label>
                  <input
                    type="time"
                    value={form.departure_time}
                    onChange={(e) =>
                      handleFormChange('departure_time', e.target.value)
                    }
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">
                    Aankomst
                  </label>
                  <input
                    type="time"
                    value={form.arrival_time}
                    onChange={(e) =>
                      handleFormChange('arrival_time', e.target.value)
                    }
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      handleFormChange('status', e.target.value as RideStatus)
                    }
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-1.5 text-sm"
                  >
                    <option value="gepland">Gepland</option>
                    <option value="onderweg">Onderweg</option>
                    <option value="afgerond">Afgerond</option>
                    <option value="geannuleerd">Geannuleerd</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Notitie
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    handleFormChange('notes', e.target.value)
                  }
                  rows={3}
                  className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-1.5 text-sm resize-none"
                  placeholder="Bijv. kenteken, referentie, bijzonderheden..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-between gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
                disabled={modalSaving}
              >
                Annuleren
              </button>
              <button
                onClick={saveRide}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium shadow-emerald-600/40 shadow-lg disabled:opacity-60"
                disabled={modalSaving}
              >
                {modalSaving
                  ? 'Opslaan...'
                  : form.id
                  ? 'Wijzigingen opslaan'
                  : 'Rit opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}