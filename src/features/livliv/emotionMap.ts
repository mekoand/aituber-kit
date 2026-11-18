import { EmotionType } from '@/features/messages/messages'

/**
 * AITuberKit の感情タグを、LivLiv Player の setExpression に渡す id へ対応づける。
 * 標準 id（smile / angry / sad / surprised など）はモデルをまたいで同じ意味を持つ。
 * happy という標準 id はないため、モデルが smile を持つときだけ smile を使う。
 * relaxed の標準 id もない。モデル自身がその id を持つときだけ使い、近い表情へは寄せない。
 */
const HAPPY_FALLBACKS = ['smile'] as const

export function expressionIdForEmotion(
  emotion: EmotionType,
  availableIds: ReadonlySet<string>
): string | null {
  if (emotion === 'neutral') return null
  if (availableIds.has(emotion)) return emotion
  if (emotion === 'happy') {
    return HAPPY_FALLBACKS.find((id) => availableIds.has(id)) ?? null
  }
  return null
}

/** 宿主の LipSync 音量（0..1）を Player の mouthOpen に収める。非数は閉じた口。 */
export function clampMouthOpen(volume: number): number {
  if (!Number.isFinite(volume) || volume <= 0) return 0
  if (volume >= 1) return 1
  return volume
}
