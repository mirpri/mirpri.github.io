'use client';

import React, { useState, useEffect, useMemo, Suspense, useRef, use } from 'react';
import { Mode, FileNode, Buffer } from '../types';
import Dashboard from '../components/Dashboard';
import Editor from '../components/Editor';
import StatusLine from '../components/StatusLine';
import FileExplorer from '../components/FileExplorer';
import TabBar from '../components/TabBar';
import { X, Home, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { buildExplorerTree, getMarkdownPages, expandFoldersForFile } from '../services/pagesService';
import { useEditorStore } from '../store';
import { useRouter, usePathname } from 'next/navigation';
import {
    nextWord, prevWord, nextWordEnd, prevWordEnd, nextParagraph, prevParagraph,
    computeSelectionText, firstNonWhitespace
} from '../services/vimService';

export default function Page() {
    const router = useRouter();
    const [filesReady, setFilesReady] = useState(false);

    const {
        mode, setMode, activeFileId, setActiveFile, buffers,
        openFile, closeFile, updateBuffer, updateCursor,
        loadTime, setLoadTime,
        files, setFiles, toggleFolder,
        showExplorer, setShowExplorer,
        commandBuffer, setCommandBuffer,
        notification, setNotification
    } = useEditorStore();

    useEffect(() => {
        if (!loadTime) {
            if (typeof performance === 'undefined' || !performance.timing) return;
            const time = Date.now() - performance.timing.navigationStart;
            setLoadTime(time);
        }
    }, [loadTime, setLoadTime]);

    const [visualAnchor, setVisualAnchor] = useState<{ row: number; col: number } | null>(null);
    const gPendingRef = useRef(false);
    const gTimerRef = useRef<number | null>(null);

    const activeBuffer = useMemo(() => {
        if (!activeFileId) return null;
        return buffers.find(b => b.id === activeFileId) || null;
    }, [buffers, activeFileId]);

    useEffect(() => {
        // Only access window during mount
        if (typeof window !== 'undefined') {
            setShowExplorer(window.innerWidth >= 768);
        }
    }, [setShowExplorer]);

    useEffect(() => {
        if (files.length === 0) {
            const tree = buildExplorerTree();
            if (activeFileId) expandFoldersForFile(tree, activeFileId);
            setFiles(tree);
        } else if (activeFileId) {
            const tree = JSON.parse(JSON.stringify(files));
            expandFoldersForFile(tree, activeFileId);
            setFiles(tree);
        }
        setFilesReady(true);
    }, [activeFileId]);

    useEffect(() => {
        if (activeBuffer) {
            document.title = `Mirpri - ${activeBuffer.title}`;
        } else {
            document.title = 'Mirpri👋';
        }
    }, [activeBuffer]);

    useEffect(() => {
        setVisualAnchor(null);
        setMode(Mode.NORMAL);
    }, [activeFileId, setMode]);

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

    const navigateToFile = (id: string) => {
        const file = findFile(files, id);
        if (!file || file.type === 'folder') return;
        router.push(`/${id}`);
    };

    const closeBuffer = () => {
        setMode(Mode.NORMAL);
        setCommandBuffer('');
        setVisualAnchor(null);
        closeTab(activeFileId);
    };

    const closeTab = (id: string | null) => {
        if (id) {
            closeFile(id);
            if (activeFileId === id) {
                setVisualAnchor(null);
                setMode(Mode.NORMAL);
                router.push('/');
            }
        }
    };

    const executeCommand = async (cmd: string) => {
        const cleanCmd = cmd.trim();
        if (cleanCmd === 'q' || cleanCmd === 'q!' || cleanCmd === 'wq') {
            closeBuffer();
        } else if (cleanCmd === 'qa' || cleanCmd === 'qa!') {
            buffers.forEach(b => closeFile(b.id));
            router.push('/');
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

    // Keyboard events from old App.tsx
    useEffect(() => {
        const handleGlobalKeys = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                if (e.key === 'Escape') {
                    (e.target as HTMLElement).blur();
                    setMode(Mode.NORMAL);
                }
                return;
            }

            if (mode === Mode.COMMAND) {
                e.preventDefault();
                if (e.key === 'Enter') {
                    executeCommand(commandBuffer);
                    setMode(Mode.NORMAL);
                    setCommandBuffer('');
                } else if (e.key === 'Backspace') {
                    setCommandBuffer(commandBuffer.slice(0, -1));
                    if (commandBuffer.length === 0) {
                        setMode(Mode.NORMAL);
                    }
                } else if (e.key === 'Escape') {
                    setMode(Mode.NORMAL);
                    setCommandBuffer('');
                } else if (e.key.length === 1) {
                    setCommandBuffer(commandBuffer + e.key);
                }
                return;
            }

            if (e.key === 'e' && e.altKey) {
                e.preventDefault();
                setShowExplorer(!showExplorer);
                return;
            }

            if (activeFileId && activeBuffer) {
                if (e.key === 'Escape') {
                    setMode(Mode.NORMAL);
                    setCommandBuffer('');
                    setVisualAnchor(null);
                }

                const lines = activeBuffer.content.split('\\n');
                const currentLine = lines[activeBuffer.cursorRow] || '';

                const snapCol = (line: string, col: number) => {
                    if (col > 0 && col < line.length) {
                        const c = line.charCodeAt(col);
                        if (c >= 0xDC00 && c <= 0xDFFF) return col - 1;
                    }
                    return col;
                };

                const charLenAt = (str: string, i: number) => {
                    const c = str.charCodeAt(i);
                    return (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) ? 2 : 1;
                };

                if (mode === Mode.NORMAL) {
                    if (gPendingRef.current) {
                        gPendingRef.current = false;
                        if (gTimerRef.current) { clearTimeout(gTimerRef.current); gTimerRef.current = null; }
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
                    }
                    if (e.key === ':') {
                        setMode(Mode.COMMAND);
                        return;
                    }

                    if (e.key === 'j' || e.key === 'ArrowDown') {
                        if (activeBuffer) {
                            const nextRow = Math.min(lines.length - 1, activeBuffer.cursorRow + 1);
                            updateCursor(activeBuffer.id, nextRow, snapCol(lines[nextRow], Math.min(activeBuffer.cursorCol, Math.max(0, lines[nextRow].length - 1))));
                        }
                    } else if (e.key === 'k' || e.key === 'ArrowUp') {
                        if (activeBuffer) {
                            const nextRow = Math.max(0, activeBuffer.cursorRow - 1);
                            updateCursor(activeBuffer.id, nextRow, snapCol(lines[nextRow], Math.min(activeBuffer.cursorCol, Math.max(0, lines[nextRow].length - 1))));
                        }
                    } else if (e.key === 'l' || e.key === 'ArrowRight') {
                        if (activeBuffer) {
                            const step = charLenAt(currentLine, activeBuffer.cursorCol);
                            updateCursor(activeBuffer.id, activeBuffer.cursorRow, Math.min(activeBuffer.cursorCol + step, currentLine.length));
                        }
                    } else if (e.key === 'h' || e.key === 'ArrowLeft') {
                        if (activeBuffer) {
                            const prev = activeBuffer.cursorCol - 1;
                            const col = (prev > 0 && currentLine.charCodeAt(prev) >= 0xDC00 && currentLine.charCodeAt(prev) <= 0xDFFF) ? prev - 1 : prev;
                            updateCursor(activeBuffer.id, activeBuffer.cursorRow, Math.max(0, col));
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
                    } else if (e.key === 'y') {
                        e.preventDefault();
                        if (currentLine !== undefined) {
                            navigator.clipboard.writeText(currentLine).then(() => {
                                setNotification('Line yanked to clipboard');
                                setTimeout(() => setNotification(null), 1500);
                            });
                        }
                    } else if (e.key === 'G') {
                        e.preventDefault();
                        if (activeBuffer) {
                            const targetRow = lines.length - 1;
                            updateCursor(activeBuffer.id, targetRow, Math.min(activeBuffer.cursorCol, (lines[targetRow] || '').length));
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
                    }
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeys);
        return () => window.removeEventListener('keydown', handleGlobalKeys);
    }, [activeFileId, mode, commandBuffer, activeBuffer]);

    return (
        <div className="flex flex-col h-screen w-screen relative">
            <div className="h-9 bg-tokyo-bg_dark flex items-center border-b border-tokyo-statusline shrink-0 text-sm">
                <div className="w-16 flex justify-center items-center bg-tokyo-blue text-tokyo-bg_dark h-full font-bold cursor-pointer" onClick={() => router.push('/')}>
                    <Home size={16} />
                </div>
                <button
                    className="h-full px-3 flex items-center border-r border-tokyo-statusline text-tokyo-comment hover:text-tokyo-fg"
                    onClick={() => setShowExplorer(!showExplorer)}
                >
                    {showExplorer ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                </button>
                <TabBar
                    buffers={buffers}
                    activeFileId={activeFileId}
                    onSelect={(fileId) => router.push(`/${fileId}`)}
                    onClose={closeTab}
                />
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                <div className="hidden md:block h-full overflow-hidden transition-all duration-300 ease-out" style={{ width: showExplorer ? '15rem' : '0rem' }}>
                    <div className={`h-full transition-transform duration-300 ease-out ${showExplorer ? 'translate-x-0' : '-translate-x-full'}`}>
                        <FileExplorer className="w-60" files={files} onFileSelect={navigateToFile} activeFileId={activeFileId} toggleFolder={toggleFolder} />
                    </div>
                </div>

                {showExplorer && (
                    <div className="md:hidden fixed inset-0 z-40 flex">
                        <div className="w-64 max-w-[80%] h-full bg-tokyo-bg_dark border-r border-tokyo-statusline shadow-xl">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-tokyo-statusline text-tokyo-fg">
                                <span className="text-xs uppercase tracking-wide text-tokyo-comment">Explorer</span>
                                <button onClick={() => setShowExplorer(false)} className="text-tokyo-comment hover:text-tokyo-fg"><X size={14} /></button>
                            </div>
                            <FileExplorer className="w-full" files={files} onFileSelect={(id) => { navigateToFile(id); setShowExplorer(false); }} activeFileId={activeFileId} toggleFolder={toggleFolder} />
                        </div>
                        <div className="flex-1 bg-black/40" onClick={() => setShowExplorer(false)}></div>
                    </div>
                )}

                <div className="flex-1 relative flex flex-col min-w-0 bg-tokyo-bg">
                    <Dashboard onNavigate={navigateToFile} onQuit={() => window.location.href = 'about:blank'} loadTime={loadTime} />
                </div>
            </div>

            <StatusLine
                mode={mode}
                file={activeBuffer?.title}
                cursorRow={activeBuffer?.cursorRow || 0}
                cursorCol={activeBuffer?.cursorCol || 0}
                fileType={activeBuffer?.type || 'N/A'}
                totalLines={activeBuffer ? activeBuffer.content.split('\\n').length : 1}
            />

            <div className="h-8 bg-tokyo-bg text-tokyo-fg flex items-center px-2 border-t border-tokyo-statusline shrink-0">
                {mode === Mode.COMMAND ? (
                    <div className="flex items-center w-full">
                        <span className="font-bold mr-1">:</span>
                        <span className="text-tokyo-fg">{commandBuffer}</span>
                        <span className="w-2 h-4 bg-tokyo-fg ml-0.5 animate-pulse"></span>
                    </div>
                ) : notification ? (
                    <span className="text-tokyo-red font-bold">{notification}</span>
                ) : (
                    <span className="text-tokyo-comment">{activeBuffer ? 'Try vim commands!' : 'Welcome to My Home Page! © 2026 Mirpri'}</span>
                )}
            </div>
        </div>
    );
}
