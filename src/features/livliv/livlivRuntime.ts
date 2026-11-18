import { logger } from '@/lib/logger'
import { LipSync } from '@/features/lipSync/lipSync'
import { EmotionType } from '@/features/messages/messages'
import type { PlaybackObserver } from '@/features/messages/characterRenderer'
import { expressionIdForEmotion } from './emotionMap'
import { bindHostMouth } from './mouthDriver'

type PlayerModule = typeof import('@livliv-dev/player')
type PlayerInstance = InstanceType<PlayerModule['Player']>

export class LivLivWebGlUnsupportedError extends Error {
  constructor() {
    super('LivLiv Player needs WebGL2')
    this.name = 'LivLivWebGlUnsupportedError'
  }
}

function isIgnorableLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (error.name === 'AbortError') return true
  const code = (error as { code?: unknown }).code
  return code === 'released'
}

export class LivLivSession {
  readonly player: PlayerInstance
  readonly lipSync: LipSync
  private readonly removeMouth: () => void
  onContextLost?: () => void

  private constructor(
    player: PlayerInstance,
    lipSync: LipSync,
    removeMouth: () => void
  ) {
    this.player = player
    this.lipSync = lipSync
    this.removeMouth = removeMouth
  }

  static async open(
    canvas: HTMLCanvasElement,
    lang?: string
  ): Promise<LivLivSession> {
    const { Player } = await import('@livliv-dev/player')
    if (!Player.isSupported()) {
      throw new LivLivWebGlUnsupportedError()
    }

    const player = new Player(canvas, {
      idle: true,
      followPointer: 'page',
      lang,
    })
    const lipSync = new LipSync(new AudioContext(), { forceStart: true })
    const removeMouth = bindHostMouth(player, () => lipSync.update().volume)
    const session = new LivLivSession(player, lipSync, removeMouth)
    player.onContextLost = () => {
      logger.warn('LivLiv Player WebGL context lost')
      session.onContextLost?.()
    }
    return session
  }

  async load(source: string | Blob): Promise<void> {
    try {
      await this.player.load(source)
    } catch (error) {
      if (isIgnorableLoadError(error)) return
      throw error
    }
  }

  applyEmotion(emotion: EmotionType): void {
    const available = new Set(this.player.expressions.map((item) => item.id))
    this.player.setExpression(expressionIdForEmotion(emotion, available))
  }

  async speak(
    buffer: ArrayBuffer,
    emotion: EmotionType,
    isNeedDecode: boolean = true,
    observer?: PlaybackObserver,
    sampleRate: number = 24000
  ): Promise<void> {
    this.applyEmotion(emotion)
    await new Promise<void>((resolve) => {
      void this.lipSync.playFromArrayBuffer(
        buffer,
        () => resolve(),
        isNeedDecode,
        sampleRate,
        observer?.onPlaybackStart
      )
    })
  }

  async speakPcm16Stream(
    stream: ReadableStream<Uint8Array>,
    emotion: EmotionType,
    sampleRate: number,
    observer?: PlaybackObserver
  ): Promise<void> {
    this.applyEmotion(emotion)
    await this.lipSync.playPcm16Stream(
      stream,
      undefined,
      sampleRate,
      observer?.onPlaybackStart
    )
  }

  stopSpeaking(): void {
    this.lipSync.stopCurrentPlayback()
    this.player.params.mouthOpen = 0
  }

  resetToIdle(): void {
    this.stopSpeaking()
    this.player.setExpression(null)
  }

  dispose(): void {
    this.onContextLost = undefined
    this.player.onContextLost = undefined
    this.removeMouth()
    this.lipSync.stopCurrentPlayback()
    this.player.dispose({ release: true })
    void this.lipSync.audio.close().catch(() => {})
  }
}

let current: LivLivSession | null = null
let attachSerial = 0

export function getLivLivSession(): LivLivSession | null {
  return current
}

export async function attachLivLivSession(
  canvas: HTMLCanvasElement,
  lang?: string
): Promise<LivLivSession | null> {
  const serial = ++attachSerial
  const session = await LivLivSession.open(canvas, lang)
  if (serial !== attachSerial) {
    session.dispose()
    return null
  }
  current = session
  return session
}

export function cancelPendingLivLivAttach(): void {
  attachSerial += 1
}

export function detachLivLivSession(session: LivLivSession): void {
  if (current === session) current = null
  session.dispose()
}
