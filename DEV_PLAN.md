# Development Plan — Foster Coordination Platform

## Overview

This plan follows a **PWA-first approach**: build a mobile-friendly web app with push notifications, then wrap it with React Native/Expo later for native app stores. This strategy lets you validate the core flow quickly while ensuring notifications work out-of-the-box for non-technical users.

**Strategy:**

1. Build core web app as PWA (mobile-first design)
2. Add push notifications early (FCM/Web Push API) — **critical for communication**
3. Test on real phones via browser
4. Wrap with Expo later for App Store/Play Store distribution

**Goal:** Get a simple app working end-to-end where a coordinator can log in, create an animal, view it, and receive push notifications on their phone.

---

## Phase 0: Environment Setup & Project Initialization

### Milestone 0.1: Local Development Environment

**Goal:** Install all required tools and verify they work.

**Tasks:**

1. Install Bun: `brew install bun` (or follow instructions at bun.sh)
2. Install Supabase CLI: `brew install supabase/tap/supabase`
3. Verify installations:
    ```bash
    bun --version
    supabase --version
    ```
4. Install VS Code extensions (in Cursor/VS Code):
    - **ESLint** (`dbaeumer.vscode-eslint`) — Code linting
    - **Prettier** (`esbenp.prettier-vscode`) — Code formatting
    - **TypeScript** (built-in) — Type checking
    - **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) — Tailwind autocomplete
    - **GitLens** (`eamodio.gitlens`) — Git history (optional but helpful)
    - **Error Lens** (`usernamehw.errorlens`) — Inline error highlighting

**Testing:** All commands should run without errors.

**Deliverable:** Development environment ready with Bun and VS Code extensions.

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
5. Install Supabase JS client locally: `bun add @supabase/supabase-js`

**Testing:** Can access Supabase dashboard and see project settings.

**Deliverable:** Supabase project created with credentials saved securely.

---

### Milestone 0.3: Initialize PWA Web App (Next.js)

**Goal:** Create Next.js app with PWA capabilities and mobile-first design.

**Tasks:**

1. Create Next.js app with Bun:
    ```bash
    bunx create-next-app@latest foster-app --typescript --tailwind --app --no-src-dir
    cd foster-app
    ```
2. Install core dependencies:
    ```bash
    bun add @supabase/supabase-js @tanstack/react-query
    bun add -d @types/node
    ```
3. Create basic folder structure:
    ```
    foster-app/
    ├── app/
    │   ├── login/
    │   │   └── page.tsx
    │   ├── dashboard/
    │   │   └── page.tsx
    │   └── layout.tsx
    ├── components/
    ├── lib/
    │   └── supabase.ts
    ├── hooks/
    ├── types/
    └── public/
    │   └── manifest.json (we'll create this in Phase 3)
    ```
4. Test run: `bun run dev`
    - Open http://localhost:3000
    - Open DevTools → Device Toolbar (Cmd+Shift+M) to test mobile view

**Testing:** Web app launches and shows Next.js welcome page. Mobile view works in DevTools.

**Deliverable:** PWA-ready web app structure initialized and running.

---

### Milestone 0.4: TypeScript Types

**Goal:** Define core data models for the app.

**Tasks:**

