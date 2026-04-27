import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '@/src/lib/firebase';
import { X, User, MapPin, Calendar, MessageSquare, Shield } from 'lucide-react';
import { format } from 'date-fns';

interface UserProfileModalProps {
  user: {
    uid: string;
    displayName: string;
    photoURL?: string;
    bio?: string;
    status?: string;
    lastSeen?: string;
    username?: string;
  };
  onClose: () => void;
}

export default function UserProfileModal({ user, onClose }: UserProfileModalProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="glass p-8 rounded-[2.5rem] w-full max-w-md relative z-[10000] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 glass rounded-full flex items-center justify-center hover:bg-white/40 transition-all z-[10001] cursor-pointer group"
          title="Закрыть"
        >
          <X className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        </button>

        {/* Decorative background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-[var(--c-leaf)]/10 z-0" />

        <div className="relative pt-12 flex flex-col items-center text-center">
            <div className="w-32 h-32 rounded-[2rem] bg-[var(--c-moss)] overflow-hidden shadow-2xl mb-6 ring-4 ring-white/5">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl text-white font-bold">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="space-y-1 mb-8">
              <h2 className="text-3xl font-display font-bold text-[var(--c-mist)] flex items-center justify-center gap-2">
                {user.displayName}
                <Shield className="w-5 h-5 text-[var(--c-leaf)]" />
              </h2>
              <p className="text-[var(--c-leaf)] font-bold text-sm">@{user.username || user.uid.slice(0, 6)}</p>
              
              <div className="flex items-center justify-center gap-2 mt-3">
                <div className={`w-2.5 h-2.5 rounded-full ${user.status === 'online' ? 'bg-[var(--c-leaf)] animate-pulse' : 'bg-white/20'}`} />
                <span className="text-xs uppercase tracking-widest font-bold opacity-40">
                  {user.status === 'online' ? 'В сети' : 'Не в сети'}
                </span>
              </div>
            </div>

            <div className="w-full space-y-6 text-left">
              <div className="glass-dark p-6 rounded-3xl space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 opacity-40" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase tracking-widest font-bold opacity-30 block mb-1">Био</span>
                    <p className="text-sm text-[var(--c-mist)]/70 leading-relaxed break-words">
                      {user.bio || 'Этот житель Саваны предпочитает сохранять тайну своего прошлого.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 opacity-40" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-bold opacity-30 block mb-1">Последний визит</span>
                    <p className="text-sm text-[var(--c-mist)]/70">
                      {user.lastSeen ? format(new Date(user.lastSeen), 'dd.MM.yyyy HH:mm') : 'Давно'}
                    </p>
                  </div>
                </div>
              </div>

              <div className={user.uid === auth.currentUser?.uid ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4"}>
                {user.uid !== auth.currentUser?.uid && (
                  <button className="py-4 glass-dark rounded-3xl flex flex-col items-center gap-2 hover:bg-white/10 transition-all group">
                    <MessageSquare className="w-5 h-5 opacity-40 group-hover:text-[var(--c-leaf)] transition-colors" />
                    <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">Написать</span>
                  </button>
                )}
                <div className="py-4 glass-dark rounded-3xl flex flex-col items-center gap-2">
                  <span className="text-xl font-bold text-[var(--c-leaf)]">15</span>
                  <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">Групп</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
  );
}
