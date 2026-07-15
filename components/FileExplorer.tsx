import React from 'react';
import Link from 'next/link';
import { FileNode } from '../types';
import { Folder, FileCode, FileText, ChevronRight, FileJson } from 'lucide-react';

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
      if (node.id === 'src' || node.name === 'src') {
        Icon = Folder;
      } else if (isFolder) {
        Icon = Folder;
      } else if (node.extension === 'ts' || node.extension === 'tsx') Icon = FileCode;
      else if (node.extension === 'json') Icon = FileJson;
      else Icon = FileText;

      const content = (
        <>
            {isFolder && (
              <span className="mr-1">
                <ChevronRight size={14} className={`transition-transform duration-200 ${node.isOpen ? 'rotate-90' : ''}`} />
              </span>
            )}
            {!isFolder && <span className="w-4 mr-1"></span>}
            
            <Icon size={14} className={`mr-2 ${
                isFolder ? 'text-tokyo-blue' : 
                node.extension === 'ts' || node.extension === 'tsx' ? 'text-tokyo-cyan' :
                'text-tokyo-fg'
            }`} />
            
            <span className={`text-sm font-mono ${isActive ? 'font-bold' : ''}`}>
              {node.name}
            </span>
        </>
      );

      const commonClasses = `relative flex items-center py-1 cursor-pointer hover:bg-tokyo-line_nr/50 hover:text-tokyo-fg select-none transition-colors duration-150 ${
        isActive
          ? 'bg-tokyo-selection text-tokyo-fg before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-tokyo-blue'
          : 'text-tokyo-comment'
      }`;

      return (
        <div key={node.id}>
          {isFolder ? (
            <div
              className={commonClasses}
              style={{ paddingLeft: `${paddingLeft}px` }}
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.id);
              }}
            >
              {content}
            </div>
          ) : (
            <Link
              href={`/${node.id}`}
              className={commonClasses + ' block'}
              style={{ paddingLeft: `${paddingLeft}px` }}
              onClick={(e) => {
                e.stopPropagation();
                onFileSelect(node.id);
              }}
            >
              {content}
            </Link>
          )}
          
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
