'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ModelLoadingOverlay from '@/components/modelLoadingOverlay'
import { reportViewerError } from '@/components/common/ErrorBoundary'
import {
  attachLivLivSession,
  cancelPendingLivLivAttach,
  detachLivLivSession,
  getLivLivSession,
  LivLivSession,
  LivLivWebGlUnsupportedError,
} from '@/features/livliv/livlivRuntime'
import { uploadLivlivFile } from '@/features/livliv/uploadLivlivFile'
import { logger } from '@/lib/logger'
import settingsStore from '@/features/stores/settings'
import toastStore from '@/features/stores/toast'
import { buildUrl } from '@/utils/buildUrl'

type LivLivStageProps = {
  selectedPath: string
}

function isLivlivFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.livliv')
}

export default function LivLivComponent({ selectedPath }: LivLivStageProps) {
  const { t, i18n } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sessionRef = useRef<LivLivSession | null>(null)
  const [canvasEpoch, setCanvasEpoch] = useState(0)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unsupported, setUnsupported] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || unsupported) return

    let alive = true
    let session: LivLivSession | null = null

    void attachLivLivSession(canvas, i18n.language)
      .then((created) => {
        if (!created) return
        if (!alive) {
          detachLivLivSession(created)
          return
        }
        session = created
        sessionRef.current = created
        created.onContextLost = () => {
          if (!alive) return
          setReady(false)
          setCanvasEpoch((epoch) => epoch + 1)
        }
        setReady(true)
      })
      .catch((error: unknown) => {
        if (!alive) return
        if (error instanceof LivLivWebGlUnsupportedError) {
          setUnsupported(true)
          return
        }
        logger.error('Failed to start LivLiv Player:', error)
        reportViewerError('livliv-viewer', error)
      })

    return () => {
      alive = false
      setReady(false)
      if (session) {
        if (sessionRef.current === session) sessionRef.current = null
        detachLivLivSession(session)
      } else {
        cancelPendingLivLivAttach()
      }
    }
  }, [canvasEpoch, i18n.language, unsupported])

  useEffect(() => {
    if (!ready || !selectedPath) return
    const session = getLivLivSession()
    if (!session) return

    let cancelled = false
    const showLoading = window.setTimeout(() => {
      if (!cancelled) setLoading(true)
    }, 0)
    session
      .load(buildUrl(selectedPath))
      .catch((error: unknown) => {
        if (cancelled) return
        logger.error('Failed to load LivLiv model:', error)
        const detail = error instanceof Error ? error.message : ''
        toastStore.getState().addToast({
          message: detail
            ? `${t('LivLiv.LoadError')} ${detail}`
            : t('LivLiv.LoadError'),
          type: 'error',
          tag: 'livliv-load-error',
        })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      window.clearTimeout(showLoading)
    }
  }, [ready, selectedPath, t])

  const importFile = useCallback(
    async (file: File) => {
      if (!isLivlivFile(file)) return
      setLoading(true)
      try {
        const uploadedPath = await uploadLivlivFile(file)
        settingsStore.setState({ selectedLivlivPath: uploadedPath })
      } catch (error) {
        logger.error('Failed to import LivLiv model:', error)
        toastStore.getState().addToast({
          message: t('LivLiv.LoadError'),
          type: 'error',
          tag: 'livliv-upload-error',
        })
        setLoading(false)
      }
    },
    [t]
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const file = event.dataTransfer.files?.[0]
      if (file) void importFile(file)
    },
    [importFile]
  )

  if (unsupported) {
    return (
      <div className="flex h-full w-full items-center justify-center px-6 text-center">
        <p className="max-w-md rounded-2xl bg-black/45 px-4 py-3 text-sm font-bold text-white">
          {t('LivLiv.WebGLUnsupported')}
        </p>
      </div>
    )
  }

  return (
    <div
      className="relative h-full w-full"
      data-testid="livliv-stage"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <canvas
        key={canvasEpoch}
        ref={canvasRef}
        className="h-full w-full"
        aria-label="LivLiv"
      />
      {!selectedPath && !loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">
          <p className="max-w-md rounded-2xl bg-black/45 px-4 py-3 text-sm font-bold text-white">
            {t('LivLiv.NoModel')}
          </p>
        </div>
      )}
      {loading && <ModelLoadingOverlay />}
    </div>
  )
}
