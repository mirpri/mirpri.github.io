import './globals.css';
import { ReactNode } from 'react';
import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
    title: 'Mirpri👋',
    description: 'Mirpri\'s terminal-based portfolio and homepage.',
    keywords: ['Mirpri', 'portfolio', 'developer', 'TypeScript', 'React', 'Neovim', 'Terminal UI', 'Web Development'],
    authors: [{ name: 'Mirpri' }],
    openGraph: {
        title: 'Mirpri👋 - My Portfolio',
        description: 'The terminal-style portfolio of Mirpri. Discover my projects, skills, and thoughts.',
        url: 'https://mirpri.com/',
        type: 'website',
    },
    icons: {
        icon: '/favicon.svg',
    },
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <body className="antialiased overflow-hidden bg-tokyo-bg text-tokyo-fg font-mono">
                {/* Google Analytics */}
                <Script src="https://www.googletagmanager.com/gtag/js?id=G-33SKNTLRN6" strategy="afterInteractive" />
                <Script id="google-analytics" strategy="afterInteractive">
                    {`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());

                        gtag('config', 'G-33SKNTLRN6');
                    `}
                </Script>
                {/* Google AdSense */}
                <Script 
                    async 
                    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6694128430435366" 
                    crossOrigin="anonymous"
                    strategy="lazyOnload"
                />
                
                <div id="root">{children}</div>
            </body>
        </html>
    );
}
