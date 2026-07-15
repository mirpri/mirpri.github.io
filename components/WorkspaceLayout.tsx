'use client';

import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEditorStore } from '../store';
import { Mode, FileNode } from '../types';
import FileExplorer from './FileExplorer';
import TabBar from './TabBar';
import StatusLine from './StatusLine';
import { Home, PanelLeftOpen, PanelLeftClose, X } from 'lucide-react';
import { buildExplorerTree, expandFoldersForFile } from '../services/pagesService';
import { useVimKeybindings } from '../hooks/useVimKeybindings';

type WorkspaceLayoutProps = {
    children: (props: { visualAnchor: { row: number; col: number } | null }) => ReactNode;
};

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
    const router = useRouter();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [filesReady, setFilesReady] = useState(false);

    const {
        mode, setMode,
        activeFileId, buffers,
        files, setFiles, toggleFolder,
        showExplorer, setShowExplorer,
        commandBuffer, setCommandBuffer,
        notification, setNotification,
        closeFile
    } = useEditorStore();

    const activeBuffer = useMemo(() => {
        if (!activeFileId) return null;
        return buffers.find(b => b.id === activeFileId) || null;
    }, [buffers, activeFileId]);

    // Handle initial file tree
    useEffect(() => {
        // If files are empty, build tree
        if (files.length === 0) {
            const tree = buildExplorerTree();
            if (activeFileId) expandFoldersForFile(tree, activeFileId);
            setFiles(tree);
        } else if (activeFileId) {
             // If activeFileId changes, ensure folder is expanded
             // optimization: only if not already expanded?
             // for now, just ensure it's expanded in the store
             // we need to mutate a copy
            const tree = JSON.parse(JSON.stringify(files));
            expandFoldersForFile(tree, activeFileId);
            setFiles(tree);
        }
        setFilesReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFileId]);

    // Window resize handler
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setShowExplorer(window.innerWidth >= 768);
        }
    }, [setShowExplorer]);

    // Title handler
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

    const closeTab = (id: string | null) => {
        if (id) {
            closeFile(id);
            if (activeFileId === id) {
                setMode(Mode.NORMAL);
                router.push('/');
            }
        }
    };

    // Command Execution Logic
    const closeBuffer = () => {
        setMode(Mode.NORMAL);
        setCommandBuffer('');
        closeTab(activeFileId);
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

    // Use Keybindings Hook
    const { visualAnchor, setVisualAnchor } = useVimKeybindings({
        activeBuffer,
        activeFileId,
        showExplorer,
        setShowExplorer,
        executeCommand,
        closeBuffer
    });

    // Reset visual anchor on file change
     useEffect(() => {
        setVisualAnchor(null);
        setMode(Mode.NORMAL);
    }, [activeFileId, setMode, setVisualAnchor]);

    return (
        <div className="flex flex-col h-screen w-screen relative">
             {/* Header */}
            <div className="h-9 bg-tokyo-bg_dark flex items-center border-b border-tokyo-statusline shrink-0 text-sm">
                <Link className="w-16 flex justify-center items-center bg-tokyo-blue text-tokyo-bg_dark h-full font-bold cursor-pointer" href={"/"}>
                    <Home size={16} />
                </Link>
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
                {/* Desktop Sidebar */}
                <div className="hidden md:block h-full overflow-hidden transition-all duration-300 ease-out" style={{ width: showExplorer ? '15rem' : '0rem' }}>
                    <div className={`h-full transition-transform duration-300 ease-out ${showExplorer ? 'translate-x-0' : '-translate-x-full'}`}>
                        <FileExplorer className="w-60" files={files} onFileSelect={navigateToFile} activeFileId={activeFileId} toggleFolder={toggleFolder} />
                    </div>
                </div>

                {/* Mobile Sidebar Overlay */}
                <div className={`md:hidden fixed inset-0 z-40 ${showExplorer ? '' : 'pointer-events-none'}`}>
                    {/* Backdrop */}
                    <div
                        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out ${showExplorer ? 'opacity-100' : 'opacity-0'}`}
                        onClick={() => setShowExplorer(false)}
                    />
                    {/* Sliding panel */}
                    <div
                        className={`absolute inset-y-0 left-0 w-64 max-w-[80%] h-full bg-tokyo-bg_dark border-r border-tokyo-statusline shadow-xl transition-transform duration-300 ease-out will-change-transform ${showExplorer ? 'translate-x-0' : '-translate-x-full'}`}
                    >
                        <div className="flex items-center justify-between px-3 py-2 border-b border-tokyo-statusline text-tokyo-fg">
                            <span className="text-xs uppercase tracking-wide text-tokyo-comment">Explorer</span>
                            <button onClick={() => setShowExplorer(false)} className="text-tokyo-comment hover:text-tokyo-fg"><X size={14} /></button>
                        </div>
                        <FileExplorer className="w-full" files={files} onFileSelect={(id) => { navigateToFile(id); setShowExplorer(false); }} activeFileId={activeFileId} toggleFolder={toggleFolder} />
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 relative flex flex-col min-w-0 bg-tokyo-bg overflow-hidden">
                     {children({ visualAnchor })}
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

            {/* Command Line / Notification */}
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
