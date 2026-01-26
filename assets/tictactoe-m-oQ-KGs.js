const e=`import React, { useState, useEffect } from 'react';

type Player = 'X' | 'O';
type Board = (Player | null)[];

const TicTacToe: React.FC = () => {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState<Player | 'Draw' | null>(null);

  const checkWinner = (squares: Board): Player | 'Draw' | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    if (squares.every(s => s !== null)) return 'Draw';
    return null;
  };

  const handleClick = (index: number) => {
    if (winner || board[index]) return;

    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    
    const w = checkWinner(newBoard);
    if (w) {
      setWinner(w);
    } else {
      setIsXNext(!isXNext);
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
  };

  return (
    <div className="p-4 border border-tokyo-comment rounded bg-tokyo-bg_dark/50 flex flex-col items-center">
      <h2 className="text-xl font-bold text-tokyo-yellow mb-4">Tic Tac Toe</h2>
      <p className="mb-4 text-tokyo-fg text-sm">
        Classic game. Player <span className="text-tokyo-blue font-bold">X</span> vs Player <span className="text-tokyo-red font-bold">O</span>.
      </p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            disabled={!!winner || !!cell}
            className={\`
              w-16 h-16 text-3xl font-bold rounded flex items-center justify-center transition-all
              \${cell === 'X' ? 'text-tokyo-blue bg-tokyo-bg_dark' : cell === 'O' ? 'text-tokyo-red bg-tokyo-bg_dark' : 'bg-tokyo-comment/20 hover:bg-tokyo-comment/40'}
              \${!cell && !winner ? 'cursor-pointer' : 'cursor-default'}
            \`}
          >
            {cell}
          </button>
        ))}
      </div>

      <div className="h-8 mb-2">
        {winner ? (
          <div className="text-lg font-bold animate-pulse">
            {winner === 'Draw' ? (
              <span className="text-tokyo-orange">It's a Draw!</span>
            ) : (
              <span className={winner === 'X' ? 'text-tokyo-blue' : 'text-tokyo-red'}>
                Winner: {winner}
              </span>
            )}
          </div>
        ) : (
          <div className="text-tokyo-fg/80">
            Next Player: <span className={\`font-bold \${isXNext ? 'text-tokyo-blue' : 'text-tokyo-red'}\`}>{isXNext ? 'X' : 'O'}</span>
          </div>
        )}
      </div>

      <button
        onClick={resetGame}
        className="px-4 py-2 mt-2 bg-tokyo-purple text-tokyo-bg font-bold rounded hover:opacity-90 transition-opacity text-sm"
      >
        Restart Game
      </button>
    </div>
  );
};

export default TicTacToe;
`;export{e as default};
