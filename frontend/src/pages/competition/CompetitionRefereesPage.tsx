import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { competitionApi, type Referee, type RefereePermission } from '@/services/competition.api';

interface UserSearchResult {
  _id: string;
  email: string;
  nickname: string;
}

const ALL_PERMISSIONS: RefereePermission[] = [
  'manual_judge',
  'override_score',
  'add_comment',
  'extend_time',
  'pause_competition',
];

// Convert snake_case to camelCase for translation keys
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function CompetitionRefereesPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const [competitionName, setCompetitionName] = useState('');
  const [refereeEnabled, setRefereeEnabled] = useState(false);
  const [maxReferees, setMaxReferees] = useState(3);
  const [permissions, setPermissions] = useState<RefereePermission[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [newRefereeEmail, setNewRefereeEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingReferee, setIsAddingReferee] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Autocomplete state
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch competition data
  const fetchData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [compData, refereesData] = await Promise.all([
        competitionApi.get(id),
        competitionApi.getReferees(id).catch(() => []),
      ]);
      setCompetitionName(compData.name);

      // Get referee settings from competition
      const settings = (compData as { settings?: { refereeSettings?: { enabled?: boolean; maxReferees?: number; permissions?: RefereePermission[] } } }).settings;
      setRefereeEnabled(settings?.refereeSettings?.enabled || false);
      setMaxReferees(settings?.refereeSettings?.maxReferees || 3);
      setPermissions(settings?.refereeSettings?.permissions || []);
      setReferees(refereesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.fetchFailed', 'Failed to fetch data'));
    } finally {
      setIsLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced user search
  const handleSearchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce the search
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await competitionApi.searchUsers(query);
        // Filter out users who are already referees
        const filteredResults = results.filter(
          (user) => !referees.some((ref) => ref.email === user.email)
        );
        setSearchResults(filteredResults);
        setShowDropdown(filteredResults.length > 0);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [referees]);

  // Handle email input change
  const handleEmailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewRefereeEmail(value);
    handleSearchUsers(value);
  };

  // Handle selecting a user from dropdown
  const handleSelectUser = (user: UserSearchResult) => {
    setNewRefereeEmail(user.email);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleSaveSettings = async () => {
    if (!id) return;
    setIsSavingSettings(true);
    setError('');
    try {
      await competitionApi.update(id, {
        refereeSettings: {
          enabled: refereeEnabled,
          maxReferees,
          permissions,
        },
      } as unknown as Parameters<typeof competitionApi.update>[1]);
      setSuccess(t('common.saved', 'Settings saved'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.saveFailed', 'Failed to save'));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddReferee = async () => {
    if (!id || !newRefereeEmail.trim()) return;
    setIsAddingReferee(true);
    setError('');
    try {
      const referee = await competitionApi.addReferee(id, newRefereeEmail.trim());
      setReferees((prev) => [...prev, referee]);
      setNewRefereeEmail('');
      setSearchResults([]);
      setShowDropdown(false);
      setSuccess(t('competition.referee.added', 'Referee added'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.addFailed', 'Failed to add referee'));
    } finally {
      setIsAddingReferee(false);
    }
  };

  const handleRemoveReferee = async (refereeUserId: string) => {
    if (!id) return;
    try {
      await competitionApi.removeReferee(id, refereeUserId);
      setReferees((prev) => prev.filter((r) => r.userId !== refereeUserId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.removeFailed', 'Failed to remove referee'));
    }
  };

  const togglePermission = (permission: RefereePermission) => {
    setPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoading size={48} state="loading" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link
              to={`/competitions/${id}`}
              className="text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold">{t('competition.manageReferees', 'Manage Referees')}</h1>
          </div>
          <p className="text-[var(--color-muted)]">{competitionName}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">
          {error}
          <button onClick={() => setError('')} className="ml-4 underline">
            {t('common.dismiss', 'Dismiss')}
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-[var(--color-success-bg)] p-4 text-[var(--color-success)]">
          {success}
        </div>
      )}

      {/* Referee Settings */}
      <GlassCard className="p-6">
        <h2 className="mb-4 text-lg font-semibold">{t('competition.referee.title', 'Referee Settings')}</h2>

        <div className="space-y-6">
          {/* Enable Toggle */}
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={refereeEnabled}
              onChange={(e) => setRefereeEnabled(e.target.checked)}
              className="h-5 w-5 accent-[var(--color-primary)]"
            />
            <div>
              <span className="font-medium">{t('competition.referee.enable', 'Enable Referees')}</span>
              <p className="text-sm text-[var(--color-muted)]">
                {t('competition.referee.enableDesc', 'Allow referees to monitor and judge submissions')}
              </p>
            </div>
          </label>

          {refereeEnabled && (
            <>
              {/* Max Referees */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  {t('competition.referee.maxCount', 'Maximum Referees')}
                </label>
                <Input
                  type="number"
                  value={maxReferees}
                  onChange={(e) => setMaxReferees(Math.max(1, Math.min(10, parseInt(e.target.value) || 3)))}
                  min={1}
                  max={10}
                  className="w-32"
                />
              </div>

              {/* Permissions */}
              <div>
                <label className="mb-3 block text-sm font-medium">
                  {t('competition.referee.permissions', 'Referee Permissions')}
                </label>
                <div className="space-y-3">
                  {ALL_PERMISSIONS.map((perm) => (
                    <label key={perm} className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={permissions.includes(perm)}
                        onChange={() => togglePermission(perm)}
                        className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                      />
                      <div>
                        <span className="text-sm font-medium">
                          {t(`competition.referee.perm.${toCamelCase(perm)}`, perm.replace('_', ' '))}
                        </span>
                        <p className="text-xs text-[var(--color-muted)]">
                          {t(`competition.referee.perm.${toCamelCase(perm)}Desc`, '')}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Save Button */}
          <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
            {isSavingSettings ? t('common.saving', 'Saving...') : t('common.saveSettings', 'Save Settings')}
          </Button>
        </div>
      </GlassCard>

      {/* Referees List */}
      {refereeEnabled && (
        <GlassCard className="p-6">
          <h2 className="mb-4 text-lg font-semibold">
            {t('competition.referee.manage', 'Manage Referees')} ({referees.length}/{maxReferees})
          </h2>

          {/* Add Referee */}
          <div className="mb-6 flex gap-3">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                type="email"
                value={newRefereeEmail}
                onChange={handleEmailInputChange}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                placeholder={t('competition.referee.emailPlaceholder', 'Enter referee email address')}
                className="w-full"
                disabled={referees.length >= maxReferees}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <IconLoading size={16} state="loading" />
                </div>
              )}
              {/* Autocomplete dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] shadow-lg"
                >
                  {searchResults.map((user) => (
                    <button
                      key={user._id}
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--color-card)] transition-colors first:rounded-t-lg last:rounded-b-lg"
                      onClick={() => handleSelectUser(user)}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)]/20">
                        <svg className="h-4 w-4 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">{user.nickname || user.email}</p>
                        <p className="truncate text-xs text-[var(--color-muted)]">{user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              onClick={handleAddReferee}
              disabled={
                !newRefereeEmail.trim() ||
                isAddingReferee ||
                referees.length >= maxReferees
              }
            >
              {isAddingReferee ? t('common.adding', 'Adding...') : t('common.add', 'Add')}
            </Button>
          </div>

          <p className="mb-4 text-xs text-[var(--color-muted)]">
            {t('competition.referee.addNote', 'The user must have a registered account with this email')}
          </p>

          {/* Referees List */}
          {referees.length === 0 ? (
            <p className="text-center text-[var(--color-muted)] py-4">
              {t('competition.referee.noReferees', 'No referees added yet')}
            </p>
          ) : (
            <div className="space-y-3">
              {referees.map((referee) => (
                <div
                  key={referee.userId}
                  className="flex items-center justify-between rounded-lg bg-[var(--color-card)] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/20">
                      <svg className="h-5 w-5 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">{referee.nickname || referee.email}</p>
                      <p className="text-sm text-[var(--color-muted)]">{referee.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        referee.isOnline
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-[var(--color-muted)]/20 text-[var(--color-muted)]'
                      }`}
                    >
                      {referee.isOnline ? t('common.online', 'Online') : t('common.offline', 'Offline')}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[var(--color-error)] hover:bg-[var(--color-error-bg)]"
                      onClick={() => handleRemoveReferee(referee.userId)}
                    >
                      {t('common.remove', 'Remove')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* Back Button */}
      <div>
        <Link to={`/competitions/${id}`}>
          <Button variant="outline">{t('common.back', 'Back')}</Button>
        </Link>
      </div>
    </div>
  );
}
