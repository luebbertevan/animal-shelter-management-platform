# Development Plan — Foster Coordination Platform

## Overview

This plan breaks down the MVP into small, incremental milestones that build a working end-to-end application. Each milestone is designed to teach the stack while delivering visible progress. We'll start with the absolute basics and gradually add features until we have a functional scaffold that can support all MVP features.

**Goal:** Get a simple app working end-to-end where a coordinator can log in, create an animal, and view it in both mobile and web interfaces.

---

## Phase 0: Environment Setup & Project Initialization

### Milestone 0.1: Local Development Environment
**Goal:** Install all required tools and verify they work.

**Tasks:**
1. Install Node.js (v18+): `brew install node` or download from nodejs.org
2. Install Expo CLI: `npm install -g expo-cli`
3. Install Supabase CLI: `brew install supabase/tap/supabase` (or `npm install -g supabase`)
4. Verify installations:
   ```bash
   node --version
   npm --version
   expo --version
   supabase --version
   ```
5. Install a code editor (VS Code recommended) with extensions:
   - ESLint
   - Prettier
   - TypeScript
   - React Native Tools

**Testing:** All commands should run without errors.

**Deliverable:** Development environment ready.

---

### Milestone 0.2: Supabase Project Setup
**Goal:** Create Supabase project and understand the dashboard.

**Tasks:**
1. Create account at supabase.com
2. Create a new project (name: `foster-platform-dev`)
3. Note down:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - Anon/public key (from Settings > API)
   - Service role key (keep secret, for server-side only)
4. Enable Row Level Security (RLS) on all tables (default in Supabase)
5. Install Supabase JS client locally: `npm install @supabase/supabase-js`

**Testing:** Can access Supabase dashboard and see project settings.

**Deliverable:** Supabase project created with credentials saved securely.

---

### Milestone 0.3: Initialize Mobile App (Expo)
**Goal:** Create React Native app structure and see it run.

**Tasks:**
1. Create Expo app:
   ```bash
   npx create-expo-app@latest foster-mobile --template blank-typescript
   cd foster-mobile
   ```
2. Install dependencies:
   ```bash
   npm install @supabase/supabase-js
   npm install @react-navigation/native @react-navigation/native-stack
   npm install react-native-screens react-native-safe-area-context
   npm install @tanstack/react-query
   ```
3. Create basic folder structure:
   ```
   foster-mobile/
   ├── app/
   │   ├── (auth)/
   │   │   └── login.tsx
   │   └── (tabs)/
   │       └── index.tsx
   ├── components/
   ├── lib/
   │   └── supabase.ts
   ├── hooks/
   └── types/
   ```
4. Test run: `npx expo start`
   - Press `i` for iOS simulator (if on Mac)
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

**Testing:** App launches and shows default "Open up App.tsx" screen.

**Deliverable:** Mobile app structure initialized and running.

---

### Milestone 0.4: Initialize Web Portal (Next.js)
**Goal:** Create Next.js app structure and see it run.

**Tasks:**
1. Create Next.js app:
   ```bash
   npx create-next-app@latest foster-web --typescript --tailwind --app --no-src-dir
   cd foster-web
   ```
2. Install dependencies:
   ```bash
   npm install @supabase/supabase-js
   npm install @tanstack/react-query
   ```
3. Create basic folder structure:
   ```
   foster-web/
   ├── app/
   │   ├── login/
   │   │   └── page.tsx
   │   └── dashboard/
   │       └── page.tsx
   ├── components/
   ├── lib/
   │   └── supabase.ts
   ├── hooks/
   └── types/
   ```
4. Test run: `npm run dev`
   - Open http://localhost:3000

**Testing:** Web app launches and shows Next.js welcome page.

**Deliverable:** Web app structure initialized and running.

---

### Milestone 0.5: Shared TypeScript Types
**Goal:** Define core data models that both apps will use.

**Tasks:**
1. Create a shared types package (or copy types between projects):
   ```typescript
   // types/index.ts
   export type UserRole = 'coordinator' | 'foster';

   export type AnimalStatus = 
     | 'needs_foster' 
     | 'in_foster' 
     | 'adopted' 
     | 'medical_hold';

   export interface Animal {
     id: string;
     name: string;
     species: string;
     breed?: string;
     sex?: string;
     age?: number;
     status: AnimalStatus;
     created_at: string;
     updated_at: string;
   }

   export interface User {
     id: string;
     email: string;
     role: UserRole;
     full_name?: string;
   }
   ```
