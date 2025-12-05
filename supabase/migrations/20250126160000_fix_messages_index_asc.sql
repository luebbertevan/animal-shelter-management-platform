-- Fix messages index to use ASC instead of DESC
-- Matches query pattern: messages displayed oldest first (ascending order)

-- Drop the existing DESC index
DROP INDEX IF EXISTS idx_messages_conversation_created;

-- Create new ASC index (ASC is default, but being explicit for clarity)
CREATE INDEX idx_messages_conversation_created ON public.messages(conversation_id, created_at ASC);

