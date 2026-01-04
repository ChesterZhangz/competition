import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      <div className="mb-8 text-9xl font-bold text-[var(--color-primary)]">404</div>
      <h1 className="mb-4 text-3xl font-bold">
        {t('error.notFoundTitle', 'Page Not Found')}
      </h1>
      <p className="mb-8 max-w-md text-[var(--color-muted)]">
        {t('error.notFoundDesc', 'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.')}
      </p>
      <div className="flex gap-4">
        <Link to="/">
          <Button>{t('error.goHome', 'Go to Home')}</Button>
        </Link>
        <Button variant="outline" onClick={() => window.history.back()}>
          {t('error.goBack', 'Go Back')}
        </Button>
      </div>
    </div>
  );
}
