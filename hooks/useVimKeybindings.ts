import { useEffect, useRef, useState } from 'react';
import { Mode, Buffer } from '../types';
import { useEditorStore } from '../store';
import {
    nextWord, prevWord, nextWordEnd,
    computeSelectionText
} from '../services/vimService';

type UseVimKeybindingsProps = {
    activeBuffer: Buffer | null;
    activeFileId: string | null;
    showExplorer: boolean;
    setShowExplorer: (show: boolean) => void;
    executeCommand: (cmd: string) => void;
    closeBuffer: () => void;
};

export function useVimKeybindings({
    activeBuffer,
    activeFileId,
    showExplorer,
    setShowExplorer,
    executeCommand,
    closeBuffer
}: UseVimKeybindingsProps) {
    const {
        mode, setMode,
        commandBuffer, setCommandBuffer,
        updateCursor,
        setNotification
    } = useEditorStore();

    const [visualAnchor, setVisualAnchor] = useState<{ row: number; col: number } | null>(null);
    const gPendingRef = useRef(false);
    const gTimerRef = useRef<number | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                if (e.key === 'Escape') {
                    (e.target as HTMLElement).blur();
                    setMode(Mode.NORMAL);
                }
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
                    if (commandBuffer.length === 0) {
                        // Optional: exit command mode if empty?
                        // setMode(Mode.NORMAL); 
                        // VSCode vim doesn't exit on backspace, but let's see legacy behavior
                    }
                    return;
                }
                if (e.key.length === 1) {
                    setCommandBuffer(commandBuffer + e.key);
                }
                return;
            }

            // Global shortcut for explorer
            if (e.key === 'e' && e.altKey) {
                e.preventDefault();
                setShowExplorer(!showExplorer);
                return;
            }

            // If no active buffer, we might not want to do much vim stuff
            if (!activeBuffer || !activeFileId) return;

             // Ignore if activeBuffer is not markdown (React components usually manage their own inputs)
             // except Escape which should unfocus/close
             if (activeBuffer.type !== 'markdown' && e.key !== 'Escape') {
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

                // Helper for unicode
                const charLenAt = (str: string, i: number) => {
                    const c = str.charCodeAt(i);
                    return (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) ? 2 : 1;
                };

                const snapCol = (line: string, col: number) => {
                   // Simplified snap logic
                   return Math.min(col, Math.max(0, line.length - 1));
                };

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
                            if (gTimerRef.current) { clearTimeout(gTimerRef.current); gTimerRef.current = null; }
                        } else {
                            gPendingRef.current = true;
                            gTimerRef.current = window.setTimeout(() => { gPendingRef.current = false; }, 1000);
                        }
                        break;
                    case 'G':
                        cursorRow = lines.length - 1;
                        cursorCol = 0;
                        break;
                    case 'y':
                         if (cursorRow >= 0 && lines[cursorRow] !== undefined) {
                            navigator.clipboard.writeText(lines[cursorRow]).then(() => {
                                setNotification('Line yanked to clipboard');
                                setTimeout(() => setNotification(null), 1500);
                            });
                        }
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
    }, [activeBuffer, activeFileId, mode, commandBuffer, setMode, updateCursor, closeBuffer, showExplorer, setShowExplorer, executeCommand]); // Added dependencies

    return { visualAnchor, setVisualAnchor };
}
