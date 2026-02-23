'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  async function handleLogin(e: any) {
    e.preventDefault()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      alert(error.message)
      return
    }

    // 🔥 Haal bijbehorende driver op via email
    const { data: driver } = await supabase
      .from('drivers')
      .select('*')
      .eq('email', email)
      .single()

    if (!driver) {
      alert('Geen gekoppelde gebruiker gevonden.')
      return
    }

    if (driver.role === 'planner') {
      router.push('/')
    } else {
      router.push(`/driver/${driver.id}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-lg w-96"
      >
        <h1 className="text-xl font-bold mb-4">Inloggen</h1>

        <input
          type="email"
          placeholder="Email"
          className="border p-2 mb-3 w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Wachtwoord"
          className="border p-2 mb-4 w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          Inloggen
        </button>
      </form>
    </div>
  )
}