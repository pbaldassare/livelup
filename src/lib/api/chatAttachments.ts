// =====================================================
// API: Allegati chat (immagini/video) — upload + validazione
// Bucket privato `chat-attachments`, path ${user.id}/${conversationKey}/${file}
// conversationKey = chat_id (1:1) oppure `group-<group_id>` (gruppo chat PT)
// =====================================================

import { supabase } from '@/integrations/supabase/client';

export const CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB
export const CHAT_VIDEO_MAX_BYTES = 40 * 1024 * 1024; // 40MB

export const CHAT_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const CHAT_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export type ChatAttachmentKind = 'image' | 'video';

export function detectChatAttachmentKind(file: File): ChatAttachmentKind | null {
  if (CHAT_IMAGE_MIME_TYPES.includes(file.type)) return 'image';
  if (CHAT_VIDEO_MIME_TYPES.includes(file.type)) return 'video';
  return null;
}

/** Ritorna un messaggio d'errore in italiano se il file non è valido, altrimenti null. */
export function validateChatAttachment(file: File): string | null {
  const kind = detectChatAttachmentKind(file);
  if (!kind) {
    return 'Formato non supportato. Usa immagini (JPG, PNG, WEBP, GIF) o video (MP4, MOV, WEBM).';
  }
  const max = kind === 'image' ? CHAT_IMAGE_MAX_BYTES : CHAT_VIDEO_MAX_BYTES;
  if (file.size > max) {
    const maxMb = Math.round(max / (1024 * 1024));
    return `File troppo grande: limite ${maxMb}MB per ${kind === 'image' ? 'le immagini' : 'i video'}.`;
  }
  return null;
}

function sanitizeExt(fileName: string, fallback: string): string {
  const ext = (fileName.split('.').pop() || fallback).toLowerCase().replace(/[^a-z0-9]/g, '');
  return ext || fallback;
}

export function groupConversationKey(groupId: string): string {
  return `group-${groupId}`;
}

/**
 * Carica un allegato su storage e restituisce un signed URL di lunga durata
 * (pattern coerente con `progress-photos`: bucket privato, generazione URL firmato dal solo uploader).
 */
export async function uploadChatAttachment(
  file: File,
  userId: string,
  conversationKey: string,
): Promise<{ url: string; type: ChatAttachmentKind }> {
  const kind = detectChatAttachmentKind(file);
  if (!kind) throw new Error('Formato non supportato');

  const ext = sanitizeExt(file.name, kind === 'image' ? 'jpg' : 'mp4');
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${userId}/${conversationKey}/${uniqueSuffix}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('chat-attachments')
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    throw new Error("Errore durante il caricamento dell'allegato: " + uploadError.message);
  }

  const { data: signedData, error: signError } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 anno

  if (signError || !signedData?.signedUrl) {
    throw new Error("Errore durante la generazione del link dell'allegato");
  }

  return { url: signedData.signedUrl, type: kind };
}
