import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TOCItem {
  id: string;
  title: string;
  icon?: React.ReactNode;
}

interface TableOfContentsProps {
  items: TOCItem[];
  className?: string;
}

export function TableOfContents({ items, className }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id || '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      }
    );

    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      items.forEach((item) => {
        const element = document.getElementById(item.id);
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, [items]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <nav className={cn('space-y-1', className)}>
      <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        目录 / Contents
      </h3>
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          onClick={() => scrollToSection(item.id)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all',
            activeId === item.id
              ? 'bg-[var(--color-primary)] text-white shadow-md'
              : 'text-[var(--color-foreground)] hover:bg-[var(--color-primary-light)]'
          )}
        >
          <span
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold',
              activeId === item.id
                ? 'bg-white/20 text-white'
                : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
            )}
          >
            {index + 1}
          </span>
          <span className="truncate">{item.title}</span>
        </button>
      ))}
    </nav>
  );
}