2. Copy this file to both `foster-mobile/types/` and `foster-web/types/`

**Testing:** TypeScript compiles without errors in both projects.

**Deliverable:** Shared type definitions ready.

---

## Phase 1: Database Schema & Authentication

### Milestone 1.1: Database Schema Setup
**Goal:** Create core database tables in Supabase.

**Tasks:**
1. In Supabase dashboard, go to SQL Editor
2. Run this migration:
   ```sql
   -- Enable UUID extension
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

   -- Users table (extends Supabase auth.users)
   CREATE TABLE public.profiles (
     id UUID REFERENCES auth.users(id) PRIMARY KEY,
     email TEXT NOT NULL,
     role TEXT NOT NULL CHECK (role IN ('coordinator', 'foster')),
     full_name TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Animals table
   CREATE TABLE public.animals (
     id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
     name TEXT NOT NULL,
     species TEXT NOT NULL,
     breed TEXT,
     sex TEXT,
     age INTEGER,
     status TEXT NOT NULL CHECK (status IN ('needs_foster', 'in_foster', 'adopted', 'medical_hold')),
     created_by UUID REFERENCES public.profiles(id),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Enable Row Level Security
   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;

   -- RLS Policies (basic - we'll refine in later milestones)
   -- Anyone can read their own profile
   CREATE POLICY "Users can view own profile"
     ON public.profiles FOR SELECT
     USING (auth.uid() = id);

   -- Coordinators can view all profiles
   CREATE POLICY "Coordinators can view all profiles"
     ON public.profiles FOR SELECT
     USING (
       EXISTS (
         SELECT 1 FROM public.profiles
         WHERE id = auth.uid() AND role = 'coordinator'
       )
     );

   -- Coordinators can create animals
   CREATE POLICY "Coordinators can create animals"
     ON public.animals FOR INSERT
     WITH CHECK (
       EXISTS (
         SELECT 1 FROM public.profiles
         WHERE id = auth.uid() AND role = 'coordinator'
       )
     );

   -- Everyone can view animals
   CREATE POLICY "Anyone can view animals"
     ON public.animals FOR SELECT
     USING (true);
   ```
3. Verify tables exist in Table Editor

**Testing:** Can see `profiles` and `animals` tables in Supabase dashboard.

**Deliverable:** Database schema created with basic RLS policies.

---

### Milestone 1.2: Supabase Client Setup (Mobile)
**Goal:** Configure Supabase client in mobile app.

**Tasks:**
1. Create `foster-mobile/lib/supabase.ts`:
   ```typescript
   import { createClient } from '@supabase/supabase-js';
   import Constants from 'expo-constants';

   const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || '';
   const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || '';

   export const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```
2. Create `foster-mobile/app.json` (or update existing):
   ```json
   {
     "expo": {
       "extra": {
         "supabaseUrl": "YOUR_SUPABASE_URL",
         "supabaseAnonKey": "YOUR_SUPABASE_ANON_KEY"
       }
     }
   }
   ```
3. Install expo-constants: `npm install expo-constants`
4. Test connection: Create a simple test screen that logs `supabase` object

**Testing:** No errors when importing supabase client, can see client object in console.

**Deliverable:** Supabase client configured in mobile app.

---

### Milestone 1.3: Supabase Client Setup (Web)
**Goal:** Configure Supabase client in web app.

**Tasks:**
1. Create `foster-web/lib/supabase.ts`:
   ```typescript
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

   export const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```
2. Create `foster-web/.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   ```
3. Test connection: Add a test page that logs supabase object

**Testing:** No errors when importing supabase client.

**Deliverable:** Supabase client configured in web app.

---

### Milestone 1.4: Authentication UI (Mobile)
**Goal:** Build login screen that actually authenticates.

