'use client';

import React, { useEffect } from 'react';
import { FileNode } from '../types';
import Dashboard from '../components/Dashboard';
import WorkspaceLayout from '../components/WorkspaceLayout';
import { useEditorStore } from '../store';
import { useRouter } from 'next/navigation';

export default function Page() {
    const router = useRouter();

    const {
        loadTime, setLoadTime,
        files
    } = useEditorStore();

    useEffect(() => {
        if (!loadTime) {
            if (typeof performance === 'undefined' || !performance.timing) return;
            const time = Date.now() - performance.timing.navigationStart;
            setLoadTime(time);
        }
    }, [loadTime, setLoadTime]);

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

    return (
        <WorkspaceLayout>
            {() => (
                <div className="flex-1 relative flex flex-col min-w-0 bg-tokyo-bg">
                    <Dashboard onNavigate={navigateToFile} onQuit={() => window.location.href = 'about:blank'} loadTime={loadTime} />
                </div>
            )}
        </WorkspaceLayout>
    );
}
