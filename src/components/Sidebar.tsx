import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, MessageSquare, Users, Radio, LogOut, X, User, Trees, Settings } from 'lucide-react';
import { auth, db, signOut } from '@/src/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ChatRoom, UserProfile } from '@/src/types';
import SettingsModal from './SettingsModal';
import UserProfileModal from './UserProfileModal';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  onSelectRoom: (roomId: string) => void;
  selectedRoomId?: string;
  onViewProfile: (profile: any) => void;
}

export default function Sidebar({ onSelectRoom, selectedRoomId, onViewProfile }: SidebarProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'chats'),
      where('members', 'array-contains', auth.currentUser.uid),
      orderBy('lastActivity', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatRoom));
      setRooms(roomData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'chats');
    });

    return () => unsubscribe();
  }, []);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 2) {
       setSearchResults([]);
       return;
    }

    const q = query(
      collection(db, 'users'),
      where('displayName', '>=', val),
      where('displayName', '<=', val + '\uf8ff'),
      // limit(10) // Small limit for search
    );

    const snap = await getDocs(q);
    const users = snap.docs.map(doc => doc.data() as UserProfile).filter(u => u.uid !== auth.currentUser?.uid);
    setSearchResults(users);
  };

  const startPrivateChat = async (targetUser: UserProfile) => {
    if (!auth.currentUser) return;

    // Check if private chat already exists
    const existing = rooms.find(r => r.type === 'private' && r.members.includes(targetUser.uid));
    if (existing) {
      onSelectRoom(existing.id);
      setIsSearching(false);
      setSearchQuery('');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'chats'), {
        type: 'private',
        members: [auth.currentUser.uid, targetUser.uid],
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        name: `${auth.currentUser.displayName || auth.currentUser.email?.split('@')[0]} & ${targetUser.displayName || targetUser.username}`
      });

      onSelectRoom(docRef.id);
      setIsSearching(false);
      setSearchQuery('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'chats (private)');
    }
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'group' | 'private'>('all');

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snapshot) => {
      const data = snapshot.data() as UserProfile;
      setProfile(data);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser?.uid}`);
    });
    return () => unsub();
  }, []);

  const filteredRooms = rooms.filter(room => {
    if (activeFilter === 'all') return true;
    return room.type === activeFilter;
  });

  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  const createGroupChat = async () => {
    if (!auth.currentUser || !newRoomName.trim()) return;

    try {
      const docRef = await addDoc(collection(db, 'chats'), {
        type: 'group',
        name: newRoomName.trim(),
        members: [auth.currentUser.uid],
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        description: 'Новая группа'
      });

      onSelectRoom(docRef.id);
      setIsCreatingRoom(false);
      setNewRoomName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chats (group)');
    }
  };

  return (
    <>
      <div className="flex flex-col h-full glass border-r border-white/5 w-full max-w-[360px]">
        {/* Header */}
        <div className="p-6 border-bottom border-white/5 flex items-center justify-between">
          <button 
            onClick={() => profile && onViewProfile(profile)}
            className="flex items-center gap-3 group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--c-leaf)]/20 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 text-xl">
               {auth.currentUser?.photoURL ? <img src={auth.currentUser.photoURL} className="w-full h-full object-cover" /> : '🦁'}
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-bold block truncate max-w-[120px]">{auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0]}</span>
              <span className="text-[10px] uppercase tracking-tighter text-[var(--c-leaf)] font-bold opacity-60">Статус: В сети</span>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 rounded-full glass flex items-center justify-center text-white/40 hover:text-[var(--c-leaf)] transition-all"
              title="Настройки"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsSearching(true)}
              className="w-10 h-10 rounded-full glass flex items-center justify-center text-white/40 hover:text-[var(--c-leaf)] transition-all"
              title="Поиск"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 pb-4 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setIsSearching(true)}
              placeholder="Поиск жителей..."
              className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[var(--c-leaf)]/50 transition-all"
            />
            {isSearching && (
              <button 
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-white/30" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {isSearching && searchQuery.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute left-6 right-6 top-full mt-2 glass-dark p-2 rounded-2xl z-50 shadow-2xl max-h-[300px] overflow-y-auto"
              >
                {searchResults.length > 0 ? searchResults.map(user => (
                  <button 
                    key={user.uid}
                    onClick={() => startPrivateChat(user)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-all"
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--c-moss)] flex items-center justify-center overflow-hidden">
                      {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <User className="w-5 h-5" />}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold">{user.displayName}</p>
                      <p className="text-xs opacity-40">@{user.username}</p>
                    </div>
                  </button>
                )) : (
                  <div className="p-4 text-center text-sm opacity-40">Жители не найдены</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Categories Toggle (Simplified) */}
        <div className="px-6 py-2 flex gap-4 text-xs font-bold uppercase tracking-widest text-[#7aaa7a]">
          <button 
            onClick={() => setActiveFilter('all')}
            className={cn("pb-2 transition-all", activeFilter === 'all' ? "text-[var(--c-leaf)] border-b-2 border-[var(--c-leaf)]" : "hover:text-[var(--c-leaf)]")}
          >
            Все
          </button>
          <button 
            onClick={() => setActiveFilter('group')}
            className={cn("pb-2 transition-all", activeFilter === 'group' ? "text-[var(--c-leaf)] border-b-2 border-[var(--c-leaf)]" : "hover:text-[var(--c-leaf)]")}
          >
            Группы
          </button>
          <button 
            onClick={() => setActiveFilter('private')}
            className={cn("pb-2 transition-all", activeFilter === 'private' ? "text-[var(--c-leaf)] border-b-2 border-[var(--c-leaf)]" : "hover:text-[var(--c-leaf)]")}
          >
            Личные
          </button>
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {filteredRooms.map(room => (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-3xl transition-all relative group",
                selectedRoomId === room.id ? "bg-[var(--c-leaf)]/20" : "hover:bg-white/5"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105",
                room.type === 'group' ? "bg-[var(--c-bark)]" : "bg-[var(--c-jungle-700)]"
              )}>
                {room.type === 'group' ? <Users className="w-6 h-6 text-[var(--c-earth)]" /> : (
                  room.name?.charAt(0).toUpperCase() || <MessageSquare className="w-6 h-6" />
                )}
              </div>
              <div className="text-left min-w-0 flex-1">
                <div className="flex justify-between items-baseline gap-2">
                   <h3 className="font-semibold truncate text-[var(--c-mist)]">
                    {room.type === 'private' 
                      ? room.name?.split('&').find(n => n.trim() !== (auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0]))?.trim() || room.name
                      : room.name}
                   </h3>
                   <span className="text-[10px] opacity-30 whitespace-nowrap">
                    {room.lastActivity ? new Date(room.lastActivity.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                   </span>
                </div>
                <p className="text-xs opacity-40 truncate">
                  {room.lastMessage?.content || "Начните общение..."}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Create Button */}
        <div className="p-6">
          <button 
            onClick={() => setIsCreatingRoom(true)}
            className="w-full py-4 bg-[var(--c-leaf)] hover:bg-[var(--c-leaf)]/90 text-white rounded-3xl font-bold flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-xl shadow-[var(--c-leaf)]/20"
          >
            <Plus className="w-5 h-5" />
            <span>Новая группа</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isCreatingRoom && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsCreatingRoom(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass p-8 rounded-[2.5rem] w-full max-w-sm relative z-10 shadow-2xl"
            >
              <h2 className="text-2xl font-display font-bold mb-6 text-center">Новая группа</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold block mb-2 px-2">Имя группы</label>
                  <input 
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Напр. Оазис..."
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-[var(--c-leaf)]/50 transition-all font-medium"
                    autoFocus
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setIsCreatingRoom(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-bold transition-all text-sm"
                  >
                    Отмена
                  </button>
                  <button 
                    onClick={createGroupChat}
                    disabled={!newRoomName.trim()}
                    className="flex-1 py-3 bg-[var(--c-leaf)] hover:bg-[var(--c-leaf)]/90 text-white rounded-2xl font-bold transition-all text-sm disabled:opacity-30 disabled:scale-95"
                  >
                    Создать
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && profile && (
          <SettingsModal profile={profile} onClose={() => setIsSettingsOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