**Tasks:**
1. Create `foster-mobile/app/(auth)/login.tsx`:
   ```typescript
   import { useState } from 'react';
   import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
   import { supabase } from '../../lib/supabase';

   export default function LoginScreen() {
     const [email, setEmail] = useState('');
     const [password, setPassword] = useState('');

     const handleLogin = async () => {
       const { data, error } = await supabase.auth.signInWithPassword({
         email,
         password,
       });
       if (error) alert(error.message);
       else console.log('Logged in:', data.user);
     };

     return (
       <View style={styles.container}>
         <Text>Login</Text>
         <TextInput
           placeholder="Email"
           value={email}
           onChangeText={setEmail}
           style={styles.input}
         />
         <TextInput
           placeholder="Password"
           value={password}
           onChangeText={setPassword}
           secureTextEntry
           style={styles.input}
         />
         <Button title="Login" onPress={handleLogin} />
       </View>
     );
   }

   const styles = StyleSheet.create({
     container: { flex: 1, padding: 20, justifyContent: 'center' },
     input: { borderWidth: 1, padding: 10, marginVertical: 10 },
   });
   ```
2. Update `foster-mobile/app/_layout.tsx` to show login screen first
3. Test: Create a test user in Supabase Auth dashboard, try logging in

**Testing:** Can log in with test credentials, see user object in console.

**Deliverable:** Working login screen in mobile app.

---

### Milestone 1.5: Authentication UI (Web)
**Goal:** Build login screen in web app.

**Tasks:**
1. Create `foster-web/app/login/page.tsx` with similar structure to mobile login
2. Use Next.js form handling and redirect on success
3. Test with same test user

**Testing:** Can log in via web, redirects to dashboard.

**Deliverable:** Working login screen in web app.

---

### Milestone 1.6: Auth State Management
**Goal:** Track auth state and protect routes.

**Tasks:**
1. Create `foster-mobile/hooks/useAuth.ts`:
   ```typescript
   import { useEffect, useState } from 'react';
   import { supabase } from '../lib/supabase';
   import { User } from '@supabase/supabase-js';

   export function useAuth() {
     const [user, setUser] = useState<User | null>(null);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
       supabase.auth.getSession().then(({ data: { session } }) => {
         setUser(session?.user ?? null);
         setLoading(false);
       });

       const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
         setUser(session?.user ?? null);
       });

       return () => subscription.unsubscribe();
     }, []);

     return { user, loading };
   }
   ```
2. Create similar hook for web app
3. Update navigation to check auth state and redirect to login if needed

**Testing:** App redirects to login when not authenticated, stays on dashboard when logged in.

**Deliverable:** Auth state management working in both apps.

---

## Phase 2: First End-to-End Feature (Animals CRUD)

### Milestone 2.1: Create Animal (Web)
**Goal:** Coordinator can create an animal via web form.

**Tasks:**
1. Create `foster-web/app/dashboard/animals/new/page.tsx` with form:
   - Name (required)
   - Species (required)
   - Breed (optional)
   - Status (dropdown, defaults to 'needs_foster')
2. On submit, insert into `animals` table via Supabase:
   ```typescript
   const { data, error } = await supabase
     .from('animals')
     .insert([{ name, species, breed, status, created_by: user.id }]);
   ```
3. Show success message and redirect to animals list

**Testing:** Can create animal, see it in Supabase table editor.

**Deliverable:** Create animal form working in web app.

---

### Milestone 2.2: List Animals (Web)
**Goal:** Display all animals in a simple list.

**Tasks:**
1. Create `foster-web/app/dashboard/animals/page.tsx`
2. Fetch animals:
   ```typescript
   const { data, error } = await supabase
     .from('animals')
     .select('*')
     .order('created_at', { ascending: false });
   ```
3. Display in a simple table or card list
4. Use React Query for data fetching and caching

**Testing:** Can see all created animals in the list.

**Deliverable:** Animals list page working.

---

### Milestone 2.3: View Animal Details (Web)
**Goal:** Click an animal to see full details.

**Tasks:**
1. Create `foster-web/app/dashboard/animals/[id]/page.tsx`
2. Fetch single animal by ID
3. Display all fields in a readable format

**Testing:** Can navigate to animal detail page and see all data.

**Deliverable:** Animal detail page working.

---

### Milestone 2.4: Create Animal (Mobile)
**Goal:** Same create functionality in mobile app.

**Tasks:**
1. Create `foster-mobile/app/(tabs)/animals/new.tsx` with form
2. Use React Native components (TextInput, Button, etc.)
3. Same Supabase insert logic as web

**Testing:** Can create animal from mobile app.

