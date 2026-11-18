import type { ModelSource } from '@livliv-dev/player'
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import i18next from 'i18next'
import { create } from 'zustand'
import settingsStore from '@/features/stores/settings'
import toastStore from '@/features/stores/toast'
import { logger } from '@/lib/logger'
import { buildUrl } from '@/utils/buildUrl'

export type LivLivModelEntry = { path: string; name: string }

interface ModelDatabase extends DBSchema {
  models: { key: string; value: Blob }
}

const localPrefix = 'livliv-local:'
let database: Promise<IDBPDatabase<ModelDatabase>> | undefined
let latestImport = 0

function openModelDatabase() {
  database ??= openDB<ModelDatabase>('aitubekit-livliv', 1, {
    upgrade(db) {
      db.createObjectStore('models')
    },
  }).catch((error) => {
    database = undefined
    throw error
  })
  return database
}

export const useLocalLivLivRevision = create<number>(() => 0)

export async function listLocalLivLivModels(): Promise<LivLivModelEntry[]> {
  const db = await openModelDatabase()
  return (await db.getAllKeys('models')).map((path) => ({
    path,
    name: path.slice(localPrefix.length),
  }))
}

export async function listHostedLivLivModels(
  signal: AbortSignal
): Promise<LivLivModelEntry[]> {
  const response = await fetch(buildUrl('/api/get-livliv-list'), { signal })
  if (!response.ok) {
    throw new Error(`LivLiv model list returned HTTP ${response.status}`)
  }
  const models: unknown = await response.json()
  if (
    !Array.isArray(models) ||
    models.some(
      (model) =>
        typeof model?.path !== 'string' || typeof model?.name !== 'string'
    )
  ) {
    throw new Error('Invalid LivLiv model list')
  }
  return models
}

export function isHostedLivLivPackage(path: string) {
  return path.startsWith('/livliv/') && /\.livliv$/i.test(path)
}

function findModelManifest(files: Map<string, Blob>) {
  return [...files]
    .filter(([name]) => name === 'model.json' || name.endsWith('/model.json'))
    .sort(([a], [b]) => a.length - b.length)[0]
}

export async function resolveLivLivModel(
  path: string,
  hideWatermark: boolean,
  signal: AbortSignal
): Promise<ModelSource> {
  if (path.startsWith(localPrefix)) {
    const db = await openModelDatabase()
    const file = await db.get('models', path)
    if (!file) throw new Error('LivLiv model is missing from browser storage')
    return file
  }

  const url = buildUrl(path)
  if (!hideWatermark) return url

  const response = await fetch(buildUrl('/livliv/samples.json'), { signal })
  if (response.status === 404) return url
  if (!response.ok) {
    throw new Error(`LivLiv sample list returned HTTP ${response.status}`)
  }
  const samples: unknown = await response.json()
  if (
    !Array.isArray(samples) ||
    samples.some((samplePath) => typeof samplePath !== 'string')
  ) {
    throw new Error('Invalid LivLiv sample list')
  }
  if (!samples.some((samplePath) => buildUrl(samplePath) === url)) return url

  const { modelFiles } = await import('@livliv-dev/player')
  const files = await modelFiles(url, { signal })
  const manifest = findModelManifest(files)
  if (manifest) {
    const [name, blob] = manifest
    const model = JSON.parse(await blob.text())
    const mark = model?.meta?.watermark
    // Player 0.5.1 draws the mark from the manifest it loads.
    if (mark?.kind === 'livliv' && mark.center === false) {
      model.meta.watermark = { kind: 'none' }
      files.set(name, new Blob([JSON.stringify(model)]))
    }
  }
  return files
}

export function reportLivLivModelError(
  kind: 'ImportError' | 'ListError' | 'LoadError',
  error: unknown
) {
  logger.error(`LivLiv ${kind}:`, error)
  toastStore.getState().addToast({
    message: i18next.t(`LivLiv.${kind}`),
    type: 'error',
    tag: `livliv-${kind}`,
  })
}

export async function selectLocalLivLivFile(file: File): Promise<void> {
  const importId = ++latestImport
  const previousPath = settingsStore.getState().selectedLivlivPath
  try {
    if (
      !/^.+\.livliv$/i.test(file.name) ||
      file.size === 0 ||
      file.size > 200 * 1024 * 1024
    ) {
      throw new Error('Expected a nonempty .livliv file of at most 200 MiB')
    }

    const { modelFiles } = await import('@livliv-dev/player')
    const files = await modelFiles(file)
    const manifest = findModelManifest(files)?.[1]
    if (!manifest) throw new Error('LivLiv package is missing model.json')
    const model = JSON.parse(await manifest.text())
    if (!model || typeof model !== 'object' || Array.isArray(model)) {
      throw new Error('Invalid LivLiv model format')
    }

    const db = await openModelDatabase()
    if (importId !== latestImport) return
    const transaction = db.transaction('models', 'readwrite')
    const extension = file.name.slice(-7)
    const baseName = file.name.slice(0, -7)
    let path = localPrefix + file.name
    for (let copy = 2; await transaction.store.getKey(path); copy++) {
      path = `${localPrefix}${baseName} (${copy})${extension}`
    }
    await transaction.store.add(file, path)
    await transaction.done
    const settings = settingsStore.getState()
    if (
      importId === latestImport &&
      settings.modelType === 'livliv' &&
      settings.selectedLivlivPath === previousPath
    ) {
      settingsStore.setState({ selectedLivlivPath: path })
    }
    useLocalLivLivRevision.setState((revision) => revision + 1, true)
  } catch (error) {
    if (importId === latestImport) reportLivLivModelError('ImportError', error)
  }
}
