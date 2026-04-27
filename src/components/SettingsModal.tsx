import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Camera, Lock, Check, Loader2, LogOut, Save } from 'lucide-react';
import { auth, db, updateProfileInAuth, updatePasswordInAuth, signOut } from '@/src/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '@/src/types';

interface SettingsModalProps {
  profile: UserProfile;
  onClose: () => void;
}

export default function SettingsModal({ profile, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile state
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [photoURL, setPhotoURL] = useState(profile.photoURL || '');
  const [bio, setBio] = useState(profile.bio || '');

  // Security state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdateProfile = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Update Auth Profile
      await updateProfileInAuth(auth.currentUser, {
        displayName,
        photoURL
      });

      // 2. Update Firestore User Doc
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName,
        photoURL,
        bio
      });

      setSuccess('Профиль успешно обновлен!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Ошибка обновления профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!auth.currentUser) return;
    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    if (newPassword.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updatePasswordInAuth(auth.currentUser, newPassword);
      setSuccess('Пароль успешно изменен!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setError('Для смены пароля необходимо выйти и войти заново.');
      } else {
        setError(err.message || 'Ошибка изменения пароля');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="glass p-8 rounded-[2.5rem] w-full max-w-lg relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-display font-bold">Настройки</h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 glass rounded-full flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 text-xs font-bold uppercase tracking-widest">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`pb-2 transition-all border-b-2 ${activeTab === 'profile' ? 'text-[var(--c-leaf)] border-[var(--c-leaf)]' : 'text-white/30 border-transparent hover:text-white'}`}
          >
            Профиль
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`pb-2 transition-all border-b-2 ${activeTab === 'security' ? 'text-[var(--c-leaf)] border-[var(--c-leaf)]' : 'text-white/30 border-transparent hover:text-white'}`}
          >
            Безопасность
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {activeTab === 'profile' ? (
            <div className="space-y-6">
              {/* Photo Section */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-3xl bg-[var(--c-bark)] overflow-hidden shadow-xl relative group">
                  {photoURL ? (
                    <img src={photoURL} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🦁</div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                </div>
                <div className="w-full">
                  <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold block mb-2 px-2">URL Фото</label>
                  <input 
                    type="text"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-[var(--c-leaf)]/50 transition-all"
                  />
                </div>
              </div>

              {/* Name Section */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold block mb-2 px-2">Имя</label>
                <input 
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ваше имя"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-[var(--c-leaf)]/50 transition-all"
                />
              </div>

              {/* Bio Section */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold block mb-2 px-2">О себе</label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-[var(--c-mist)] focus:outline-none focus:border-[var(--c-leaf)]/50 transition-all resize-none h-24"
                  placeholder="Расскажите о себе..."
                />
              </div>

              <button 
                onClick={handleUpdateProfile}
                disabled={loading}
                className="w-full py-4 bg-[var(--c-leaf)] hover:bg-[var(--c-leaf)]/90 text-white rounded-2xl font-bold transition-all shadow-lg shadow-[var(--c-leaf)]/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Сохранить профиль
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="glass-dark p-6 rounded-[2rem] border border-white/5 space-y-4">
                <div className="flex items-center gap-4 text-[var(--c-leaf)] mb-2">
                  <Lock className="w-6 h-6" />
                  <span className="font-bold">Изменение пароля</span>
                </div>
                
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold block mb-2 px-2">Новый пароль</label>
                  <input 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-red-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold block mb-2 px-2">Повторите пароль</label>
                  <input 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-red-500/50 transition-all"
                  />
                </div>
              </div>

              <button 
                onClick={handleUpdatePassword}
                disabled={loading || !newPassword}
                className="w-full py-4 bg-red-500/80 hover:bg-red-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-30"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                Обновить пароль
              </button>

              <div className="pt-6 border-t border-white/5">
                <button 
                  onClick={() => signOut()}
                  className="w-full py-4 bg-white/5 hover:bg-red-500/10 text-red-400 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Выйти из Саваны
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Messages */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-4 p-4 bg-red-500/20 text-red-200 rounded-2xl flex items-center gap-3 text-sm border border-red-500/30"
            >
              <X className="w-5 h-5 shrink-0" />
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-4 p-4 bg-emerald-500/20 text-emerald-200 rounded-2xl flex items-center gap-3 text-sm border border-emerald-500/30"
            >
              <Check className="w-5 h-5 shrink-0" />
              {success}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
