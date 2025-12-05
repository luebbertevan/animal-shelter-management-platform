-- Enable Realtime for messages table
-- This allows Supabase Realtime subscriptions to listen for INSERT, UPDATE, DELETE events

-- Add messages table to the supabase_realtime publication
-- This enables Realtime subscriptions for the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

