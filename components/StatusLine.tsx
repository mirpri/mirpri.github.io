import React from 'react';
import { Mode } from '../types';
import { GitBranch, Wifi } from 'lucide-react';

interface StatusLineProps {
  mode: Mode;
  file?: string;
  cursorRow: number;
  cursorCol: number;
  fileType: string;
  totalLines: number;
}

const StatusLine: React.FC<StatusLineProps> = ({ mode, file, cursorRow, cursorCol, fileType, totalLines }) => {
  const getModeColor = () => {
    switch (mode) {
      case Mode.NORMAL: return 'bg-tokyo-blue text-tokyo-bg_dark';
      case Mode.INSERT: return 'bg-tokyo-green text-tokyo-bg_dark';
      case Mode.VISUAL: return 'bg-tokyo-purple text-tokyo-bg_dark';
      case Mode.COMMAND: return 'bg-tokyo-red text-tokyo-bg_dark';
      default: return 'bg-tokyo-blue text-tokyo-bg_dark';
    }
  };

  const percent = (() => {
    const lines = Math.max(1, totalLines || 1);
    const current = Math.min(lines, Math.max(1, cursorRow + 1));
    return Math.floor((current / lines) * 100);
  })();

  return (
    <div className="h-6 w-full bg-tokyo-statusline flex items-center text-xs font-mono select-none z-10">
      {/* Mode Indicator */}
      <div className={`${getModeColor()} px-3 py-1 font-bold uppercase transition-colors duration-200`}>
        {mode}
      </div>
      
      {/* Git Branch (Static decoration) */}
      <div className="px-3 py-1 bg-tokyo-line_nr text-tokyo-fg flex items-center gap-1">
        <GitBranch size={10} />
        <span>main</span>
      </div>

      {/* File Name */}
      <div className="px-3 py-1 bg-tokyo-statusline text-tokyo-fg flex-1 font-medium overflow-hidden whitespace-nowrap text-ellipsis">
         {file || '[No Name]'}
      </div>

      {/* Right Side Info */}
      <div className="flex items-center h-full">
         <div className="px-3 py-1 text-tokyo-comment bg-tokyo-statusline flex items-center gap-2">
            <span className="hidden md:inline">utf-8</span>
            {<span className="hidden md:inline">{fileType}</span>}
         </div>
         <div className="px-3 py-1 bg-tokyo-line_nr text-tokyo-fg">
          {percent}%
         </div>
         <div className={`${getModeColor()} px-3 py-1 text-tokyo-bg_dark font-bold min-w-[80px] text-center`}>
            {cursorRow + 1}:{cursorCol + 1}
         </div>
      </div>
    </div>
  );
};

export default StatusLine;
