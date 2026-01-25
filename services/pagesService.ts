/// <reference types="vite/client" />
import { FileNode } from '../types';

// Load markdown and tsx files lazily under /src
const pageModules = import.meta.glob('/src/**/*.{md,tsx}', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const componentModules = import.meta.glob('/src/**/*.tsx') as Record<string, () => Promise<any>>;
// Preload image assets so markdown-local references can be resolved at runtime
const assetModules = import.meta.glob('/src/**/*.{png,jpg,jpeg,gif,svg,webp,avif}', { eager: true, as: 'url' }) as Record<string, string>;

const normalizePath = (input: string) => input.replace(/\\/g, '/');

type PageEntry = {
  slug: string;
  path: string;
  extension: string;
  loader: () => Promise<string>;
};

const pageEntries: PageEntry[] = Object.entries(pageModules).map(([path, loader]) => {
  const match = path.match(/\/src\/(.+)\.(md|tsx)$/);
  const slug = match?.[1] || path.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const extension = match?.[2] || 'md';
  return {
    slug,
    path,
    extension,
    loader,
  };
});

const loaderLookup: Record<string, () => Promise<string>> = Object.fromEntries(
  pageEntries.map(entry => [entry.slug, entry.loader])
);
const pagePathLookup: Record<string, string> = Object.fromEntries(
  pageEntries.map(entry => [entry.slug, entry.path])
);

// Convert path to slug (page name)
const toSlug = (path: string) => {
  const match = path.match(/\/src\/(.+)\.(md|tsx)$/);
  if (!match) return path.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return match[1];
};

export const getMarkdownPages = (): FileNode[] => {
  const rootChildren: FileNode[] = [];

  pageEntries.forEach(({ slug, path, extension }) => {
    const parts = slug.split('/');
    const fileName = parts.pop();
    if (!fileName) return;

    let currentLevel = rootChildren;
    let currentIdPath = '';

    parts.forEach((part) => {
      currentIdPath = currentIdPath ? `${currentIdPath}/${part}` : part;
      let folderId = currentIdPath + '/';
      let folder = currentLevel.find(n => n.id === folderId && n.type === 'folder');
      if (!folder) {
        folder = {
          id: folderId,
          name: part,
          type: 'folder',
          isOpen: false,
          children: []
        };
        currentLevel.push(folder);
      }
      currentLevel = folder.children!;
    });

    const fileNode: FileNode = {
      id: slug,
      name: `${fileName}.${extension}`,
      type: 'file',
      extension: extension,
      path,
    };
    currentLevel.push(fileNode);
  });

  const sortNodes = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => {
      if (n.children) sortNodes(n.children);
    });
  };

  sortNodes(rootChildren);
  return rootChildren;
};

export const loadMarkdownContent = async (slug: string): Promise<string | null> => {
  const loader = loaderLookup[slug];
  if (!loader) return null;
  const mod = await loader();
  // Vite raw import returns string; default interop if any
  // @ts-ignore
  return typeof mod === 'string' ? mod : (mod?.default ?? null);
};

export const getPageLoader = (slug: string): (() => Promise<any>) | null => {
   const path = pagePathLookup[slug];
   if (!path) return null;
   return componentModules[path] || null;
};

export const getPagePath = (slug: string): string | undefined => pagePathLookup[slug];

export const resolveMarkdownAsset = (src: string, fromPath?: string): string => {
  if (!src) return src;
  const lowered = src.toLowerCase();
  if (lowered.startsWith('http://') || lowered.startsWith('https://') || lowered.startsWith('data:') || lowered.startsWith('blob:')) {
    return src;
  }

  // Build an absolute path rooted at /src so we can look up the bundled asset URL
  let absolutePath: string;
  if (src.startsWith('/')) {
    absolutePath = normalizePath(`/src${src}`);
  } else {
    const base = fromPath ? `file://${normalizePath(fromPath)}` : 'file:///src/index.md';
    absolutePath = normalizePath(new URL(src, base).pathname);
  }

  return assetModules[absolutePath] || src;
};

export const buildExplorerTree = (extraNodes: FileNode[] = []): FileNode[] => {
  const children: FileNode[] = [
    {
      id: 'src',
      name: 'src',
      type: 'folder',
      isOpen: true,
      children: getMarkdownPages(),
    },
    ...extraNodes,
  ];
  return [
    {
      id: 'root',
      name: 'portfolio',
      type: 'folder',
      isOpen: true,
      children,
    },
  ];
};
