import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, AlertCircle, Loader2, Mail, Lock, UserPlus, MessageSquare } from 'lucide-react';
import { signInWithEmail, signUpWithEmail } from '@/src/lib/firebase';

export default function Auth() {
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
            <span>{isSigningIn ? 'Обработка...' : authMode === 'login' ? 'Войти' : 'Зарегистрироваться'}</span>
          </button>
        </form>

        <p className="text-xs text-[var(--c-mist)]/40">
          {authMode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
          <button 
            type="button"
            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            className="ml-2 text-[var(--c-leaf)] font-bold hover:underline"
          >
            {authMode === 'login' ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
