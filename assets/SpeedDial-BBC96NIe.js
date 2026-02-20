const e=`import React, { useState, useEffect } from 'react';
import { ExternalLink, Github, Twitter, Linkedin, Mail, Globe, Code, Terminal, Youtube, HomeIcon, PenTool, KeyRound, School2, Notebook, Dog } from 'lucide-react';

interface SpeedDialCategory {
  title: string;
  items: SpeedDialItem[];
}

interface SpeedDialItem {
  id: string;
  label: string;
  url: string;
  icon: React.ElementType;
  description?: string;
  color?: string;
}

const SPEED_DIAL_DATA: SpeedDialCategory[] = [
  {
    title: '*this',
    items: [
      { 
        id: 'github', 
        label: 'GitHub', 
        url: 'https://github.com/mirpri', 
        icon: Github, 
        description: 'Check out my code',
        color: 'text-tokyo-blue'
      },
      { 
        id: 'portfolio', 
        label: 'Portfolio', 
        url: 'https://mirpri.com', 
        icon: HomeIcon, 
        description: 'This website',
        color: 'text-tokyo-purple'
      },
      { 
        id: 'blog', 
        label: 'Blog', 
        url: 'https://blog.mirpri.com', 
        icon: PenTool, 
        description: 'My thoughts and writings',
        color: 'text-tokyo-cyan'
      },
      { 
        id: 'email', 
        label: 'Email Me', 
        url: 'mailto:hi@mirpri.com', 
        icon: Mail, 
        description: 'hi@mirpri.com',
        color: 'text-tokyo-red'
      }
    ]
  },
  {
    title: 'Projects',
    items: [
      { 
        id: 'mirpass', 
        label: 'Mirpass', 
        url: 'https://pass.mirpri.com', 
        icon: KeyRound, 
        description: 'OAuth SSO for developers',
        color: 'text-tokyo-cyan'
      },
      { 
        id: 'neonvocab', 
        label: 'NeonVocab', 
        url: 'https://mirpri.com/neonvocab', 
        icon: School2, 
        description: 'AI-powered vocabulary builder',
        color: 'text-tokyo-green'
      },
      { 
        id: 'mirnote', 
        label: 'Mirnote', 
        url: 'https://mirpri.com/mirnote', 
        icon: Notebook, 
        description: 'My learning journal',
        color: 'text-tokyo-red'
      },
      { 
        id: 'puppygo', 
        label: 'Puppy Go', 
        url: 'https://puppygoapp.com', 
        icon: Dog, 
        description: 'AI-powered workout companion',
        color: 'text-tokyo-orange'
      }
    ]
  }
];

// Flatten items for easier index-based navigation logic
const FLAT_ITEMS = SPEED_DIAL_DATA.flatMap(cat => cat.items);

const SpeedDial: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cols, setCols] = useState(1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleSelect = (index: number) => {
    const item = FLAT_ITEMS[index];
    if (item) {
      window.open(item.url, '_blank');
    }
  };

  useEffect(() => {
    const updateCols = () => {
      if (containerRef.current) {
        // Calculate columns based on container width
        // Threshold can be adjusted (e.g., 768px for 2 columns)
        const width = containerRef.current.offsetWidth;
        setCols(width >= 600 ? 2 : 1);
      }
    };

    // Initial check
    updateCols();

    // Use ResizeObserver for robust updates
    const observer = new ResizeObserver(updateCols);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const total = FLAT_ITEMS.length;

      // Vertical navigation
      if (e.key === 'j' || e.key === 'ArrowDown') {
        setSelectedIndex(prev => {
           const next = prev + cols;
           if (next >= total) {
               // Try to wrap or find nearest content?
               // For now, let's keep simple wrap
               return next % total; 
           }
           return next;
        });
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        setSelectedIndex(prev => {
            const next = prev - cols;
            if (next < 0) {
                 return (next + total); 
            }
            return next;
        });
      } 
      // Horizontal navigation
      else if (e.key === 'l' || e.key === 'ArrowRight') {
        setSelectedIndex(prev => (prev + 1) % total);
      } else if (e.key === 'h' || e.key === 'ArrowLeft') {
        setSelectedIndex(prev => (prev - 1 + total) % total);
      } 
      else if (e.key === 'Enter') {
        handleSelect(selectedIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, cols]); // Add cols dependency

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-tokyo-purple mb-2 font-mono">
        <span className="text-tokyo-cyan">~</span>/speed-dial
      </h1>
      <p className="text-tokyo-comment mb-6 font-mono text-sm">
        Quick access links. Use <span className="text-tokyo-fg font-bold">h/j/k/l</span> to navigate.
      </p>

      {/* Render grouped items from nested data */}
      {SPEED_DIAL_DATA.map((category, catIndex) => {
        return (
          <div key={category.title} className="w-full mb-8">
            <h2 className="text-xl font-bold text-tokyo-cyan mb-4 border-b border-tokyo-statusline pb-2 w-full font-mono">
              {category.title}
            </h2>
            <div 
              className="grid gap-4 w-full"
              style={{ gridTemplateColumns: \`repeat(\${cols}, minmax(0, 1fr))\` }}
              /* We need to use ref only once for width calculation */
              ref={catIndex === 0 ? containerRef : undefined}
            >
              {category.items.map((item) => {
                // Find original index in flattened list
                const originalIndex = FLAT_ITEMS.map((x, i) => ({ id: x.id, index: i })).find(x => x.id === item.id)?.index ?? -1;
                const isSelected = selectedIndex === originalIndex;
                const Icon = item.icon;
                
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(originalIndex)}
                    onMouseEnter={() => setSelectedIndex(originalIndex)}
                    className={\`
                      relative flex items-center p-4 rounded-md border transition-all duration-200 cursor-pointer group
                      \${isSelected 
                        ? 'border-tokyo-purple bg-tokyo-bg_dark translate-x-1 shadow-lg' 
                        : 'border-tokyo-statusline bg-transparent hover:border-tokyo-fg/30'
                      }
                    \`}
                  >
                    {/* Selection Marker */}
                    {isSelected && (
                      <div className="text-tokyo-purple font-bold animate-pulse text-2xl mr-3">
                        ➜
                      </div>
                    )}
      
                    <div className={\`mr-4 p-2 rounded-full bg-opacity-10 \${isSelected ? 'bg-tokyo-purple' : 'bg-transparent'}\`}>
                      <Icon className={\`w-6 h-6 \${item.color || 'text-tokyo-fg'}\`} />
                    </div>
                    
                    <div className="flex flex-col">
                      <span className={\`font-bold font-mono text-lg \${isSelected ? 'text-tokyo-purple' : 'text-tokyo-fg'}\`}>
                        {item.label}
                      </span>
                      {item.description && (
                        <span className="text-xs text-tokyo-comment font-mono mt-1">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      
      <div className="mt-12 text-xs text-tokyo-comment font-mono border-t border-tokyo-statusline pt-4 w-full text-center">
        [SPEED DIAL] {selectedIndex + 1}/{FLAT_ITEMS.length}
      </div>
    </div>
  );
};

export default SpeedDial;
`;export{e as default};
