import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Smile, Paperclip, MoreVertical, ShieldCheck, Gamepad2, Heart, ThumbsUp, X, Image as ImageIcon, Film, File as FileIcon, AlertCircle, Loader2, Trash2, Eraser, Reply, Forward, Hash, MessageCircle } from 'lucide-react';
import { auth, db } from '@/src/lib/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, doc, getDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc, getDocs, writeBatch, limit } from 'firebase/firestore';
import { Message, ChatRoom } from '@/src/types';
import { format } from 'date-fns';
import CheckersGame from './CheckersGame';
import ChessGame from './ChessGame';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import UserProfileModal from './UserProfileModal';

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

interface ChatWindowProps {
  roomId: string;
}

export default function ChatWindow({ roomId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [input, setInput] = useState('');
  const [activeGame, setActiveGame] = useState<{ id: string, type: 'checkers' | 'chess' } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showGameSelection, setShowGameSelection] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<Message | null>(null);
  const [showProfile, setShowProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch room details
    const fetchRoom = async () => {
      try {
        const docRef = doc(db, 'chats', roomId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setRoom({ id: snap.id, ...snap.data() } as ChatRoom);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `chats/${roomId}`);
      }
    };
    fetchRoom();

    const messagesRef = collection(db, 'chats', roomId, 'messages');
    const q = query(
      messagesRef,
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setTimeout(() => scrollToBottom(), 100);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `chats/${roomId}/messages`);
    });

    return () => unsubscribe();
  }, [roomId]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!auth.currentUser) return;
    const msgRef = doc(db, 'chats', roomId, 'messages', msgId);
    const msg = messages.find(m => m.id === msgId);
    const hasReacted = msg?.reactions?.[emoji]?.includes(auth.currentUser.uid);

    try {
      await updateDoc(msgRef, {
        [`reactions.${emoji}`]: hasReacted ? arrayRemove(auth.currentUser.uid) : arrayUnion(auth.currentUser.uid)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chats/${roomId}/messages/${msgId}`);
    }
  };

  const deleteMessage = async (msgId: string) => {
    if (!confirm('Удалить сообщение?')) return;
    try {
      await deleteDoc(doc(db, 'chats', roomId, 'messages', msgId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `chats/${roomId}/messages/${msgId}`);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() && !forwardingMsg) return;
    if (!auth.currentUser) return;

    const content = input;
    setInput('');

    let msgData: any = {
      chatId: roomId,
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Anonymous',
      content: forwardingMsg ? forwardingMsg.content : content,
      createdAt: serverTimestamp(),
      type: forwardingMsg?.type || 'text'
    };

    if (replyingTo) {
      msgData.replyTo = {
        id: replyingTo.id,
        senderName: replyingTo.senderName,
        content: replyingTo.content.substring(0, 50) + (replyingTo.content.length > 50 ? '...' : '')
      };
    }

    if (forwardingMsg) {
      msgData.forwardedFrom = {
        senderName: forwardingMsg.senderName
      };
    }

    try {
      await addDoc(collection(db, 'chats', roomId, 'messages'), msgData);
      setReplyingTo(null);
      setForwardingMsg(null);

      // Update room last activity and last message for preview
      await updateDoc(doc(db, 'chats', roomId), {
        lastActivity: serverTimestamp(),
        lastMessage: {
          ...msgData,
          createdAt: new Date().toISOString() // Fallback to now for immediate preview
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `chats/${roomId}/messages`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    // Strict limit for Firestore Base64 storage (max ~700KB results in ~1MB Base64)
    if (file.size > 700 * 1024) {
      setUploadError('Файл слишком велик для бесплатного плана. Максимум 700 КБ.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
        const msgData = {
          chatId: roomId,
          senderId: auth.currentUser?.uid,
          senderName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Anonymous',
          content: '',
          mediaUrl: base64,
          mediaType: file.type.startsWith('image/') ? 'image' : 'video',
          createdAt: serverTimestamp(),
          type: 'media'
        };

        try {
          await addDoc(collection(db, 'chats', roomId, 'messages'), msgData);
          await updateDoc(doc(db, 'chats', roomId), {
            lastActivity: serverTimestamp(),
            lastMessage: {
              ...msgData,
              createdAt: new Date().toISOString()
            }
          });
          setUploading(false);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `chats/${roomId}/messages (media)`);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadError('Ошибка при обработке файла.');
      setUploading(false);
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setInput(prev => prev + emojiData.emoji);
  };

  const viewProfile = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setShowProfile({ uid: userDoc.id, ...userDoc.data() });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const sendGameInvite = async (type: 'checkers' | 'chess') => {
    if (!auth.currentUser) return;
    const msgData = {
      chatId: roomId,
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Anonymous',
      content: type === 'checkers' ? "Го погнали в шашки! 🔴" : "Вызываю на шахматную дуэль! ♟️",
      type: 'game_invite',
      createdAt: serverTimestamp(),
      gameData: { type, status: 'pending' }
    };

    await addDoc(collection(db, 'chats', roomId, 'messages'), msgData);
    setShowGameSelection(false);

    await updateDoc(doc(db, 'chats', roomId), {
      lastActivity: serverTimestamp(),
      lastMessage: {
        ...msgData,
        createdAt: new Date().toISOString()
      }
    });
  };

  const clearHistory = async () => {
    if (!confirm('Вы уверены, что хотите очистить историю сообщений? Это удалит сообщения только для вас локально (в этой реализации для всех)')) return;
    try {
      const msgsRef = collection(db, 'chats', roomId, 'messages');
      const snap = await getDocs(msgsRef);
      const batch = writeBatch(db);
      snap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      // Update room last message
      await updateDoc(doc(db, 'chats', roomId), {
        lastMessage: null
      });
      setShowMenu(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `chats/${roomId}/messages`);
    }
  };

  const deleteChat = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот чат?')) return;
    try {
      // Delete all messages first
      const msgsRef = collection(db, 'chats', roomId, 'messages');
      const snap = await getDocs(msgsRef);
      const batch = writeBatch(db);
      snap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Delete the chat document
      await deleteDoc(doc(db, 'chats', roomId));
      window.location.reload(); // Quick way to reset state
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `chats/${roomId}`);
    }
  };

  if (!room) return <div className="flex-1 bg-[var(--c-jungle-900)]" />;

  return (
    <div className="flex-1 flex flex-col bg-[var(--c-jungle-900)] h-full">
      {/* Top Bar */}
      <div className="p-4 sm:p-6 glass border-b border-white/5 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[var(--c-moss)] flex items-center justify-center font-bold text-lg sm:text-xl text-white">
            {room.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-display font-bold text-sm sm:text-lg text-[var(--c-mist)]">
              {room.type === 'private' 
                ? room.name?.split('&').find(n => n.trim() !== (auth.currentUser?.displayName || (auth.currentUser?.email?.split('@')[0] || '')))?.trim() || room.name
                : room.name}
            </h2>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[var(--c-leaf)] animate-pulse" />
              <span className="text-[10px] sm:text-xs text-[var(--c-mist)]/40 uppercase tracking-widest font-semibold">Житель Саваны</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="relative">
             <button 
               onClick={() => setShowGameSelection(!showGameSelection)}
               className={`w-8 h-8 sm:w-10 sm:h-10 glass rounded-full flex items-center justify-center hover:bg-white/10 transition-all ${showGameSelection ? 'text-[var(--c-leaf)]' : 'text-[var(--c-leaf)]'}`}
               title="Сыграть"
             >
               <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5" />
             </button>

             <AnimatePresence>
               {showGameSelection && (
                 <>
                   <div className="fixed inset-0 z-30" onClick={() => setShowGameSelection(false)} />
                   <motion.div
                     initial={{ opacity: 0, y: 10, scale: 0.95 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 10, scale: 0.95 }}
                     className="absolute right-0 mt-2 w-48 glass rounded-2xl p-2 shadow-2xl z-40 border border-white/5"
                   >
                     <button
                       onClick={() => sendGameInvite('checkers')}
                       className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 rounded-xl transition-colors"
                     >
                       <span>🔴</span> Шашки
                     </button>
                     <button
                       onClick={() => sendGameInvite('chess')}
                       className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 rounded-xl transition-colors"
                     >
                       <span>♟️</span> Шахматы
                     </button>
                   </motion.div>
                 </>
               )}
             </AnimatePresence>
           </div>
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className={`w-8 h-8 sm:w-10 sm:h-10 glass rounded-full flex items-center justify-center hover:bg-white/10 transition-all ${showMenu ? 'text-[var(--c-leaf)]' : 'text-white/40'}`}
            >
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setShowMenu(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 glass rounded-2xl p-2 shadow-2xl z-40 border border-white/5"
                  >
                    <button
                      onClick={clearHistory}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 rounded-xl transition-colors text-white/70"
                    >
                      <Eraser className="w-4 h-4" />
                      Очистить историю
                    </button>
                    <button
                      onClick={deleteChat}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-red-500/10 text-red-400 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Удалить чат
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        <AnimatePresence>
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === auth.currentUser?.uid;
            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, x: isMe ? 20 : -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {!isMe && (
                   <button 
                     onClick={() => viewProfile(msg.senderId)}
                     className="text-[10px] uppercase tracking-wider text-[var(--c-mist)]/30 font-bold mb-1 ml-2 hover:text-[var(--c-leaf)] transition-colors"
                   >
                    {msg.senderName}
                   </button>
                )}
                
                <div className={`group relative max-w-[85%] sm:max-w-[70%] px-4 py-2 sm:px-5 sm:py-3 rounded-[1.5rem] ${
                  isMe 
                    ? 'bg-[var(--c-leaf)] text-white rounded-br-none shadow-lg shadow-[var(--c-leaf)]/10' 
                    : 'glass rounded-bl-none'
                }`}>
                  {msg.forwardedFrom && (
                    <div className="flex items-center gap-1.5 opacity-40 mb-1 border-b border-white/5 pb-1">
                      <Forward className="w-3 h-3" />
                      <span className="text-[10px] uppercase tracking-widest font-bold">Переслано от {msg.forwardedFrom.senderName}</span>
                    </div>
                  )}

                  {msg.replyTo && (
                    <div className="bg-white/5 rounded-lg p-2 mb-2 border-l-2 border-[var(--c-leaf)] opacity-60">
                      <span className="text-[10px] font-bold block mb-0.5">{msg.replyTo.senderName}</span>
                      <p className="text-[11px] truncate italic">{msg.replyTo.content}</p>
                    </div>
                  )}

                  {msg.type === 'game_invite' ? (
                    <div className="flex flex-col gap-3 min-w-[200px]">
                      <p className="font-semibold text-sm sm:text-base">🎮 {msg.content}</p>
                      <button 
                        onClick={() => setActiveGame({ id: msg.id, type: msg.gameData?.type || 'checkers' })}
                        className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-all"
                      >
                        {msg.gameData?.status === 'pending' ? 'Принять вызов' : 'Открыть игру'}
                      </button>
                    </div>
                  ) : msg.type === 'media' ? (
                    <div className="space-y-2">
                       {msg.mediaType === 'image' ? (
                         <img src={msg.mediaUrl} alt="media" className="max-w-full rounded-xl" />
                       ) : (
                         <video src={msg.mediaUrl} controls className="max-w-full rounded-xl" />
                       )}
                       {msg.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}
                  
                  {/* Reactions Display */}
                  {msg.reactions && Object.entries(msg.reactions).some(([_, users]) => (users as string[]).length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(msg.reactions).map(([emoji, users]) => (users as string[]).length > 0 && (
                        <button 
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji)}
                          className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                            (users as string[]).includes(auth.currentUser?.uid || '') ? 'bg-white/20' : 'bg-transparent border border-white/10'
                          }`}
                        >
                          {emoji === 'heart' ? <Heart className="w-3 h-3 fill-current text-red-400" /> : <ThumbsUp className="w-3 h-3 fill-current text-blue-400" />}
                          <span>{(users as string[]).length}</span>
                        </button>
                      ))}
                      <button onClick={() => toggleReaction(msg.id, 'fire')} className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 bg-transparent border border-white/10`}>
                        🔥 <span>{msg.reactions['fire']?.length || 0}</span>
                      </button>
                    </div>
                  )}

                  <div className={`mt-1 flex items-center gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] opacity-40">
                      {msg.createdAt?.seconds ? format(new Date(msg.createdAt.seconds * 1000), 'HH:mm') : '...'}
                    </span>
                    {isMe && <ShieldCheck className="w-3 h-3 opacity-30" />}
                  </div>

                  {/* Message Controls (hover) */}
                  <div className={`absolute top-0 group-hover:opacity-100 opacity-0 transition-opacity flex gap-1 ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>
                    <button onClick={() => setReplyingTo(msg)} className="p-1 glass rounded-full hover:text-[var(--c-leaf)] transition-colors" title="Ответить">
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setForwardingMsg(msg)} className="p-1 glass rounded-full hover:text-blue-400 transition-colors" title="Переслать">
                      <Forward className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggleReaction(msg.id, 'heart')} className="p-1 glass rounded-full hover:text-red-400 transition-colors">
                      <Heart className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggleReaction(msg.id, 'fire')} className="p-1 glass rounded-full hover:text-orange-400 transition-colors">
                      🔥
                    </button>
                    {isMe && (
                      <button onClick={() => deleteMessage(msg.id)} className="p-1 glass rounded-full hover:text-red-500 transition-colors" title="Удалить">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {activeGame && activeGame.type === 'checkers' && (
        <CheckersGame 
          messageId={activeGame.id} 
          chatId={roomId}
          onClose={() => setActiveGame(null)} 
        />
      )}

      {activeGame && activeGame.type === 'chess' && (
        <ChessGame 
          messageId={activeGame.id} 
          chatId={roomId}
          onClose={() => setActiveGame(null)} 
        />
      )}

      {showProfile && (
        <UserProfileModal 
          user={showProfile} 
          onClose={() => setShowProfile(null)} 
        />
      )}

      {/* Input */}
      <div className="p-4 sm:p-8 relative">
        <AnimatePresence>
          {replyingTo && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-8 right-8 mb-4 glass p-4 rounded-2xl flex items-center justify-between border border-[var(--c-leaf)]/30"
            >
              <div className="flex items-center gap-3">
                <Reply className="w-4 h-4 text-[var(--c-leaf)]" />
                <div>
                  <span className="text-[10px] font-bold block uppercase tracking-widest opacity-40">Ответ {replyingTo.senderName}</span>
                  <p className="text-xs truncate max-w-[200px] italic">{replyingTo.content}</p>
                </div>
              </div>
              <button onClick={() => setReplyingTo(null)} className="opacity-40 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {forwardingMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-8 right-8 mb-4 glass p-4 rounded-2xl flex items-center justify-between border border-blue-500/30"
            >
              <div className="flex items-center gap-3">
                <Forward className="w-4 h-4 text-blue-400" />
                <div>
                  <span className="text-[10px] font-bold block uppercase tracking-widest opacity-40">Переслать от {forwardingMsg.senderName}</span>
                  <p className="text-xs truncate max-w-[200px] italic">{forwardingMsg.content}</p>
                </div>
              </div>
              <button onClick={() => setForwardingMsg(null)} className="opacity-40 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
          {showEmojiPicker && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full right-8 mb-4 z-[100]"
            >
              <div className="relative glass p-1 rounded-3xl shadow-2xl">
                 <button 
                   onClick={() => setShowEmojiPicker(false)}
                   className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg z-[101]"
                 >
                   <X className="w-4 h-4" />
                 </button>
                 <EmojiPicker 
                   onEmojiClick={onEmojiClick}
                   theme={Theme.DARK}
                   width={300}
                   height={400}
                   lazyLoadEmojis
                 />
              </div>
            </motion.div>
          )}

          {uploadError && (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 10 }}
               className="absolute bottom-full left-8 mb-4 glass bg-red-500/20 p-4 rounded-2xl flex items-center gap-3 border border-red-500/30"
             >
               <AlertCircle className="w-5 h-5 text-red-400" />
               <p className="text-xs text-red-100">{uploadError}</p>
               <button onClick={() => setUploadError(null)} className="ml-2 opacity-40 hover:opacity-100">
                  <X className="w-4 h-4" />
               </button>
             </motion.div>
          )}
        </AnimatePresence>

        <form 
          onSubmit={handleSend}
          className="bg-[var(--c-jungle-800)]/90 backdrop-blur-2xl border border-white/5 p-2 rounded-[2rem] flex items-center gap-2 shadow-2xl relative z-[60]"
        >
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,video/*"
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-12 h-12 flex items-center justify-center text-white/20 hover:text-[var(--c-leaf)] transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
          </button>
          
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setShowEmojiPicker(false)}
            placeholder="Напишите сообщение..."
            className="flex-1 bg-transparent border-none outline-none py-3 text-[var(--c-mist)] placeholder:text-white/20 text-sm"
          />

          <button 
            type="button" 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`w-12 h-12 flex items-center justify-center transition-colors ${showEmojiPicker ? 'text-[var(--c-leaf)]' : 'text-white/20'}`}
          >
            <Smile className="w-5 h-5" />
          </button>

          <button 
            type="submit"
            disabled={!input.trim() || uploading}
            className="w-12 h-12 bg-[var(--c-leaf)] text-white rounded-full flex items-center justify-center disabled:opacity-30 disabled:scale-95 transition-all shadow-lg shadow-[var(--c-leaf)]/20 active:scale-90"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
