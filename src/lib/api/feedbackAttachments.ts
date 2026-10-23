import { supabase } from '@/integrations/supabase/client';

export const FEEDBACK_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const FEEDBACK_PDF_MIME = ['application/pdf'];
export const FEEDBACK_MAX_BYTES = 10 * 1024 * 1024;

export type FeedbackAttachmentKind = 'image' | 'pdf';

export function detectFeedbackAttachmentKind(file: File): FeedbackAttachmentKind | null {
  if (FEEDBACK_IMAGE_MIME.includes(file.type)) return 'image';
  if (FEEDBACK_PDF_MIME.includes(file.type)) return 'pdf';
  return null;
}

export function validateFeedbackAttachment(file: File): string | null {
  const kind = detectFeedbackAttachmentKind(file);
  if (!kind) {
    return 'Formato non supportato. Usa immagini (JPG, PNG, WEBP, GIF) o PDF.';
  }
  if (file.size > FEEDBACK_MAX_BYTES) {
    return 'File troppo grande: limite 10 MB.';
  }
  return null;
}

function sanitizeExt(fileName: string, fallback: string): string {
  const ext = (fileName.split('.').pop() || fallback).toLowerCase().replace(/[^a-z0-9]/g, '');
  return ext || fallback;
}

/** Carica su storage e restituisce il path nel bucket (non URL firmato). */
export async function uploadFeedbackAttachment(
  file: File,
  userId: string,
  ticketId: string,
): Promise<string> {
  const kind = detectFeedbackAttachmentKind(file);
  if (!kind) throw new Error('Formato non supportato');

  const ext = sanitizeExt(file.name, kind === 'image' ? 'jpg' : 'pdf');
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${userId}/${ticketId}/${uniqueSuffix}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('feedback-attachments')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    throw new Error("Errore durante il caricamento dell'allegato: " + uploadError.message);
  }

  return path;
}

export async function signedFeedbackAttachmentUrl(
  storagePath: string,
  expiresSeconds = 3600,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('feedback-attachments')
    .createSignedUrl(storagePath, expiresSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
