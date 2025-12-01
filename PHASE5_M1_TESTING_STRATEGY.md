# Milestone 5.1 Testing Strategy: Messaging Schema

## Overview
This document provides a comprehensive testing strategy for the messaging system schema including tables, constraints, RLS policies, and indexes.

---

## Pre-Testing Setup

### 1. Database State
- Ensure you have at least 2 organizations in the database
- Have at least 2 foster profiles (different organizations)
- Have at least 2 coordinator profiles (different organizations)
- Have at least 2 animals in the database (for tagging tests)

### 2. Test Users Setup
Create test users via Supabase Auth:
- `foster1@test.com` (foster, org 1)
- `foster2@test.com` (foster, org 2)
- `coordinator1@test.com` (coordinator, org 1)
- `coordinator2@test.com` (coordinator, org 2)

---

## Part 1: Schema Structure Testing

### Test 1.1: Tables Exist
**Goal:** Verify all three tables were created

```sql
-- Run in Supabase SQL Editor
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('conversations', 'messages', 'message_animal_links')
ORDER BY table_name;
```

**Expected:** All three tables listed

---

### Test 1.2: Conversations Table Structure
**Goal:** Verify conversations table has correct columns and constraints

```sql
-- Check columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'conversations'
ORDER BY ordinal_position;
```

**Expected Columns:**
- `id` (uuid, NOT NULL, default gen_random_uuid())
- `organization_id` (uuid, NOT NULL)
- `type` (text, NOT NULL)
- `foster_profile_id` (uuid, NULLABLE)
- `created_at` (timestamptz, NOT NULL, default NOW())
- `updated_at` (timestamptz, NOT NULL, default NOW())

```sql
-- Check constraints
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.conversations'::regclass
ORDER BY conname;
```

**Expected Constraints:**
- Primary key on `id`
- Foreign key on `organization_id` → `organizations(id)`
- Foreign key on `foster_profile_id` → `profiles(id)`
- CHECK constraint on `type` (foster_chat or coordinator_group)
- CHECK constraint `foster_chat_requires_profile`

---

### Test 1.3: Messages Table Structure
**Goal:** Verify messages table structure

```sql
-- Check columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'messages'
ORDER BY ordinal_position;
```

**Expected Columns:**
- `id` (uuid, NOT NULL)
- `conversation_id` (uuid, NOT NULL)
- `sender_id` (uuid, NOT NULL)
- `content` (text, NOT NULL)
- `created_at` (timestamptz, NOT NULL)
- `edited_at` (timestamptz, NULLABLE)

**Verify Foreign Keys:**
```sql
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'messages'
  AND tc.constraint_type = 'FOREIGN KEY';
```

**Expected:** Foreign keys to `conversations(id)` and `profiles(id)`

---

### Test 1.4: Message Animal Links Table Structure
**Goal:** Verify message_animal_links table structure

```sql
-- Check columns and constraint
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'message_animal_links'
ORDER BY ordinal_position;
```

**Expected Columns:**
- `id` (uuid, NOT NULL)
- `message_id` (uuid, NOT NULL)
- `animal_id` (uuid, NULLABLE)
- `group_id` (uuid, NULLABLE)

**Verify CHECK Constraint:**
```sql
SELECT pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.message_animal_links'::regclass
  AND contype = 'c'
  AND conname = 'exactly_one_link';
```

**Expected:** Constraint ensures exactly one of `animal_id` or `group_id` is set

---

### Test 1.5: Indexes Exist
**Goal:** Verify all indexes were created

```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'messages', 'message_animal_links')
ORDER BY tablename, indexname;
```

**Expected Indexes:**
- `conversations`: `organization_id`, `type`, `foster_profile_id`
- `messages`: `conversation_id`, `(conversation_id, created_at DESC)`, `sender_id`
- `message_animal_links`: `message_id`, `animal_id`, `group_id`

---

## Part 2: Constraint Testing

### Test 2.1: Conversation Type Constraint
**Goal:** Verify only valid conversation types can be inserted