1. Create `foster-app/types/index.ts`:

    ```typescript
    export type UserRole = "coordinator" | "foster";

    export type AnimalStatus =
    	| "needs_foster"
    	| "in_foster"
    	| "adopted"
    	| "medical_hold";

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

**Testing:** TypeScript compiles without errors.

**Deliverable:** Type definitions ready.

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

### Milestone 1.2: Supabase Client Setup

**Goal:** Configure Supabase client in web app.

**Tasks:**

1. Create `foster-app/lib/supabase.ts`:

    ```typescript
    import { createClient } from "@supabase/supabase-js";

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    export const supabase = createClient(supabaseUrl, supabaseAnonKey);
    ```

2. Create `foster-app/.env.local`:
    ```
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    ```
3. Test connection: Add a test page that logs supabase object

**Testing:** No errors when importing supabase client.

**Deliverable:** Supabase client configured in web app.

---

### Milestone 1.3: Authentication UI

**Goal:** Build mobile-first login screen that works on phones.

**Tasks:**

1. Create `foster-app/app/login/page.tsx`:

    ```typescript
    "use client";
    import { useState } from "react";
    import { useRouter } from "next/navigation";
    import { supabase } from "@/lib/supabase";

    export default function LoginPage() {
    	const [email, setEmail] = useState("");
    	const [password, setPassword] = useState("");
    	const [loading, setLoading] = useState(false);
    	const router = useRouter();

    	const handleLogin = async (e: React.FormEvent) => {
    		e.preventDefault();
    		setLoading(true);
    		const { data, error } = await supabase.auth.signInWithPassword({
    			email,
    			password,
    		});
    		if (error) alert(error.message);
    		else router.push("/dashboard");
    		setLoading(false);
    	};

    	return (
    		<div className="min-h-screen flex items-center justify-center p-4">
    			<form
    				onSubmit={handleLogin}
    				className="w-full max-w-sm space-y-4"
    			>
    				<h1 className="text-2xl font-bold">Login</h1>
    				<input
    					type="email"
    					placeholder="Email"
    					value={email}
    					onChange={(e) => setEmail(e.target.value)}
    					className="w-full p-3 border rounded-lg"
    					required
    				/>
    				<input
    					type="password"
    					placeholder="Password"
    					value={password}
    					onChange={(e) => setPassword(e.target.value)}
    					className="w-full p-3 border rounded-lg"
    					required
    				/>
    				<button
    					type="submit"
    					disabled={loading}
    					className="w-full p-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
    				>
    					{loading ? "Logging in..." : "Login"}
    				</button>
    			</form>
    		</div>
    	);
    }
    ```

2. Test: Create a test user in Supabase Auth dashboard, try logging in
3. Test on a real phone: Deploy to Vercel (or use ngrok) and open on phone browser

**Testing:** Can log in via web, redirects to dashboard. Works on phone browser.

**Deliverable:** Working mobile-first login screen.

---

### Milestone 1.4: Auth State Management

**Goal:** Track auth state and protect routes.

**Tasks:**

1. Create `foster-app/hooks/useAuth.ts`:

    ```typescript
    "use client";
    import { useEffect, useState } from "react";
    import { supabase } from "@/lib/supabase";
    import { User } from "@supabase/supabase-js";

    export function useAuth() {
    	const [user, setUser] = useState<User | null>(null);
    	const [loading, setLoading] = useState(true);

    	useEffect(() => {
    		supabase.auth.getSession().then(({ data: { session } }) => {
    			setUser(session?.user ?? null);
    			setLoading(false);
    		});

    		const {
    			data: { subscription },
    		} = supabase.auth.onAuthStateChange((_event, session) => {
    			setUser(session?.user ?? null);
    		});

    		return () => subscription.unsubscribe();
    	}, []);

    	return { user, loading };
    }
    ```

2. Create middleware or layout component to protect routes:
    - Create `foster-app/middleware.ts` to check auth on protected routes
    - Or use client-side redirect in layout

**Testing:** App redirects to login when not authenticated, stays on dashboard when logged in.

**Deliverable:** Auth state management working.

---

## Phase 2: First End-to-End Feature (Animals CRUD)

### Milestone 2.1: Create Animal

**Goal:** Coordinator can create an animal via mobile-first form.

**Tasks:**

1. Create `foster-app/app/dashboard/animals/new/page.tsx` with form:
    - Name (required)
    - Species (required)
    - Breed (optional)
    - Status (dropdown, defaults to 'needs_foster')
2. On submit, insert into `animals` table via Supabase:
    ```typescript
    const { data, error } = await supabase
    	.from("animals")
    	.insert([{ name, species, breed, status, created_by: user.id }]);
    ```
3. Show success message and redirect to animals list
4. Style with Tailwind for mobile-first responsive design

**Testing:** Can create animal, see it in Supabase table editor. Form works on phone.

**Deliverable:** Create animal form working.

---

### Milestone 2.2: List Animals

**Goal:** Display all animals in a mobile-friendly list.

**Tasks:**

1. Create `foster-app/app/dashboard/animals/page.tsx`
2. Fetch animals with React Query:
    ```typescript
    const { data, error } = useQuery({
    	queryKey: ["animals"],
    	queryFn: async () => {
    		const { data, error } = await supabase
    			.from("animals")
    			.select("*")
    			.order("created_at", { ascending: false });
    		if (error) throw error;
    		return data;
    	},
    });
    ```
3. Display in a card-based grid (mobile: 1 column, desktop: 2-3 columns)
4. Add loading and error states

**Testing:** Can see all created animals in the list. Responsive on phone and desktop.

**Deliverable:** Animals list page working.

---

### Milestone 2.3: View Animal Details

**Goal:** Click an animal to see full details.

**Tasks:**

1. Create `foster-app/app/dashboard/animals/[id]/page.tsx`
2. Fetch single animal by ID using React Query
3. Display all fields in a readable, mobile-friendly format
4. Add back button and edit link (for coordinators)

**Testing:** Can navigate to animal detail page and see all data. Works on phone.

**Deliverable:** Animal detail page working.

---

## Phase 3: PWA Setup (Install to Home Screen)

### Milestone 3.1: PWA Manifest

**Goal:** Make app installable on phones (Add to Home Screen).

**Tasks:**

1. Create `foster-app/public/manifest.json`:
    ```json
    {
    	"name": "Foster Platform",
    	"short_name": "Foster",
    	"description": "Animal foster coordination platform",
    	"start_url": "/",
    	"display": "standalone",
    	"background_color": "#ffffff",
    	"theme_color": "#3b82f6",
    	"icons": [
    		{
    			"src": "/icon-192.png",
    			"sizes": "192x192",
    			"type": "image/png",
    			"purpose": "any maskable"
    		},
    		{
    			"src": "/icon-512.png",
    			"sizes": "512x512",
    			"type": "image/png",
    			"purpose": "any maskable"
    		}
    	]
    }
    ```
2. Generate app icons (192x192 and 512x512) and place in `public/`
3. Add manifest link to `app/layout.tsx`:
    ```tsx
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#3b82f6" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    ```

