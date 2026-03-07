'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Mode, FileNode, Buffer } from '../../types';
import Editor from '../../components/Editor';
import StatusLine from '../../components/StatusLine';
import FileExplorer from '../../components/FileExplorer';
import TabBar from '../../components/TabBar';
import { X, Home, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { buildExplorerTree, getMarkdownPages, expandFoldersForFile } from '../../services/pagesService';
import { useEditorStore } from '../../store';
import { useRouter } from 'next/navigation';
import {
    nextWord, prevWord, nextWordEnd, prevWordEnd, nextParagraph, prevParagraph,
    computeSelectionText, firstNonWhitespace
} from '../../services/vimService';
import dynamic from 'next/dynamic';

const SnakeGame = dynamic(() => import('../../src/games/snake'));
const TicTacToeGame = dynamic(() => import('../../src/games/tictactoe'));
const WordstrandGame = dynamic(() => import('../../src/games/wordstrand'));
const SpeedDial = dynamic(() => import('../../src/SpeedDial'));

const ComponentMap: Record<string, React.ComponentType<any>> = {
    'games/snake': SnakeGame,
    'games/tictactoe': TicTacToeGame,
    'games/wordstrand': WordstrandGame,
    'SpeedDial': SpeedDial,
};

type WorkspaceWrapperProps = {
    initialContent: string;
    initialFileName: string;
    initialFileId: string;
};

export default function WorkspaceWrapper({ initialContent, initialFileName, initialFileId }: WorkspaceWrapperProps) {
    const router = useRouter();
    const [filesReady, setFilesReady] = useState(false);

    const {
        mode, setMode, activeFileId, setActiveFile, buffers,
        openFile, closeFile, updateBuffer, updateCursor,
        files, setFiles, toggleFolder,
        showExplorer, setShowExplorer,
        commandBuffer, setCommandBuffer,
        notification, setNotification
    } = useEditorStore();

    const [visualAnchor, setVisualAnchor] = useState<{ row: number; col: number } | null>(null);
    const gPendingRef = useRef(false);
    const gTimerRef = useRef<number | null>(null);

    // Initialize store with pre-rendered content from server
    useEffect(() => {
        // Check if buffer already loaded
        const existing = useEditorStore.getState().buffers.find(b => b.id === initialFileId);
        if (!existing) {
            const bufferType = initialFileName.endsWith('.tsx') ? 'tsx' : 'markdown';
            openFile(initialFileId, initialContent, initialFileName, bufferType);
        } else {
            setActiveFile(initialFileId);
        }
    }, [initialFileId, initialContent, initialFileName, openFile, setActiveFile]);

    const activeBuffer = useMemo(() => {
        if (!activeFileId) return null;
        return buffers.find(b => b.id === activeFileId) || null;
    }, [buffers, activeFileId]);

    useEffect(() => {
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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!activeBuffer) return;
            // Ignore if activeBuffer is not markdown (React components usually manage their own inputs)
            if (activeBuffer.type !== 'markdown' && e.key !== 'Escape') {
                return;
            }

            if (mode === Mode.COMMAND) {
                if (e.key === 'Escape') {
                    setMode(Mode.NORMAL);
                    setCommandBuffer('');
                    return;
                }
                if (e.key === 'Enter') {
                    executeCommand(commandBuffer);
                    setMode(Mode.NORMAL);
                    setCommandBuffer('');
                    return;
                }
                if (e.key === 'Backspace') {
                    setCommandBuffer(commandBuffer.slice(0, -1));
                    return;
                }
                if (e.key.length === 1) {
                    setCommandBuffer(commandBuffer + e.key);
                }
                return;
            }

            if (e.key === ':' && mode !== Mode.INSERT) {
                e.preventDefault();
                setMode(Mode.COMMAND);
                setCommandBuffer('');
                return;
            }

            if (mode === Mode.NORMAL || mode === Mode.VISUAL) {
                const lines = activeBuffer.content.split('\n');
                let { cursorRow, cursorCol } = activeBuffer;
                const currentLineLength = (lines[cursorRow] || '').length;

                switch (e.key) {
                    case 'h':
                    case 'ArrowLeft':
                        cursorCol = Math.max(0, cursorCol - 1);
                        break;
                    case 'l':
                    case 'ArrowRight':
                        cursorCol = Math.min(Math.max(0, currentLineLength - 1), cursorCol + 1);
                        break;
                    case 'j':
                    case 'ArrowDown':
                        cursorRow = Math.min(lines.length - 1, cursorRow + 1);
                        cursorCol = Math.min(cursorCol, Math.max(0, (lines[cursorRow] || '').length - 1));
                        break;
                    case 'k':
                    case 'ArrowUp':
                        cursorRow = Math.max(0, cursorRow - 1);
                        cursorCol = Math.min(cursorCol, Math.max(0, (lines[cursorRow] || '').length - 1));
                        break;
                    case 'w': {
                        const next = nextWord(lines, cursorRow, cursorCol);
                        cursorRow = next.row; cursorCol = next.col;
                        break;
                    }
                    case 'b': {
                        const prev = prevWord(lines, cursorRow, cursorCol);
                        cursorRow = prev.row; cursorCol = prev.col;
                        break;
                    }
                    case 'e': {
                        const nEnd = nextWordEnd(lines, cursorRow, cursorCol);
                        cursorRow = nEnd.row; cursorCol = nEnd.col;
                        break;
                    }
                    case '0':
                        cursorCol = 0;
                        break;
                    case '$':
                        cursorCol = Math.max(0, (lines[cursorRow] || '').length - 1);
                        break;
                    case 'g':
                        if (gPendingRef.current) {
                            cursorRow = 0; cursorCol = 0;
                            gPendingRef.current = false;
                            if (gTimerRef.current) clearTimeout(gTimerRef.current);
                        } else {
                            gPendingRef.current = true;
                            gTimerRef.current = window.setTimeout(() => { gPendingRef.current = false; }, 1000);
                        }
                        break;
                    case 'G':
                        cursorRow = lines.length - 1;
                        cursorCol = 0;
                        break;
                    case 'v':
                        if (mode === Mode.NORMAL) {
                            setMode(Mode.VISUAL);
                            setVisualAnchor({ row: cursorRow, col: cursorCol });
                        } else {
                            setMode(Mode.NORMAL);
                            setVisualAnchor(null);
                        }
                        break;
                    case 'Escape':
                        if (mode === Mode.VISUAL) {
                            setMode(Mode.NORMAL);
                            setVisualAnchor(null);
                        } else if (activeBuffer.type !== 'markdown') {
                            // If user hits Escape on a React Component like SpeedDial, close it
                            closeBuffer();
                        }
                        break;
                }

                if (cursorRow !== activeBuffer.cursorRow || cursorCol !== activeBuffer.cursorCol) {
                    updateCursor(activeFileId!, cursorRow, cursorCol);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeBuffer, activeFileId, mode, commandBuffer, setMode, updateCursor, closeBuffer]);
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

                <div className="flex-1 relative flex flex-col min-w-0 bg-tokyo-bg overflow-hidden">
                    {activeBuffer ? (
                        activeBuffer.type === 'tsx' && ComponentMap[activeBuffer.id] ? (
                            <div className="flex-1 w-full h-full overflow-auto p-8">
                                {React.createElement(ComponentMap[activeBuffer.id])}
                            </div>
                        ) : (
                            <Editor
                                buffer={activeBuffer}
                                isActive={true}
                                selection={visualAnchor ? { start: visualAnchor, end: { row: activeBuffer.cursorRow, col: activeBuffer.cursorCol } } : null}
                            />
                        )
                    ) : (
                        <div className="flex-1 overflow-auto">
                            <div className="p-8 prose prose-invert max-w-none">
                                <p className="animate-pulse">Loading Editor...</p>
                                <div className='hidden'>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeRaw]}
                                    >
                                        {initialContent}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    )}
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
