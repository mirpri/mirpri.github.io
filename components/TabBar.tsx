import React from "react";
import { FileCode, FileText, X } from "lucide-react";
import { Buffer } from "../types";

interface TabBarProps {
  buffers: Buffer[];
  activeFileId: string | null;
  onSelect: (fileId: string) => void;
  onClose: (id: string) => void;
}

const TabBar: React.FC<TabBarProps> = ({
  buffers,
  activeFileId,
  onSelect,
  onClose,
}) => {
  return (
    <div className="flex-1 h-full flex overflow-x-auto">
      {buffers.length === 0 ? (
        <div className="px-4 h-full flex items-center text-tokyo-comment italic">
          Dashboard
        </div>
      ) : (
        buffers.map((buf) => {
          const isActive = buf.id === activeFileId;
          return (
            <div
              key={buf.id}
              onClick={() => onSelect(buf.fileId)}
              onMouseDown={(e) => {
                if (e.button === 1) {
                  onClose(buf.id);
                }
                e.preventDefault()
              }}
              className={`group relative pl-4 pr-3 h-full flex items-center border-r border-tokyo-statusline cursor-pointer transition-colors duration-200 ${isActive ? "bg-tokyo-bg text-tokyo-fg" : "text-tokyo-comment hover:text-tokyo-fg hover:bg-tokyo-bg/40"}`}
            >
              {/* Active tab accent */}
              {isActive && (
                <span className="absolute left-0 right-0 top-0 h-[2px] bg-tokyo-blue" />
              )}
              <span className="mr-2">
                {buf.type === "tsx" ? (
                  <FileCode size={14} className=" text-tokyo-cyan" />
                ) : (
                  <FileText size={14} className="text-tokyo-fg" />
                )}
              </span>
              {buf.title}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(buf.id);
                }}
                className="ml-2 rounded p-0.5 text-tokyo-comment opacity-60 hover:opacity-100 hover:text-tokyo-red hover:bg-tokyo-red/10 transition-all duration-150"
              >
                <X size={12} />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
};

export default TabBar;