```sql
-- This should FAIL
INSERT INTO public.conversations (organization_id, type, foster_profile_id)
VALUES (
  (SELECT id FROM public.organizations LIMIT 1),
  'invalid_type',
  NULL
);
```

**Expected:** Error about CHECK constraint violation

```sql
-- This should SUCCEED
INSERT INTO public.conversations (organization_id, type, foster_profile_id)
VALUES (
  (SELECT id FROM public.organizations LIMIT 1),
  'foster_chat',
  (SELECT id FROM public.profiles WHERE role = 'foster' LIMIT 1)
);
```

**Expected:** Insert succeeds

---

### Test 2.2: Foster Chat Requires Profile Constraint
**Goal:** Verify foster_chat must have foster_profile_id

```sql
-- This should FAIL (foster_chat without profile)
INSERT INTO public.conversations (organization_id, type, foster_profile_id)
VALUES (
  (SELECT id FROM public.organizations LIMIT 1),
  'foster_chat',
  NULL
);
```

**Expected:** Error about `foster_chat_requires_profile` constraint

```sql
-- This should FAIL (coordinator_group with profile)
INSERT INTO public.conversations (organization_id, type, foster_profile_id)
VALUES (
  (SELECT id FROM public.organizations LIMIT 1),
  'coordinator_group',
  (SELECT id FROM public.profiles WHERE role = 'foster' LIMIT 1)
);
```

**Expected:** Error about `foster_chat_requires_profile` constraint

---

### Test 2.3: Message Animal Links Constraint
**Goal:** Verify exactly one link type must be set

```sql
-- This should FAIL (both NULL)
INSERT INTO public.message_animal_links (message_id, animal_id, group_id)
VALUES (
  (SELECT id FROM public.messages LIMIT 1),
  NULL,
  NULL
);
```

**Expected:** Error about `exactly_one_link` constraint

```sql
-- This should FAIL (both set)
INSERT INTO public.message_animal_links (message_id, animal_id, group_id)
VALUES (
  (SELECT id FROM public.messages LIMIT 1),
  (SELECT id FROM public.animals LIMIT 1),
  (SELECT id FROM public.animal_groups LIMIT 1)
);
```

**Expected:** Error about `exactly_one_link` constraint

---

## Part 3: RLS Policy Testing

### Test 3.1: RLS is Enabled
**Goal:** Verify RLS is enabled on all tables

```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'messages', 'message_animal_links');
```

**Expected:** `rowsecurity = true` for all three tables

---

### Test 3.2: Foster Can View Own Foster Chat
**Goal:** Foster can only see their own foster chat

**Setup:**
```sql
-- Create test conversations
INSERT INTO public.conversations (organization_id, type, foster_profile_id)
VALUES 
  -- Foster 1's chat
  ((SELECT organization_id FROM public.profiles WHERE email = 'foster1@test.com'), 
   'foster_chat', 
   (SELECT id FROM public.profiles WHERE email = 'foster1@test.com')),
  -- Foster 2's chat (different org)
  ((SELECT organization_id FROM public.profiles WHERE email = 'foster2@test.com'), 
   'foster_chat', 
   (SELECT id FROM public.profiles WHERE email = 'foster2@test.com'));
```

**Test as Foster 1:**
```sql
-- Switch to foster1@test.com context (use Supabase client or set role)
SET ROLE authenticated;
SET request.jwt.claim.sub = (SELECT id FROM auth.users WHERE email = 'foster1@test.com');

SELECT id, type, foster_profile_id 
FROM public.conversations;
```

**Expected:** Only foster 1's conversation is visible

**Test as Foster 2:**
```sql
SET request.jwt.claim.sub = (SELECT id FROM auth.users WHERE email = 'foster2@test.com');

SELECT id, type, foster_profile_id 
FROM public.conversations;
```

**Expected:** Only foster 2's conversation is visible

---

### Test 3.3: Coordinator Can View All Foster Chats in Org
**Goal:** Coordinator sees all foster chats in their organization

