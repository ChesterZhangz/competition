import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { problemApi } from '@/services/problem.api';
import { useProblemStore } from '@/store/problemStore';

type Visibility = 'private' | 'public' | 'shared';

export function ProblemBankEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateBank } = useProblemStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBank = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const bank = await problemApi.banks.get(id);
        setName(bank.name);
        setDescription(bank.description || '');
        setVisibility(bank.visibility);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error.fetchFailed', 'Failed to fetch data'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBank();
  }, [id, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t('problem.nameRequired', 'Problem bank name is required'));
      return;
    }

    if (!id) return;

    setIsSubmitting(true);
    try {
      const updated = await problemApi.banks.update(id, {
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
      });
      updateBank(id, updated);
      navigate(`/problems/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.updateFailed', 'Failed to update'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoading size={48} state="loading" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">{t('problem.editBank', 'Edit Problem Bank')}</h1>

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
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/problems/${id}`)}
              disabled={isSubmitting}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
