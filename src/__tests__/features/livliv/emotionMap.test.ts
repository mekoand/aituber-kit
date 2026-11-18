import {
  clampMouthOpen,
  expressionIdForEmotion,
} from '@/features/livliv/emotionMap'

describe('expressionIdForEmotion', () => {
  const standard = new Set(['smile', 'shy', 'angry', 'sad', 'surprised'])

  it('maps AITuberKit emotions onto LivLiv expression ids the model actually has', () => {
    expect(expressionIdForEmotion('neutral', standard)).toBeNull()
    expect(expressionIdForEmotion('happy', standard)).toBe('smile')
    expect(expressionIdForEmotion('angry', standard)).toBe('angry')
    expect(expressionIdForEmotion('sad', standard)).toBe('sad')
    expect(expressionIdForEmotion('surprised', standard)).toBe('surprised')
  })

  it('keeps relaxed neutral unless the model itself has that id', () => {
    expect(expressionIdForEmotion('relaxed', standard)).toBeNull()
    expect(
      expressionIdForEmotion('relaxed', new Set([...standard, 'relaxed']))
    ).toBe('relaxed')
  })

  it('prefers an exact happy id over smile', () => {
    expect(expressionIdForEmotion('happy', new Set(['happy', 'smile']))).toBe(
      'happy'
    )
  })

  it('returns null when the model has no matching expression', () => {
    expect(expressionIdForEmotion('angry', new Set(['smile']))).toBeNull()
    expect(expressionIdForEmotion('happy', new Set(['shy']))).toBeNull()
  })
})

describe('clampMouthOpen', () => {
  it('keeps host volume inside 0..1', () => {
    expect(clampMouthOpen(0)).toBe(0)
    expect(clampMouthOpen(0.4)).toBe(0.4)
    expect(clampMouthOpen(1)).toBe(1)
    expect(clampMouthOpen(1.4)).toBe(1)
    expect(clampMouthOpen(-0.2)).toBe(0)
    expect(clampMouthOpen(Number.NaN)).toBe(0)
    expect(clampMouthOpen(Number.POSITIVE_INFINITY)).toBe(0)
  })
})
