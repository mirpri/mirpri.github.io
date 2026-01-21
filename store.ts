import { create } from 'zustand';
import { Mode, Buffer } from './types';

interface EditorState {
  mode: Mode;
  buffers: Buffer[];
  activeFileId: string | null;

  // Actions
  setMode: (mode: Mode) => void;
  openFile: (fileId: string, content: string, name: string) => void;
  closeFile: (fileId: string) => void;
  setActiveFile: (fileId: string | null) => void;
  updateBuffer: (fileId: string, content: string) => void;
  updateCursor: (fileId: string, row: number, col: number) => void;
  updateScroll: (fileId: string, offset: number) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  mode: Mode.NORMAL,
  buffers: [],
  activeFileId: null,

  setMode: (mode) => set({ mode }),

  openFile: (fileId, content, name) => 
    set((state) => {
      // Check if buffer already exists
      const existingBuffer = state.buffers.find(b => b.id === fileId);
      if (existingBuffer) {
        return { activeFileId: fileId };
      }

      // Create new buffer
      const newBuffer: Buffer = {
        id: fileId,
        fileId: fileId,
        title: name,
        content,
        cursorRow: 0,
        cursorCol: 0,
        scrollOffset: 0,
        isDirty: false,
        readOnly: true, // Markdown pages are readonly by default
        type: 'markdown',
      };

      return {
        buffers: [...state.buffers, newBuffer],
        activeFileId: fileId,
      };
    }),

  closeFile: (fileId) =>
    set((state) => {
      const newBuffers = state.buffers.filter(b => b.id !== fileId);
      let newActiveId = state.activeFileId;

      // If we closed the active file, switch to another one
      if (state.activeFileId === fileId) {
        newActiveId = newBuffers.length > 0 ? newBuffers[newBuffers.length - 1].id : null;
      }

      return {
        buffers: newBuffers,
        activeFileId: newActiveId,
      };
    }),

  setActiveFile: (fileId) => set({ activeFileId: fileId }),

  updateBuffer: (fileId, content) =>
    set((state) => ({
      buffers: state.buffers.map(b => 
        b.id === fileId ? { ...b, content, isDirty: true } : b
      ),
    })),
    
  updateCursor: (fileId, row, col) =>
    set((state) => ({
        buffers: state.buffers.map(b =>
            b.id === fileId ? { ...b, cursorRow: row, cursorCol: col } : b
        )
    })),

  updateScroll: (fileId, offset) =>
      set((state) => ({
          buffers: state.buffers.map(b => 
              b.id === fileId ? { ...b, scrollOffset: offset } : b
          )
      })),
}));
