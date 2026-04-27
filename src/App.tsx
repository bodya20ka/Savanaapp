import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import Auth from '@/src/components/Auth';
import Sidebar from '@/src/components/Sidebar';
import ChatWindow from '@/src/components/ChatWindow';
import { Trees } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();

  useEffect(() => {
    // Test connection to prevent Firebase errors on startup
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--c-jungle-900)]">
         <motion.div 
           animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
           transition={{ repeat: Infinity, duration: 2 }}
           className="text-6xl"
         >
           🦁
         </motion.div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="flex h-screen bg-[var(--c-jungle-900)] text-[var(--c-mist)] overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar 
        onSelectRoom={setSelectedRoomId} 
        selectedRoomId={selectedRoomId} 
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative min-w-0">
        <AnimatePresence mode="wait">
          {selectedRoomId ? (
            <motion.div 
              key={selectedRoomId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 h-full"
            >
              <ChatWindow roomId={selectedRoomId} />
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="w-48 h-48 bg-gradient-to-br from-[var(--c-leaf)]/10 to-transparent rounded-full flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 bg-[var(--c-leaf)]/5 blur-2xl rounded-full animate-pulse" />
                <div className="text-8xl opacity-20 relative z-10">🦁</div>
              </div>
              <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">Савана ждет тебя</h2>
              <p className="max-w-md text-lg text-[var(--c-mist)]/40 leading-relaxed italic">
                В экосистеме общения каждый голос — это сердцебиение. Выбери группу, чтобы начать свой путь.
              </p>
              <div className="mt-12 flex gap-4">
                <div className="px-4 py-2 glass rounded-full text-xs font-bold uppercase tracking-widest text-white/20">
                  Безопасно
                </div>
                <div className="px-4 py-2 glass rounded-full text-xs font-bold uppercase tracking-widest text-white/20">
                  В реальном времени
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Atmospheric overlays */}
      <div className="fixed top-0 right-0 w-[50vw] h-[50vh] bg-[var(--c-leaf)]/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-[50vw] h-[50vh] bg-[var(--c-bark)]/5 blur-[120px] rounded-full pointer-events-none -z-10" />
    </div>
  );
}
