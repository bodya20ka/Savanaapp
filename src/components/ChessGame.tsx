import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Loader2 } from 'lucide-react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { db, auth } from '@/src/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

interface ChessGameProps {
  onClose: () => void;
  chatId: string;
  messageId: string;
}

export default function ChessGame({ onClose, chatId, messageId }: ChessGameProps) {
  const [game, setGame] = useState(new Chess());
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<{ white: string, black: string } | null>(null);

  useEffect(() => {
    const gameRef = doc(db, 'chats', chatId, 'messages', messageId);
    
    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.gameState) {
          const newGame = new Chess();
          newGame.load(data.gameState.fen);
          setGame(newGame);
          setPlayers(data.gameState.players);
        } else {
          // Initialize
          const initialPlayers = {
            white: data.senderId,
            black: auth.currentUser?.uid || ''
          };
          updateDoc(gameRef, {
            gameState: {
              fen: new Chess().fen(),
              players: initialPlayers
            }
          });
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [chatId, messageId]);

  async function makeAMove(move: any) {
    if (!players) return false;
    
    // Auth check
    const isWhite = auth.currentUser?.uid === players.white;
    const isBlack = auth.currentUser?.uid === players.black;
    
    if (game.turn() === 'w' && !isWhite) return false;
    if (game.turn() === 'b' && !isBlack) return false;

    const gameCopy = new Chess();
    gameCopy.load(game.fen());
    
    try {
      const result = gameCopy.move(move);
      if (result) {
        const gameRef = doc(db, 'chats', chatId, 'messages', messageId);
        await updateDoc(gameRef, {
          'gameState.fen': gameCopy.fen()
        });
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  function onDrop(sourceSquare: string, targetSquare: string) {
    makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q', // always promote to queen for simplicity
    });
    return true;
  }

  if (loading) return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <Loader2 className="w-10 h-10 text-[var(--c-leaf)] animate-spin" />
    </div>
  );

  const isMyTurn = (game.turn() === 'w' && auth.currentUser?.uid === players?.white) || 
                   (game.turn() === 'b' && auth.currentUser?.uid === players?.black);

  const Board = Chessboard as any;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass p-6 sm:p-8 rounded-[2.5rem] w-full max-w-md relative shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-display font-bold">♟️ Шахматы</h2>
            <p className={`text-xs font-bold uppercase tracking-widest ${isMyTurn ? 'text-[var(--c-leaf)] animate-pulse' : 'text-[var(--c-mist)]/40'}`}>
              {isMyTurn ? 'Ваш ход' : `Ход ${game.turn() === 'w' ? 'Белых' : 'Черных'}`}
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 glass rounded-full flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="aspect-square w-full rounded-xl overflow-hidden shadow-2xl border-4 border-[var(--c-jungle-800)]">
          <Board 
            position={game.fen()} 
            onPieceDrop={onDrop} 
            boardOrientation={auth.currentUser?.uid === players?.black ? 'black' : 'white'}
            customDarkSquareStyle={{ backgroundColor: 'rgb(24 41 33)' }}
            customLightSquareStyle={{ backgroundColor: 'rgb(24 41 33 / 0.1)' }}
          />
        </div>

        <div className="mt-8 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-60">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${auth.currentUser?.uid === players?.white ? 'bg-white' : 'bg-black'}`} />
            <span>Вы</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Противник</span>
            <div className={`w-3 h-3 rounded-full ${auth.currentUser?.uid === players?.white ? 'bg-black' : 'bg-white'}`} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