**Test as Coordinator 1:**
```sql
SET request.jwt.claim.sub = (SELECT id FROM auth.users WHERE email = 'coordinator1@test.com');

SELECT id, type, foster_profile_id, organization_id
FROM public.conversations
WHERE type = 'foster_chat';
```

**Expected:** All foster chats from coordinator 1's organization are visible

**Verify:** Coordinator 1 should NOT see foster chats from coordinator 2's organization

---

### Test 3.4: Coordinator Can View Coordinator Group Chat
**Goal:** Coordinators can see coordinator group chat in their org

**Setup:**
```sql
-- Create coordinator group chats for both orgs
INSERT INTO public.conversations (organization_id, type, foster_profile_id)
VALUES 
  ((SELECT organization_id FROM public.profiles WHERE email = 'coordinator1@test.com'), 
   'coordinator_group', 
   NULL),
  ((SELECT organization_id FROM public.profiles WHERE email = 'coordinator2@test.com'), 
   'coordinator_group', 
   NULL);
```

**Test as Coordinator 1:**
```sql
SET request.jwt.claim.sub = (SELECT id FROM auth.users WHERE email = 'coordinator1@test.com');

SELECT id, type, organization_id
FROM public.conversations
WHERE type = 'coordinator_group';
```

**Expected:** Only coordinator group chat from coordinator 1's organization

**Test as Foster:**
```sql
SET request.jwt.claim.sub = (SELECT id FROM auth.users WHERE email = 'foster1@test.com');

SELECT id, type
FROM public.conversations
WHERE type = 'coordinator_group';
```

**Expected:** No results (fosters cannot see coordinator group chat)

---

### Test 3.5: Messages RLS (Access via Conversation)
**Goal:** Users can only see messages in conversations they have access to

**Setup:**
```sql
-- Create messages in different conversations
-- (Use conversation IDs from previous tests)
INSERT INTO public.messages (conversation_id, sender_id, content)
VALUES 
  ((SELECT id FROM public.conversations WHERE foster_profile_id = (SELECT id FROM public.profiles WHERE email = 'foster1@test.com')), 
   (SELECT id FROM public.profiles WHERE email = 'foster1@test.com'), 
   'Message from foster 1'),
  ((SELECT id FROM public.conversations WHERE foster_profile_id = (SELECT id FROM public.profiles WHERE email = 'foster2@test.com')), 
   (SELECT id FROM public.profiles WHERE email = 'foster2@test.com'), 
   'Message from foster 2');
```

**Test as Foster 1:**
```sql
SET request.jwt.claim.sub = (SELECT id FROM auth.users WHERE email = 'foster1@test.com');

SELECT id, content, sender_id
FROM public.messages;
```

**Expected:** Only messages from foster 1's conversation

**Test as Coordinator 1:**
```sql
SET request.jwt.claim.sub = (SELECT id FROM auth.users WHERE email = 'coordinator1@test.com');

SELECT id, content, sender_id
FROM public.messages;
```

**Expected:** Messages from all conversations in coordinator 1's organization

---

### Test 3.6: Message Creation RLS
**Goal:** Users can only create messages in accessible conversations

**Test as Foster 1 (should succeed):**
```sql
SET request.jwt.claim.sub = (SELECT id FROM auth.users WHERE email = 'foster1@test.com');

INSERT INTO public.messages (conversation_id, sender_id, content)
VALUES (
  (SELECT id FROM public.conversations WHERE foster_profile_id = (SELECT id FROM public.profiles WHERE email = 'foster1@test.com')),
  (SELECT id FROM public.profiles WHERE email = 'foster1@test.com'),
  'Test message'
);
```

**Expected:** Insert succeeds

