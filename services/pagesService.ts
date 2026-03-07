import { FileNode } from '../types';

// For Next.js client-side, we can't use node `fs` or Vite `import.meta.glob`.
// Since the structure of this site is mostly static (skills.md, projects/*.md),
// we will hardcode the explorer tree structure here representing the available markdown pages.
// In a full-stack Next.js app, this might be an API route, but for a static export, a hardcoded tree is easiest.

const staticExplorerTree: FileNode[] = [
  {
    id: 'src',
    name: 'src',
    type: 'folder' as const,
    isOpen: true,
    children: [
      { id: 'about', name: 'about.md', type: 'file' as const, extension: 'md', path: '/src/about.md' },
      { id: 'learning', name: 'learning.md', type: 'file' as const, extension: 'md', path: '/src/learning.md' },
      { id: 'skills', name: 'skills.md', type: 'file' as const, extension: 'md', path: '/src/skills.md' },
      { id: 'works', name: 'works.md', type: 'file' as const, extension: 'md', path: '/src/works.md' },
      { id: 'SpeedDial', name: 'SpeedDial.tsx', type: 'file' as const, extension: 'tsx', path: '/src/SpeedDial.tsx' },
      {
        id: 'games',
        name: 'games',
        type: 'folder' as const,
        isOpen: false,
        children: [
          { id: 'games/snake', name: 'snake.tsx', type: 'file' as const, extension: 'tsx', path: '/src/games/snake.tsx' },
          { id: 'games/tictactoe', name: 'tictactoe.tsx', type: 'file' as const, extension: 'tsx', path: '/src/games/tictactoe.tsx' },
          { id: 'games/wordstrand', name: 'wordstrand.tsx', type: 'file' as const, extension: 'tsx', path: '/src/games/wordstrand.tsx' },
        ]
      }
    ]
  }
];

export const getMarkdownPages = (): FileNode[] => {
  return staticExplorerTree[0].children as FileNode[];
};

export const buildExplorerTree = (extraNodes: FileNode[] = []): FileNode[] => {
  const tree = JSON.parse(JSON.stringify(staticExplorerTree)); // Deep clone
  if (extraNodes.length > 0) {
    tree[0].children.push(...extraNodes);
  }
  return tree;
};

export const expandFoldersForFile = (nodes: FileNode[], fileId: string | null): FileNode[] => {
  if (!fileId) return nodes;

  const findAndExpand = (items: FileNode[]): boolean => {
      let found = false;
      items.forEach(node => {
          if (node.id === fileId) {
              found = true;
          }
          if (node.children) {
              if (findAndExpand(node.children)) {
                  node.isOpen = true;
                  found = true;
              }
          }
      });
      return found;
  };
  
  findAndExpand(nodes);
  return nodes;
};

// Next.js handles loading the content via server-side fs in the [...slug]/page.tsx
// This function is kept for type compatibility if client-side fallback is ever needed.
export const loadMarkdownContent = async (slug: string): Promise<string | null> => {
  try {
    const res = await fetch(`/${slug}.md`); // Fallback fetch if trying to client-load
    if (res.ok) return await res.text();
    return null;
  } catch (e) {
    return null;
  }
};

export const getPageLoader = (slug: string): (() => Promise<any>) | null => {
  return null;
};

export const getPagePath = (slug: string): string | undefined => undefined;

export const resolveMarkdownAsset = (src: string, fromPath?: string): string => {
  return src;
};
