import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Trees, AlertCircle, Loader2 } from 'lucide-react';
import { signIn } from '@/src/lib/firebase';

export default function Auth() {
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      await signIn();
    } catch (err: any) {
      console.error('Auth Component Error:', err);
      // Map common firebase errors to user friendly messages
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please keep the popup open.');
      } else if (err.code === 'auth/internal-error') {
        setError('Internal Firebase error. Please try again or open in a new tab.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please enable popups for this site.');
      } else {
        setError(err.message || 'An unexpected error occurred during sign-in.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_center,var(--c-jungle-800),var(--c-jungle-900))] relative overflow-hidden">
      {/* Decorative Leaves (Optional/Abstract) */}
      <div className="absolute -top-10 -left-10 w-64 h-64 bg-[var(--c-leaf)] opacity-10 blur-3xl rounded-full" />
      <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-[var(--c-moss)] opacity-10 blur-3xl rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-12 rounded-[2.5rem] w-full max-w-md text-center flex flex-col items-center gap-6 shadow-2xl relative z-10"
      >
        <div className="w-24 h-24 bg-[var(--c-leaf)]/20 rounded-full flex items-center justify-center mb-4 text-5xl">
          🦁
        </div>
        
        <h1 className="text-5xl font-display font-bold tracking-tight text-[var(--c-mist)]">
          Savana
        </h1>
        
        <p className="text-[var(--c-mist)]/60 text-lg">
          Добро пожаловать в самое сердце общения.
        </p>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 text-left"
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-200 leading-relaxed font-medium">
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="mt-6 group relative w-full py-4 bg-[var(--c-leaf)] hover:bg-[var(--c-leaf)]/90 text-white rounded-full font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-[var(--c-leaf)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSigningIn ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <LogIn className="w-5 h-5" />
          )}
          <span>{isSigningIn ? 'Вход в систему...' : 'Войти в Савану'}</span>
        </button>

        <div className="mt-8 pt-6 border-t border-white/5 w-full space-y-4">
          <p className="text-xs text-[var(--c-mist)]/40 uppercase tracking-[0.2em]">
            Требуется авторизация Google
          </p>
          
          {error?.includes('Internal') && (
            <button 
              onClick={() => window.open(window.location.href, '_blank')}
              className="text-xs text-[var(--c-leaf)] hover:underline font-bold"
            >
              Проблемы со входом? Открыть в новой вкладке →
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
