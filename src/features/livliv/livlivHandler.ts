import { logger } from '@/lib/logger'
import { Talk } from '@/features/messages/messages'
import type { PlaybackObserver } from '@/features/messages/characterRenderer'
import { getLivLivSession } from './livlivRuntime'

function requireSession() {
  const session = getLivLivSession()
  if (!session) {
    logger.warn('LivLiv session is not ready')
  }
  return session
}

export class LivLivHandler {
  static async speak(
    audioBuffer: ArrayBuffer,
    talk: Talk,
    isNeedDecode: boolean = true,
    observer?: PlaybackObserver
  ): Promise<void> {
    const session = requireSession()
    if (!session) return
    await session.speak(audioBuffer, talk.emotion, isNeedDecode, observer)
  }

  static async speakPcm16Stream(
    stream: ReadableStream<Uint8Array>,
    talk: Talk,
    sampleRate: number,
    observer?: PlaybackObserver
  ): Promise<void> {
    const session = requireSession()
    if (!session) return
    await session.speakPcm16Stream(stream, talk.emotion, sampleRate, observer)
  }

  static stopSpeaking(): void {
    requireSession()?.stopSpeaking()
  }

  static resetToIdle(): void {
    requireSession()?.resetToIdle()
  }
}
