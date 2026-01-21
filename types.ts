export enum Mode {
  NORMAL = 'NORMAL',
  INSERT = 'INSERT',
  VISUAL = 'VISUAL',
  COMMAND = 'COMMAND'
}

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string; // For simple text files
  component?: string; // For special components like "Works" or "Skills"
  children?: FileNode[];
  isOpen?: boolean; // For folders
  extension?: string;
  icon?: string;
  path?: string; // Source path for lazy loading
}

export interface Buffer {
  id: string;
  fileId: string;
  title: string;
  content: string;
  readOnly?: boolean;
  cursorRow: number;
  cursorCol: number;
  scrollOffset: number;
  isDirty: boolean;
  type: 'markdown' | 'typescript' | 'json' | 'dashboard' | 'chat';
}

export interface ThemeColor {
  name: string;
  hex: string;
}
