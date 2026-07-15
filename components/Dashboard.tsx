import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Code, Cpu, Gamepad2, Zap, Book, icons, Compass } from 'lucide-react';
// import { useEditorStore } from '../store'; // If using store directly, but props is fine too

interface DashboardProps {
  onNavigate: (fileId: string) => void;
  loadTime?: number;
  onQuit?: () => void;
}

const ASCII_ART = `
  :::   :::   ::::::::::: :::::::::  :::::::::  :::::::::  :::::::::::
 :+:+: :+:+:      :+:     :+:    :+: :+:    :+: :+:    :+:     :+:
+:+ +:+:+ +:+     +:+     +:+    +:+ +:+    +:+ +:+    +:+     +:+
+#+  +:+  +#+     +#+     +#++:++#:  +#++:++#+  +#++:++#:      +#+
+#+       +#+     +#+     +#+    +#+ +#+        +#+    +#+     +#+
#+#       #+#     #+#     #+#    #+# #+#        #+#    #+#     #+#
###       ### ########### ###    ### ###        ###    ### ###########
`;

const MENU_ITEMS = [
  { icon: Compass, label: "Speed Dial", key: "d", fileId: "SpeedDial", desc: "Access links" },
  { icon: FileText, label: "About Me", key: "a", fileId: "about", desc: "Get to know me" },
  { icon: Code, label: "My Works", key: "w", fileId: "works", desc: "What I built" },
  { icon: Cpu, label: "Skills", key: "s", fileId: "skills", desc: "Tech stack stats" },
  { icon: Book, label: "Learning", key: "l", fileId: "learning", desc: "Notes & insights" },
  { icon: Gamepad2, label: "Games", key: "g", fileId: "games/wordstrand", desc: "Play games" },
];

const GLITCH_CHARS = ['$', '@', '#', '%', '&', '!', '?', '<', '>', '/', '\\', '|', '[', ']', '{', '}'];

const AsciiArt = () => {
  const [art, setArt] = useState(ASCII_ART);

  useEffect(() => {
    // Determine dimensions once
    const initialLines = ASCII_ART.split('\n');
    const maxWidth = Math.max(...initialLines.map(l => l.length));
    const cycle = maxWidth + 40; // Allow time for full destruction + pause
    let frame = 0;

    const interval = setInterval(() => {
      frame++;
      // Wave position: -20 to maxWidth + 20
      const pos = (frame % cycle) - 20;
      const cycleIndex = Math.floor(frame / cycle);
      const isRecovery = cycleIndex % 2 !== 0; // Odd cycles = recovery

      setArt((prevArt) => {
        const lines = prevArt.split('\n');

        return lines.map((line, y) => {
          if (!line) return line;

          return line.split('').map((char, x) => {
            if (char === ' ' || char === '\n') return char;

            // Define block wave window
            const dist = x - pos;
            const isInWave = dist >= 0 && dist < 12;

            if (isInWave) {
              return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
            }

            if (isRecovery && dist < 0) {
              return initialLines[y][x];
            }
            return char;
          }).join('');
        }).join('\n');
      });
    }, 40);

    return () => clearInterval(interval);
  }, []);

  return (
    <pre className="mb-10 text-tokyo-blue font-mono font-bold leading-none select-none text-[8px] sm:text-xs lg:text-sm whitespace-pre max-w-full animate-fade-in-up">
      {art}
    </pre>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, loadTime }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Basic vim navigation for dashboard
      if (e.key === 'j' || e.key === 'ArrowDown') {
        setSelectedIndex(prev => (prev + 1) % MENU_ITEMS.length);
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        setSelectedIndex(prev => (prev - 1 + MENU_ITEMS.length) % MENU_ITEMS.length);
      } else if (e.key === 'Enter') {
        handleSelect(selectedIndex);
      } else {
        // Hotkeys
        const itemIndex = MENU_ITEMS.findIndex(item => item.key === e.key);
        if (itemIndex !== -1) {
          handleSelect(itemIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex]);

  const handleSelect = (index: number) => {
    const item = MENU_ITEMS[index];
    onNavigate(item.fileId);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-tokyo-bg text-tokyo-fg select-none p-8">
      <AsciiArt />

      <div className="flex flex-col gap-2 w-full max-w-md">
        {MENU_ITEMS.map((item, index) => {
          const Icon = item.icon;
          const isSelected = index === selectedIndex;

          return (
            <Link
              key={item.label}
              href={`/${item.fileId}`}
              onClick={() => handleSelect(index)}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{ animationDelay: `${index * 60 + 120}ms` }}
              className={`flex items-center px-4 py-2 cursor-pointer transition-all duration-200 rounded-md group animate-fade-in-up ${isSelected ? 'bg-tokyo-line_nr translate-x-1' : 'hover:bg-tokyo-bg_dark'
                }`}
            >
              {/* Selection Marker */}
              <div
                className={`text-tokyo-cyan font-bold text-lg overflow-hidden transition-all duration-200 ${isSelected ? 'w-5 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-2'}`}
              >
                ➜
              </div>
              <div className={`w-8 flex justify-center ${isSelected ? 'text-tokyo-cyan' : 'text-tokyo-comment'}`}>
                <Icon size={18} className={`transition-all duration-200 ${isSelected ? 'drop-shadow-[0_0_8px_currentColor]' : ''}`} />
              </div>
              <span className={`font-bold mr-4 ${isSelected ? 'text-tokyo-fg' : 'text-tokyo-comment group-hover:text-tokyo-fg'}`}>
                {item.label}
              </span>
              <span className="text-tokyo-comment text-xs sm:text-sm flex-1 text-right italic opacity-60">
                {item.desc}
              </span>
              <span className={`ml-4 text-xs font-mono px-2 py-0.5 rounded ${isSelected ? 'bg-tokyo-blue text-tokyo-bg' : 'text-tokyo-comment'}`}>
                {item.key}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 text-tokyo-comment text-sm min-h-[20px]">
        {loadTime !== null && (
          <p className="flex items-center justify-center gap-2"><Zap size={15} /> Loaded in {loadTime}ms</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
