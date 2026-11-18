import path from 'path'
import {
  isPathInsideDirectory,
  livlivUploadFileName,
} from '@/features/livliv/livlivFileName'

describe('livlivUploadFileName', () => {
  it('keeps a plain .livliv file name', () => {
    expect(livlivUploadFileName('sena.livliv')).toBe('sena.livliv')
    expect(livlivUploadFileName('Sena.LIVLIV')).toBe('Sena.LIVLIV')
  })

  it('uses only the base name from a path', () => {
    expect(livlivUploadFileName('../secrets/sena.livliv')).toBe('sena.livliv')
    expect(livlivUploadFileName('C:\\models\\sena.livliv')).toBe('sena.livliv')
  })

  it('rejects names that are not a .livliv file', () => {
    expect(livlivUploadFileName(null)).toBeNull()
    expect(livlivUploadFileName('')).toBeNull()
    expect(livlivUploadFileName('sena.vrm')).toBeNull()
    expect(livlivUploadFileName('.livliv')).toBeNull()
    expect(livlivUploadFileName('sena.livliv.png')).toBeNull()
  })
})

describe('isPathInsideDirectory', () => {
  it('accepts a file inside the directory and rejects escapes', () => {
    const directory = path.join('/tmp', 'livliv')
    expect(
      isPathInsideDirectory(directory, path.join(directory, 'sena.livliv'))
    ).toBe(true)
    expect(isPathInsideDirectory(directory, directory)).toBe(false)
    expect(
      isPathInsideDirectory(directory, path.join('/tmp', 'other.livliv'))
    ).toBe(false)
  })
})
