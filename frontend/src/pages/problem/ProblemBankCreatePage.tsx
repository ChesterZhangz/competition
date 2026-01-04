import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { problemApi } from '@/services/problem.api';
import { useProblemStore } from '@/store/problemStore';

type Visibility = 'private' | 'public' | 'shared';

export function ProblemBankCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addBank } = useProblemStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t('problem.nameRequired', 'Problem bank name is required'));
      return;
    }

    setIsSubmitting(true);
    try {
      const newBank = await problemApi.banks.create({
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
      });
      addBank(newBank);
      navigate(`/problems/${newBank._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.createFailed', 'Failed to create'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">{t('problem.createBank', 'Create Problem Bank')}</h1>

      <GlassCard className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">{error}</div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              {t('problem.bankName', 'Name')} <span className="text-[var(--color-error)]">*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('problem.bankNamePlaceholder', 'Enter problem bank name')}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              {t('problem.description', 'Description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('problem.descriptionPlaceholder', 'Enter description (optional)')}
              rows={4}
              maxLength={500}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              {t('problem.visibility.label', 'Visibility')}
            </label>
            <div className="flex gap-4">
              {(['private', 'shared', 'public'] as Visibility[]).map((v) => (
                <label key={v} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="visibility"
                    value={v}
                    checked={visibility === v}
                    onChange={() => setVisibility(v)}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  <span className={`rounded-full px-2 py-1 text-sm ${
                    v === 'public' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' :
                    v === 'shared' ? 'bg-[var(--color-info-bg)] text-[var(--color-info)]' :
                    'bg-[var(--color-secondary)] text-[var(--color-muted)]'
                  }`}>
                    {t(`problem.visibility.${v}`, v)}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-sm text-[var(--color-muted)]">
              {visibility === 'private' && t('problem.visibility.privateDesc', 'Only you can access this bank')}
              {visibility === 'shared' && t('problem.visibility.sharedDesc', 'Shared with specific users')}
              {visibility === 'public' && t('problem.visibility.publicDesc', 'Anyone can view this bank')}
            </p>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/problems')}
              disabled={isSubmitting}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.creating', 'Creating...') : t('common.create', 'Create')}
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
