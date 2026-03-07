import fs from 'fs';
import path from 'path';
import WorkspaceWrapper from './WorkspaceWrapper';

import { getMarkdownPages } from '../../services/pagesService';
import { FileNode } from '../../types';

export const dynamicParams = false;

// 1. Tell Next.js which routes to pre-render at build time
export async function generateStaticParams() {
    const pages = getMarkdownPages();
    const files: { slug: string[] }[] = [];

    const walkNodes = (nodes: FileNode[]) => {
        nodes.forEach(node => {
            if (node.type === 'file') {
                const slugSegments = node.id.split('/').filter(Boolean);
                files.push({ slug: slugSegments });
            } else if (node.children) {
                walkNodes(node.children);
            }
        });
    };

    walkNodes(pages);

    // Explicitly add system paths that Next.js client router might request to avoid "missing param" crash
    files.push({ slug: ['chat'] });
    files.push({ slug: ['favicon.ico'] });
    files.push({ slug: ['.well-known', 'appspecific', 'com.chrome.devtools.json'] });

    return files;
}

// 2. Fetch data (the markdown content) for the currently requested layout
export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
    const resolvedParams = await params;
    const slugArray = resolvedParams.slug || [];
    const fullPathMarkdown = path.join(process.cwd(), 'src', slugArray.join('/') + '.md');
    const fullPathTsx = path.join(process.cwd(), 'src', slugArray.join('/') + '.tsx');

    let initialContent = '';
    let isMarkdown = fs.existsSync(fullPathMarkdown);
    let isTsx = fs.existsSync(fullPathTsx);
    let fileName = slugArray[slugArray.length - 1];
    let fileExtension = isMarkdown ? '.md' : (isTsx ? '.tsx' : '');
    fileName += fileExtension;

    let fileId = slugArray.join('/');

    try {
        if (isMarkdown) {
            initialContent = fs.readFileSync(fullPathMarkdown, 'utf8');
        } else if (isTsx) {
            // It's a TSX component route; we won't serve the raw tsx text
            initialContent = `React Component Rendering...`;
        } else {
            initialContent = `404: The file ${fileId} could not be found.`;
        }
    } catch (error) {
        initialContent = `Error reading file ${fileId}.`;
    }

    // 3. Pass data to client-side interactive wrapper Component
    return (
        <WorkspaceWrapper initialFileId={fileId} initialFileName={fileName} initialContent={initialContent} />
    );
}
