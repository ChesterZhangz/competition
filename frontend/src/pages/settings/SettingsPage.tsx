import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/store/themeStore';
import { GlassCard } from '@/components/ui/glass-card';

type Theme = 'light' | 'dark' | 'system';

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useThemeStore();

  const themeOptions: { value: Theme; label: string; icon: ReactNode }[] = [
    {
      value: 'light',
      label: t('settings.themeLight', 'Light'),
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      value: 'dark',
      label: t('settings.themeDark', 'Dark'),
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ),
    },
    {
      value: 'system',
      label: t('settings.themeSystem', 'System'),
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  const languageOptions = [
    {
      value: 'en',
      label: t('settings.english', 'English'),
      nativeLabel: 'English',
    },
    {
      value: 'zh',
      label: t('settings.chinese', 'Chinese'),
      nativeLabel: '中文',
    },
  ];

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('settings.title', 'Settings')}</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          {t('settings.subtitle', 'Customize your experience')}
        </p>
      </div>

      {/* Appearance Section */}
      <GlassCard className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">{t('settings.appearance', 'Appearance')}</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {t('settings.appearanceDescription', 'Customize how the app looks on your device')}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-3 block text-sm font-medium">
              {t('settings.theme', 'Theme')}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    theme === option.value
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-muted)] hover:bg-[var(--color-secondary)]'
                  }`}
                >
                  <div
                    className={`${
                      theme === option.value
                        ? 'text-[var(--color-primary)]'
                        : 'text-[var(--color-muted)]'
                    }`}
                  >
                    {option.icon}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      theme === option.value
                        ? 'text-[var(--color-primary)]'
                        : 'text-[var(--color-foreground)]'
                    }`}
                  >
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Language Section */}
      <GlassCard className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">{t('settings.languageSection', 'Language & Region')}</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {t('settings.languageSectionDescription', 'Choose your preferred language')}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-3 block text-sm font-medium">
              {t('settings.language', 'Language')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {languageOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleLanguageChange(option.value)}
                  className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                    i18n.language === option.value
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-muted)] hover:bg-[var(--color-secondary)]'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${
                      i18n.language === option.value
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-secondary)] text-[var(--color-muted)]'
                    }`}
                  >
                    {option.value === 'en' ? 'En' : '中'}
                  </div>
                  <div className="text-left">
                    <div
                      className={`font-medium ${
                        i18n.language === option.value
                          ? 'text-[var(--color-primary)]'
                          : 'text-[var(--color-foreground)]'
                      }`}
                    >
                      {option.nativeLabel}
                    </div>
                    <div className="text-sm text-[var(--color-muted)]">{option.label}</div>
                  </div>
                  {i18n.language === option.value && (
                    <svg
                      className="ml-auto h-5 w-5 text-[var(--color-primary)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Current Settings Summary */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-icon-primary-bg)]">
              <svg
                className="h-6 w-6 text-[var(--color-icon-primary-fg)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <div className="font-medium">{t('settings.currentTheme', 'Current theme')}</div>
              <div className="text-sm text-[var(--color-muted)]">
                {theme === 'light'
                  ? t('settings.themeLight', 'Light')
                  : theme === 'dark'
                  ? t('settings.themeDark', 'Dark')
                  : t('settings.themeSystem', 'System')}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium">{t('settings.currentLanguage', 'Current language')}</div>
            <div className="text-sm text-[var(--color-muted)]">
              {i18n.language === 'en' ? 'English' : '中文'}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
