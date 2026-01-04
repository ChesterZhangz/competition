import { useMemo, type CSSProperties } from 'react';
import katex from 'katex';
// KaTeX CSS is imported in main.tsx to ensure fonts load early

interface LaTeXRendererProps {
  content: string;
  className?: string;
  style?: CSSProperties;
}

// Common KaTeX options for consistent rendering
const KATEX_OPTIONS = {
  throwOnError: false,
  strict: false,
  trust: true,
  output: 'html' as const,
  // Enable all macros
  macros: {
    '\\R': '\\mathbb{R}',
    '\\N': '\\mathbb{N}',
    '\\Z': '\\mathbb{Z}',
    '\\Q': '\\mathbb{Q}',
    '\\C': '\\mathbb{C}',
  },
};

export function LaTeXRenderer({ content, className = '', style }: LaTeXRendererProps) {
  const renderedContent = useMemo(() => {
    if (!content) return '';

    // First, convert newlines to a placeholder BEFORE KaTeX rendering
    // This prevents breaking SVG paths that KaTeX generates
    const NEWLINE_PLACEHOLDER = '\u0000NEWLINE\u0000';
    let result = content.replace(/\n/g, NEWLINE_PLACEHOLDER);

    // Replace display math $$...$$ first
    result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      try {
        // Remove placeholders from math content for proper rendering
        const cleanMath = math.replace(new RegExp(NEWLINE_PLACEHOLDER, 'g'), '\n');
        return katex.renderToString(cleanMath.trim(), {
          ...KATEX_OPTIONS,
          displayMode: true,
        });
      } catch (e) {
        console.error('KaTeX display math error:', e);
        return `<span class="text-red-500">[LaTeX Error: ${math}]</span>`;
      }
    });

    // Replace inline math $...$ (improved regex to handle backslashes properly)
    result = result.replace(/\$([^$]+?)\$/g, (_, math) => {
      try {
        // Remove placeholders from math content for proper rendering
        const cleanMath = math.replace(new RegExp(NEWLINE_PLACEHOLDER, 'g'), '\n');
        return katex.renderToString(cleanMath.trim(), {
          ...KATEX_OPTIONS,
          displayMode: false,
        });
      } catch (e) {
        console.error('KaTeX inline math error:', e);
        return `<span class="text-red-500">[LaTeX Error: ${math}]</span>`;
      }
    });

    // Now convert placeholders to <br> (only in non-KaTeX content)
    result = result.replace(new RegExp(NEWLINE_PLACEHOLDER, 'g'), '<br>');

    return result;
  }, [content]);

  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}
