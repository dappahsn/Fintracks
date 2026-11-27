import React, { createContext, useContext, useEffect, useState } from 'react'
import { getAuthToken, setAuthToken } from '@/lib/api'
import {
  fetchCurrentUser,
  loginWithPassword,
  registerWithPassword,
  type AuthSession,
  type AuthUser,
} from '@/services/auth.service'

interface AuthContextValue {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (fullName: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      setLoading(false)
      return
    }

    fetchCurrentUser()
      .then((currentUser) => {
        setUser(currentUser)
        setSession({ token, user: currentUser })
      })
      .catch(() => {
        setAuthToken(null)
        setUser(null)
        setSession(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null)
      setSession(null)
    }
    window.addEventListener('fintracks:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('fintracks:unauthorized', handleUnauthorized)
  }, [])

  const signIn = async (email: string, password: string) => {
    const data = await loginWithPassword(email, password)
    setAuthToken(data.token)
    setUser(data.user)
    setSession(data)
  }

  const signUp = async (fullName: string, email: string, password: string) => {
    const data = await registerWithPassword(fullName, email, password)
    setAuthToken(data.token)
    setUser(data.user)
    setSession(data)
  }

  const signOut = async () => {
    setAuthToken(null)
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
