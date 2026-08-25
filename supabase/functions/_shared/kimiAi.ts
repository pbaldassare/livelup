const KIMI_BASE = (Deno.env.get('KIMI_BASE_URL') || 'https://api.moonshot.ai/v1').replace(/\/$/, '')

export function kimiApiKey(): string | undefined {
  return Deno.env.get('KIMI_API_KEY')?.trim() || Deno.env.get('MOONSHOT_API_KEY')?.trim()
}

export function kimiModel(): string {
  return Deno.env.get('KIMI_MODEL')?.trim() || 'kimi-k3'
}

function authHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` }
}

function extForMime(mime: string): string {
  if (mime.includes('pdf')) return 'pdf'
  if (mime.includes('spreadsheet') || mime.includes('excel')) return 'xlsx'
  if (mime.includes('png')) return 'png'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  return 'bin'
}

export async function kimiUploadForExtract(params: {
  apiKey: string
  fileBase64: string
  mimeType: string
  filename?: string
}): Promise<{ fileId: string; extractedText: string }> {
  const binary = Uint8Array.from(atob(params.fileBase64), (c) => c.charCodeAt(0))
  const filename = params.filename || `upload.${extForMime(params.mimeType)}`
  const file = new File([binary], filename, { type: params.mimeType })
  const form = new FormData()
  form.append('purpose', 'file-extract')
  form.append('file', file)

  const uploadRes = await fetch(`${KIMI_BASE}/files`, {
    method: 'POST',
    headers: authHeaders(params.apiKey),
    body: form,
  })
  if (!uploadRes.ok) {
    const detail = await uploadRes.text()
    throw new Error(`kimi_file_upload_failed:${uploadRes.status}:${detail}`)
  }
  const uploaded = (await uploadRes.json()) as { id?: string }
  const fileId = uploaded.id
  if (!fileId) throw new Error('kimi_file_upload_failed:missing_id')

  const contentRes = await fetch(`${KIMI_BASE}/files/${fileId}/content`, {
    headers: authHeaders(params.apiKey),
  })
  if (!contentRes.ok) {
    const detail = await contentRes.text()
    throw new Error(`kimi_file_content_failed:${contentRes.status}:${detail}`)
  }
  const extractedText = await contentRes.text()
  return { fileId, extractedText }
}

export async function kimiDeleteFile(apiKey: string, fileId: string): Promise<void> {
  try {
    await fetch(`${KIMI_BASE}/files/${fileId}`, {
      method: 'DELETE',
      headers: authHeaders(apiKey),
    })
  } catch (err) {
    console.warn('kimi delete file failed', err)
  }
}

export async function kimiChatCompletion(params: {
  apiKey: string
  messages: unknown[]
  jsonObject?: boolean
}): Promise<{ ok: true; content: string } | { ok: false; status: number; detail: string }> {
  const body: Record<string, unknown> = {
    model: kimiModel(),
    messages: params.messages,
    temperature: 0.2,
    thinking: { type: 'disabled' },
  }
  if (params.jsonObject) {
    body.response_format = { type: 'json_object' }
  }

  const res = await fetch(`${KIMI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      ...authHeaders(params.apiKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    return { ok: false, status: res.status, detail: await res.text() }
  }

  const data = await res.json()
  const content: string = data?.choices?.[0]?.message?.content ?? ''
  return { ok: true, content }
}
