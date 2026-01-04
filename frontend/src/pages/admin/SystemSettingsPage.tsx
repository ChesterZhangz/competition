import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { adminApi } from '@/services/admin.api';
import type { AllowedEmailDomains } from '@/services/admin.api';
import { useAuthStore } from '@/store';

export function SystemSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const [emailDomainSettings, setEmailDomainSettings] = useState<AllowedEmailDomains>({
    enabled: false,
    domains: [],
  });
  const [newDomain, setNewDomain] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Check if user is super_admin
  const isSuperAdmin = currentUser?.role === 'super_admin';

  useEffect(() => {
    // Redirect if not super_admin
    if (!isSuperAdmin) {
      navigate('/admin');
      return;
    }
    fetchSettings();
  }, [isSuperAdmin, navigate]);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError('');
    try {
      const domains = await adminApi.getAllowedEmailDomains();
      setEmailDomainSettings(domains);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.fetchFailed', 'Failed to fetch data'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEnabled = () => {
    setEmailDomainSettings((prev) => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  };

  const handleAddDomain = () => {
    const domain = newDomain.toLowerCase().trim();
    if (!domain) return;

    // Validate domain format
    const domainPattern = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
    if (!domainPattern.test(domain)) {
      setError(t('admin.invalidDomainFormat', 'Invalid domain format'));
      return;
    }

    if (emailDomainSettings.domains.includes(domain)) {
      setError(t('admin.domainExists', 'Domain already exists'));
      return;
    }

    setEmailDomainSettings((prev) => ({
      ...prev,
      domains: [...prev.domains, domain],
    }));
    setNewDomain('');
    setError('');
  };

  const handleRemoveDomain = (domain: string) => {
    setEmailDomainSettings((prev) => ({
      ...prev,
      domains: prev.domains.filter((d) => d !== domain),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      await adminApi.updateAllowedEmailDomains(emailDomainSettings);
      setSuccessMessage(t('admin.settingsSaved', 'Settings saved successfully'));
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.actionFailed', 'Action failed'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoading size={48} state="loading" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/users">
          <Button variant="ghost" size="sm">
            &larr; {t('common.back', 'Back')}
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">{t('admin.systemSettings', 'System Settings')}</h1>
      </div>

      {/* Super Admin Only Notice */}
      <div className="rounded-lg bg-[var(--color-red-bg)] p-4">
        <p className="text-sm text-[var(--color-red)]">
          <strong>{t('admin.superAdminOnly', 'Super Admin Only')}</strong>:{' '}
          {t('admin.superAdminOnlyDesc', 'These settings can only be modified by super administrators.')}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">{error}</div>
      )}

      {successMessage && (
        <div className="rounded-lg bg-[var(--color-success-bg)] p-4 text-[var(--color-success)]">
          {successMessage}
        </div>
      )}

      {/* Email Domain Whitelist */}
      <GlassCard className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {t('admin.emailDomainWhitelist', 'Email Domain Whitelist')}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {t(
                'admin.emailDomainWhitelistDesc',
                'Control which email domains are allowed to register. When enabled, only users with email addresses from the specified domains can create accounts.'
              )}
            </p>
          </div>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="mb-6 flex items-center justify-between rounded-lg border border-[var(--color-border)] p-4">
          <div>
            <p className="font-medium">
              {t('admin.enableDomainRestriction', 'Enable Domain Restriction')}
            </p>
            <p className="text-sm text-[var(--color-muted)]">
              {emailDomainSettings.enabled
                ? t('admin.domainRestrictionEnabled', 'Only specified domains can register')
                : t('admin.domainRestrictionDisabled', 'Anyone can register with any email')}
            </p>
          </div>
          <button
            onClick={handleToggleEnabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              emailDomainSettings.enabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                emailDomainSettings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Domain List */}
        <div className={emailDomainSettings.enabled ? '' : 'pointer-events-none opacity-50'}>
          <h3 className="mb-3 font-medium">{t('admin.allowedDomains', 'Allowed Domains')}</h3>

          {/* Add Domain */}
          <div className="mb-4 flex gap-2">
            <Input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder={t('admin.domainPlaceholder', 'e.g., example.edu or *.edu.cn')}
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
            />
            <Button onClick={handleAddDomain} disabled={!newDomain.trim()}>
              {t('admin.addDomain', 'Add')}
            </Button>
          </div>

          {/* Domain Format Hint */}
          <p className="mb-4 text-xs text-[var(--color-muted)]">
            {t(
              'admin.domainFormatHint',
              'Use *.example.com to allow all subdomains (e.g., *.edu.cn allows student.edu.cn, teacher.edu.cn, etc.)'
            )}
          </p>

          {/* Domain Tags */}
          <div className="flex flex-wrap gap-2">
            {emailDomainSettings.domains.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">
                {t('admin.noDomains', 'No domains added. When enabled with no domains, no one can register.')}
              </p>
            ) : (
              emailDomainSettings.domains.map((domain) => (
                <span
                  key={domain}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-sm"
                >
                  <span className="font-mono">@{domain}</span>
                  <button
                    onClick={() => handleRemoveDomain(domain)}
                    className="text-[var(--color-muted)] hover:text-[var(--color-error)]"
                  >
                    &times;
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end border-t border-[var(--color-border)] pt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <IconLoading size={16} state="loading" />
                <span className="ml-2">{t('common.saving', 'Saving...')}</span>
              </>
            ) : (
              t('common.save', 'Save')
            )}
          </Button>
        </div>
      </GlassCard>

      {/* Additional Settings Section (placeholder for future settings) */}
      <GlassCard className="p-6">
        <h2 className="mb-4 text-xl font-semibold">{t('admin.otherSettings', 'Other Settings')}</h2>
        <p className="text-sm text-[var(--color-muted)]">
          {t('admin.moreSettingsComingSoon', 'More settings options will be available in future updates.')}
        </p>
      </GlassCard>
    </div>
  );
}