**Testing:** Open app on phone, see "Add to Home Screen" prompt. App installs and opens fullscreen.

**Deliverable:** PWA manifest working, app installable.

---

### Milestone 3.2: Service Worker (Offline Support)

**Goal:** Enable offline access and background sync.

**Tasks:**

1. Install `next-pwa`:
    ```bash
    bun add next-pwa
    ```
2. Configure in `next.config.js`:
    ```js
    const withPWA = require("next-pwa")({
    	dest: "public",
    	register: true,
    	skipWaiting: true,
    });
    module.exports = withPWA({
    	/* your config */
    });
    ```
3. Test offline mode: Turn off WiFi, app should still load cached pages

**Testing:** App works offline, service worker registers successfully.

**Deliverable:** Service worker working, basic offline support.

---

## Phase 4: Push Notifications (CRITICAL - Communication Core)

### Milestone 4.1: Firebase Cloud Messaging (FCM) Setup

**Goal:** Set up FCM for push notifications on Android and web.

**Tasks:**

1. Create Firebase project at console.firebase.google.com
2. Add web app to Firebase project, get config:
    ```js
    const firebaseConfig = {
    	apiKey: "...",
    	authDomain: "...",
    	projectId: "...",
    	storageBucket: "...",
    	messagingSenderId: "...",
    	appId: "...",
    };
    ```
3. Install Firebase SDK:
    ```bash
    bun add firebase
    ```
4. Create `foster-app/lib/firebase.ts`:

    ```typescript
    import { initializeApp } from "firebase/app";
    import { getMessaging, getToken, onMessage } from "firebase/messaging";

    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    export async function requestNotificationPermission() {
    	const permission = await Notification.requestPermission();
    	if (permission === "granted") {
    		const token = await getToken(messaging, {
    			vapidKey: "YOUR_VAPID_KEY", // Get from Firebase Console
    		});
    		return token;
    	}
    	return null;
    }

    export function onMessageListener() {
    	return new Promise((resolve) => {
    		onMessage(messaging, (payload) => {
    			resolve(payload);
    		});
    	});
    }
    ```

