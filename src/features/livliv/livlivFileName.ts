import path from 'path'

const MAX_FILE_NAME_LENGTH = 180

/**
 * アップロードされた .livliv のファイル名を、public/livliv 直下に置ける名前へ正規化する。
 * パス区切りや空の名前は受け取らない。
 */
export function livlivUploadFileName(
  original: string | null | undefined
): string | null {
  if (!original) return null
  const normalized = original.replace(/\\/g, '/')
  const base = path.basename(normalized)
  if (!base || base !== path.posix.basename(base)) return null
  if (base.length > MAX_FILE_NAME_LENGTH) return null
  if (base.includes('\0') || base.includes('/') || base.includes('\\')) {
    return null
  }
  if (!base.toLowerCase().endsWith('.livliv')) return null
  if (base.toLowerCase() === '.livliv') return null
  return base
}

export function isPathInsideDirectory(
  directory: string,
  target: string
): boolean {
  const relative = path.relative(directory, target)
  return (
    relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
  )
}
