import React from 'react';
import { FileNode } from '../types';
import { Folder, FileCode, FileText, ChevronRight, ChevronDown, FileJson } from 'lucide-react';

interface FileExplorerProps {
  files: FileNode[];
  onFileSelect: (id: string) => void;
  activeFileId: string | null;
  toggleFolder: (id: string) => void;
  className?: string;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ files, onFileSelect, activeFileId, toggleFolder, className }) => {
  
  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map(node => {
      const isFolder = node.type === 'folder';
      const isActive = node.id === activeFileId;
      const paddingLeft = depth * 12 + 10;

      let Icon = FileText;
      if (isFolder) Icon = Folder;
      else if (node.extension === 'ts' || node.extension === 'tsx') Icon = FileCode;
      else if (node.extension === 'json') Icon = FileJson;
      else if (node.extension === 'lua') Icon = FileCode;
      else if (node.extension === 'md') Icon = FileText;

      return (
        <div key={node.id}>
          <div
            className={`flex items-center py-1 cursor-pointer hover:bg-tokyo-line_nr/50 select-none ${
              isActive ? 'bg-tokyo-selection text-tokyo-fg' : 'text-tokyo-comment'
            }`}
            style={{ paddingLeft: `${paddingLeft}px` }}
            onClick={(e) => {
              e.stopPropagation();
              if (isFolder) {
                toggleFolder(node.id);
              } else {
                onFileSelect(node.id);
              }
            }}
          >
            {isFolder && (
              <span className="mr-1">
                {node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            )}
            {!isFolder && <span className="w-4 mr-1"></span>}
            
            <Icon size={14} className={`mr-2 ${
                isFolder ? 'text-tokyo-blue' : 
                node.extension === 'ts' || node.extension === 'tsx' ? 'text-tokyo-cyan' :
                node.extension === 'json' ? 'text-tokyo-yellow' :
                'text-tokyo-fg'
            }`} />
            
            <span className={`text-sm font-mono ${isActive ? 'font-bold' : ''}`}>
              {node.name}
            </span>
          </div>
          
          {isFolder && node.isOpen && node.children && (
             <div>
                {renderTree(node.children, depth + 1)}
             </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className={`h-full bg-tokyo-bg_dark border-r border-tokyo-statusline overflow-y-auto w-60 ${className || ''}`}>
       <div className="p-2 text-xs font-bold text-tokyo-comment uppercase tracking-wider mb-2 mt-2 ml-2">Explorer</div>
       {renderTree(files)}
    </div>
  );
};

export default FileExplorer;
