import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ColorPicker } from '@/components/ui/color-picker';
import {
  type ThemePreset,
  type ThemeConfig,
  type CustomThemeColors,
  type DisplayMode,
  THEME_PRESETS_LIGHT,
  THEME_PRESETS_DARK,
  generateThemeFromPrimary,
} from '@/types/competition';

interface ThemeSelectorProps {
  value: ThemeConfig;
  onChange: (theme: ThemeConfig) => void;
  className?: string;
}

const PRESET_OPTIONS: { id: ThemePreset; nameKey: string }[] = [
  { id: 'default', nameKey: 'competition.display.themeDefault' },
  { id: 'dark', nameKey: 'competition.display.themeDark' },
  { id: 'ocean', nameKey: 'competition.display.themeOcean' },
  { id: 'forest', nameKey: 'competition.display.themeForest' },
  { id: 'sunset', nameKey: 'competition.display.themeSunset' },
  { id: 'custom', nameKey: 'competition.display.themeCustom' },
];

export function ThemeSelector({ value, onChange, className }: ThemeSelectorProps) {
  const { t } = useTranslation();
  const [showCustom, setShowCustom] = useState(value.preset === 'custom');
  const [editingMode, setEditingMode] = useState<DisplayMode>(value.displayMode || 'light');

  // 初始化自定义颜色
  useEffect(() => {
    if (value.preset === 'custom' && !value.custom) {
      const defaultCustom = generateThemeFromPrimary('#4f46e5');
      onChange({ ...value, custom: defaultCustom });
    }
  }, [value.preset]);

  const handlePresetChange = (preset: ThemePreset) => {
    if (preset === 'custom') {
      setShowCustom(true);
      const customColors = value.custom || generateThemeFromPrimary('#4f46e5');
      onChange({
        ...value,
        preset: 'custom',
        custom: customColors,
      });
    } else {
      setShowCustom(false);
      onChange({ ...value, preset });
    }
  };

  const handleDisplayModeChange = (mode: DisplayMode) => {
    onChange({ ...value, displayMode: mode });
    setEditingMode(mode);
  };

  const handleCustomColorChange = (mode: DisplayMode, key: keyof CustomThemeColors, color: string) => {
    const currentCustom = value.custom || generateThemeFromPrimary('#4f46e5');
    onChange({
      ...value,
      preset: 'custom',
      custom: {
        ...currentCustom,
        [mode]: {
          ...currentCustom[mode],
          [key]: color,
        },
      },
    });
  };

  const handleAutoGenerate = () => {
    const currentColors = value.custom?.[editingMode] || THEME_PRESETS_LIGHT.default;
    const generated = generateThemeFromPrimary(currentColors.primary);
    onChange({
      ...value,
      preset: 'custom',
      custom: generated,
    });
  };

  const getPresetColors = (preset: ThemePreset, mode: DisplayMode): CustomThemeColors => {
    if (preset === 'custom') {
      return value.custom?.[mode] || THEME_PRESETS_LIGHT.default;
    }
    const presets = mode === 'dark' ? THEME_PRESETS_DARK : THEME_PRESETS_LIGHT;
    return presets[preset];
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Light/Dark Mode Toggle */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[var(--color-foreground)]">
          {t('competition.display.displayMode', 'Display Mode')}
        </label>
        <div className="flex rounded-xl bg-[var(--color-secondary)] p-1">
          <button
            type="button"
            onClick={() => handleDisplayModeChange('light')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
              value.displayMode === 'light'
                ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
            )}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            {t('competition.display.lightMode', 'Light')}
          </button>
          <button
            type="button"
            onClick={() => handleDisplayModeChange('dark')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
              value.displayMode === 'dark'
                ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
            )}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            {t('competition.display.darkMode', 'Dark')}
          </button>
        </div>
      </div>

      {/* Theme Preset Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[var(--color-foreground)]">
          {t('competition.display.theme', 'Theme')}
        </label>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {PRESET_OPTIONS.map((option) => {
            const colors = getPresetColors(option.id, value.displayMode || 'light');
            const isSelected = value.preset === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handlePresetChange(option.id)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all',
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
                )}
              >
                {/* Color Preview */}
                <div
                  className="flex h-10 w-full overflow-hidden rounded-lg shadow-sm"
                  style={{ backgroundColor: colors.background }}
                >
                  <div className="w-1/3" style={{ backgroundColor: colors.primary }} />
                  <div className="w-1/3" style={{ backgroundColor: colors.secondary }} />
                  <div className="w-1/3" style={{ backgroundColor: colors.accent }} />
                </div>
                <span
                  className={cn(
                    'text-xs font-medium',
                    isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-foreground)]'
                  )}
                >
                  {t(option.nameKey, option.id)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Colors Panel */}
      {showCustom && (
        <div className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-secondary)]/30 p-5">
          {/* Header with Auto Generate Button */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[var(--color-foreground)]">
              {t('competition.display.customColors', 'Custom Colors')}
            </h4>
            <button
              type="button"
              onClick={handleAutoGenerate}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/20"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('competition.display.autoGenerate', 'Auto Generate')}
            </button>
          </div>

          {/* Mode Tabs for Editing */}
          <div className="flex rounded-lg bg-[var(--color-card)] p-1">
            <button
              type="button"
              onClick={() => setEditingMode('light')}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                editingMode === 'light'
                  ? 'bg-[var(--color-secondary)] text-[var(--color-foreground)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
              )}
            >
              {t('competition.display.editLight', 'Edit Light Mode')}
            </button>
            <button
              type="button"
              onClick={() => setEditingMode('dark')}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                editingMode === 'dark'
                  ? 'bg-[var(--color-secondary)] text-[var(--color-foreground)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
              )}
            >
              {t('competition.display.editDark', 'Edit Dark Mode')}
            </button>
          </div>

          {/* Color Pickers Grid - 2 per row */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <ColorPicker
              label={t('competition.display.primaryColor', 'Primary')}
              value={value.custom?.[editingMode]?.primary || THEME_PRESETS_LIGHT.default.primary}
              onChange={(color) => handleCustomColorChange(editingMode, 'primary', color)}
            />
            <ColorPicker
              label={t('competition.display.secondaryColor', 'Secondary')}
              value={value.custom?.[editingMode]?.secondary || THEME_PRESETS_LIGHT.default.secondary}
              onChange={(color) => handleCustomColorChange(editingMode, 'secondary', color)}
            />
            <ColorPicker
              label={t('competition.display.accentColor', 'Accent')}
              value={value.custom?.[editingMode]?.accent || THEME_PRESETS_LIGHT.default.accent}
              onChange={(color) => handleCustomColorChange(editingMode, 'accent', color)}
            />
            <ColorPicker
              label={t('competition.display.backgroundColor', 'Background')}
              value={value.custom?.[editingMode]?.background || THEME_PRESETS_LIGHT.default.background}
              onChange={(color) => handleCustomColorChange(editingMode, 'background', color)}
            />
            <ColorPicker
              label={t('competition.display.textColor', 'Text')}
              value={value.custom?.[editingMode]?.text || THEME_PRESETS_LIGHT.default.text}
              onChange={(color) => handleCustomColorChange(editingMode, 'text', color)}
            />
          </div>

          {/* Dual Preview - Light and Dark Side by Side */}
          <div className="space-y-3">
            <h5 className="text-xs font-medium text-[var(--color-muted)]">
              {t('competition.display.preview', 'Preview')}
            </h5>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <svg className="h-3.5 w-3.5 text-[var(--color-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="text-xs font-medium text-[var(--color-muted)]">
                    {t('competition.display.lightMode', 'Light')}
                  </span>
                </div>
                <ThemePreview colors={value.custom?.light || THEME_PRESETS_LIGHT.default} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <svg className="h-3.5 w-3.5 text-[var(--color-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span className="text-xs font-medium text-[var(--color-muted)]">
                    {t('competition.display.darkMode', 'Dark')}
                  </span>
                </div>
                <ThemePreview colors={value.custom?.dark || THEME_PRESETS_DARK.default} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Theme Preview Component
function ThemePreview({ colors }: { colors: CustomThemeColors }) {
  const { t } = useTranslation();

  return (
    <div
      className="overflow-hidden rounded-xl border shadow-sm"
      style={{
        backgroundColor: colors.background,
        borderColor: colors.secondary,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ backgroundColor: colors.primary }}
      >
        <span className="text-xs font-bold text-white">
          {t('competition.display.previewTitle', 'Title')}
        </span>
        <span className="text-[10px] text-white/80">00:30</span>
      </div>

      {/* Content */}
      <div className="p-3">
        <div
          className="mb-2 text-sm font-medium"
          style={{ color: colors.text }}
        >
          {t('competition.display.previewQuestion', 'Question')}
        </div>
        <div className="space-y-1.5">
          {['A', 'B'].map((option, i) => (
            <div
              key={option}
              className="flex items-center gap-2 rounded-md px-2 py-1.5"
              style={{
                backgroundColor: i === 0 ? colors.accent + '20' : colors.secondary + '30',
                borderLeft: `2px solid ${i === 0 ? colors.accent : 'transparent'}`,
              }}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: i === 0 ? colors.accent : colors.secondary,
                  color: i === 0 ? '#fff' : colors.text,
                }}
              >
                {option}
              </span>
              <span className="text-xs" style={{ color: colors.text }}>
                Option {option}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
