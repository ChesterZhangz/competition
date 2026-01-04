import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useTranslation } from 'react-i18next';
import { UserDropdown } from './UserDropdown';
import { MareateLogo } from './MareaetLogo';
import { NotificationDropdown } from './NotificationDropdown';

export function Navbar() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const isTeacherOrAbove = user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'super_admin';
  const isStudent = user?.role === 'student';

  return (
    <nav className="navbar sticky top-0 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold group">
          <MareateLogo size={36} />
          <span className="hidden sm:inline text-[var(--color-primary)]">
            {t('app.name', 'Mareate Content')}
          </span>
        </Link>

        {/* Navigation Links - Center */}
        <div className="hidden md:flex items-center gap-1">
          {isAuthenticated && (
            <>
              <Link to="/competitions" className="nav-link">
                {t('nav.competitions', 'Competitions')}
              </Link>
              {isTeacherOrAbove && (
                <>
                  <Link to="/problems" className="nav-link">
                    {t('nav.problems', 'Problem Banks')}
                  </Link>
                  <Link to="/competitions/demo" className="nav-link">
                    {t('nav.demo', 'Demo')}
                  </Link>
                </>
              )}
              {isStudent && (
                <Link to="/apply-teacher" className="nav-link">
                  {t('nav.applyTeacher', 'Apply for Teacher')}
                </Link>
              )}
            </>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {/* Mobile Navigation Menu */}
              <div className="md:hidden flex items-center gap-1">
                <Link to="/competitions" className="nav-link text-sm px-2">
                  {t('nav.competitions', 'Competitions')}
                </Link>
                {isTeacherOrAbove && (
                  <Link to="/problems" className="nav-link text-sm px-2">
                    {t('nav.problems', 'Problems')}
                  </Link>
                )}
                {isStudent && (
                  <Link to="/apply-teacher" className="nav-link text-sm px-2">
                    {t('nav.applyTeacher', 'Apply')}
                  </Link>
                )}
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="rounded-lg p-2 hover:bg-[var(--color-secondary)] transition-colors"
                aria-label={t('nav.toggleTheme', 'Toggle theme')}
              >
                {theme === 'dark' ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Notification Bell */}
              <NotificationDropdown />

              {/* User Dropdown */}
              <UserDropdown />
            </>
          ) : (
            <>
              {/* Theme Toggle for non-authenticated users */}
              <button
                onClick={toggleTheme}
                className="rounded-lg p-2 hover:bg-[var(--color-secondary)] transition-colors"
                aria-label={t('nav.toggleTheme', 'Toggle theme')}
              >
                {theme === 'dark' ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Login/Register Buttons */}
              <Link to="/login" className="nav-button nav-button-outline">
                {t('nav.login', 'Login')}
              </Link>
              <Link to="/register" className="nav-button nav-button-primary">
                {t('nav.register', 'Register')}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