**Test as Foster 1 (should fail - wrong conversation):**
```sql
SET request.jwt.claim.sub = (SELECT id FROM auth.users WHERE email = 'foster1@test.com');

INSERT INTO public.messages (conversation_id, sender_id, content)
VALUES (
  (SELECT id FROM public.conversations WHERE foster_profile_id = (SELECT id FROM public.profiles WHERE email = 'foster2@test.com')),
  (SELECT id FROM public.profiles WHERE email = 'foster1@test.com'),
  'Unauthorized message'
);
```

**Expected:** Insert fails (RLS blocks access to other foster's conversation)

---

### Test 3.7: Message Animal Links RLS
**Goal:** Users can only view/create links for accessible messages

**Setup:**
```sql
-- Create a message with a link
INSERT INTO public.message_animal_links (message_id, animal_id, group_id)
VALUES (
  (SELECT id FROM public.messages WHERE sender_id = (SELECT id FROM public.profiles WHERE email = 'foster1@test.com') LIMIT 1),
  (SELECT id FROM public.animals LIMIT 1),
  NULL
);
```

**Test as Foster 1:**
```sql
SET request.jwt.claim.sub = (SELECT id FROM auth.users WHERE email = 'foster1@test.com');

SELECT * FROM public.message_animal_links;
```

**Expected:** Links for messages foster 1 can access

**Test as Foster 2:**
```sql
SET request.jwt.claim.sub = (SELECT id FROM auth.users WHERE email = 'foster2@test.com');

SELECT * FROM public.message_animal_links;
```

**Expected:** No links (foster 2 cannot access foster 1's messages)

---

## Part 4: Integration Testing

### Test 4.1: Create Full Conversation Flow
**Goal:** Test complete flow: conversation → message → tag

**Steps:**
1. Create foster chat conversation
2. Create message in conversation
3. Create message_animal_link for the message
4. Query all data together

```sql
-- Step 1: Create conversation
INSERT INTO public.conversations (organization_id, type, foster_profile_id)
VALUES (
  (SELECT organization_id FROM public.profiles WHERE email = 'foster1@test.com'),
  'foster_chat',
  (SELECT id FROM public.profiles WHERE email = 'foster1@test.com')
)
RETURNING id;

-- Step 2: Create message (use conversation_id from step 1)
INSERT INTO public.messages (conversation_id, sender_id, content)
VALUES (
  '<conversation_id_from_step_1>',
  (SELECT id FROM public.profiles WHERE email = 'foster1@test.com'),
  'This is a test message about an animal'
)
RETURNING id;

-- Step 3: Create link (use message_id from step 2)
INSERT INTO public.message_animal_links (message_id, animal_id, group_id)
VALUES (
  '<message_id_from_step_2>',
  (SELECT id FROM public.animals LIMIT 1),
  NULL
);

-- Step 4: Query everything
SELECT 
  c.id AS conversation_id,
  c.type,
  m.id AS message_id,
  m.content,
  mal.animal_id,
  mal.group_id
FROM public.conversations c
JOIN public.messages m ON m.conversation_id = c.id
LEFT JOIN public.message_animal_links mal ON mal.message_id = m.id
WHERE c.foster_profile_id = (SELECT id FROM public.profiles WHERE email = 'foster1@test.com');
```

**Expected:** All data linked correctly

---

### Test 4.2: Foreign Key Cascades
**Goal:** Verify ON DELETE CASCADE works correctly

**Test:**
```sql
-- Create test data
INSERT INTO public.conversations (organization_id, type, foster_profile_id)
VALUES (
  (SELECT organization_id FROM public.profiles WHERE email = 'foster1@test.com'),
  'foster_chat',
  (SELECT id FROM public.profiles WHERE email = 'foster1@test.com')
)
RETURNING id;

-- Create message
INSERT INTO public.messages (conversation_id, sender_id, content)
VALUES (
  '<conversation_id>',
  (SELECT id FROM public.profiles WHERE email = 'foster1@test.com'),
  'Test message'
)
RETURNING id;

-- Create link
INSERT INTO public.message_animal_links (message_id, animal_id, group_id)
VALUES (
  '<message_id>',
  (SELECT id FROM public.animals LIMIT 1),
  NULL
);

-- Delete conversation (should cascade to messages and links)
DELETE FROM public.conversations WHERE id = '<conversation_id>';

-- Verify cascade
SELECT COUNT(*) FROM public.messages WHERE conversation_id = '<conversation_id>';
SELECT COUNT(*) FROM public.message_animal_links WHERE message_id = '<message_id>';
```

**Expected:** Both counts = 0 (cascade worked)

---

## Part 5: Performance Testing

### Test 5.1: Index Usage
**Goal:** Verify indexes are being used in queries

```sql
-- Enable query plan analysis
EXPLAIN ANALYZE
SELECT * FROM public.messages
WHERE conversation_id = (SELECT id FROM public.conversations LIMIT 1)
ORDER BY created_at DESC;
```

**Expected:** Query plan shows index scan on `idx_messages_conversation_created`

```sql
EXPLAIN ANALYZE
SELECT * FROM public.conversations
WHERE organization_id = (SELECT id FROM public.organizations LIMIT 1)
  AND type = 'foster_chat';
```

**Expected:** Query plan shows index usage on `organization_id` and `type`

---

## Part 6: Edge Cases

### Test 6.1: Multiple Messages in Conversation
**Goal:** Verify multiple messages work correctly

```sql
-- Create 10 messages in same conversation
INSERT INTO public.messages (conversation_id, sender_id, content)
SELECT 
  (SELECT id FROM public.conversations LIMIT 1),
  (SELECT id FROM public.profiles WHERE email = 'foster1@test.com'),
  'Message ' || generate_series(1, 10)
FROM generate_series(1, 10);

-- Query messages
SELECT COUNT(*) FROM public.messages 
WHERE conversation_id = (SELECT id FROM public.conversations LIMIT 1);
```

**Expected:** Count = 10

---

### Test 6.2: Message with Multiple Tags
**Goal:** Verify a message can have multiple animal/group links

```sql
-- Create message
INSERT INTO public.messages (conversation_id, sender_id, content)
VALUES (
  (SELECT id FROM public.conversations LIMIT 1),
  (SELECT id FROM public.profiles WHERE email = 'foster1@test.com'),
  'Message about multiple animals'
)
RETURNING id;

-- Create multiple links (if you have multiple animals)
INSERT INTO public.message_animal_links (message_id, animal_id, group_id)
SELECT 
  '<message_id>',
  id,
  NULL
FROM public.animals
LIMIT 3;

-- Verify
SELECT COUNT(*) FROM public.message_animal_links 
WHERE message_id = '<message_id>';
```

**Expected:** Count matches number of links created

---

## Part 7: Cleanup

After testing, clean up test data:

```sql
-- Delete test conversations (will cascade to messages and links)
DELETE FROM public.conversations 
WHERE foster_profile_id IN (
  SELECT id FROM public.profiles 
  WHERE email LIKE '%@test.com'
);

-- Verify cleanup
SELECT COUNT(*) FROM public.conversations;
SELECT COUNT(*) FROM public.messages;
SELECT COUNT(*) FROM public.message_animal_links;
```

---

## Testing Checklist

- [ ] All tables created with correct structure
- [ ] All constraints work correctly
- [ ] All indexes created and used
- [ ] RLS enabled on all tables
- [ ] Foster can only see own foster chat
- [ ] Coordinator can see all foster chats in org
- [ ] Coordinator can see coordinator group chat
- [ ] Fosters cannot see coordinator group chat
- [ ] Messages RLS works (access via conversation)
- [ ] Message creation RLS works
- [ ] Message animal links RLS works
- [ ] Foreign key cascades work
- [ ] Indexes improve query performance
- [ ] Multiple messages in conversation work
- [ ] Multiple tags per message work

---

## Notes

- Use Supabase Dashboard SQL Editor or `psql` for testing
- For RLS testing, you may need to use Supabase client libraries or set JWT claims manually
- Consider creating a test script that automates these tests
- Document any failures and investigate before proceeding to M 5.2