5. Get VAPID key from Firebase Console → Project Settings → Cloud Messaging

**Testing:** Can request permission and get FCM token. Token appears in console.

**Deliverable:** FCM configured and ready.

---

### Milestone 4.2: Store Push Tokens in Database

**Goal:** Save user's push token to Supabase so we can send notifications.

**Tasks:**

1. Add `push_tokens` table in Supabase:

    ```sql
    CREATE TABLE public.push_tokens (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      platform TEXT, -- 'web', 'ios', 'android'
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can manage own tokens"
      ON public.push_tokens
      FOR ALL
      USING (auth.uid() = user_id);
    ```

2. Create hook `foster-app/hooks/usePushNotifications.ts`:

    ```typescript
    import { useEffect } from "react";
    import {
    	requestNotificationPermission,
    	onMessageListener,
    } from "@/lib/firebase";
    import { supabase } from "@/lib/supabase";
    import { useAuth } from "./useAuth";

    export function usePushNotifications() {
    	const { user } = useAuth();

    	useEffect(() => {
    		if (!user) return;

    		// Request permission and save token
    		requestNotificationPermission().then(async (token) => {
    			if (token) {
    				await supabase.from("push_tokens").upsert({
    					user_id: user.id,
    					token,
    					platform: "web",
    				});
    			}
    		});

    		// Listen for foreground messages
    		onMessageListener().then((payload) => {
    			console.log("Message received:", payload);
    			// Show notification
    			new Notification(payload.notification?.title || "New message", {
    				body: payload.notification?.body,
    				icon: "/icon-192.png",
    			});
    		});
    	}, [user]);
    }
    ```

3. Add hook to main layout

**Testing:** Token saved to database when user grants permission.

**Deliverable:** Push tokens stored and managed.

---

### Milestone 4.3: Send Test Notification

**Goal:** Send a notification from backend to verify it works.

**Tasks:**

1. Create Supabase Edge Function `send-notification`:

    ```typescript
    // supabase/functions/send-notification/index.ts
    import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
    import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

    serve(async (req) => {
    	const { userId, title, body } = await req.json();

    	// Get user's push token
    	const supabase = createClient(/* ... */);
    	const { data: tokens } = await supabase
    		.from("push_tokens")
    		.select("token")
    		.eq("user_id", userId);

    	// Send via FCM Admin SDK (or use webhook)
    	// For MVP, use a simple HTTP request to FCM API

    	return new Response(JSON.stringify({ success: true }), {
    		headers: { "Content-Type": "application/json" },
    	});
    });
    ```

2. Or use a simpler approach: Supabase Database Webhook → external service (e.g., OneSignal, Pusher)
3. For MVP, use Supabase Realtime + browser Notification API:
    - Create `notifications` table
    - Use Supabase Realtime to listen for new notifications
    - Show browser notification when received

**Testing:** Coordinator creates animal → foster receives push notification on phone.

**Deliverable:** Push notifications working end-to-end.

---

### Milestone 4.4: Notification Preferences

**Goal:** Let users control what notifications they receive.

**Tasks:**

1. Add `notification_preferences` column to profiles table
2. Create settings page to toggle:
    - New animal assignments
    - Messages from coordinator
    - Task reminders
3. Respect preferences when sending notifications

**Testing:** Users can toggle preferences, notifications respect settings.

**Deliverable:** Notification preferences working.

---

## Phase 5: Profile Management & Role-Based Features

### Milestone 5.1: User Profile Creation

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

### Milestone 5.2: Role-Based UI

**Goal:** Show different UI based on user role.

**Tasks:**

1. Fetch user profile to get role:
    ```typescript
    const { data } = await supabase
    	.from("profiles")
    	.select("role")
    	.eq("id", user.id)
    	.single();
    ```
