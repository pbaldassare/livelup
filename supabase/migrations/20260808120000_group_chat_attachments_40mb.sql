-- =====================================================
-- Raise storage attachment limits to 40MB
-- - group-chat-attachments: 20MB → 40MB (community group chat)
-- - chat-attachments: 25MB → 40MB (1:1 / PT chat video, consistency)
-- Policies / RLS unchanged — only file_size_limit.
-- =====================================================

-- Allegati chat gruppo community (paperclip): max 40MB
UPDATE storage.buckets
SET file_size_limit = 41943040  -- 40MB
WHERE id = 'group-chat-attachments';

-- Allegati chat 1:1 / PT groups: allinea video a 40MB
UPDATE storage.buckets
SET file_size_limit = 41943040  -- 40MB
WHERE id = 'chat-attachments';
