import React, { useState } from 'react';

const Counter: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="p-4 border border-tokyo-comment rounded bg-tokyo-bg_dark/50">
      <h2 className="text-xl font-bold text-tokyo-purple mb-4">Interactive Counter Example</h2>
      <p className="mb-4 text-tokyo-fg">
        This is a fully functional React component loaded dynamically from <code className="text-tokyo-orange">src/demos/Counter.tsx</code>.
      </p>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setCount(c => c - 1)}
          className="px-4 py-2 bg-tokyo-red text-tokyo-bg font-bold rounded hover:opacity-90 transition-opacity"
        >
          -
        </button>
        <span className="text-2xl font-mono text-tokyo-blue w-12 text-center">{count}</span>
        <button 
          onClick={() => setCount(c => c + 1)}
          className="px-4 py-2 bg-tokyo-green text-tokyo-bg font-bold rounded hover:opacity-90 transition-opacity"
        >
          +
        </button>
      </div>

      <div className="mt-4 text-sm text-tokyo-comment">
        Current count: {count}
      </div>
    </div>
  );
};

export default Counter;
