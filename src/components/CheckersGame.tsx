import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface CheckersGameProps {
  onClose: () => void;
  gameId: string;
}

type Piece = 'red' | 'black' | 'red_king' | 'black_king';
type Board = (Piece | null)[][];

export default function CheckersGame({ onClose, gameId }: CheckersGameProps) {
  const [board, setBoard] = useState<Board>([]);
  const [turn, setTurn] = useState<'red' | 'black'>('red');
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);

  useEffect(() => {
    const initialBoard: Board = Array(8).fill(null).map(() => Array(8).fill(null));
    // Black pieces at top
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) initialBoard[r][c] = 'black';
      }
    }
    // Red pieces at bottom
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) initialBoard[r][c] = 'red';
      }
    }
    setBoard(initialBoard);
  }, [gameId]);

  const handleCellClick = (r: number, c: number) => {
    if ((r + c) % 2 === 0) return; // Only dark cells are playable

    const piece = board[r][c];

    if (selected) {
      if (r === selected.r && c === selected.c) {
        setSelected(null);
        return;
      }

      // Basic move logic (very simplified for now)
      const dr = r - selected.r;
      const dc = c - selected.c;
      const movingPiece = board[selected.r][selected.c];

      if (!piece && Math.abs(dr) === 1 && Math.abs(dc) === 1) {
        // Simple move
        const newBoard = [...board.map(row => [...row])];
        newBoard[r][c] = movingPiece;
        newBoard[selected.r][selected.c] = null;
        setBoard(newBoard);
        setTurn(turn === 'red' ? 'black' : 'red');
        setSelected(null);
      } else if (!piece && Math.abs(dr) === 2 && Math.abs(dc) === 2) {
        // Jump move
        const mr = (r + selected.r) / 2;
        const mc = (c + selected.c) / 2;
        const jumpedPiece = board[mr][mc];

        if (jumpedPiece && jumpedPiece.startsWith(turn === 'red' ? 'black' : 'red')) {
          const newBoard = [...board.map(row => [...row])];
          newBoard[r][c] = movingPiece;
          newBoard[selected.r][selected.c] = null;
          newBoard[mr][mc] = null;
          setBoard(newBoard);
          setTurn(turn === 'red' ? 'black' : 'red');
          setSelected(null);
        }
      }
    } else if (piece && piece.startsWith(turn)) {
      setSelected({ r, c });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass p-8 rounded-[2.5rem] w-full max-w-md relative shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-display font-bold">🔴 Шашки</h2>
            <p className="text-xs text-[var(--c-mist)]/40 font-bold uppercase tracking-widest">
              Ход {turn === 'red' ? 'Красных' : 'Черных'}
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 glass rounded-full flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="aspect-square w-full grid grid-cols-8 grid-rows-8 border-4 border-[var(--c-jungle-800)] rounded-xl overflow-hidden shadow-2xl">
          {board.map((row, r) => 
            row.map((cell, c) => (
              <div 
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                className={`flex items-center justify-center cursor-pointer transition-colors ${
                  (r + c) % 2 === 0 ? 'bg-[var(--c-leaf)]/10' : 'bg-[var(--c-jungle-800)]'
                } ${selected?.r === r && selected?.c === c ? 'ring-2 ring-inset ring-[var(--c-accent)]' : ''}`}
              >
                {cell && (
                  <motion.div 
                    layoutId={`piece-${r}-${c}`}
                    className={`w-[80%] h-[80%] rounded-full shadow-lg ${
                      cell.startsWith('red') ? 'bg-red-500' : 'bg-zinc-900 border border-white/10'
                    } flex items-center justify-center`}
                  >
                    {cell.includes('king') && <div className="text-white text-xs">👑</div>}
                  </motion.div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-8 flex justify-between items-center text-sm font-bold opacity-60">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Вы</span>
          </div>
          <span>Игра #{gameId.slice(-4)}</span>
        </div>
      </motion.div>
    </div>
  );
}
