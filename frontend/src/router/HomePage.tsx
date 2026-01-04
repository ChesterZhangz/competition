import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';

export function HomePage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="space-y-12 py-8">
      {/* Hero Section */}
      <section className="text-center">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">
          {t('home.welcome', 'Math Competition Platform')}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-[var(--color-muted)]">
          {t('home.description', 'Host and participate in exciting math competitions')}
        </p>
      </section>

      {/* Action Cards */}
      <section className="grid gap-6 md:grid-cols-3">
        <Link to="/join" className="card p-6 text-center hover:scale-[1.02]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--color-icon-primary-bg)] text-[var(--color-icon-primary-fg)]">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold">
            {t('home.joinCompetition', 'Join a Competition')}
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            {t('home.joinDescription', 'Enter a code to participate')}
          </p>
        </Link>

        <Link to={isAuthenticated ? '/competitions/create' : '/login'} className="card p-6 text-center hover:scale-[1.02]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--color-icon-amber-bg)] text-[var(--color-icon-amber-fg)]">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold">
            {t('home.hostCompetition', 'Host a Competition')}
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            {t('home.hostDescription', 'Create your own competition')}
          </p>
        </Link>

        <Link to={isAuthenticated ? '/problems' : '/login'} className="card p-6 text-center hover:scale-[1.02]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--color-icon-emerald-bg)] text-[var(--color-icon-emerald-fg)]">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold">
            {t('home.browseProblemBanks', 'Problem Banks')}
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            {t('home.browseDescription', 'Explore and create problems')}
          </p>
        </Link>
      </section>

      {/* CTA Section - Only for non-authenticated users */}
      {!isAuthenticated && (
        <section className="text-center">
          <div className="card mx-auto max-w-xl p-8">
            <h2 className="mb-3 text-xl font-bold">
              {t('home.getStarted', 'Get Started Today')}
            </h2>
            <p className="mb-6 text-[var(--color-muted)]">
              {t('home.getStartedDescription', 'Create an account to host competitions and manage problem banks.')}
            </p>
            <div className="flex justify-center gap-3">
              <Link
                to="/register"
                className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                {t('home.createAccount', 'Create Account')}
              </Link>
              <Link
                to="/login"
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-5 py-2.5 font-medium text-[var(--color-foreground)] hover:bg-[var(--color-secondary)] transition-colors"
              >
                {t('home.signIn', 'Sign In')}
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
