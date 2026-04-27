import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, AlertCircle, Loader2, Mail, Lock, UserPlus } from 'lucide-react';
import { signIn, signInWithEmail, signUpWithEmail } from '@/src/lib/firebase';

export default function Auth() {
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      await signIn();
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setError(null);
    setIsSigningIn(true);
    try {
      if (authMode === 'login') {
        await signInWithEmail(email, password);
      } else {
        if (password.length < 6) {
          throw new Error('Пароль должен быть не менее 6 символов');
        }
        await signUpWithEmail(email, password);
      }
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleAuthError = (err: any) => {
    console.error('Auth Error:', err);
    if (err.code === 'auth/popup-closed-by-user') {
      setError('Вход отменен. Пожалуйста, не закрывайте окно.');
    } else if (err.code === 'auth/internal-error') {
      setError('Внутренняя ошибка. Попробуйте еще раз.');
    } else if (err.code === 'auth/unauthorized-domain') {
      setError('Этот домен не разрешен в настройках Firebase. Добавьте его в консоли Firebase (Authentication -> Settings -> Authorized domains).');
    } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') {
      setError('Неверный email или пароль.');
    } else if (err.code === 'auth/email-already-in-use') {
      setError('Этот email уже зарегистрирован.');
    } else if (err.code === 'auth/weak-password') {
      setError('Слишком слабый пароль (минимум 6 символов).');
    } else {
      setError(err.message || 'Произошла ошибка при входе.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_center,var(--c-jungle-800),var(--c-jungle-900))] relative overflow-hidden">
      <div className="absolute -top-10 -left-10 w-64 h-64 bg-[var(--c-leaf)] opacity-10 blur-3xl rounded-full" />
      <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-[var(--c-moss)] opacity-10 blur-3xl rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-8 sm:p-12 rounded-[2.5rem] w-full max-w-md text-center flex flex-col gap-5 shadow-2xl relative z-10"
      >
        <div className="w-20 h-20 bg-[var(--c-leaf)]/20 rounded-full flex items-center justify-center mx-auto text-4xl">
          🦁
        </div>
        
        <div className="space-y-1">
          <h1 className="text-4xl font-display font-bold tracking-tight text-[var(--c-mist)]">
            Savana
          </h1>
          <p className="text-[var(--c-mist)]/60 text-sm">
            {authMode === 'login' ? 'С возвращением в джунгли' : 'Станьте частью нашей экосистемы'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-3 flex items-start gap-3 text-left overflow-hidden"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-200 leading-relaxed font-medium">
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-[var(--c-leaf)]/50 transition-all font-medium"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-[var(--c-leaf)]/50 transition-all font-medium"
              required
            />
          </div>
          
          <button 
            type="submit"
            disabled={isSigningIn}
            className="mt-2 w-full py-3.5 bg-[var(--c-leaf)] hover:bg-[var(--c-leaf)]/90 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-[var(--c-leaf)]/20 disabled:opacity-50"
          >
            {isSigningIn ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : authMode === 'login' ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>{isSigningIn ? 'Обработка...' : authMode === 'login' ? 'Войти' : 'Создать аккаунт'}</span>
          </button>
        </form>

        <div className="flex items-center gap-4 py-2">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">или</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button 
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="w-full py-3.5 glass hover:bg-white/10 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="text-sm">Google</span>
        </button>

        <p className="text-xs text-[var(--c-mist)]/40">
          {authMode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
          <button 
            type="button"
            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            className="ml-2 text-[var(--c-leaf)] font-bold hover:underline"
          >
            {authMode === 'login' ? 'Создать тропу' : 'Войти'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