2. Conditionally show "Create Animal" button only for coordinators
3. Update navigation to show coordinator-only pages
4. Use role in layout to conditionally render menu items

**Testing:** Fosters don't see create animal button, coordinators do. Works on phone.

**Deliverable:** Role-based UI working.

---

## Phase 6: Navigation & Polish

### Milestone 6.1: Navigation Structure

**Goal:** Set up mobile-friendly navigation.

**Tasks:**

1. Create bottom navigation bar for mobile (hamburger menu for desktop)
2. Add links to:
    - Dashboard
    - Animals
    - Profile
    - (Coordinator only: Create Animal)
3. Use Next.js Link component for client-side navigation
4. Make navigation responsive (bottom nav on mobile, sidebar on desktop)

**Testing:** Can navigate between pages smoothly. Navigation works on phone.

**Deliverable:** Responsive navigation working.

---

### Milestone 6.2: Mobile-First Styling

**Goal:** Make app look polished on phones.

**Tasks:**

1. Use Tailwind CSS (already installed) with mobile-first approach
2. Style all screens with:
    - Large touch targets (min 44x44px)
    - Readable fonts
    - Good contrast
    - Consistent spacing
3. Add loading states and error messages
4. Test on real phone devices

**Testing:** App looks professional on phone and desktop.

**Deliverable:** Polished, mobile-first UI.

---

## Phase 7: Data Validation & Error Handling

### Milestone 7.1: Form Validation

**Goal:** Validate inputs before submitting.

**Tasks:**

1. Add validation to create animal form:
    - Name required, min 2 characters
    - Species required
    - Status must be valid enum value
2. Show error messages inline
3. Prevent submission if invalid
4. Use a validation library like `zod` for type-safe validation

**Testing:** Can't submit invalid forms, see helpful error messages.

**Deliverable:** Form validation working.

---

### Milestone 7.2: Error Handling

**Goal:** Handle API errors gracefully.

**Tasks:**

1. Create error boundary component
2. Show user-friendly error messages for:
    - Network errors
    - Permission errors
    - Validation errors
3. Add retry mechanisms for failed requests
4. Show toast notifications for errors

**Testing:** Errors are caught and displayed nicely, app doesn't crash.

**Deliverable:** Robust error handling.

---

## Phase 8: Testing Setup

### Milestone 8.1: Unit Tests for Utilities

**Goal:** Set up testing framework and write first tests.

**Tasks:**

1. Install testing dependencies:
    ```bash
    bun add -d vitest @testing-library/react @testing-library/jest-dom
    ```
2. Create `vitest.config.ts`
3. Write tests for:
    - Type validation functions
    - Date formatting utilities
    - Status mapping functions
4. Run tests: `bun test`

**Testing:** Tests pass, can see coverage report.

**Deliverable:** Testing framework set up with sample tests.

---

### Milestone 8.2: Integration Tests for API Calls

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

### Milestone 8.3: E2E Test (One Critical Flow)

**Goal:** Test complete user flow end-to-end.

**Tasks:**

1. Install Playwright:
    ```bash
    bun add -d @playwright/test
    ```
2. Write one E2E test:
    - Login as coordinator
    - Create an animal
    - Verify it appears in list
    - View details
3. Run E2E test: `bunx playwright test`

**Testing:** E2E test passes, demonstrates full flow works.

**Deliverable:** One working E2E test.

---

## Phase 9: Real-Time Updates

### Milestone 9.1: Real-Time Animal List

**Goal:** See new animals appear automatically.

**Tasks:**

1. Use Supabase real-time subscriptions:
    ```typescript
    supabase
    	.channel("animals")
    	.on(
    		"postgres_changes",
    		{ event: "INSERT", schema: "public", table: "animals" },
    		(payload) => {
    			// Add new animal to list
    		}
    	)
    	.subscribe();
    ```
2. Update animals list when new animal is created
3. Test: Create animal on one device, see it appear on another

**Testing:** Changes in one client appear in other clients automatically.

**Deliverable:** Real-time updates working.

---

## Success Criteria for MVP Scaffold

At the end of these milestones, you should have:

✅ **Working PWA**

