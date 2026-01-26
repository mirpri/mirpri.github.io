const e=`import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRID_SIZE = 15;
const CELL_SIZE = 20;
const INITIAL_SPEED = 200;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const Snake: React.FC = () => {
  const [snake, setSnake] = useState<Point[]>([{ x: 7, y: 7 }]);
  const [food, setFood] = useState<Point>({ x: 3, y: 3 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const moveRef = useRef<Direction>('RIGHT'); // Ref to prevent rapid key turns killing the snake

  const generateFood = useCallback((): Point => {
    return {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
  }, []);

  const resetGame = () => {
    setSnake([{ x: 7, y: 7 }]);
    setFood(generateFood());
    setDirection('RIGHT');
    moveRef.current = 'RIGHT';
    setIsGameOver(false);
    setScore(0);
    setIsPlaying(true);
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent | KeyboardEvent) => {
    if (!isPlaying) return;
    
    // Prevent default scrolling for arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }

    const currentDir = moveRef.current;
    
    switch (e.key) {
      case 'ArrowUp':
      case 'k':
        if (currentDir !== 'DOWN') moveRef.current = 'UP';
        break;
      case 'ArrowDown':
      case 'j':
        if (currentDir !== 'UP') moveRef.current = 'DOWN';
        break;
      case 'ArrowLeft':
      case 'h':
        if (currentDir !== 'RIGHT') moveRef.current = 'LEFT';
        break;
      case 'ArrowRight':
      case 'l':
        if (currentDir !== 'LEFT') moveRef.current = 'RIGHT';
        break;
    }
  }, [isPlaying]);

  // Attach global key listener
  useEffect(() => {
    if (isPlaying) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isPlaying, handleKeyDown]);

  const setMove = (dir: Direction) => {
    const currentDir = moveRef.current;
     if (dir === 'UP' && currentDir !== 'DOWN') moveRef.current = 'UP';
     if (dir === 'DOWN' && currentDir !== 'UP') moveRef.current = 'DOWN';
     if (dir === 'LEFT' && currentDir !== 'RIGHT') moveRef.current = 'LEFT';
     if (dir === 'RIGHT' && currentDir !== 'LEFT') moveRef.current = 'RIGHT';
  };

  useEffect(() => {
    if (isPlaying && !isGameOver) {
      const interval = setInterval(() => {
        setSnake(prevSnake => {
          const head = prevSnake[0];
          const newDir = moveRef.current;
          setDirection(newDir); // Sync state for render

          const newHead = { ...head };
          if (newDir === 'UP') newHead.y -= 1;
          if (newDir === 'DOWN') newHead.y += 1;
          if (newDir === 'LEFT') newHead.x -= 1;
          if (newDir === 'RIGHT') newHead.x += 1;

          // Check collisions
          if (
            newHead.x < 0 || newHead.x >= GRID_SIZE ||
            newHead.y < 0 || newHead.y >= GRID_SIZE ||
            prevSnake.some(s => s.x === newHead.x && s.y === newHead.y)
          ) {
            setIsGameOver(true);
            setIsPlaying(false);
            return prevSnake;
          }

          const newSnake = [newHead, ...prevSnake];
          // Check food
          if (newHead.x === food.x && newHead.y === food.y) {
            setScore(s => s + 1);
            setFood(generateFood());
          } else {
            newSnake.pop();
          }
          return newSnake;
        });
      }, Math.max(50, INITIAL_SPEED - Math.floor(score / 5) * 10));

      return () => clearInterval(interval);
    }
  }, [isPlaying, isGameOver, score, food, generateFood]);

  return (
    <div 
      className="p-4 border border-tokyo-comment rounded bg-tokyo-bg_dark/50 flex flex-col items-center outline-none"
    >
      <h2 className="text-xl font-bold text-tokyo-green mb-2">Retro Snake</h2>
      <p className="mb-4 text-tokyo-fg text-sm">
        Use <kbd className="bg-tokyo-line_nr px-1 rounded">Arrows</kbd> or <kbd className="bg-tokyo-line_nr px-1 rounded">hjkl</kbd> to move.
      </p>

      <div 
        style={{ 
          width: GRID_SIZE * CELL_SIZE, 
          height: GRID_SIZE * CELL_SIZE,
          gridTemplateColumns: \`repeat(\${GRID_SIZE}, 1fr)\` 
        }} 
        className="grid bg-tokyo-bg border border-tokyo-comment relative"
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
           const x = i % GRID_SIZE;
           const y = Math.floor(i / GRID_SIZE);
           const isSnake = snake.some(s => s.x === x && s.y === y);
           const isFood = food.x === x && food.y === y;
           const isHead = snake[0].x === x && snake[0].y === y;

           return (
             <div 
              key={i} 
              className={\`w-full h-full border-[0.5px] border-tokyo-bg_dark/20 
                \${isHead ? 'bg-tokyo-green' : isSnake ? 'bg-tokyo-green/70' : isFood ? 'bg-tokyo-red rounded-full scale-75' : ''}
              \`} 
             />
           );
        })}
        
        {(!isPlaying && !isGameOver) && (
          <div className="absolute inset-0 flex items-center justify-center bg-tokyo-bg_dark/80 backdrop-blur-sm">
            <button 
              onClick={resetGame}
              className="px-6 py-2 bg-tokyo-blue text-tokyo-bg font-bold rounded hover:opacity-90 shadow-lg"
            >
              Start Game
            </button>
          </div>
        )}

        {isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-tokyo-red/20 backdrop-blur-sm">
            <div className="text-2xl font-bold text-tokyo-fg mb-2">Game Over</div>
            <div className="text-tokyo-fg mb-4">Score: {score}</div>
            <button 
              onClick={resetGame}
              className="px-4 py-2 bg-tokyo-purple text-tokyo-bg font-bold rounded hover:opacity-90"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 text-sm text-tokyo-fg">
        Score: <span className="text-tokyo-yellow font-bold">{score}</span>
      </div>

      {/* Button Controls */}
      <div className="mt-4 grid grid-cols-3 gap-2 w-32">
        <div />
        <button 
           className="bg-tokyo-comment/20 hover:bg-tokyo-comment/40 text-tokyo-cyan p-2 rounded"
           onClick={() => setMove('UP')}
        >▲</button>
        <div />
        <button 
           className="bg-tokyo-comment/20 hover:bg-tokyo-comment/40 text-tokyo-cyan p-2 rounded"
           onClick={() => setMove('LEFT')}
        >◀</button>
        <button 
           className="bg-tokyo-comment/20 hover:bg-tokyo-comment/40 text-tokyo-cyan p-2 rounded"
           onClick={() => setMove('DOWN')}
        >▼</button>
        <button 
           className="bg-tokyo-comment/20 hover:bg-tokyo-comment/40 text-tokyo-cyan p-2 rounded"
           onClick={() => setMove('RIGHT')}
        >▶</button>
      </div>
    </div>
  );
};

export default Snake;
`;export{e as default};
