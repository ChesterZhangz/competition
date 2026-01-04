import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { PreviewModeSelector, type PreviewMode } from '@/components/competition/PreviewModeSelector';
import { StyleEditor } from '@/components/competition/StyleEditor';
import { CompetitionPreview } from '@/components/competition/CompetitionPreview';
import { competitionApi } from '@/services/competition.api';
import {
  type CompetitionDisplaySettings,
  DEFAULT_DISPLAY_SETTINGS,
} from '@/types/competition';

interface Competition {
  _id: string;
  name: string;
  description?: string;
  type: string;
  displaySettings?: CompetitionDisplaySettings;
}

export function CompetitionPreviewPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('style');
  const [displaySettings, setDisplaySettings] = useState<CompetitionDisplaySettings>(
    DEFAULT_DISPLAY_SETTINGS
  );
  const [isSimulating, setIsSimulating] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCompetition = useCallback(async () => {
    if (!id) return;
    try {
      const data = await competitionApi.get(id);
      setCompetition(data);
      if (data.displaySettings) {
        setDisplaySettings(data.displaySettings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.fetchFailed', 'Failed to fetch data'));
    } finally {
      setIsLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchCompetition();
  }, [fetchCompetition]);

  const handleSettingsChange = (newSettings: CompetitionDisplaySettings) => {
    setDisplaySettings(newSettings);
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await competitionApi.update(id, { displaySettings } as Partial<Competition>);
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.saveFailed', 'Failed to save'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartSimulation = () => {
    setIsSimulating(true);
  };

  const handleSimulationEnd = () => {
    setIsSimulating(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoading size={48} state="loading" />
      </div>
    );
  }

  if (error || !competition) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">
          {error}
        </div>
        <Button onClick={() => navigate('/competitions')}>{t('common.back', 'Back')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('competition.preview.title', 'Competition Preview')}</h1>
          <p className="text-[var(--color-muted)]">{competition.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/competitions/${id}`)}>
            {t('common.back', 'Back')}
          </Button>
          {previewMode === 'edit' && hasUnsavedChanges && (
            <Button onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </Button>
          )}
        </div>
      </div>

      {/* Mode Selector */}
      <PreviewModeSelector value={previewMode} onChange={setPreviewMode} />

      {/* Content based on mode */}
      {previewMode === 'style' && (
        <div className="space-y-6">
          <GlassCard className="p-4">
            <p className="text-center text-[var(--color-muted)]">
              {t('competition.preview.styleDescription', 'Preview how your competition will look with the current settings.')}
            </p>
          </GlassCard>
          <CompetitionPreview settings={displaySettings} />
        </div>
      )}

      {previewMode === 'simulate' && (
        <div className="space-y-6">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{t('competition.preview.simulateTitle', 'Simulation Mode')}</h3>
                <p className="text-sm text-[var(--color-muted)]">
                  {isSimulating
                    ? t('competition.preview.simulateRunning', 'Simulation is running...')
                    : t('competition.preview.simulateReady', 'Click Start to simulate the competition flow')}
                </p>
              </div>
              <Button
                onClick={isSimulating ? handleSimulationEnd : handleStartSimulation}
                variant={isSimulating ? 'outline' : 'default'}
              >
                {isSimulating
                  ? t('competition.preview.stopSimulation', 'Stop')
                  : t('competition.preview.startSimulation', 'Start Simulation')}
              </Button>
            </div>
          </GlassCard>
          <CompetitionPreview
            settings={displaySettings}
            isSimulating={isSimulating}
            onSimulationEnd={handleSimulationEnd}
          />
        </div>
      )}

      {previewMode === 'edit' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Editor Panel */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {t('competition.preview.editSettings', 'Edit Settings')}
            </h3>
            <StyleEditor settings={displaySettings} onChange={handleSettingsChange} />
          </div>

          {/* Live Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {t('competition.preview.livePreview', 'Live Preview')}
              </h3>
              {hasUnsavedChanges && (
                <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs text-yellow-600 dark:text-yellow-400">
                  {t('common.unsavedChanges', 'Unsaved changes')}
                </span>
              )}
            </div>
            <div className="sticky top-4">
              <CompetitionPreview settings={displaySettings} />
            </div>
          </div>
        </div>
      )}

      {/* Quick Info */}
      <GlassCard className="p-4">
        <div className="grid gap-4 text-center sm:grid-cols-3">
          <div>
            <p className="text-sm text-[var(--color-muted)]">
              {t('competition.display.currentLayout', 'Layout')}
            </p>
            <p className="font-semibold capitalize">{t(`competition.display.${displaySettings.layout}`, displaySettings.layout)}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted)]">
              {t('competition.display.questionsPerPage', 'Questions per Page')}
            </p>
            <p className="font-semibold">{displaySettings.questionsPerPage}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted)]">
              {t('competition.display.currentTheme', 'Theme')}
            </p>
            <p className="font-semibold capitalize">{t(`competition.display.${displaySettings.theme.preset}`, displaySettings.theme.preset)}</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
