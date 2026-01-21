import React, { useEffect, useState } from 'react';
import { FileText, Code, Cpu, MessageSquare, Power } from 'lucide-react';
// import { useEditorStore } from '../store'; // If using store directly, but props is fine too

interface DashboardProps {
  onNavigate: (fileId: string) => void;
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
  { icon: FileText, label: "About Me", key: "a", fileId: "about", desc: "Get to know me" },
  { icon: Code, label: "My Projects", key: "p", fileId: "works", desc: "See what I built" },
  { icon: Cpu, label: "Skills", key: "s", fileId: "skills", desc: "Tech stack stats" },
  { icon: MessageSquare, label: "Ask AI", key: "c", fileId: "chat", desc: "Chat with Gemini" },
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
            
            // If we are in recovery phase and the wave has passed this point (wake),
            // restore the original character.
            if (isRecovery && dist < 0) {
              return initialLines[y][x];
            }
            
            // Otherwise, keep the current state (persistence)
            // This handles the "destruction" wake where chars stay randomized
            return char;
          }).join('');
        }).join('\n');
      });
    }, 40);

    return () => clearInterval(interval);
  }, []);

  return (
    <pre className="mb-10 text-tokyo-blue font-mono font-bold leading-none select-none text-[9px] md:text-xs lg:text-sm text-center whitespace-pre w-full overflow-hidden">
      {art}
    </pre>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
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
    <div className="flex flex-col items-center justify-center h-full w-full bg-tokyo-bg text-tokyo-fg select-none pb-20">
      <AsciiArt />

      <div className="flex flex-col gap-2 w-full max-w-md">
        {MENU_ITEMS.map((item, index) => {
          const Icon = item.icon;
          const isSelected = index === selectedIndex;
          
          return (
            <div
              key={item.label}
              onClick={() => handleSelect(index)}
              className={`flex items-center px-4 py-2 cursor-pointer transition-all duration-200 rounded-md group ${
                isSelected ? 'bg-tokyo-line_nr' : 'hover:bg-tokyo-bg_dark'
              }`}
            >
              <div className={`w-8 flex justify-center ${isSelected ? 'text-tokyo-cyan' : 'text-tokyo-comment'}`}>
                <Icon size={18} />
              </div>
              <span className={`font-bold mr-4 ${isSelected ? 'text-tokyo-fg' : 'text-tokyo-comment group-hover:text-tokyo-fg'}`}>
                {item.label}
              </span>
              <span className="text-tokyo-comment text-sm flex-1 text-right italic opacity-60">
                {item.desc}
              </span>
              <span className={`ml-4 text-xs font-mono px-2 py-0.5 rounded ${isSelected ? 'bg-tokyo-blue text-tokyo-bg' : 'text-tokyo-comment'}`}>
                {item.key}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-16 text-tokyo-comment text-sm">
        <p>Neovim loaded in {Math.ceil(Math.random()*100)}ms</p>
      </div>
    </div>
  );
};

export default Dashboard;
