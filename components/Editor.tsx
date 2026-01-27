import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Buffer, Mode } from '../types';
import { resolveMarkdownAsset } from '../services/pagesService';

interface EditorProps {
  buffer: Buffer;
  isActive: boolean;
  mode?: Mode;
  selection?: { start: { row: number; col: number }, end: { row: number; col: number } } | null;
  onCursorChange?: (row: number, col: number) => void;
  onMouseSelectionChange?: (start: { row: number; col: number }, end: { row: number; col: number }) => void;
  onExitVisual?: () => void;
}

const Editor: React.FC<EditorProps> = ({ buffer, isActive, mode, selection, onCursorChange, onMouseSelectionChange, onExitVisual }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic to keep cursor in view
  useEffect(() => {
    if (isActive && activeLineRef.current) {
        activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [buffer.cursorRow, isActive]);

  // Render Standard Text Editor
  const lines = buffer.content.split('\n');

  // Mouse selection/click handling: update cursor and selection to match text selection
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    // Safely resolve the line element tagged with data-row
    const resolveRowElement = (node: Node | null): HTMLElement | null => {
      if (!node) return null;
      let el: HTMLElement | null = null;
      if (node.nodeType === Node.ELEMENT_NODE) {
        el = (node as HTMLElement);
      } else if ((node as any).parentElement) {
        el = (node as any).parentElement as HTMLElement;
      }
      return el ? el.closest('[data-row]') as HTMLElement | null : null;
    };

    const anchorEl = resolveRowElement(sel.anchorNode);
    const focusEl = resolveRowElement(sel.focusNode);
    if (!anchorEl || !focusEl) {
      // Click outside text lines
      return;
    }
    const startRow = Number(anchorEl.getAttribute('data-row'));
    const endRow = Number(focusEl.getAttribute('data-row'));

    const getOffsetInElement = (rowEl: HTMLElement, node: Node, offset: number) => {
      try {
        const range = document.createRange();
        range.selectNodeContents(rowEl);
        range.setStart(rowEl, 0);
        range.setEnd(node, offset);
        return range.toString().length;
      } catch (e) {
        return 0;
      }
    };

    const startCol = getOffsetInElement(anchorEl, sel.anchorNode!, sel.anchorOffset);
    const endCol = getOffsetInElement(focusEl, sel.focusNode!, sel.focusOffset);

    if (sel.isCollapsed) {
      // Simple click: move cursor
      onCursorChange?.(endRow, Math.max(0, Math.min(endCol, (lines[endRow] || '').length)));
      // If currently in Visual mode, exit it on simple click
      if (mode === Mode.VISUAL) {
        onExitVisual?.();
      }
    } else {
      // Visual selection: sync selection
      const start = { row: startRow, col: Math.max(0, startCol) };
      const end = { row: endRow, col: Math.max(0, endCol) };
      onMouseSelectionChange?.(start, end);
      sel.removeAllRanges();
    }
  };

  return (
    <div ref={containerRef} className="h-full overflow-y-auto w-full bg-tokyo-bg font-mono custom-scrollbar relative cursor-text py-6" onMouseUp={handleMouseUp}>
       <div className="min-h-full pb-10">
        {lines.map((line, idx) => {
          const isCursorLine = isActive && idx === buffer.cursorRow;
          // Compute selection columns for this line if selection exists
          let selStartCol: number | undefined = undefined;
          let selEndCol: number | undefined = undefined;
          if (selection) {
            const s = selection.start;
            const e = selection.end;
            const startBeforeEnd = (s.row < e.row) || (s.row === e.row && s.col <= e.col);
            const start = startBeforeEnd ? s : e;
            const end = startBeforeEnd ? e : s;
            const lineLen = line.length;
            if (idx > start.row && idx < end.row) {
              selStartCol = 0;
              selEndCol = lineLen;
            } else if (idx === start.row && idx === end.row) {
              selStartCol = Math.max(0, Math.min(start.col, lineLen));
              selEndCol = Math.max(0, Math.min(end.col, lineLen));
            } else if (idx === start.row) {
              selStartCol = Math.max(0, Math.min(start.col, lineLen));
              selEndCol = lineLen;
            } else if (idx === end.row) {
              selStartCol = 0;
              selEndCol = Math.max(0, Math.min(end.col, lineLen));
            }
          }
          
          return (
            <div 
              key={idx} 
              ref={isCursorLine ? activeLineRef : null}
              className={`flex w-full ${isCursorLine ? 'bg-tokyo-line_nr/30' : ''}`}
            >
              {/* Line Number */}
              <div className={`w-12 text-right pr-4 select-none shrink-0 ${isCursorLine ? 'text-tokyo-yellow font-bold' : 'text-tokyo-comment'}`}>
                {idx + 1}
              </div>
              
              {/* Line Content*/}
              <div className="flex-1 whitespace-pre-wrap pr-4 break-words min-h-[1.5em] mx-auto block max-w-xl xl:max-w-4xl" data-row={idx}>
                <HighlightLine 
                  text={line} 
                  type={buffer.type} 
                  cursorCol={isCursorLine ? buffer.cursorCol : undefined}
                  selStartCol={selStartCol}
                  selEndCol={selEndCol}
                  basePath={buffer.path}
                />
              </div>
            </div>
          );
        })}
       </div>
    </div>
  );
};

// Simple Syntax Highlighter with Cursor Support
const HighlightLine: React.FC<{ text: string, type: string, cursorCol?: number, selStartCol?: number, selEndCol?: number, basePath?: string }> = ({ text, type, cursorCol, selStartCol, selEndCol, basePath }) => {
    // If no cursor/selection, render efficiently
    if (cursorCol === undefined && (selStartCol === undefined || selEndCol === undefined)) {
      if (type === 'markdown') {
       return <MarkdownInline text={text} basePath={basePath} />;
      }
      return <SyntaxTokens text={text} type={type} basePath={basePath} />;
    }
  
  const hasCursor = cursorCol !== undefined && cursorCol >= 0;
  
  const tokens = tokenize(text, type);
  let currentLength = 0;
  const parts: React.ReactNode[] = [];
  tokens.forEach((token, i) => {
    const tokenStart = currentLength;
    const tokenEnd = currentLength + token.text.length;
    currentLength = tokenEnd;

    const hasSelection = selStartCol !== undefined && selEndCol !== undefined && selStartCol !== selEndCol;
    const selStart = hasSelection ? Math.max(tokenStart, selStartCol!) : undefined;
    const selEnd = hasSelection ? Math.min(tokenEnd, selEndCol!) : undefined;
    const intersectsSelection = hasSelection && selStart! < selEnd!;

    const cursorInsideToken = hasCursor && cursorCol! >= tokenStart && cursorCol! < tokenEnd;
    const cursorIndexRel = cursorInsideToken ? (cursorCol! - tokenStart) : -1;

    if (intersectsSelection) {
      // Split into up to 3 segments relative to selection
      const relSelStart = selStart! - tokenStart;
      const relSelEnd = selEnd! - tokenStart;
      const segA = token.text.slice(0, relSelStart);
      const segB = token.text.slice(relSelStart, relSelEnd);
      const segC = token.text.slice(relSelEnd);

      // If cursor also inside, and not in selected part, handle char highlight without animation
      const pushSegment = (textSeg: string, className: string, offsetStart: number) => {
        if (cursorInsideToken && cursorIndexRel >= offsetStart && cursorIndexRel < offsetStart + textSeg.length && !hasSelection) {
          const pre = textSeg.slice(0, cursorIndexRel - offsetStart);
          const ch = textSeg[cursorIndexRel - offsetStart];
          const post = textSeg.slice(cursorIndexRel - offsetStart + 1);
          parts.push(<span key={`${i}-pre`} className={className}>{pre}</span>);
          parts.push(<span key={`${i}-cur`} className={`${className} bg-tokyo-fg text-tokyo-bg_dark font-bold`}>{ch}</span>);
          parts.push(<span key={`${i}-post`} className={className}>{post}</span>);
        } else {
          parts.push(<span key={`${i}-${offsetStart}`} className={className}>{textSeg}</span>);
        }
      };

      pushSegment(segA, token.className, 0);
      if (segB.length > 0) {
        parts.push(
          <span
            key={`${i}-sel`}
            className={token.className}
            style={{ backgroundColor: '#c0caf5', color: '#16161e' }}
          >
            {segB}
          </span>
        );
      }
      pushSegment(segC, token.className, relSelEnd);
    } else if (cursorInsideToken && !hasSelection) {
      // No selection, highlight cursor char
      const relIndex = cursorIndexRel;
      const pre = token.text.slice(0, relIndex);
      const ch = token.text[relIndex];
      const post = token.text.slice(relIndex + 1);
      parts.push(<span key={`${i}-pre`} className={token.className}>{pre}</span>);
      parts.push(
        <span
          key={`${i}-cur`}
          className={token.className}
          style={{ backgroundColor: '#c0caf5', color: '#16161e', fontWeight: 700 }}
        >
          {ch}
        </span>
      );
      parts.push(<span key={`${i}-post`} className={token.className}>{post}</span>);
    } else {
      parts.push(<span key={i} className={token.className}>{token.text}</span>);
    }
  });

  return (
    <>
      {parts}
      {hasCursor && cursorCol! >= text.length && (!selStartCol || !selEndCol) && (
        <span className="bg-tokyo-fg text-tokyo-bg_dark opacity-50">&nbsp;</span>
      )}
    </>
  );
};

// Helper to generate tokens with classes
const tokenize = (text: string, type: string): { text: string, className: string }[] => {
  if (type === 'markdown') {
    // Fallback for active line with cursor/selection: keep simple styling
    if (text.startsWith('# ')) return [{ text, className: "text-tokyo-purple font-bold text-4xl" }];
    if (text.startsWith('## ')) return [{ text, className: "text-tokyo-blue font-bold text-2xl" }];
    return [{ text, className: "text-tokyo-fg text-[1em]" }];
  }

  return [{ text, className: "text-tokyo-fg text-[1em]" }];
};

// Component for non-active lines (faster)
const SyntaxTokens: React.FC<{ text: string, type: string, basePath?: string }> = ({ text, type, basePath }) => {
   if (type === 'markdown') {
     return <MarkdownInline text={text} basePath={basePath} />;
   }
   const tokens = tokenize(text, type);
   return (
      <>
        {tokens.map((t, i) => <span key={i} className={t.className}>{t.text}</span>)}
      </>
   );
};

const MarkdownInline: React.FC<{ text: string, basePath?: string }> = ({ text, basePath }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeRaw]}
    components={{
      p: ({ children }) => <span className="text-tokyo-fg font-sans max-w-lg text-lg">{children}</span>,
      a: ({ children, href, style}) => <a href={href} className="px-1.5 text-tokyo-cyan hover:text-tokyo-orange border border-tokyo-cyan hover:border-tokyo-orange rounded-[100px] font-mono text-base hover:rounded-[0px] transition-all duration-300" style={style}>{children}</a>,
      strong: ({ children }) => <span className="font-bold text-tokyo-fg">{children}</span>,
      em: ({ children }) => <span className="italic text-tokyo-fg">{children}</span>,
      code: ({ children }) => <code className="bg-tokyo-line_nr text-tokyo-orange px-1 rounded" style={{ fontSize: '0.9em' }}>{children}</code>,
      ul: ({ children }) => <ul className="list-disc leading-[0rem] ml-4 my-0 space-y-0 text-tokyo-fg">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal leading-[0rem] ml-4 my-0 space-y-0 text-tokyo-fg">{children}</ol>,
      li: ({ children }) => <li className="text-tokyo-fg font-sans text-lg">{children}</li>,
      h1: ({ children }) => <span className="block text-4xl font-bold text-tokyo-purple">{children}</span>,
      h2: ({ children }) => <span className="block text-2xl font-bold text-tokyo-blue">{children}</span>,
      blockquote: ({ children }) => <blockquote className="border-l-2 border-tokyo-comment/40 pl-3 text-tokyo-comment font-sans italic">{children}</blockquote>,
      hr: () => <hr className="border-tokyo-comment/30 my-2" />,
      img: ({ src, alt, style }) => {
        const resolved = resolveMarkdownAsset(src || '', basePath);
        return <img src={resolved} alt={alt || ''} className="inline-block max-h-80 rounded-3xl p-0.5 hover:rounded-none border border-tokyo-comment transition-all duration-300" style={style} title={alt || ''} />;
      }
    }}
  >
    {text}
  </ReactMarkdown>
);

export default Editor;
