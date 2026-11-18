export async function uploadLivlivFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch('/api/upload-livliv-list', {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    throw new Error(`LivLiv upload failed: ${response.status}`)
  }
  const body = (await response.json()) as { path?: unknown }
  if (typeof body.path !== 'string' || body.path === '') {
    throw new Error('LivLiv upload did not return a path')
  }
  return body.path
}
