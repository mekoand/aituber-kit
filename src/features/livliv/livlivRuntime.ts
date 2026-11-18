import type { Player } from '@livliv-dev/player'
import { LipSync } from '@/features/lipSync/lipSync'
import type { CharacterRenderer } from '@/features/messages/characterRenderer'
import type { EmotionType } from '@/features/messages/messages'
import settingsStore from '@/features/stores/settings'
import { logger } from '@/lib/logger'
import { expressionIdForEmotion } from './emotionMap'

type LivLivFace = Pick<Player, 'expressions' | 'setExpression'>

let lipSync: LipSync | undefined
let face: LivLivFace | undefined
let emotion: EmotionType = 'neutral'

// Speech continues while a canvas or model is loading and on browsers without WebGL2.
function getLipSync(): LipSync {
  if (lipSync) return lipSync

  const audio = new LipSync(new AudioContext(), { forceStart: true })
  lipSync = audio
  const unsubscribe = settingsStore.subscribe(({ modelType }) => {
    if (modelType === 'livliv') return
    unsubscribe()
    lipSync = undefined
    emotion = 'neutral'
    audio.stopCurrentPlayback()
    void audio.audio.close().catch((error) => {
      logger.warn('Failed to close LivLiv audio:', error)
    })
  })
  return audio
}

export function bindLivLivFace(player: LivLivFace): () => void {
  face = player
  return () => {
    if (face === player) face = undefined
  }
}

export function refreshLivLivExpression() {
  if (!face) return
  const available = new Set(face.expressions.map(({ id }) => id))
  face.setExpression(expressionIdForEmotion(emotion, available))
}

function setEmotion(next: EmotionType) {
  emotion = next
  refreshLivLivExpression()
}

export function readLivLivVolume(): number {
  return lipSync?.update().volume ?? 0
}

export const livlivRenderer: CharacterRenderer = {
  async speak(buffer, talk, isNeedDecode, observer) {
    const audio = getLipSync()
    setEmotion(talk.emotion)
    await new Promise<void>((resolve, reject) => {
      audio
        .playFromArrayBuffer(
          buffer,
          resolve,
          isNeedDecode,
          24000,
          observer?.onPlaybackStart
        )
        .catch(reject)
    })
  },
  async speakPcm16Stream(stream, talk, sampleRate, observer) {
    const audio = getLipSync()
    setEmotion(talk.emotion)
    await audio.playPcm16Stream(
      stream,
      undefined,
      sampleRate,
      observer?.onPlaybackStart
    )
  },
  stopSpeaking() {
    lipSync?.stopCurrentPlayback()
  },
  resetToIdle() {
    setEmotion('neutral')
  },
}
