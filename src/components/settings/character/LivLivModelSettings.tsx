import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TextButton } from '@/components/textButton'
import { ToggleSwitch } from '@/components/toggleSwitch'
import { settingsControlClass } from '@/components/settings/formStyles'
import {
  listHostedLivLivModels,
  listLocalLivLivModels,
  reportLivLivModelError,
  selectLocalLivLivFile,
  useLocalLivLivRevision,
  type LivLivModelEntry,
} from '@/features/livliv/models'
import menuStore from '@/features/stores/menu'
import settingsStore from '@/features/stores/settings'

export function LivLivModelSettings() {
  const { t } = useTranslation()
  const selectedPath = settingsStore((s) => s.selectedLivlivPath)
  const showWatermark = settingsStore((s) => s.showLivlivWatermark)
  const watermarkLabel = t('LivLiv.ShowSampleWatermark')
  const revision = useLocalLivLivRevision()
  const [hosted, setHosted] = useState<LivLivModelEntry[]>([])
  const [local, setLocal] = useState<LivLivModelEntry[]>([])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    void listHostedLivLivModels(signal)
      .then((models) => {
        if (!signal.aborted) setHosted(models)
      })
      .catch((error) => {
        if (!signal.aborted) reportLivLivModelError('ListError', error)
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    let cancelled = false
    void listLocalLivLivModels()
      .then((models) => {
        if (!cancelled) setLocal(models)
      })
      .catch((error) => {
        if (!cancelled) reportLivLivModelError('ListError', error)
      })
    return () => {
      cancelled = true
    }
  }, [revision])

  const models = [...hosted, ...local].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  return (
    <>
      <select
        aria-label="LivLiv"
        className={`${settingsControlClass.medium} mb-2`}
        value={selectedPath}
        onChange={(event) => {
          settingsStore.setState({ selectedLivlivPath: event.target.value })
        }}
      >
        <option value="">{t('LivLiv.ChooseModel')}</option>
        {models.map(({ path, name }) => (
          <option key={path} value={path}>
            {name}
          </option>
        ))}
        {selectedPath && !models.some(({ path }) => path === selectedPath) && (
          <option value={selectedPath}>{selectedPath}</option>
        )}
      </select>
      <div className="my-2 flex flex-wrap items-center gap-3">
        <TextButton
          onClick={() => {
            const { fileInput } = menuStore.getState()
            if (!fileInput) return
            fileInput.accept = '.livliv'
            fileInput.onchange = () => {
              const file = fileInput.files?.[0]
              if (file) void selectLocalLivLivFile(file)
              fileInput.value = ''
            }
            fileInput.click()
          }}
        >
          {t('LivLiv.OpenModel')}
        </TextButton>
        <a
          href="https://github.com/livliv-dev/player#featured-characters"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline"
        >
          {t('LivLiv.Characters')}
        </a>
      </div>
      <p className="my-2 text-sm">{t('LivLiv.FileInfo')}</p>
      <div className="my-2 flex flex-wrap items-center gap-3 text-sm">
        <span>{watermarkLabel}</span>
        <ToggleSwitch
          ariaLabel={watermarkLabel}
          enabled={showWatermark}
          onChange={(enabled) => {
            settingsStore.setState({ showLivlivWatermark: enabled })
          }}
        />
      </div>
    </>
  )
}
