'use client';

import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import Editor from '../../components/Editor';
import WorkspaceLayout from '../../components/WorkspaceLayout';
import { useEditorStore } from '../../store';
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
    const {
        activeFileId, setActiveFile, buffers,
        openFile
    } = useEditorStore();

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
        if (activeFileId !== initialFileId) return null;
        return buffers.find(b => b.id === activeFileId) || null;
    }, [buffers, activeFileId, initialFileId]);

    const [showLoading, setShowLoading] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (!activeBuffer) {
            timer = setTimeout(() => {
                setShowLoading(true);
            }, 150); // Show loading after 150ms delay
        } else {
            setShowLoading(false);
        }
        return () => clearTimeout(timer);
    }, [activeBuffer]);

    return (
        <WorkspaceLayout>
            {({ visualAnchor }) => (
                <div className="flex-1 relative flex flex-col min-w-0 bg-tokyo-bg overflow-hidden">
                    {activeBuffer ? (
                        activeBuffer.type === 'tsx' && ComponentMap[activeBuffer.id] ? (
                            <div key={activeBuffer.id} className="flex-1 w-full h-full overflow-auto p-8 custom-scrollbar animate-fade-in">
                                {React.createElement(ComponentMap[activeBuffer.id])}
                            </div>
                        ) : (
                            <div key={activeBuffer.id} className="flex-1 min-h-0 animate-fade-in flex flex-col">
                                <Editor
                                    buffer={activeBuffer}
                                    isActive={true}
                                    selection={visualAnchor ? { start: visualAnchor, end: { row: activeBuffer.cursorRow, col: activeBuffer.cursorCol } } : null}
                                />
                            </div>
                        )
                    ) : (
                        <div className="flex-1 overflow-auto">
                            <div className="p-8 prose prose-invert max-w-none">
                                {showLoading && (
                                    <p className="animate-pulse font-bold text-tokyo-comment">Loading content...</p>
                                )}
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
            )}
        </WorkspaceLayout>
    );
}
