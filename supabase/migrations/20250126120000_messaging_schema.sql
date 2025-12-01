-- Messaging System Schema
-- Creates conversations, messages, and message_animal_links tables
-- Supports foster chats and coordinator group chat with message tagging

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================

CREATE TABLE public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('foster_chat', 'coordinator_group')),
  foster_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Constraint: foster_profile_id must be set for 'foster_chat' type, NULL for 'coordinator_group'
  CONSTRAINT foster_chat_requires_profile CHECK (
    (type = 'foster_chat' AND foster_profile_id IS NOT NULL) OR
    (type = 'coordinator_group' AND foster_profile_id IS NULL)
  )
);

-- ============================================
-- MESSAGES TABLE
-- ============================================

CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

-- ============================================
-- MESSAGE_ANIMAL_LINKS TABLE (for tagging)
-- ============================================

CREATE TABLE public.message_animal_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  animal_id UUID REFERENCES public.animals(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.animal_groups(id) ON DELETE CASCADE,
  -- Constraint: Exactly one of animal_id or group_id must be set
  CONSTRAINT exactly_one_link CHECK (
    (animal_id IS NOT NULL AND group_id IS NULL) OR
    (animal_id IS NULL AND group_id IS NOT NULL)
  )
);

-- ============================================
-- INDEXES
-- ============================================

-- Conversations indexes
CREATE INDEX idx_conversations_organization_id ON public.conversations(organization_id);
CREATE INDEX idx_conversations_type ON public.conversations(type);
CREATE INDEX idx_conversations_foster_profile_id ON public.conversations(foster_profile_id);

-- Messages indexes
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_conversation_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);

-- Message animal links indexes
CREATE INDEX idx_message_animal_links_message_id ON public.message_animal_links(message_id);
CREATE INDEX idx_message_animal_links_animal_id ON public.message_animal_links(animal_id);
CREATE INDEX idx_message_animal_links_group_id ON public.message_animal_links(group_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_animal_links ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - CONVERSATIONS
-- ============================================

-- Fosters can view their own foster chat
CREATE POLICY "Fosters can view own foster chat"
  ON public.conversations FOR SELECT
  USING (
    type = 'foster_chat' AND
    foster_profile_id = auth.uid()
  );

-- Coordinators can view all foster chats in their organization
CREATE POLICY "Coordinators can view foster chats in org"
  ON public.conversations FOR SELECT
  USING (
    type = 'foster_chat' AND
    organization_id = public.get_user_organization_id() AND
    public.is_coordinator()
  );

-- Coordinators can view coordinator group chat in their organization
CREATE POLICY "Coordinators can view coordinator group chat"
  ON public.conversations FOR SELECT
  USING (
    type = 'coordinator_group' AND
    organization_id = public.get_user_organization_id() AND
    public.is_coordinator()
  );

-- Coordinators can create foster chats (when creating for a foster)
CREATE POLICY "Coordinators can create foster chats"
  ON public.conversations FOR INSERT
  WITH CHECK (
    type = 'foster_chat' AND
    organization_id = public.get_user_organization_id() AND
    public.is_coordinator()
  );

-- Coordinators can create coordinator group chat (handled by trigger, but allow for safety)
CREATE POLICY "Coordinators can create coordinator group chat"
  ON public.conversations FOR INSERT
  WITH CHECK (
    type = 'coordinator_group' AND
    organization_id = public.get_user_organization_id() AND
    public.is_coordinator()
  );

-- ============================================
-- RLS POLICIES - MESSAGES
-- ============================================

-- Users can view messages in conversations they have access to
-- This uses a subquery to check conversation access via RLS
CREATE POLICY "Users can view messages in accessible conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = messages.conversation_id
    )
  );

-- Users can create messages in conversations they have access to
CREATE POLICY "Users can create messages in accessible conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = messages.conversation_id
    )
  );

-- ============================================
-- RLS POLICIES - MESSAGE_ANIMAL_LINKS
-- ============================================

-- Users can view links for messages they can access
CREATE POLICY "Users can view message animal links"
  ON public.message_animal_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages
      WHERE id = message_animal_links.message_id
    )
  );

-- Users can create links for messages they sent
CREATE POLICY "Users can create message animal links"
  ON public.message_animal_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages
      WHERE id = message_animal_links.message_id
      AND sender_id = auth.uid()
    )
  );