**Deliverable:** Create animal form in mobile app.

---

### Milestone 2.5: List Animals (Mobile)
**Goal:** Display animals in mobile-friendly list.

**Tasks:**
1. Create `foster-mobile/app/(tabs)/animals/index.tsx`
2. Use FlatList component for efficient rendering
3. Add pull-to-refresh
4. Style with basic React Native styles

**Testing:** Can see animals list, pull to refresh works.

**Deliverable:** Animals list in mobile app.

---

### Milestone 2.6: View Animal Details (Mobile)
**Goal:** Tap animal to see details.

**Tasks:**
1. Create `foster-mobile/app/(tabs)/animals/[id].tsx`
2. Use React Navigation to pass animal ID
3. Display details in scrollable view

**Testing:** Can navigate to detail screen and see animal data.

**Deliverable:** Animal detail screen in mobile app.

---

## Phase 3: Testing Setup

### Milestone 3.1: Unit Tests for Utilities
**Goal:** Set up testing framework and write first tests.

**Tasks:**
1. Install Jest and React Native Testing Library:
   ```bash
   npm install --save-dev jest @testing-library/react-native @testing-library/jest-native
   ```
2. Create `jest.config.js` in mobile app
3. Write tests for:
   - Type validation functions
   - Date formatting utilities
   - Status mapping functions
4. Run tests: `npm test`

**Testing:** Tests pass, can see coverage report.

**Deliverable:** Testing framework set up with sample tests.

---

### Milestone 3.2: Integration Tests for API Calls
**Goal:** Test Supabase interactions.

**Tasks:**
1. Create test database or use Supabase test mode
2. Write tests for:
   - Creating an animal
   - Fetching animals list
   - Updating animal status
3. Mock Supabase client for unit tests, use real client for integration tests

**Testing:** Integration tests verify database operations work correctly.

**Deliverable:** API integration tests passing.

---

### Milestone 3.3: E2E Test (One Critical Flow)
**Goal:** Test complete user flow end-to-end.

**Tasks:**
1. Install Detox (for React Native) or Playwright (for web):
   ```bash
   npm install --save-dev detox
   # or
   npm install --save-dev @playwright/test
   ```
2. Write one E2E test:
   - Login as coordinator
   - Create an animal
   - Verify it appears in list
   - View details
3. Run E2E test

**Testing:** E2E test passes, demonstrates full flow works.

**Deliverable:** One working E2E test.

---

## Phase 4: Profile Management & Role-Based Features

### Milestone 4.1: User Profile Creation
**Goal:** When user signs up, create profile record.

**Tasks:**
1. Create Supabase database trigger or Edge Function:
   ```sql
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO public.profiles (id, email, role)
     VALUES (NEW.id, NEW.email, 'foster');
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```
2. Test: Create new user, verify profile is created automatically

**Testing:** New user signup creates profile record.

**Deliverable:** Automatic profile creation working.

---

### Milestone 4.2: Role-Based UI (Web)
**Goal:** Show different UI based on user role.

**Tasks:**
1. Fetch user profile to get role:
   ```typescript
   const { data } = await supabase
     .from('profiles')
     .select('role')
     .eq('id', user.id)
     .single();
   ```
2. Conditionally show "Create Animal" button only for coordinators
3. Update navigation to show coordinator-only pages

**Testing:** Fosters don't see create animal button, coordinators do.

**Deliverable:** Role-based UI working in web app.

---

### Milestone 4.3: Role-Based UI (Mobile)
**Goal:** Same role-based features in mobile.

**Tasks:**
1. Fetch user role in mobile app
2. Conditionally show tabs/screens based on role
3. Hide "New Animal" button for fosters

**Testing:** Mobile app respects user roles.

**Deliverable:** Role-based UI working in mobile app.

---

## Phase 5: Basic Navigation & Polish

### Milestone 5.1: Navigation Structure (Mobile)
**Goal:** Set up proper tab navigation.

**Tasks:**
1. Install React Navigation dependencies (already done in 0.3)
2. Create tab navigator with:
   - Animals (list)
   - Profile
   - (Coordinator only: Create Animal)
3. Add navigation between screens

**Testing:** Can navigate between tabs smoothly.

**Deliverable:** Tab navigation working.

---

### Milestone 5.2: Navigation Structure (Web)
**Goal:** Set up proper routing in Next.js.

