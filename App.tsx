import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { Mode, FileNode, Buffer } from './types';
import Dashboard from './components/Dashboard';
import Editor from './components/Editor';
import StatusLine from './components/StatusLine';
import FileExplorer from './components/FileExplorer';
import { X, Home, FileCode, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom';
import { buildExplorerTree, getMarkdownPages, loadMarkdownContent, getPageLoader } from './services/pagesService';
import { useEditorStore } from './store';
import { 
  nextWord, 
  prevWord, 
  nextWordEnd, 
  prevWordEnd, 
  nextParagraph, 
  prevParagraph, 
  computeSelectionText, // computeSelectionText is needed
  // ... others likely not needed if logic moved but let's see
  firstNonWhitespace
} from './services/vimService';

const App: React.FC = () => {
  const { 
    mode, 
    setMode, 
    activeFileId, 
    setActiveFile, 
    buffers, 
    openFile, 
    closeFile, 
    updateBuffer,
    updateCursor
  } = useEditorStore();
  
  const [files, setFiles] = useState<FileNode[]>([]);
  const [filesReady, setFilesReady] = useState(false);
  const [ActivePage, setActivePage] = useState<React.ComponentType | null>(null);

  const activeBuffer = useMemo(() => {
    if (!activeFileId) return null;
    return buffers.find(b => b.id === activeFileId) || null;
  }, [buffers, activeFileId]);

    // Initialize explorer from markdown pages plus special Chat page
    useEffect(() => {
      const extraNodes: FileNode[] = [
        {
          id: 'chat',
          name: 'ask_ai.tsx',
          type: 'file',
          extension: 'tsx',
          content: 'Chat interface initializing...',
        }
      ];
      setFiles(buildExplorerTree(extraNodes));
      setFilesReady(true);
    }, []);

  const [showExplorer, setShowExplorer] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 768; // visible by default on md+
  });
  const [visualAnchor, setVisualAnchor] = useState<{ row: number; col: number } | null>(null);
  // Pending key combos (e.g., 'gg', 'ge')
  const gPendingRef = useRef(false);
  const gTimerRef = useRef<number | null>(null);
  
  // Command Mode State
  const [commandBuffer, setCommandBuffer] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  // Helper to find file recursively
  const findFile = (nodes: FileNode[], id: string): FileNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findFile(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const toggleFolder = (id: string) => {
     const newFiles = [...files];
     const toggleNode = (nodes: FileNode[]) => {
        for (const node of nodes) {
           if (node.id === id) {
              node.isOpen = !node.isOpen;
              return true;
           }
           if (node.children) {
              if (toggleNode(node.children)) return true;
           }
        }
        return false;
     };
     toggleNode(newFiles);
     setFiles(newFiles);
  };


  const navigate = useNavigate();
  const navigateToFile = (id: string) => {
    const file = findFile(files, id);
    if (!file || file.type === 'folder') return;
    // Navigate to /pagename for markdown and special chat
    navigate(`/${id}`);
  };

  const closeBuffer = () => {
    setMode(Mode.NORMAL);
    setCommandBuffer('');
    setVisualAnchor(null);
    setActivePage(null);
    closeTab(activeFileId);
    navigate('/');
  };

  const closeTab = (id: string | null) => {
    if (id) {
       closeFile(id);
       if (activeFileId === id) {
          setVisualAnchor(null);
          setMode(Mode.NORMAL);
          setActivePage(null);
          navigate('/');
       }
    }
  };
  
  // Route -> Buffer sync
  const location = useLocation();
  useEffect(() => {
    if (!filesReady) return;
    const path = location.pathname.replace(/^\/+/, '');
    if (!path) {
      setActiveFile(null);
      return;
    }
    const file = findFile(files, path);
    if (!file || file.type === 'folder') {
      setActiveFile(null);
      if (path !== '') navigate('/');
      return;
    }

    if (activeFileId !== file.id) {
        setActiveFile(file.id);
        setMode(Mode.NORMAL);
        setCommandBuffer('');
    }

    let bufferType: Buffer['type'] = 'markdown';
    if (file.extension === 'ts' || file.extension === 'tsx') bufferType = file.id === 'chat' ? 'chat' : 'typescript';
    if (file.extension === 'json') bufferType = 'json';
    if (file.extension === 'md') bufferType = 'markdown';
    if (file.id === 'chat') bufferType = 'chat';

    const bufferBase: Buffer = {
      id: file.id,
      fileId: file.id,
      title: file.name,
      path: file.path,
      content: file.content || '',
      cursorRow: 0,
      cursorCol: 0,
      scrollOffset: 0,
      isDirty: false,
      type: bufferType
    };

    if (file.extension === 'md' ) {
      loadMarkdownContent(file.id).then(content => {
          if (content !== null) {
              openFile(file.id, content, file.name);
          } else {
              openFile(file.id, file.content || '', file.name);
          }
      });
      setActivePage(null);
    } else if (file.extension === 'tsx' && file.id !== 'chat') {
      const loader = getPageLoader(file.id);
      if (loader) {
          // Open dummy buffer for tab
          openFile(file.id, '(Component Loaded)', file.name);
          const LazyComp = React.lazy(loader);
          setActivePage(() => LazyComp);
      } else {
          openFile(file.id, file.content || '', file.name);
          setActivePage(null);
      }
    } else {
       openFile(file.id, file.content || '', file.name);
       setActivePage(null);
    }

  }, [location, filesReady, files]); // Removed activeFileId to prevent loops? No, we need it if we change logic. But openFile handles check.
  
  // Wait, the "updateActiveBuffer" method was used heavily. 
  // We need to replace usages of it with updateBuffer from store or similar.
  // The original updateActiveBuffer was complex (handling array update).
  // Our store "updateBuffer" just takes id and content. What about cursor?
  // We need to extend store to handle cursor updates if we want to move cursor state to store completely.
  // BUT the request was "use zustand to manage mode, selection, opened editors". 
  // It didn't explicitly say cursor position, but usually "opened editors" implies their state.
  // Let's assume cursor pos is part of buffer state.
  
  // Let's update store.ts to handle cursor updates first.

// We removed updateActiveBuffer and the old useEffect.
// Now we need to handle command execution.

  const executeCommand = async (cmd: string) => {
    const cleanCmd = cmd.trim();
    if (cleanCmd === 'q' || cleanCmd === 'q!' || cleanCmd === 'wq') {
      closeBuffer();
    } else if ( cleanCmd === 'qa' || cleanCmd === 'qa!'){
      // Close all buffers
      // We need a store action for this, or just loop
      // Simplified:
      buffers.forEach(b => closeFile(b.id));
      navigate('/');
    } else if (cleanCmd === '%y') {
      if (activeBuffer?.content) {
        try {
          await navigator.clipboard.writeText(activeBuffer.content);
          setNotification('Buffer copied to clipboard');
        } catch (err) {
          setNotification('Failed to copy to clipboard');
        }
      } else {
        setNotification('Nothing to copy');
      }
      setTimeout(() => setNotification(null), 2000);
    } else {
      setNotification(`E492: Not an editor command: ${cleanCmd}`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Global Key Handler for Vim-like actions
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // Allow default behavior for chat inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // Unless it's escape
        if (e.key === 'Escape') {
             (e.target as HTMLElement).blur();
             setMode(Mode.NORMAL);
        }
        return;
      }

      // Handle Command Mode Typing
      if (mode === Mode.COMMAND) {
        e.preventDefault();
        if (e.key === 'Enter') {
          executeCommand(commandBuffer);
          setMode(Mode.NORMAL);
          setCommandBuffer('');
        } else if (e.key === 'Backspace') {
          setCommandBuffer(prev => prev.slice(0, -1));
          if (commandBuffer.length === 0) {
             setMode(Mode.NORMAL);
          }
        } else if (e.key === 'Escape') {
          setMode(Mode.NORMAL);
          setCommandBuffer('');
        } else if (e.key.length === 1) {
          setCommandBuffer(prev => prev + e.key);
        }
        return;
      }

      // Shortcut to toggle explorer
      if (e.key === 'e' && e.altKey) { 
          e.preventDefault();
          setShowExplorer(prev => !prev);
          return;
      }

      if (activeFileId && activeBuffer && activeBuffer.type !== 'chat') {
         if (e.key === 'Escape') {
             setMode(Mode.NORMAL);
             setCommandBuffer('');
           setVisualAnchor(null);
         }

         // Normal Mode Navigation
         if (mode === Mode.NORMAL) {
            // resolve pending 'g' combos first
            if (gPendingRef.current) {
              // clear pending if any key pressed next
              gPendingRef.current = false;
              if (gTimerRef.current) { clearTimeout(gTimerRef.current); gTimerRef.current = null; }
              const lines = activeBuffer.content.split('\n');
              if (e.key === 'g') {
                e.preventDefault();
                if (activeBuffer) updateCursor(activeBuffer.id, 0, Math.min(activeBuffer.cursorCol, (lines[0] || '').length));
                return;
              } else if (e.key === 'e') {
                e.preventDefault();
                if (activeBuffer) {
                  const pos = nextWordEnd(lines, activeBuffer.cursorRow, activeBuffer.cursorCol);
                  updateCursor(activeBuffer.id, pos.row, pos.col);
                }
                return;
              }
              // fallthrough to handle this key normally
            }
             if (e.key === ':') {
                 setMode(Mode.COMMAND);
                 return;
             }
             
             const lines = activeBuffer.content.split('\n');
             const currentLine = lines[activeBuffer.cursorRow] || '';


             if (e.key === 'j' || e.key === 'ArrowDown') {
                 if (activeBuffer) {
                   const nextRow = Math.min(lines.length - 1, activeBuffer.cursorRow + 1);
                   const nextLineLen = lines[nextRow].length;
                   updateCursor(activeBuffer.id, nextRow, Math.min(activeBuffer.cursorCol, Math.max(0, nextLineLen - 1)));
                 }
             } else if (e.key === 'k' || e.key === 'ArrowUp') {
                 if (activeBuffer) {
                   const nextRow = Math.max(0, activeBuffer.cursorRow - 1);
                   const nextLineLen = lines[nextRow].length;
                   updateCursor(activeBuffer.id, nextRow, Math.min(activeBuffer.cursorCol, Math.max(0, nextLineLen - 1)));
                 }
             } else if (e.key === 'l' || e.key === 'ArrowRight') {
                 if (activeBuffer) {
                   updateCursor(activeBuffer.id, activeBuffer.cursorRow, Math.min(activeBuffer.cursorCol + 1, currentLine.length));
                 }
             } else if (e.key === 'h' || e.key === 'ArrowLeft') {
                 if (activeBuffer) {
                    updateCursor(activeBuffer.id, activeBuffer.cursorRow, Math.max(0, activeBuffer.cursorCol - 1));
                 }
             } else if (e.key === 'v') {
                 setMode(Mode.VISUAL);
                 if (activeBuffer) setVisualAnchor({ row: activeBuffer.cursorRow, col: activeBuffer.cursorCol });
                 e.preventDefault();
             } else if (e.key === 'g') {
               e.preventDefault();
               gPendingRef.current = true;
               if (gTimerRef.current) { clearTimeout(gTimerRef.current); }
               gTimerRef.current = window.setTimeout(() => { gPendingRef.current = false; gTimerRef.current = null; }, 600);
             }
             // Yank current line in NORMAL mode
             else if (e.key === 'y') {
                 e.preventDefault();
                 const lineText = currentLine;
                 if (lineText !== undefined) {
                   navigator.clipboard.writeText(lineText).then(() => {
                     setNotification('Line yanked to clipboard');
                     setTimeout(() => setNotification(null), 1500);
                   }).catch(() => {
                     setNotification('Failed to copy');
                     setTimeout(() => setNotification(null), 1500);
                   });
                 }
               } else if (e.key === '0') {
                   e.preventDefault();
                   if (activeBuffer) updateCursor(activeBuffer.id, activeBuffer.cursorRow, 0);
               } else if (e.key === '$') {
                   e.preventDefault();
                   if (activeBuffer) updateCursor(activeBuffer.id, activeBuffer.cursorRow, (lines[activeBuffer.cursorRow] || '').length);
               } else if (e.key === 'e') {
                   e.preventDefault();
                   if (activeBuffer) {
                     const pos = nextWordEnd(lines, activeBuffer.cursorRow, activeBuffer.cursorCol);
                     updateCursor(activeBuffer.id, pos.row, pos.col);
                   }
               } else if (e.key === 'G') {
                   e.preventDefault();
                   if (activeBuffer) {
                     const targetRow = lines.length - 1;
                     const targetCol = Math.min(activeBuffer.cursorCol, (lines[targetRow] || '').length);
                     updateCursor(activeBuffer.id, targetRow, targetCol);
                   }
             } else if (e.key === 'w') {
                 e.preventDefault();
                   if (activeBuffer) {
                     const pos = nextWord(lines, activeBuffer.cursorRow, activeBuffer.cursorCol);
                     updateCursor(activeBuffer.id, pos.row, pos.col);
                   }
             } else if (e.key === 'b') {
                 e.preventDefault();
                   if (activeBuffer) {
                     const pos = prevWord(lines, activeBuffer.cursorRow, activeBuffer.cursorCol);
                     updateCursor(activeBuffer.id, pos.row, pos.col);
                   }
             } else if (e.key === '}') {
                 e.preventDefault();
                   if (activeBuffer) {
                     const pos = nextParagraph(lines, activeBuffer.cursorRow);
                     updateCursor(activeBuffer.id, pos.row, pos.col);
                   }
             } else if (e.key === '{') {
                 e.preventDefault();
                   if (activeBuffer) {
                     const pos = prevParagraph(lines, activeBuffer.cursorRow);
                     updateCursor(activeBuffer.id, pos.row, pos.col);
                   }
             }
         }

         // Visual Mode Navigation and Yank
         if (mode === Mode.VISUAL) {
             const lines = activeBuffer.content.split('\n');
             const currentLine = lines[activeBuffer.cursorRow] || '';

             // resolve pending 'g' combos first
             if (gPendingRef.current) {
               gPendingRef.current = false;
               if (gTimerRef.current) { clearTimeout(gTimerRef.current); gTimerRef.current = null; }
               if (e.key === 'g') {
                 e.preventDefault();
                 if (activeBuffer) {
                   const targetRow = 0;
                   const targetCol = Math.min(activeBuffer.cursorCol, (lines[targetRow] || '').length);
                   updateCursor(activeBuffer.id, targetRow, targetCol);
                 }
                 return;
               } else if (e.key === 'e') {
                 e.preventDefault();
                 if (activeBuffer) {
                   const pos = prevWordEnd(lines, activeBuffer.cursorRow, activeBuffer.cursorCol);
                   updateCursor(activeBuffer.id, pos.row, pos.col);
                 }
                 return;
               }
               // fallthrough
             }

             if (e.key === 'j' || e.key === 'ArrowDown') {
               e.preventDefault();
               if (activeBuffer) {
                 const nextRow = Math.min(lines.length - 1, activeBuffer.cursorRow + 1);
                 const nextLineLen = lines[nextRow].length;
                 updateCursor(activeBuffer.id, nextRow, Math.min(activeBuffer.cursorCol, Math.max(0, nextLineLen)));
               }
             } else if (e.key === 'k' || e.key === 'ArrowUp') {
               e.preventDefault();
               if (activeBuffer) {
                 const nextRow = Math.max(0, activeBuffer.cursorRow - 1);
                 const nextLineLen = lines[nextRow].length;
                 updateCursor(activeBuffer.id, nextRow, Math.min(activeBuffer.cursorCol, Math.max(0, nextLineLen)));
               }
             } else if (e.key === 'l' || e.key === 'ArrowRight') {
               e.preventDefault();
               if (activeBuffer) {
                 updateCursor(activeBuffer.id, activeBuffer.cursorRow, Math.min(activeBuffer.cursorCol + 1, currentLine.length));
               }
             } else if (e.key === 'h' || e.key === 'ArrowLeft') {
               e.preventDefault();
               if (activeBuffer) {
                 updateCursor(activeBuffer.id, activeBuffer.cursorRow, Math.max(0, activeBuffer.cursorCol - 1));
               }
             } else if (e.key === 'y') {

               e.preventDefault();
               // Compute selection from visualAnchor to current cursor
               if (visualAnchor) {
                 const selText = computeSelectionText(activeBuffer.content, visualAnchor, { row: activeBuffer.cursorRow, col: activeBuffer.cursorCol });
                 navigator.clipboard.writeText(selText).then(() => {
                   setNotification('Selection yanked to clipboard');
                   setTimeout(() => setNotification(null), 1500);
                 }).catch(() => {
                   setNotification('Failed to copy');
                   setTimeout(() => setNotification(null), 1500);
                 });
                 // Exit visual mode after yank
                 setMode(Mode.NORMAL);
                 setVisualAnchor(null);
               }
            } else if (e.key === 'g') {
              e.preventDefault();
              gPendingRef.current = true;
              if (gTimerRef.current) { clearTimeout(gTimerRef.current); }
              gTimerRef.current = window.setTimeout(() => { gPendingRef.current = false; gTimerRef.current = null; }, 600);
            } else if (e.key === '0') {
              e.preventDefault();
              if (activeBuffer) updateCursor(activeBuffer.id, activeBuffer.cursorRow, 0);
            } else if (e.key === '$') {
              e.preventDefault();
              if (activeBuffer) updateCursor(activeBuffer.id, activeBuffer.cursorRow, (lines[activeBuffer.cursorRow] || '').length);
            } else if (e.key === 'e') {
              e.preventDefault();
              if (activeBuffer) {
                const pos = nextWordEnd(lines, activeBuffer.cursorRow, activeBuffer.cursorCol);
                updateCursor(activeBuffer.id, pos.row, pos.col);
              }
            } else if (e.key === 'G') {
              e.preventDefault();
              if (activeBuffer) {
                const targetRow = lines.length - 1;
                const targetCol = Math.min(activeBuffer.cursorCol, (lines[targetRow] || '').length);
                useEditorStore.getState().updateCursor(activeBuffer.id, targetRow, targetCol);
              }
            } else if (e.key === 'w') {
              e.preventDefault();
              if (activeBuffer) {
                const pos = nextWord(lines, activeBuffer.cursorRow, activeBuffer.cursorCol);
                useEditorStore.getState().updateCursor(activeBuffer.id, pos.row, pos.col);
              }
            } else if (e.key === 'b') {
              e.preventDefault();
              if (activeBuffer) {
                const pos = prevWord(lines, activeBuffer.cursorRow, activeBuffer.cursorCol);
                useEditorStore.getState().updateCursor(activeBuffer.id, pos.row, pos.col);
              }
            } else if (e.key === '}') {
              e.preventDefault();
              if (activeBuffer) {
                const pos = nextParagraph(lines, activeBuffer.cursorRow);
                useEditorStore.getState().updateCursor(activeBuffer.id, pos.row, pos.col);
              }
            } else if (e.key === '{') {
              e.preventDefault();
              if (activeBuffer) {
                const pos = prevParagraph(lines, activeBuffer.cursorRow);
                useEditorStore.getState().updateCursor(activeBuffer.id, pos.row, pos.col);
              }
            }
         }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [activeFileId, mode, commandBuffer, activeBuffer]);

  // Vim-like motion helpers
  const isWordChar = (ch: string) => /[A-Za-z0-9_]/.test(ch);

  const goLineStart = (lines: string[], row: number) => ({ row, col: 0 });
  const goLineEnd = (lines: string[], row: number) => ({ row, col: (lines[row] || '').length });


  return (
    <div className="flex flex-col h-screen w-screen bg-tokyo-bg text-tokyo-fg overflow-hidden font-mono">
      
      {/* Top Bar */}
      <div className="h-9 bg-tokyo-bg_dark flex items-center border-b border-tokyo-statusline shrink-0 text-sm">
         <div className="w-16 flex justify-center items-center bg-tokyo-blue text-tokyo-bg_dark h-full font-bold cursor-pointer" onClick={() => navigate('/')}>
            <Home size={16} />
         </div>
         <button
           className="h-full px-3 flex items-center border-r border-tokyo-statusline text-tokyo-comment hover:text-tokyo-fg"
           onClick={() => setShowExplorer(prev => !prev)}
         >
           {showExplorer ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
         </button>
         <div className="flex-1 h-full flex overflow-x-auto">
           {buffers.length === 0 ? (
             <div className="px-4 h-full flex items-center text-tokyo-comment italic">
                Dashboard
             </div>
           ) : (
             buffers.map(buf => {
               const isActive = buf.id === activeFileId;
               return (
                 <div
                   key={buf.id}
                   onClick={() => navigate(`/${buf.fileId}`)}
                   className={`px-4 h-full flex items-center border-r border-tokyo-statusline cursor-pointer ${isActive ? 'bg-tokyo-bg text-tokyo-fg' : 'text-tokyo-comment hover:text-tokyo-fg'}`}
                 >
                   <span className="mr-2 text-tokyo-cyan"><FileCode size={14}/></span>
                   {buf.title}
                   <button
                     onClick={(e) => { e.stopPropagation(); closeTab(buf.id); }}
                     className="ml-3 hover:text-tokyo-red"
                   >
                     <X size={12} />
                   </button>
                 </div>
               );
             })
           )}
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop explorer with slide/collapse */}
        <div className="hidden md:block h-full overflow-hidden transition-all duration-300 ease-out" style={{ width: showExplorer ? '15rem' : '0rem' }}>
          <div className={`h-full transition-transform duration-300 ease-out ${showExplorer ? 'translate-x-0' : '-translate-x-full'}`}>
            <FileExplorer 
              className="w-60"
              files={files} 
              onFileSelect={navigateToFile} 
              activeFileId={activeFileId}
              toggleFolder={toggleFolder}
            />
          </div>
        </div>

        {/* Mobile modal explorer */}
        {showExplorer && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div className="w-64 max-w-[80%] h-full bg-tokyo-bg_dark border-r border-tokyo-statusline shadow-xl">
              <div className="flex items-center justify-between px-3 py-2 border-b border-tokyo-statusline text-tokyo-fg">
                <span className="text-xs uppercase tracking-wide text-tokyo-comment">Explorer</span>
                <button onClick={() => setShowExplorer(false)} className="text-tokyo-comment hover:text-tokyo-fg"><X size={14} /></button>
              </div>
              <FileExplorer 
                className="w-full"
                files={files} 
                onFileSelect={(id) => { navigateToFile(id); setShowExplorer(false); }} 
                activeFileId={activeFileId}
                toggleFolder={toggleFolder}
              />
            </div>
            <div className="flex-1 bg-black/40" onClick={() => setShowExplorer(false)}></div>
          </div>
        )}

        <div className="flex-1 relative flex flex-col min-w-0 bg-tokyo-bg">
          <Routes>
            <Route path="/" element={<Dashboard onNavigate={navigateToFile} onQuit={() => window.location.href = 'about:blank'} />} />
            <Route path="/*" element={
              ActivePage ? (
                <div className="h-full w-full overflow-y-auto bg-tokyo-bg text-tokyo-fg p-6">
                  <Suspense fallback={<div className="text-tokyo-comment">Loading Component...</div>}>
                    <ActivePage />
                  </Suspense>
                </div>
              ) : activeBuffer ? (
              <Editor 
                buffer={activeBuffer} 
                isActive={true}
                mode={mode}
                selection={visualAnchor ? { start: visualAnchor, end: { row: activeBuffer.cursorRow, col: activeBuffer.cursorCol } } : null}
                onCursorChange={(row, col) => {
                  updateCursor(activeBuffer.id, row, col);
                }}
                onMouseSelectionChange={(start, end) => {
                  if (start && end) {
                    setMode(Mode.VISUAL);
                    setVisualAnchor(start);
                    updateCursor(activeBuffer.id, end.row, end.col);
                  }
                }}
                onExitVisual={() => { setMode(Mode.NORMAL); setVisualAnchor(null); }}
              />
            ) : (
              <Dashboard onNavigate={openFile} onQuit={() => window.location.href = 'about:blank'} />
            )} />
          </Routes>
        </div>
      </div>

      {/* Status Line */}
      <StatusLine 
        mode={mode} 
        file={activeBuffer?.title} 
        cursorRow={activeBuffer?.cursorRow || 0} 
        cursorCol={activeBuffer?.cursorCol || 0}
        fileType={activeBuffer?.type || 'N/A'}
        totalLines={activeBuffer ? activeBuffer.content.split('\n').length : 1}
      />
      
      {/* Command Line / Message Bar */}
      <div className="h-6 bg-tokyo-bg text-tokyo-fg flex items-center px-2 text-xs border-t border-tokyo-statusline shrink-0">
         {mode === Mode.COMMAND ? (
            <div className="flex items-center w-full">
               <span className="font-bold mr-1">:</span>
               <span className="text-tokyo-fg">{commandBuffer}</span>
               <span className="w-2 h-4 bg-tokyo-fg ml-0.5 animate-pulse"></span>
            </div>
         ) : notification ? (
            <span className="text-tokyo-red font-bold">{notification}</span>
         ) : (
            activeBuffer?.type === 'chat' 
              ? <span className="text-tokyo-comment">Chat active. Type your question below.</span>
              : <span className="text-tokyo-comment">{activeBuffer ? 'Try vim commands!' : 'Welcome to My Home Page! © 2026 Mirpri'}</span>
         )}
      </div>
    </div>
  );
};

export default App;
