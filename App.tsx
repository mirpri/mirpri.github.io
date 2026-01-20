import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mode, FileNode, Buffer } from './types';
import Dashboard from './components/Dashboard';
import Editor from './components/Editor';
import StatusLine from './components/StatusLine';
import FileExplorer from './components/FileExplorer';
import { X, Home, FileCode } from 'lucide-react';
import { Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom';
import { buildExplorerTree, getMarkdownPages, loadMarkdownContent } from './services/pagesService';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>(Mode.NORMAL);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [filesReady, setFilesReady] = useState(false);
  const [buffers, setBuffers] = useState<Buffer[]>([]);
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

  const [showExplorer, setShowExplorer] = useState(true);
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

  const updateActiveBuffer = (updater: (prev: Buffer | null) => Buffer | null) => {
    setBuffers(prev => {
      const idx = activeFileId ? prev.findIndex(b => b.id === activeFileId) : -1;
      const current = idx >= 0 ? prev[idx] : null;
      const next = updater(current);
      if (!next) {
        if (idx >= 0) {
          const copy = [...prev];
          copy.splice(idx, 1);
          return copy;
        }
        return prev;
      }
      const copy = [...prev];
      if (idx >= 0) {
        copy[idx] = next;
      } else {
        copy.push(next);
      }
      return copy;
    });
  };

  const navigate = useNavigate();
  const openFile = (id: string) => {
    const file = findFile(files, id);
    if (!file || file.type === 'folder') return;
    // Navigate to /pagename for markdown and special chat
    navigate(`/${id}`);
  };

  const closeBuffer = () => {
    setMode(Mode.NORMAL);
    setCommandBuffer('');
    setVisualAnchor(null);
    navigate('/');
    closeTab(activeFileId);
  };

  const closeTab = (id: string) => {
    setBuffers(prev => prev.filter(b => b.id !== id));
    if (activeFileId === id) {
      setActiveFileId(null);
      setVisualAnchor(null);
      setMode(Mode.NORMAL);
      navigate('/');
    }
  };
  // Route -> Buffer sync
  const location = useLocation();
  const params = useParams();
  useEffect(() => {
    if (!filesReady) return;
    const path = location.pathname.replace(/^\/+/, '');
    if (!path) {
      setActiveFileId(null);
      return;
    }
    const file = findFile(files, path);
    if (!file || file.type === 'folder') {
      setActiveFileId(null);
      navigate('/');
      return;
    }

    setActiveFileId(file.id);
    setMode(Mode.NORMAL);
    setCommandBuffer('');

    let bufferType: Buffer['type'] = 'markdown';
    if (file.extension === 'ts' || file.extension === 'tsx') bufferType = file.id === 'chat' ? 'chat' : 'typescript';
    if (file.extension === 'json') bufferType = 'json';
    if (file.extension === 'md') bufferType = 'markdown';
    if (file.id === 'chat') bufferType = 'chat';

    const bufferBase: Buffer = {
      id: file.id,
      fileId: file.id,
      title: file.name,
      content: file.content || '',
      cursorRow: 0,
      cursorCol: 0,
      scrollOffset: 0,
      isDirty: false,
      type: bufferType
    };

    if (file.extension === 'md') {
      loadMarkdownContent(file.id).then(content => {
        const resolved = content ?? '';
        setBuffers(prev => {
          if (prev.find(b => b.fileId === file.id)) return prev;
          return [...prev, { ...bufferBase, content: resolved }];
        });
      });
    } else {
      setBuffers(prev => {
        if (prev.find(b => b.fileId === file.id)) return prev;
        return [...prev, bufferBase];
      });
    }
  }, [location.pathname, files, filesReady]);


  const executeCommand = async (cmd: string) => {
    const cleanCmd = cmd.trim();
    if (cleanCmd === 'q' || cleanCmd === 'q!' || cleanCmd === 'wq') {
      closeBuffer();
    } else if ( cleanCmd === 'qa' || cleanCmd === 'qa!'){
      setBuffers([]);
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
                updateActiveBuffer(prev => {
                  if (!prev) return null;
                  const targetRow = 0;
                  const targetCol = Math.min(prev.cursorCol, (lines[targetRow] || '').length);
                  return { ...prev, cursorRow: targetRow, cursorCol: targetCol };
                });
                return;
              } else if (e.key === 'e') {
                e.preventDefault();
                updateActiveBuffer(prev => {
                  if (!prev) return null;
                  const pos = prevWordEnd(lines, prev.cursorRow, prev.cursorCol);
                  return { ...prev, cursorRow: pos.row, cursorCol: pos.col };
                });
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
                 updateActiveBuffer(prev => {
                   if (!prev) return null;
                   const nextRow = Math.min(lines.length - 1, prev.cursorRow + 1);
                   const nextLineLen = lines[nextRow].length;
                   return {
                     ...prev, 
                     cursorRow: nextRow,
                     cursorCol: Math.min(prev.cursorCol, Math.max(0, nextLineLen - 1))
                   };
                 });
             } else if (e.key === 'k' || e.key === 'ArrowUp') {
                 updateActiveBuffer(prev => {
                   if (!prev) return null;
                   const nextRow = Math.max(0, prev.cursorRow - 1);
                   const nextLineLen = lines[nextRow].length;
                   return {
                     ...prev, 
                     cursorRow: nextRow,
                     cursorCol: Math.min(prev.cursorCol, Math.max(0, nextLineLen - 1))
                   };
                 });
             } else if (e.key === 'l' || e.key === 'ArrowRight') {
                 updateActiveBuffer(prev => {
                   if (!prev) return null;
                   return {
                     ...prev,
                     cursorCol: Math.min(prev.cursorCol + 1, currentLine.length) // Allow going 1 past char for append logic if we were real vim
                   };
                 });
             } else if (e.key === 'h' || e.key === 'ArrowLeft') {
                 updateActiveBuffer(prev => {
                   if (!prev) return null;
                   return {
                     ...prev,
                     cursorCol: Math.max(0, prev.cursorCol - 1)
                   };
                 });
             } else if (e.key === 'v') {
                 setMode(Mode.VISUAL);
                 setVisualAnchor({ row: activeBuffer.cursorRow, col: activeBuffer.cursorCol });
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
                   updateActiveBuffer(prev => prev ? { ...prev, cursorCol: 0 } : prev);
               } else if (e.key === '$') {
                   e.preventDefault();
                   updateActiveBuffer(prev => {
                     if (!prev) return null;
                     return { ...prev, cursorCol: (lines[prev.cursorRow] || '').length };
                   });
               } else if (e.key === 'e') {
                   e.preventDefault();
                   updateActiveBuffer(prev => {
                     if (!prev) return null;
                     const pos = nextWordEnd(lines, prev.cursorRow, prev.cursorCol);
                     return { ...prev, cursorRow: pos.row, cursorCol: pos.col };
                   });
               } else if (e.key === 'G') {
                   e.preventDefault();
                   updateActiveBuffer(prev => {
                     if (!prev) return null;
                     const targetRow = lines.length - 1;
                     const targetCol = Math.min(prev.cursorCol, (lines[targetRow] || '').length);
                     return { ...prev, cursorRow: targetRow, cursorCol: targetCol };
                   });
             } else if (e.key === 'w') {
                 e.preventDefault();
                   updateActiveBuffer(prev => {
                     if (!prev) return null;
                     const pos = nextWord(lines, prev.cursorRow, prev.cursorCol);
                     return { ...prev, cursorRow: pos.row, cursorCol: pos.col };
                   });
             } else if (e.key === 'b') {
                 e.preventDefault();
                   updateActiveBuffer(prev => {
                     if (!prev) return null;
                     const pos = prevWord(lines, prev.cursorRow, prev.cursorCol);
                     return { ...prev, cursorRow: pos.row, cursorCol: pos.col };
                   });
             } else if (e.key === '}') {
                 e.preventDefault();
                   updateActiveBuffer(prev => {
                     if (!prev) return null;
                     const pos = nextParagraph(lines, prev.cursorRow);
                     return { ...prev, cursorRow: pos.row, cursorCol: pos.col };
                   });
             } else if (e.key === '{') {
                 e.preventDefault();
                   updateActiveBuffer(prev => {
                     if (!prev) return null;
                     const pos = prevParagraph(lines, prev.cursorRow);
                     return { ...prev, cursorRow: pos.row, cursorCol: pos.col };
                   });
             }
         }

         // Visual Mode Navigation and Yank
         if (mode === Mode.VISUAL) {
             const lines = activeBuffer.content.split('\n');
             const currentLine = lines[activeBuffer.cursorRow] || '';

             const moveCursor = (newRow: number, newCol: number) => {
               updateActiveBuffer(prev => {
                 if (!prev) return null;
                 return { ...prev, cursorRow: newRow, cursorCol: newCol };
               });
             };

             // resolve pending 'g' combos first
             if (gPendingRef.current) {
               gPendingRef.current = false;
               if (gTimerRef.current) { clearTimeout(gTimerRef.current); gTimerRef.current = null; }
               if (e.key === 'g') {
                 e.preventDefault();
                 updateActiveBuffer(prev => {
                   if (!prev) return null;
                   const targetRow = 0;
                   const targetCol = Math.min(prev.cursorCol, (lines[targetRow] || '').length);
                   return { ...prev, cursorRow: targetRow, cursorCol: targetCol };
                 });
                 return;
               } else if (e.key === 'e') {
                 e.preventDefault();
                 updateActiveBuffer(prev => {
                   if (!prev) return null;
                   const pos = prevWordEnd(lines, prev.cursorRow, prev.cursorCol);
                   return { ...prev, cursorRow: pos.row, cursorCol: pos.col };
                 });
                 return;
               }
               // fallthrough
             }

             if (e.key === 'j' || e.key === 'ArrowDown') {
               e.preventDefault();
               updateActiveBuffer(prev => {
                 if (!prev) return null;
                 const nextRow = Math.min(lines.length - 1, prev.cursorRow + 1);
                 const nextLineLen = lines[nextRow].length;
                 return {
                   ...prev,
                   cursorRow: nextRow,
                   cursorCol: Math.min(prev.cursorCol, Math.max(0, nextLineLen))
                 };
               });
             } else if (e.key === 'k' || e.key === 'ArrowUp') {
               e.preventDefault();
               updateActiveBuffer(prev => {
                 if (!prev) return null;
                 const nextRow = Math.max(0, prev.cursorRow - 1);
                 const nextLineLen = lines[nextRow].length;
                 return {
                   ...prev,
                   cursorRow: nextRow,
                   cursorCol: Math.min(prev.cursorCol, Math.max(0, nextLineLen))
                 };
               });
             } else if (e.key === 'l' || e.key === 'ArrowRight') {
               e.preventDefault();
               updateActiveBuffer(prev => {
                 if (!prev) return null;
                 return { ...prev, cursorCol: Math.min(prev.cursorCol + 1, currentLine.length) };
               });
             } else if (e.key === 'h' || e.key === 'ArrowLeft') {
               e.preventDefault();
               updateActiveBuffer(prev => {
                 if (!prev) return null;
                 return { ...prev, cursorCol: Math.max(0, prev.cursorCol - 1) };
               });
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
              updateActiveBuffer(prev => prev ? { ...prev, cursorCol: 0 } : prev);
            } else if (e.key === '$') {
              e.preventDefault();
              updateActiveBuffer(prev => prev ? { ...prev, cursorCol: (lines[prev.cursorRow] || '').length } : prev);
            } else if (e.key === 'e') {
              e.preventDefault();
              updateActiveBuffer(prev => {
                if (!prev) return null;
                const pos = nextWordEnd(lines, prev.cursorRow, prev.cursorCol);
                return { ...prev, cursorRow: pos.row, cursorCol: pos.col };
              });
            } else if (e.key === 'G') {
              e.preventDefault();
              updateActiveBuffer(prev => {
                if (!prev) return null;
                const targetRow = lines.length - 1;
                const targetCol = Math.min(prev.cursorCol, (lines[targetRow] || '').length);
                return { ...prev, cursorRow: targetRow, cursorCol: targetCol };
              });
            } else if (e.key === 'w') {
              e.preventDefault();
              updateActiveBuffer(prev => {
                if (!prev) return null;
                const pos = nextWord(lines, prev.cursorRow, prev.cursorCol);
                return { ...prev, cursorRow: pos.row, cursorCol: pos.col };
              });
            } else if (e.key === 'b') {
              e.preventDefault();
              updateActiveBuffer(prev => {
                if (!prev) return null;
                const pos = prevWord(lines, prev.cursorRow, prev.cursorCol);
                return { ...prev, cursorRow: pos.row, cursorCol: pos.col };
              });
            } else if (e.key === '}') {
              e.preventDefault();
              updateActiveBuffer(prev => {
                if (!prev) return null;
                const pos = nextParagraph(lines, prev.cursorRow);
                return { ...prev, cursorRow: pos.row, cursorCol: pos.col };
              });
            } else if (e.key === '{') {
              e.preventDefault();
              updateActiveBuffer(prev => {
                if (!prev) return null;
                const pos = prevParagraph(lines, prev.cursorRow);
                return { ...prev, cursorRow: pos.row, cursorCol: pos.col };
              });
             }
         }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [activeFileId, mode, commandBuffer, activeBuffer]);

  // Helper: compute selected text across lines given start/end positions
  const computeSelectionText = (
    content: string,
    start: { row: number; col: number },
    end: { row: number; col: number }
  ) => {
    const lines = content.split('\n');
    const [sRow, sCol] = (start.row < end.row || (start.row === end.row && start.col <= end.col))
      ? [start.row, start.col] : [end.row, end.col];
    const [eRow, eCol] = (start.row < end.row || (start.row === end.row && start.col <= end.col))
      ? [end.row, end.col] : [start.row, start.col];

    if (sRow === eRow) {
      return (lines[sRow] || '').slice(Math.max(0, sCol), Math.max(0, eCol));
    }

    const parts: string[] = [];
    parts.push((lines[sRow] || '').slice(Math.max(0, sCol)));
    for (let r = sRow + 1; r < eRow; r++) {
      parts.push(lines[r] || '');
    }
    parts.push((lines[eRow] || '').slice(0, Math.max(0, eCol)));
    return parts.join('\n');
  };

  // Vim-like motion helpers
  const isWordChar = (ch: string) => /[A-Za-z0-9_]/.test(ch);
  const firstNonWhitespace = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c !== ' ' && c !== '\t') return i;
    }
    return 0;
  };

  const nextWord = (lines: string[], row: number, col: number) => {
    let r = row;
    let c = col;
    const n = lines.length;
    if (r >= n) return { row: n - 1, col: (lines[n - 1] || '').length };
    let line = lines[r] || '';
    if (c >= line.length) { r++; c = 0; }
    while (r < n) {
      line = lines[r] || '';
      let p = c;
      while (p < line.length && isWordChar(line[p])) p++; // finish current word if in one
      while (p < line.length && !isWordChar(line[p])) p++; // skip separators
      if (p < line.length) return { row: r, col: p };
      r++; c = 0; // go to next line
    }
    return { row: n - 1, col: (lines[n - 1] || '').length };
  };

  const prevWord = (lines: string[], row: number, col: number) => {
    let r = row;
    let c = col;
    if (r < 0) return { row: 0, col: 0 };
    if (r >= lines.length) r = lines.length - 1;
    // step back one column to avoid staying on current word start
    if (c > 0) c--; else { r--; if (r < 0) return { row: 0, col: 0 }; c = (lines[r] || '').length - 1; if (c < 0) c = 0; }
    while (r >= 0) {
      const line = lines[r] || '';
      let p = Math.min(c, Math.max(0, line.length - 1));
      while (p >= 0 && !isWordChar(line[p])) p--; // skip separators
      if (p >= 0) {
        while (p > 0 && isWordChar(line[p - 1])) p--; // to word start
        return { row: r, col: Math.max(0, p) };
      }
      r--; if (r < 0) break; c = (lines[r] || '').length - 1;
    }
    return { row: 0, col: 0 };
  };

  const nextParagraph = (lines: string[], row: number) => {
    const n = lines.length;
    let r = Math.min(n, row + 1);
    while (r < n && (lines[r] || '').trim() !== '') r++; // find blank line
    while (r < n && (lines[r] || '').trim() === '') r++; // then next non-blank
    if (r >= n) return { row: n - 1, col: (lines[n - 1] || '').length };
    const line = lines[r] || '';
    return { row: r, col: Math.min(line.length, firstNonWhitespace(line)) };
  };

  const prevParagraph = (lines: string[], row: number) => {
    let r = Math.max(0, row - 1);
    while (r >= 0 && (lines[r] || '').trim() === '') r--; // skip blanks above
    while (r >= 0 && (lines[r] || '').trim() !== '') r--; // go to blank before paragraph
    const target = Math.max(0, r + 1);
    const line = lines[target] || '';
    return { row: target, col: Math.min(line.length, firstNonWhitespace(line)) };
  };

  const nextWordEnd = (lines: string[], row: number, col: number) => {
    let r = row;
    let c = col;
    const n = lines.length;
    if (r >= n) return { row: n - 1, col: (lines[n - 1] || '').length };
    let line = lines[r] || '';
    // move at least one position forward if possible
    if (c < line.length) c++; else { r++; c = 0; }
    while (r < n) {
      line = lines[r] || '';
      let p = c;
      // skip separators to start of next word
      while (p < line.length && !isWordChar(line[p])) p++;
      if (p < line.length) {
        // advance to end of this word
        while (p + 1 < line.length && isWordChar(line[p + 1])) p++;
        return { row: r, col: p };
      }
      r++; c = 0;
    }
    return { row: n - 1, col: (lines[n - 1] || '').length };
  };

  const prevWordEnd = (lines: string[], row: number, col: number) => {
    let r = row;
    let c = col;
    if (r < 0) return { row: 0, col: 0 };
    if (r >= lines.length) r = lines.length - 1;
    // step back one column
    if (c > 0) c--; else { r--; if (r < 0) return { row: 0, col: 0 }; c = (lines[r] || '').length - 1; if (c < 0) c = 0; }
    while (r >= 0) {
      const line = lines[r] || '';
      let p = Math.min(c, Math.max(0, line.length - 1));
      // skip separators
      while (p >= 0 && !isWordChar(line[p])) p--;
      if (p >= 0) {
        // find start of this word
        let start = p;
        while (start > 0 && isWordChar(line[start - 1])) start--;
        // end is p (the last word char found)
        return { row: r, col: p };
      }
      r--; if (r < 0) break; c = (lines[r] || '').length - 1;
    }
    return { row: 0, col: 0 };
  };

  const goLineStart = (lines: string[], row: number) => ({ row, col: 0 });
  const goLineEnd = (lines: string[], row: number) => ({ row, col: (lines[row] || '').length });

  return (
    <div className="flex flex-col h-screen w-screen bg-tokyo-bg text-tokyo-fg overflow-hidden font-mono text-sm">
      
      {/* Top Bar */}
      <div className="h-9 bg-tokyo-bg_dark flex items-center border-b border-tokyo-statusline shrink-0">
         <div className="w-16 flex justify-center items-center bg-tokyo-blue text-tokyo-bg_dark h-full font-bold cursor-pointer" onClick={closeBuffer}>
            <Home size={16} />
         </div>
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
      <div className="flex-1 flex overflow-hidden">
        {showExplorer && (
            <FileExplorer 
              files={files} 
              onFileSelect={openFile} 
              activeFileId={activeFileId}
              toggleFolder={toggleFolder}
            />
        )}

        <div className="flex-1 relative flex flex-col min-w-0 bg-tokyo-bg">
          <Routes>
            <Route path="/" element={<Dashboard onNavigate={openFile} onQuit={() => window.location.href = 'about:blank'} />} />
            <Route path=":page" element={activeBuffer ? (
              <Editor 
                buffer={activeBuffer} 
                isActive={true}
                mode={mode}
                selection={visualAnchor ? { start: visualAnchor, end: { row: activeBuffer.cursorRow, col: activeBuffer.cursorCol } } : null}
                onCursorChange={(row, col) => {
                  updateActiveBuffer(prev => prev ? { ...prev, cursorRow: row, cursorCol: col } : prev);
                }}
                onMouseSelectionChange={(start, end) => {
                  if (start && end) {
                    setMode(Mode.VISUAL);
                    setVisualAnchor(start);
                    updateActiveBuffer(prev => prev ? { ...prev, cursorRow: end.row, cursorCol: end.col } : prev);
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