**Tasks:**
1. Create layout with sidebar navigation
2. Add links to:
   - Dashboard
   - Animals
   - Profile
3. Use Next.js Link component for client-side navigation

**Testing:** Can navigate between pages without full page reloads.

**Deliverable:** Web navigation working.

---

### Milestone 5.3: Basic Styling (Mobile)
**Goal:** Make mobile app look presentable.

**Tasks:**
1. Install a UI library (e.g., NativeBase, React Native Paper) or create custom styles
2. Style login screen
3. Style animals list with cards
4. Add loading states and error messages

**Testing:** App looks polished, no unstyled components.

**Deliverable:** Styled mobile app.

---

### Milestone 5.4: Basic Styling (Web)
**Goal:** Make web app look presentable.

**Tasks:**
1. Use Tailwind CSS (already installed) or add custom CSS
2. Style dashboard layout
3. Style forms and lists
4. Add loading states

**Testing:** Web app looks professional.

**Deliverable:** Styled web app.

---

## Phase 6: Data Validation & Error Handling

### Milestone 6.1: Form Validation
**Goal:** Validate inputs before submitting.

**Tasks:**
1. Add validation to create animal form:
   - Name required, min 2 characters
   - Species required
   - Status must be valid enum value
2. Show error messages inline
3. Prevent submission if invalid

**Testing:** Can't submit invalid forms, see helpful error messages.

**Deliverable:** Form validation working.

---

### Milestone 6.2: Error Handling
**Goal:** Handle API errors gracefully.

**Tasks:**
1. Create error boundary component
2. Show user-friendly error messages for:
   - Network errors
   - Permission errors
   - Validation errors
3. Add retry mechanisms for failed requests

**Testing:** Errors are caught and displayed nicely, app doesn't crash.

**Deliverable:** Robust error handling.

---

## Phase 7: Real-Time Updates (Optional but Recommended)

### Milestone 7.1: Real-Time Animal List
**Goal:** See new animals appear automatically.

**Tasks:**
1. Use Supabase real-time subscriptions:
   ```typescript
   supabase
     .channel('animals')
     .on('postgres_changes', 
       { event: 'INSERT', schema: 'public', table: 'animals' },
       (payload) => {
         // Add new animal to list
       }
     )
     .subscribe();
   ```
2. Update animals list when new animal is created
3. Test: Create animal in web, see it appear in mobile without refresh

**Testing:** Changes in one client appear in other clients automatically.

**Deliverable:** Real-time updates working.

---

## Success Criteria for MVP Scaffold

At the end of these milestones, you should have:

✅ **Working Authentication**
- Users can log in via mobile and web
- Auth state is managed and persisted
- Routes are protected

✅ **Basic Animal Management**
- Coordinators can create animals (web and mobile)
- Everyone can view animals list (web and mobile)
- Everyone can view animal details (web and mobile)
- Data persists in Supabase database

✅ **Role-Based Access**
- Different UI for coordinators vs fosters
- Database policies enforce permissions

✅ **Testing**
- Unit tests for utilities
- Integration tests for API calls
- At least one E2E test

✅ **Polished UI**
- Both apps are styled and navigable
- Forms validate input
- Errors are handled gracefully

✅ **Real-Time (Optional)**
- Changes sync across clients

---

## Next Steps After Scaffold

Once this scaffold is complete, you can add MVP features incrementally:

1. **Foster Management** — Add fosters table, assignment logic
2. **Communication Hub** — Add messages table, chat UI
3. **Foster Opportunities Board** — Add posting and browsing
4. **Task & Reminder Engine** — Add tasks table, notification system
5. **Media Uploads** — Add photo uploads to Supabase Storage
6. **Update Timeline** — Add updates table, display history

Each of these can be added one milestone at a time, following the same pattern: database schema → API/RLS → Web UI → Mobile UI → Testing.

---

## Notes

- **Start Small:** Don't try to build everything at once. Complete each milestone fully before moving on.
- **Test Frequently:** Run your app after every small change to catch errors early.
- **Use Supabase Docs:** The Supabase documentation is excellent—refer to it often.
- **Ask for Help:** If stuck on a milestone for more than a few hours, step back and break it down further.
- **Version Control:** Commit after each milestone so you can roll back if needed.

