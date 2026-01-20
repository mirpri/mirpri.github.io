/// <reference types="vite/client" />
import { FileNode } from '../types';

// Load markdown files lazily under /src
const mdModules = import.meta.glob('/src/**/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;

type PageEntry = {
  slug: string;
  path: string;
  loader: () => Promise<string>;
};

const pageEntries: PageEntry[] = Object.entries(mdModules).map(([path, loader]) => ({
  slug: path.match(/\/src\/(.+)\.md$/)?.[1] || path.replace(/[^a-z0-9]+/gi, '-').toLowerCase(),
  path,
  loader,
}));

const loaderLookup: Record<string, () => Promise<string>> = Object.fromEntries(
  pageEntries.map(entry => [entry.slug, entry.loader])
);

// Convert path to slug (page name)
const toSlug = (path: string) => {
  const match = path.match(/\/src\/(.+)\.md$/);
  if (!match) return path.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return match[1];
};

export const getMarkdownPages = (): FileNode[] => {
  const pages: FileNode[] = pageEntries.map(({ slug, path }) => ({
    id: slug,
    name: `${slug}.md`,
    type: 'file',
    extension: 'md',
    path,
  }));
  return pages.sort((a, b) => a.id.localeCompare(b.id));
};

export const loadMarkdownContent = async (slug: string): Promise<string | null> => {
  const loader = loaderLookup[slug];
  if (!loader) return null;
  const mod = await loader();
  // Vite raw import returns string; default interop if any
  // @ts-ignore
  return typeof mod === 'string' ? mod : (mod?.default ?? null);
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
