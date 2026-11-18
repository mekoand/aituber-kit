'use client'

import type { Player } from '@livliv-dev/player'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { reportViewerError } from '@/components/common/ErrorBoundary'
import ModelLoadingOverlay from '@/components/modelLoadingOverlay'
import {
  bindLivLivFace,
  readLivLivVolume,
  refreshLivLivExpression,
} from '@/features/livliv/livlivRuntime'
import {
  isHostedLivLivPackage,
  reportLivLivModelError,
  resolveLivLivModel,
  selectLocalLivLivFile,
} from '@/features/livliv/models'
import { bindHostMouth } from '@/features/livliv/mouthDriver'
import settingsStore from '@/features/stores/settings'

export default function LivLivComponent({
  selectedPath,
}: {
  selectedPath: string
}) {
  const { t } = useTranslation()
  const hideWatermark = settingsStore(
    (state) => !state.showLivlivWatermark && isHostedLivLivPackage(selectedPath)
  )
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [canvasVersion, setCanvasVersion] = useState(0)
  const [initError, setInitError] = useState<string | null>(null)
  const [settled, setSettled] = useState<{
    player: Player
    path: string
    hideWatermark: boolean
  } | null>(null)
  const hasModel = selectedPath !== ''

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !hasModel) return

    let cancelled = false
    let mountedPlayer: Player | undefined
    let unbindFace: (() => void) | undefined

    void import('@livliv-dev/player')
      .then(({ Player, LivLivError }) => {
        if (cancelled) return

        try {
          const created = new Player(canvas, { followPointer: 'page' })
          mountedPlayer = created
          unbindFace = bindLivLivFace(created)
          bindHostMouth(created, readLivLivVolume)
          created.onContextLost = () => {
            setPlayer(null)
            setCanvasVersion((version) => version + 1)
          }
          setInitError(null)
          setPlayer(created)
        } catch (error) {
          if (error instanceof LivLivError && error.code === 'no-webgl') {
            setInitError('LivLiv.WebGLUnsupported')
          } else {
            throw error
          }
        }
      })
      .catch((error) => {
        if (cancelled) return
        setInitError('Errors.ViewerRenderingError')
        reportViewerError('livliv-viewer', error)
      })

    return () => {
      cancelled = true
      if (!mountedPlayer) return
      unbindFace?.()
      mountedPlayer.onContextLost = undefined
      // StrictMode and deselection keep the canvas in the DOM for reuse.
      mountedPlayer.dispose({ release: !canvas.isConnected })
      if (canvas.isConnected) setPlayer(null)
    }
  }, [canvasVersion, hasModel])

  useEffect(() => {
    if (!player || !selectedPath) return

    const controller = new AbortController()
    const { signal } = controller
    void resolveLivLivModel(selectedPath, hideWatermark, signal)
      .then(async (source) => {
        if (signal.aborted) return
        const model = await player.load(source, { signal })
        if (signal.aborted) return
        player.view.fit = model.fullBody ? 'whole' : 'frame'
        refreshLivLivExpression()
      })
      .catch((error) => {
        if (!signal.aborted) reportLivLivModelError('LoadError', error)
      })
      .finally(() => {
        if (!signal.aborted) {
          setSettled({ player, path: selectedPath, hideWatermark })
        }
      })

    return () => controller.abort()
  }, [player, selectedPath, hideWatermark])

  const message = hasModel ? initError : 'LivLiv.NoModel'
  const loading =
    hasModel &&
    !initError &&
    (!settled ||
      settled.player !== player ||
      settled.path !== selectedPath ||
      settled.hideWatermark !== hideWatermark)

  return (
    <div
      className="relative h-full w-full"
      data-testid="livliv-stage"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        const file = event.dataTransfer.files[0]
        if (file) void selectLocalLivLivFile(file)
      }}
    >
      <canvas
        key={canvasVersion}
        ref={canvasRef}
        className="h-full w-full"
        aria-label="LivLiv"
      />
      {message && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">
          <p className="max-w-md text-balance rounded-2xl bg-black/45 px-4 py-3 text-sm font-bold text-white">
            {t(message)}
          </p>
        </div>
      )}
      {loading && <ModelLoadingOverlay />}
    </div>
  )
}
