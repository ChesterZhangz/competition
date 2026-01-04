import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
}

// 预设颜色
const PRESET_COLORS = [
  // 主色调
  '#4f46e5', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#2563eb',
  // 中性色
  '#000000', '#1e293b', '#334155', '#64748b',
  '#94a3b8', '#cbd5e1', '#e2e8f0', '#f8fafc',
  '#ffffff',
];

export function ColorPicker({ value, onChange, label, className }: ColorPickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleColorSelect = (color: string) => {
    setInputValue(color);
    onChange(color);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-[var(--color-foreground)]">
          {label}
        </label>
      )}

      <div className="flex items-center gap-2">
        {/* 颜色预览按钮 */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--color-border)] transition-all hover:border-[var(--color-primary)]"
          style={{ backgroundColor: value }}
        >
          <span className="sr-only">{t('common.selectColor', 'Select color')}</span>
        </button>

        {/* 颜色值输入 */}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="#000000"
          className="h-10 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 font-mono text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none"
        />

        {/* 原生颜色选择器 */}
        <input
          type="color"
          value={value}
          onChange={(e) => handleColorSelect(e.target.value)}
          className="h-10 w-10 cursor-pointer rounded-lg border border-[var(--color-border)]"
        />
      </div>

      {/* 预设颜色面板 */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-lg">
          <div className="mb-2 text-xs font-medium text-[var(--color-muted)]">
            {t('common.presetColors', 'Preset Colors')}
          </div>
          <div className="grid grid-cols-9 gap-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleColorSelect(color)}
                className={cn(
                  'h-6 w-6 rounded-md border-2 transition-transform hover:scale-110',
                  value === color ? 'border-[var(--color-primary)]' : 'border-transparent'
                )}
                style={{ backgroundColor: color }}
              >
                <span className="sr-only">{color}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 简化版颜色选择器（只有颜色块）
interface ColorSwatchProps {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
  className?: string;
}

export function ColorSwatch({ value, onChange, colors = PRESET_COLORS, className }: ColorSwatchProps) {
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn(
            'h-8 w-8 rounded-lg border-2 transition-all hover:scale-105',
            value === color
              ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30'
              : 'border-transparent hover:border-[var(--color-muted)]'
          )}
          style={{ backgroundColor: color }}
        >
          {value === color && (
            <svg
              className="h-full w-full p-1"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isLightColor(color) ? '#000' : '#fff'}
              strokeWidth="3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

// 判断颜色是否为浅色
function isLightColor(color: string): boolean {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
}
