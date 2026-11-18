import { bindHostMouth, MouthHost } from '@/features/livliv/mouthDriver'

describe('bindHostMouth', () => {
  it('writes the host volume into mouthOpen on each frame', () => {
    let driver: { update: (frame: { params: { mouthOpen: number } }) => void } =
      { update: () => {} }
    const player: MouthHost = {
      use: (next) => {
        driver = next
        return () => {}
      },
    }

    bindHostMouth(player, () => 0.62)
    const frame = { params: { mouthOpen: 0 } }
    driver.update(frame)

    expect(frame.params.mouthOpen).toBe(0.62)
  })

  it('closes the mouth when the host volume is not a usable number', () => {
    let driver: { update: (frame: { params: { mouthOpen: number } }) => void } =
      { update: () => {} }
    const player: MouthHost = {
      use: (next) => {
        driver = next
        return () => {}
      },
    }

    bindHostMouth(player, () => Number.NaN)
    const frame = { params: { mouthOpen: 0.8 } }
    driver.update(frame)

    expect(frame.params.mouthOpen).toBe(0)
  })
})
