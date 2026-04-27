import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Loader2 } from 'lucide-react';
import { db, auth } from '@/src/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

interface CheckersGameProps {
  onClose: () => void;
  chatId: string;
  messageId: string;
}

type Piece = 'red' | 'black' | 'red_king' | 'black_king';
type Board = (Piece | null)[][];

export default function CheckersGame({ onClose, chatId, messageId }: CheckersGameProps) {
  const [board, setBoard] = useState<Board>([]);
  const [turn, setTurn] = useState<'red' | 'black'>('red');
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<{ red: string, black: string } | null>(null);

  useEffect(() => {
    const gameRef = doc(db, 'chats', chatId, 'messages', messageId);
    
    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.gameState) {
          setBoard(data.gameState.board);
          setTurn(data.gameState.turn);
          setPlayers(data.gameState.players);
        } else {
          // Initialize game if first time
          const initialBoard: Board = Array(8).fill(null).map(() => Array(8).fill(null));
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 8; c++) {
              if ((r + c) % 2 === 1) initialBoard[r][c] = 'black';
            }
          }
          for (let r = 5; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              if ((r + c) % 2 === 1) initialBoard[r][c] = 'red';
            }
          }
          
          const initialPlayers = {
            red: data.senderId,
            black: auth.currentUser?.uid || '' // Joiner is black
          };

          updateDoc(gameRef, {
            gameState: {
              board: initialBoard,
              turn: 'red',
              players: initialPlayers
            }
          });
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [chatId, messageId]);

  const handleCellClick = async (r: number, c: number) => {
    if (loading || !players) return;
    
    // Check if it's my turn
    const isRed = auth.currentUser?.uid === players.red;
    const isBlack = auth.currentUser?.uid === players.black;
    
    if (turn === 'red' && !isRed) return;
    if (turn === 'black' && !isBlack) return;

    if ((r + c) % 2 === 0) return;

    const piece = board[r][c];

    if (selected) {
      if (r === selected.r && c === selected.c) {
        setSelected(null);
        return;
      }

      const dr = r - selected.r;
      const dc = c - selected.c;
      const movingPiece = board[selected.r][selected.c];

      if (!movingPiece) return;

      const isValidSimple = !piece && Math.abs(dr) === 1 && Math.abs(dc) === 1;
      const isValidJump = !piece && Math.abs(dr) === 2 && Math.abs(dc) === 2;

      if (isValidSimple || isValidJump) {
        const newBoard = [...board.map(row => [...row])];
        
        if (isValidJump) {
          const mr = (r + selected.r) / 2;
          const mc = (c + selected.c) / 2;
          const jumpedPiece = board[mr][mc];
          if (!jumpedPiece || jumpedPiece.startsWith(turn)) return;
          newBoard[mr][mc] = null;
        }

        // Handle Kinging
        let finalPiece = movingPiece;
        if (turn === 'red' && r === 0) finalPiece = 'red_king';
        if (turn === 'black' && r === 7) finalPiece = 'black_king';

        newBoard[r][c] = finalPiece;
        newBoard[selected.r][selected.c] = null;

        const gameRef = doc(db, 'chats', chatId, 'messages', messageId);
        await updateDoc(gameRef, {
          'gameState.board': newBoard,
          'gameState.turn': turn === 'red' ? 'black' : 'red'
        });
        
        setSelected(null);
      }
    } else if (piece && piece.startsWith(turn)) {
      setSelected({ r, c });
    }
  };

  if (loading) return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <Loader2 className="w-10 h-10 text-[var(--c-leaf)] animate-spin" />
    </div>
  );

  const isMyTurn = (turn === 'red' && auth.currentUser?.uid === players?.red) || 
                   (turn === 'black' && auth.currentUser?.uid === players?.black);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass p-6 sm:p-8 rounded-[2.5rem] w-full max-w-md relative shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-display font-bold">🔴 Шашки</h2>
            <p className={`text-xs font-bold uppercase tracking-widest ${isMyTurn ? 'text-[var(--c-leaf)] animate-pulse' : 'text-[var(--c-mist)]/40'}`}>
              {isMyTurn ? 'Ваш ход' : `Ход ${turn === 'red' ? 'Красных' : 'Черных'}`}
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 glass rounded-full flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="aspect-square w-full grid grid-cols-8 grid-rows-8 border-4 border-[var(--c-jungle-800)] rounded-xl overflow-hidden shadow-2xl bg-[var(--c-jungle-950)]">
          {board.map((row, r) => 
            row.map((cell, c) => (
              <div 
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                className={`flex items-center justify-center cursor-pointer transition-colors ${
                  (r + c) % 2 === 0 ? 'bg-[var(--c-leaf)]/5' : 'bg-[var(--c-jungle-800)]/40'
                } ${selected?.r === r && selected?.c === c ? 'ring-4 ring-inset ring-[var(--c-leaf)]' : ''}`}
              >
                {cell && (
                  <motion.div 
                    layoutId={`piece-${r}-${c}`}
                    className={`w-[75%] h-[75%] rounded-full shadow-2xl border-2 ${
                      cell.startsWith('red') 
                        ? 'bg-gradient-to-tr from-red-600 to-red-400 border-red-300/30' 
                        : 'bg-gradient-to-tr from-zinc-900 to-zinc-700 border-zinc-500/30'
                    } flex items-center justify-center relative`}
                  >
                    {cell.includes('king') && (
                      <div className="text-white text-xs drop-shadow-md">👑</div>
                    )}
                  </motion.div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-8 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-60">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${auth.currentUser?.uid === players?.red ? 'bg-red-500' : 'bg-zinc-800'}`} />
            <span>Вы</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Противник</span>
            <div className={`w-3 h-3 rounded-full ${auth.currentUser?.uid === players?.red ? 'bg-zinc-800' : 'bg-red-500'}`} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