-   App installs on phone (Add to Home Screen)
-   Works offline with service worker
-   Mobile-first responsive design

✅ **Working Authentication**

-   Users can log in via web (works on phone browser)
-   Auth state is managed and persisted
-   Routes are protected

✅ **Basic Animal Management**

-   Coordinators can create animals
-   Everyone can view animals list
-   Everyone can view animal details
-   Data persists in Supabase database

✅ **Push Notifications (CRITICAL)**

-   Users receive push notifications on phone
-   Notifications work out-of-the-box
-   Token management and preferences working

✅ **Role-Based Access**

-   Different UI for coordinators vs fosters
-   Database policies enforce permissions

✅ **Testing**

-   Unit tests for utilities
-   Integration tests for API calls
-   At least one E2E test

✅ **Polished UI**

-   App is styled and navigable on phone
-   Forms validate input
-   Errors are handled gracefully

✅ **Real-Time (Optional)**

-   Changes sync across clients

---

## Phase 10: Expo Wrapping (Optional - For App Stores)

**Note:** This phase is optional. The PWA works great on phones via browser. Only do this if you want to publish to App Store/Play Store.

### Milestone 10.1: Initialize Expo Project

**Goal:** Create Expo wrapper around existing web app.

**Tasks:**

1. Create Expo app:
    ```bash
    bunx create-expo-app@latest foster-mobile --template blank-typescript
    ```
2. Install `expo-web-browser` and `expo-linking`
3. Use `WebView` component to load your deployed PWA
4. Or better: Share components between Next.js and Expo using a monorepo

**Testing:** Expo app loads web app in WebView.

**Deliverable:** Expo wrapper created.

---

### Milestone 10.2: Native Features (Camera, Push)

**Goal:** Add native features that PWA can't do.

**Tasks:**

1. Install Expo Camera: `bun add expo-camera`
2. Install Expo Notifications: `bun add expo-notifications`
3. Replace PWA camera with native camera
4. Replace FCM with Expo Push Notifications (works on iOS + Android)
5. Test on physical devices

**Testing:** Camera works, push notifications work on iOS and Android.

**Deliverable:** Native features integrated.

---

### Milestone 10.3: Build & Publish

**Goal:** Publish to App Store and Play Store.

**Tasks:**

1. Set up Expo EAS Build
2. Configure app.json with app details
3. Build for iOS and Android: `bunx eas build`
4. Submit to stores (requires developer accounts)

**Testing:** App installs from App Store/Play Store.

**Deliverable:** App published to stores.

---

## Next Steps After Scaffold

Once this scaffold is complete, you can add MVP features incrementally:

1. **Foster Management** — Add fosters table, assignment logic
2. **Communication Hub** — Add messages table, chat UI (with push notifications)
3. **Foster Opportunities Board** — Add posting and browsing
4. **Task & Reminder Engine** — Add tasks table, automated notifications
5. **Media Uploads** — Add photo uploads to Supabase Storage
6. **Update Timeline** — Add updates table, display history

Each of these can be added one milestone at a time, following the same pattern: database schema → API/RLS → Web UI → Testing → Push notifications integration.

---

## Notes

-   **Start Small:** Don't try to build everything at once. Complete each milestone fully before moving on.
-   **Test on Real Phones:** The PWA approach means you can test on actual devices immediately—use this advantage!
-   **Push Notifications are Critical:** Phase 4 is not optional—notifications are core to the communication-focused app.
-   **PWA First, Native Later:** Get the PWA working perfectly before considering Expo wrapping. Many users are fine with "Add to Home Screen."
-   **Use Bun:** All commands use `bun` instead of `npm` for faster installs and runs.
-   **Test Frequently:** Run your app after every small change to catch errors early.
-   **Use Supabase Docs:** The Supabase documentation is excellent—refer to it often.
-   **Ask for Help:** If stuck on a milestone for more than a few hours, step back and break it down further.
-   **Version Control:** Commit after each milestone so you can roll back if needed.
-   **Deploy Early:** Deploy to Vercel early so you can test on real phones via URL (no app store needed!).
