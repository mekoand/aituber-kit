import { clampMouthOpen } from './emotionMap'

export type MouthFrame = {
  params: { mouthOpen: number }
}

export type MouthHost = {
  use(driver: { order?: number; update(frame: MouthFrame): void }): () => void
}

let liveVolume: number | null = null

export function setLivLivLiveVolume(volume: number | null): void {
  liveVolume = volume
}

/**
 * 宿主の音量を毎フレーム mouthOpen へ書く。
 * Player の lip sync ドライバと同じ order（10）で、idle が口を上書きしない位置に置く。
 * 母音（vowel）は宿主の LipSync が音量しか出さないため、ここでは動かさない。
 */
export function bindHostMouth(
  player: MouthHost,
  readVolume: () => number
): () => void {
  return player.use({
    order: 10,
    update(frame) {
      frame.params.mouthOpen = clampMouthOpen(liveVolume ?? readVolume())
    },
  })
}
