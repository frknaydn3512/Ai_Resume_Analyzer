import type { AnalyseResponse } from '../types'

export async function analyseResume(file: File): Promise<AnalyseResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/resume/analyse', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${response.status}`)
  }

  return response.json()
}