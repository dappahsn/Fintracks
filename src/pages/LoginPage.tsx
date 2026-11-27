import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type AuthMode = 'login' | 'register'

export function LoginPage() {
  const { session, loading, signIn, signUp } = useAuth()
  const { t } = useI18n()

  const [mode, setMode] = useState<AuthMode>('login')
  const [justRegistered, setJustRegistered] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && session) {
    return <Navigate to={justRegistered ? '/onboarding' : '/transactions'} replace />
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    const trimmedName = fullName.trim()

    if (mode === 'register' && !trimmedName) {
      setError(t('auth.error_name_required'))
      return
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError(t('auth.error_email_invalid'))
      return
    }
    if (password.length < 6) {
      setError(t('auth.error_password_min'))
      return
    }

    try {
      setSubmitting(true)
      if (mode === 'register') {
        setJustRegistered(true)
        await signUp(trimmedName, trimmedEmail, password)
      } else {
        setJustRegistered(false)
        await signIn(trimmedEmail, password)
      }
    } catch (err: unknown) {
      setJustRegistered(false)
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-[380px] sm:max-w-[430px] flex flex-col items-center">
      {/* Main Card */}
      <div className="w-full bg-white dark:bg-[#17181c] rounded-[32px] sm:rounded-[36px] p-7 sm:p-10 border border-slate-100 dark:border-[#262930] shadow-[0_2px_18px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col items-center">
        {/* Logo Circle Badge */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white dark:bg-[#22242a] border-[7px] border-[#f0f2f5] dark:border-[#1d1f24] flex items-center justify-center mb-5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
          <img
            src="/icons/logo-text.png"
            alt="Fintracks"
            className="w-18 sm:w-20 object-contain select-none"
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-[#063d35] dark:text-[#5eead4] tracking-tight mb-2">
          Fintracks
        </h1>

        {/* Tagline */}
        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 font-normal leading-relaxed mb-6 text-center">
          {t('auth.tagline')}
        </p>

        {/* Login / Register Toggle */}
        <div className="w-full flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#22242a] mb-5">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={[
              'flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all',
              mode === 'login'
                ? 'bg-white dark:bg-[#17181c] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
            ].join(' ')}
          >
            {t('auth.login_tab')}
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={[
              'flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all',
              mode === 'register'
                ? 'bg-white dark:bg-[#17181c] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
            ].join(' ')}
          >
            {t('auth.register_tab')}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div role="alert" className="w-full mb-4 px-4 py-3 bg-[var(--danger-light)] text-[var(--danger-foreground)] rounded-xl text-xs text-left leading-relaxed">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3.5 text-left">
          {mode === 'register' && (
            <Input
              label={t('auth.full_name')}
              type="text"
              placeholder={t('auth.full_name_placeholder')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              disabled={submitting || loading}
            />
          )}

          <Input
            label={t('auth.email')}
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={submitting || loading}
          />

          <Input
            label={t('auth.password')}
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            disabled={submitting || loading}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={submitting || loading}
            className="mt-2 rounded-full"
          >
            {mode === 'login' ? t('auth.login_button') : t('auth.register_button')}
          </Button>
        </form>
      </div>

      {/* Footer links */}
      <div className="flex items-center justify-center gap-3 mt-8 text-xs text-slate-500 dark:text-slate-400">
        <Link
          to="/privacy"
          className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          {t('auth.privacy')}
        </Link>
        <span className="text-slate-300 dark:text-slate-600 select-none" aria-hidden="true">·</span>
        <Link
          to="/terms"
          className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          {t('auth.terms')}
        </Link>
      </div>
    </div>
  )
}
