# Development Plan — Foster Coordination Platform

## Overview

This plan follows a **PWA-first approach**: build a mobile-friendly web app with push notifications using **React Router + Vite**, then wrap it with React Native/Expo later for native app stores. This strategy lets you validate the core flow quickly while ensuring notifications work out-of-the-box for non-technical users.

**Why React Router + Vite:**

-   Pure SPA setup — ideal for internal dashboard/admin tools
-   Simpler than Next.js for this use case
-   Easy to share UI components/logic with Expo later (pure React)
-   Simple build and hosting — any static host works (Netlify, Vercel, Supabase)
-   More control over routing and architecture

**Strategy:**

1. Build core web app as PWA (mobile-first design) with React Router + Vite
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

### Milestone 0.3: Initialize PWA Web App (Vite + React Router)

**Goal:** Create Vite + React Router app with PWA capabilities and mobile-first design.

**Tasks:**

1. Create Vite app with React and TypeScript:
    ```bash
    bunx create-vite@latest foster-app --template react-ts
    cd foster-app
    ```
2. Install core dependencies:
    ```bash
    bun add react-router-dom @supabase/supabase-js @tanstack/react-query
    bun add -d @types/react @types/react-dom
    ```
3. Install Tailwind CSS:
    ```bash
    bun add -d tailwindcss postcss autoprefixer
    bunx tailwindcss init -p
    ```
4. Create basic folder structure:
    ```
    foster-app/
    ├── src/
    │   ├── pages/
    │   │   ├── Login.tsx
    │   │   ├── Dashboard.tsx
    │   │   └── animals/
    │   │       └── NewAnimal.tsx
    │   ├── components/
    │   ├── lib/
    │   │   └── supabase.ts
    │   ├── hooks/
    │   ├── types/
    │   ├── App.tsx
    │   └── main.tsx
    ├── public/
    │   └── manifest.json (we'll create this in Phase 3)
    └── vite.config.ts
    ```
5. Set up React Router in `src/App.tsx` (see existing file for reference)

6. Test run: `bun run dev`
    - Open http://localhost:5173 (Vite default port)
    - Open DevTools → Device Toolbar (Cmd+Shift+M) to test mobile view

**Testing:** Web app launches and shows React app. Mobile view works in DevTools. Routing works.

**Deliverable:** PWA-ready web app structure initialized and running with React Router.

---

### Milestone 0.4: TypeScript Types

**Goal:** Define core data models for the app.

**Tasks:**

1. Create `src/types/index.ts` with all type definitions (see existing file for reference)

**Testing:** TypeScript compiles without errors: `bunx tsc --noEmit`

**Deliverable:** Type definitions ready.

---

## Phase 1: Database Schema & Authentication

### Milestone 1.1: Database Schema Setup

**Goal:** Create core database tables in Supabase.

**Tasks:**

1. **Link your Supabase project** (if not already linked):

    ```bash
    supabase link --project-ref YOUR_PROJECT_REF
    ```

    - Get your project ref from Supabase dashboard → Settings → General → Reference ID
    - Or use: `supabase link` and follow the interactive prompts

2. **Run the migration**:

    ```bash
    supabase db push
    ```

    - This will apply the migration file: `supabase/migrations/20251114190534_initial_schema.sql`
    - The migration creates: `profiles`, `animals`, and `animal_groups` tables with RLS policies

3. **Verify tables exist**:
    - Go to Supabase dashboard → Table Editor
    - You should see: `profiles`, `animals`, and `animal_groups` tables
    - Each table should show "RLS enabled" indicator

**Note:** The migration SQL is in `supabase/migrations/20251114190534_initial_schema.sql`. It creates:

-   `profiles` table (with foster-specific fields)
-   `animals` table (all fields matching TypeScript types)
-   `animal_groups` table (for group fostering)
-   RLS policies for all tables

**Testing:**

-   Migration runs successfully with `supabase db push`
-   Can see `profiles`, `animals`, and `animal_groups` tables in Supabase dashboard Table Editor
-   Each table shows "RLS enabled"

**Deliverable:** Database schema created with basic RLS policies.

---

### Milestone 1.2: Supabase Client Setup

**Goal:** Configure Supabase client in web app.

**Tasks:**

1. Create `src/lib/supabase.ts` (see existing file for reference)

2. Create `foster-app/.env.local`:
    ```
    VITE_SUPABASE_URL=YOUR_SUPABASE_URL
    VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    ```
3. Update `vite.config.ts` to ensure env variables are available (standard Vite config)

4. Test connection: Add a test page that logs supabase object

**Testing:** No errors when importing supabase client.

**Deliverable:** Supabase client configured in web app.

---

### Milestone 1.3: Authentication UI

**Goal:** Build mobile-first login screen.

**Tasks:**

1. **Create Login form** (`src/pages/Login.tsx`):

    - Email and password inputs
    - Form submission handler using `supabase.auth.signInWithPassword()`
    - Loading state (disable button during submission)
    - Error handling (display error messages)
    - Mobile-first styling with Tailwind CSS
    - Redirect to `/dashboard` on successful login

2. **Verify routing** (`src/App.tsx`):

    - `/login` route already exists (no changes needed)
    - Confirm route works

3. **Local testing**:

    - Create test user in Supabase dashboard → Authentication → Users
    - Run `bun run dev` and navigate to `http://localhost:5173/login`
    - Test login with valid credentials (should redirect to dashboard)
    - Test error cases (wrong password, non-existent email, empty fields)

4. **Optional: Test on phone** (via local network):
    - Find your computer's local IP: `ifconfig` (Mac) or `ipconfig` (Windows)
    - Run dev server: `bun run dev --host`
    - On phone (same WiFi), open `http://YOUR_IP:5173/login`
    - Test login on phone browser

**Testing:**

-   Can log in via browser (localhost)
-   Redirects to dashboard on success
-   Shows error messages on failure
-   Works on phone browser (via local network, optional)

**Deliverable:** Working mobile-first login screen with error handling.

**Note:** Deployment to production is covered in Phase 3.5 (recommended after PWA Setup is complete).

---

### Milestone 1.4: Auth State Management

**Goal:** Track authentication state across the app and protect routes so only logged-in users can access certain pages. This milestone creates a system to track whether a user is logged in and automatically redirects unauthorized users to the login page. It solves the problem where users could access protected pages (like the dashboard) even when not logged in.

**Tasks:**

1. **Create `useAuth` custom hook** (`src/hooks/useAuth.ts`):

    - This hook will manage authentication state throughout the application
    - Use React's `useState` to track the current user (null if not logged in, user object if logged in)
    - Use React's `useState` to track loading state (true while checking auth, false when done)
    - Use React's `useEffect` to check for existing session when component mounts
    - Call `supabase.auth.getSession()` to check if user is already logged in (handles page refresh)
    - Set up a listener using `supabase.auth.onAuthStateChange()` to automatically update state when login/logout happens
    - Return an object with `{ user, loading }` so components can check auth status
    - Clean up the auth state listener when component unmounts to prevent memory leaks

2. **Create `ProtectedRoute` component** (`src/components/ProtectedRoute.tsx`):

    - This component will wrap routes that require authentication
    - Import and use the `useAuth` hook to get current user and loading state
    - If loading is true, show a loading indicator (simple "Loading..." message)
    - If user is null (not logged in), use React Router's `Navigate` component to redirect to `/login`
    - If user exists (logged in), render the protected children components
    - This component accepts `children` as a prop (the protected content to render)

3. **Update App routing** (`src/App.tsx`):
    - Import the `ProtectedRoute` component
    - Wrap the `/dashboard` route with `<ProtectedRoute>` component
    - This ensures the dashboard is only accessible to logged-in users
    - Other routes (like `/login`) remain public and don't need protection

**How It Works:**

-   When a user tries to access `/dashboard`, the `ProtectedRoute` component checks if they're logged in
-   If not logged in, they're automatically redirected to `/login`
-   If logged in, they see the dashboard
-   The `useAuth` hook listens for auth changes, so if a user logs out, all components using the hook will update automatically
-   When the page refreshes, `getSession()` checks if there's an existing session, so users stay logged in

**Testing:**

-   Navigate to `/dashboard` while not logged in → should redirect to `/login`
-   Log in successfully → should redirect to `/dashboard` and stay there
-   Refresh the page while logged in → should remain on `/dashboard` (session persists)
-   Log out → should redirect to `/login`
-   Try accessing `/dashboard` directly via URL while logged out → should redirect to login

**Deliverable:** Auth state management working with route protection. Users cannot access protected routes without being logged in, and the app remembers login state across page refreshes.

---

### Milestone 1.5: Sign Up

**Goal:** Allow new users to create accounts through a simple signup form. This milestone implements basic user registration with email and password. For MVP, we'll use simple signup without confirmation codes (confirmation code flow will be added later as specified in the spec).

**Tasks:**

1. **Create Sign Up page** (`src/pages/SignUp.tsx`):

    - Build a form component similar to the Login page
    - Include email input (required, type="email")
    - Include password input (required, type="password")
    - Include password confirmation input (required, must match password)
    - Add form validation:
        - Email must be valid format
        - Password must meet minimum requirements (e.g., 6+ characters)
        - Password confirmation must match password
    - Use React state to manage form field values
    - Style with Tailwind CSS for mobile-first responsive design (matching Login page style)

2. **Handle form submission**:

    - Prevent default form submission behavior
    - Validate all fields before submitting
    - Use Supabase client to create new user account: `supabase.auth.signUp({ email, password })`
    - Handle errors from Supabase (display error messages)
    - Show loading state while submitting (disable form, show loading indicator)
    - On success, show success message and redirect to login page

3. **Add routing**:
    - Add route in `src/App.tsx`: `/signup` that renders the `SignUp` component
    - Add a "Sign up" link on the Login page (e.g., "Don't have an account? Sign up")
    - The signup route should be public (not protected)

**How It Works:**

-   User navigates to `/signup` or clicks "Sign up" link from login page
-   Fills out email and password fields
-   Submits form, which sends data to Supabase
-   Supabase creates the user account in the auth system
-   On success, user is redirected to login page to sign in
-   Note: Profile creation will be handled automatically via database trigger (Phase 5.1)

**Testing:**

-   Fill out form with valid email and matching passwords → should successfully create account
-   Submit form with invalid email → should show validation error
-   Submit form with passwords that don't match → should show error
-   Submit form with weak password → should show error (if Supabase enforces password policy)
-   Check Supabase dashboard → new user should appear in Authentication → Users
-   After signup, redirect to login → should be able to log in with new credentials
-   Test form on mobile device → should be usable and responsive

**Deliverable:** Working signup form that creates user accounts in Supabase. Form is mobile-friendly and includes proper validation and error handling.

---

### Milestone 1.6: Auto-Login After Signup

**Goal:** Automatically log users in immediately after successful signup, providing a seamless registration experience without requiring them to manually log in.

**Tasks:**

1. **Update SignUp component** (`src/pages/SignUp.tsx`):
    - After successful `supabase.auth.signUp()` call, check if a session was created
    - Use `supabase.auth.getSession()` to check for an active session immediately after signup
    - If session exists (user is automatically logged in), redirect to `/dashboard` instead of `/login`
    - Ensure error handling still works for signup failures

**How It Works:**

-   User completes signup form and submits
-   Supabase creates the account and automatically creates a session (email confirmation is disabled)
-   The app checks for the session immediately after signup
-   If session exists → user is logged in → redirect to dashboard
-   This provides a seamless experience: signup → immediately in the app

**Note:** This implementation assumes email confirmation is disabled in Supabase. If email confirmation is enabled later, the code will need to be updated to handle the case where no session exists after signup.

**Testing:**

-   Sign up with new account → should automatically redirect to dashboard
-   Verify user is logged in → should see dashboard, not login page
-   Verify session persists → refresh page, should stay logged in
-   Test error cases → invalid signup should still show errors correctly

**Deliverable:** Users are automatically logged in after successful signup and redirected to dashboard. Seamless registration experience without manual login step.

---

### Milestone 1.7: Sign Out

**Goal:** Allow logged-in users to sign out of their account. This provides a way to end the current session and clear authentication state.

**Tasks:**

1. **Add logout functionality to Dashboard** (`src/pages/Dashboard.tsx`):

    - Import `useNavigate` from react-router-dom
    - Import `supabase` from lib/supabase
    - Create a `handleLogout` function that:
        - Calls `supabase.auth.signOut()` to clear the session
        - Redirects to `/login` page after successful logout
        - Handles any errors (though signOut rarely fails)

2. **Add logout button to Dashboard UI**:

    - Add a logout button (can be in header, top-right corner, or bottom of page)
    - Style the button with Tailwind CSS to match app design
    - Make it easily tappable on mobile devices
    - Button should be clearly labeled (e.g., "Log out" or "Sign out")

3. **Optional: Add logout to other pages**:
    - Consider adding logout to a navigation component (if you create one later)
    - For now, Dashboard is sufficient since it's the main protected page

**How It Works:**

-   User clicks "Log out" button on Dashboard
-   `supabase.auth.signOut()` is called, which:
    -   Clears the session token from localStorage
    -   Invalidates the current session on Supabase
-   User is redirected to `/login` page
-   `useAuth` hook detects the auth state change and updates accordingly
-   User can no longer access protected routes

**Testing:**

-   Click logout button while logged in → should sign out and redirect to login
-   Try accessing `/dashboard` after logout → should redirect to login
-   Verify localStorage is cleared → check DevTools, Supabase auth tokens should be gone
-   Test on mobile device → logout button should be easy to tap

**Deliverable:** Logout functionality working. Users can sign out from the Dashboard, and the session is properly cleared. After logout, users are redirected to login and cannot access protected routes.

---

## Phase 2: First End-to-End Feature (Animals CRUD)

### Milestone 2.1: Create Animal

**Goal:** Allow coordinators to create new animal records through a mobile-friendly form interface. This milestone builds the first data entry feature - a form where coordinators can add new animals to the system. The form will collect essential animal information and save it to the Supabase database.

**Tasks:**

1. **Add navigation and routing**:

    - Add a route in `src/App.tsx` for the new animal page: `/animals/new`
    - Create a basic `src/pages/animals/NewAnimal.tsx` page (can be empty or just a heading for now)
    - Ensure the route is protected (wrapped in ProtectedRoute if needed)
    - Consider adding a "Create Animal" button/link on the Dashboard (can be done in M2.2 for animals list page)

2. **Create the New Animal form page** (`src/pages/animals/NewAnimal.tsx`):

    - Build a form component with the following fields:
        - Name field (text input, required)
        - Species field (text input or dropdown, required - e.g., "Cat", "Dog")
        - Breed field (text input, optional)
        - Status dropdown (required, defaults to 'needs_foster' - options: needs_foster, in_foster, adopted, medical_hold, available, transferred)
    - Use React state to manage form field values
    - Add form validation to ensure required fields are filled
    - Style the form with Tailwind CSS for mobile-first responsive design (single column on mobile, comfortable spacing)

3. **Handle form submission**:

    - Prevent default form submission behavior
    - Get the current logged-in user's ID (from the auth context or useAuth hook)
    - Use Supabase client to insert a new record into the `animals` table
    - Include all form field values plus `created_by` field set to the current user's ID
    - Handle errors from Supabase (display error message if insert fails)
    - Show loading state while submitting (disable form, show loading indicator)

4. **Handle successful submission**:

    - Display a success message to the user
    - Use React Router's `useNavigate` hook to redirect to the animals list page (`/animals`)
    - This provides immediate feedback that the animal was created

**How It Works:**

-   Coordinator navigates to `/animals/new`
-   Fills out the form with animal information
-   Submits the form, which sends data to Supabase
-   Supabase validates the data against the database schema
-   On success, the new animal record is created in the database
-   User is redirected to the animals list to see their new entry

**Testing:**

-   Fill out form with all required fields → should successfully create animal
-   Submit form with missing required fields → should show validation error
-   Check Supabase table editor → new animal should appear in `animals` table
-   Verify `created_by` field is set to the logged-in user's ID
-   Test form on mobile device → should be usable and responsive
-   Test error handling → try submitting with invalid data, should show error message

**Deliverable:** Working create animal form that saves data to Supabase database. Form is mobile-friendly and includes proper validation and error handling.

---

### Milestone 2.2: List Animals

**Goal:** Display all animals in a mobile-friendly, scrollable list that allows users to browse and navigate to individual animal details. This milestone creates a page that fetches and displays all animals from the database. It uses React Query for efficient data fetching, caching, and automatic refetching. The list should be visually appealing and easy to navigate on mobile devices.

**Tasks:**

1. **Create the Animals List page** (`src/pages/animals/AnimalsList.tsx`):

    - Create a new component that will display all animals
    - Set up React Query's `useQuery` hook to fetch animals from Supabase
    - Configure the query to:
        - Use a query key of `["animals"]` for caching
        - Fetch all records from the `animals` table using Supabase client
        - Order results by `created_at` in descending order (newest first)
        - Handle errors from Supabase and throw them so React Query can catch them

2. **Display animals in a responsive grid**:

    - Use a card-based layout for each animal
    - Each card should display key information: name, status, sex (when available)
    - Note: Species and breed are not displayed in MVP list view
    - Design cards to be touch-friendly on mobile (adequate spacing, clear tap targets)
    - Use Tailwind CSS grid or flexbox:
        - Mobile: single column layout (one card per row)
        - Desktop/tablet: 2-3 columns layout (multiple cards per row)
    - Ensure cards are visually distinct with borders, shadows, or background colors

3. **Handle loading and error states**:

    - Show a loading indicator while data is being fetched (spinner or skeleton screens)
    - Display an error message if the fetch fails
    - Use React Query's built-in `isLoading` and `isError` states

4. **Add routing**:
    - Add route in `src/App.tsx`: `/animals` that renders the `AnimalsList` component
    - Consider adding a "Create New Animal" button/link on this page that navigates to `/animals/new`

**How It Works:**

-   When the page loads, React Query automatically fetches animals from Supabase
-   The data is cached, so if the user navigates away and comes back, it shows cached data immediately
-   Animals are displayed in a responsive grid of cards
-   If data is stale or the user refocuses the window, React Query automatically refetches

**Testing:**

-   Navigate to `/animals` → should see all animals in the database
-   Verify animals are ordered by newest first
-   Test on mobile device → should display in single column, cards are easy to tap
-   Test on desktop → should display in multiple columns
-   Test loading state → should show loading indicator while fetching
-   Test error state → simulate network error, should show error message with retry button
-   Verify data updates → create a new animal, list should update (or refresh to see new animal)

**Deliverable:** Working animals list page that displays all animals in a responsive, mobile-friendly grid with proper loading and error states. Users can browse animals in the list.

---

### Milestone 2.3: View Animal Details

**Goal:** Display complete information about a single animal when a user clicks on it from the list. This milestone creates a detail page that shows all information about a specific animal. The page will fetch the animal data based on the ID in the URL and display it in a readable, mobile-friendly format.

**Tasks:**

1. **Add navigation from list to detail pages**:

    - Import `Link` component from react-router-dom in `AnimalsList.tsx`
    - Make each animal card clickable/linkable to its detail page
    - Use the route pattern `/animals/{animal.id}` for navigation
    - Add visual indication that cards are clickable (hover effects, cursor pointer)
    - Wrap each card in a `Link` component or make the card itself a clickable link

2. **Create the Animal Detail page** (`src/pages/animals/AnimalDetail.tsx`):

    - Create a new component to display a single animal's full details
    - Use React Router's `useParams` hook to extract the animal ID from the URL
    - The route will be `/animals/:id`, so the `id` parameter will contain the animal's UUID

3. **Fetch the animal data**:

    - Use React Query's `useQuery` hook to fetch a single animal by ID
    - Configure the query to:
        - Use a query key like `["animals", id]` for proper caching
        - Query Supabase to select the animal where `id` matches the URL parameter
        - Handle errors appropriately

4. **Display all animal fields**:

    - Show all available animal information in a readable format
    - Organize information in sections or a clean vertical layout
    - Display fields like: name, species, breed, status, dates (intake, available, etc.), notes
    - Handle missing/optional fields gracefully (don't show empty fields or show "Not specified")
    - Use mobile-first design with adequate spacing and readable font sizes
    - Consider using a card or section-based layout for visual organization

5. **Add navigation controls**:

    - Add a "Back" button that uses React Router's `useNavigate` hook
    - Use `navigate(-1)` to go back to the previous page (browser history)
    - Alternatively, use `navigate("/animals")` to always go back to the list
    - Style the back button to be easily tappable on mobile

6. **Add edit functionality (for coordinators)**:

    - Add an "Edit" button or link (will be functional in a later milestone)
    - For now, this can just be a placeholder that shows the button
    - Consider role-based visibility (only show for coordinators, not fosters)

7. **Add routing**:
    - Add route in `src/App.tsx`: `/animals/:id` that renders the `AnimalDetail` component
    - The `:id` is a URL parameter that will be captured by `useParams`

**How It Works:**

-   User clicks an animal card in the list → navigates to `/animals/{animal-id}`
-   The detail page extracts the ID from the URL
-   React Query fetches that specific animal from Supabase
-   All animal information is displayed in a readable format
-   User can navigate back to the list using the back button

**Testing:**

-   Click an animal from the list → should navigate to detail page with correct animal
-   Verify all animal fields are displayed correctly
-   Test with animals that have missing/optional fields → should handle gracefully
-   Test back button → should return to previous page
-   Test on mobile device → should be readable and easy to navigate
-   Test loading state → should show loading indicator while fetching
-   Test error state → try accessing invalid animal ID, should show error message
-   Test direct URL access → type `/animals/{valid-id}` directly, should load correctly

**Deliverable:** Working animal detail page that displays complete animal information. Page is mobile-friendly and includes navigation back to the list.

---

## Phase 3: PWA Setup (Install to Home Screen)

### Milestone 3.1: PWA Manifest

**Goal:** Configure the app as a Progressive Web App (PWA) so users can install it on their phones like a native app. This milestone makes your web app installable on mobile devices. Users will be able to "Add to Home Screen" and launch it like a native app. This requires creating a web app manifest file and configuring the PWA plugin.

**Tasks:**

1. **Install Vite PWA plugin**:

    - Install `vite-plugin-pwa` as a dev dependency using Bun
    - This plugin handles PWA configuration, service worker generation, and manifest creation

2. **Create web app manifest** (`public/manifest.json`):

    - Create a JSON file that describes your app to the browser
    - Include app metadata:
        - `name`: Full app name ("Foster Platform")
        - `short_name`: Short name for home screen ("Foster")
        - `description`: What the app does
        - `start_url`: Where the app starts when launched (usually "/")
        - `display`: How the app appears ("standalone" means it looks like a native app, no browser UI)
        - `background_color`: Background color while app loads
        - `theme_color`: Color for browser UI elements
    - Define app icons array with:
        - Icon at 192x192 pixels (for Android home screen)
        - Icon at 512x512 pixels (for splash screens and high-res displays)
        - Each icon entry needs: src path, sizes, type, and purpose ("any maskable" for adaptive icons)

3. **Generate app icons**:

    - Create two icon images: 192x192 and 512x512 pixels
    - Icons should be square PNG files
    - Place them in the `public/` directory
    - Icons should be recognizable and work well as app icons (simple, clear design)

4. **Configure PWA plugin in Vite config** (`vite.config.ts`):

    - Import the VitePWA plugin
    - Add it to the plugins array in your Vite config
    - Configure with:
        - `registerType: "autoUpdate"` - automatically updates the service worker when new version is available
        - `includeAssets` - list of static assets to include (favicon, icons)
        - `manifest` - object containing the same manifest data (can reference the manifest.json or define inline)
    - The plugin will automatically generate a service worker and register it

5. **Add iOS-specific meta tags** (`index.html`):
    - Add `theme-color` meta tag for browser theme color
    - Add `apple-mobile-web-app-capable` meta tag set to "yes" (enables fullscreen on iOS)
    - Add `apple-mobile-web-app-status-bar-style` meta tag (controls status bar appearance)

**How It Works:**

-   The manifest.json tells browsers this is an installable PWA
-   The Vite PWA plugin generates a service worker (for offline support) and registers it
-   When users visit the app on mobile, browsers detect the manifest and show an "Add to Home Screen" prompt
-   Once installed, the app opens in standalone mode (no browser UI) and appears in the app drawer/home screen

**Testing:**

-   Open the app on a mobile device (phone browser)
-   Look for "Add to Home Screen" prompt or browser menu option
-   Install the app to home screen
-   Launch the installed app → should open fullscreen without browser UI
-   Verify app icon appears correctly on home screen
-   Test on both Android and iOS if possible (iOS requires Safari, Android works in Chrome/Edge)

**Deliverable:** PWA manifest configured and working. App is installable on mobile devices and opens in standalone mode when launched from home screen.

---

### Milestone 3.2: Service Worker (Offline Support)

**Goal:** Enable the app to work offline by caching assets and data, allowing users to access previously viewed content without an internet connection. This milestone configures caching strategies so the app can function offline. The service worker (automatically generated by Vite PWA plugin) will cache app files and API responses, allowing users to view cached content when offline.

**Tasks:**

1. **Understand service worker generation**:

    - The Vite PWA plugin automatically generates a service worker during build
    - The service worker is a JavaScript file that runs in the background
    - It intercepts network requests and can serve cached content instead

2. **Configure caching strategies in Vite config** (`vite.config.ts`):

    - Add `workbox` configuration to the VitePWA plugin options
    - Configure `globPatterns` to specify which files to cache:
        - Cache all JavaScript, CSS, HTML, icon, and SVG files
        - These are your app's static assets that don't change often
    - Configure `runtimeCaching` for API requests:
        - Set up caching for Supabase API calls (URLs matching `*.supabase.co`)
        - Use "NetworkFirst" strategy: try network first, fall back to cache if offline
        - Configure cache options:
            - `cacheName`: Name for this cache (e.g., "supabase-cache")
            - `expiration`: How long to keep cached data (e.g., 24 hours, max 50 entries)
    - This ensures API responses are cached and available offline

3. **Test offline functionality**:
    - Build the app for production (service worker only works in production build)
    - Serve the production build locally or deploy it
    - Open the app in a browser
    - Open browser DevTools → Application tab → Service Workers
    - Verify service worker is registered
    - Turn off WiFi or disable network in DevTools
    - Refresh the page → app should still load (using cached files)
    - Navigate to previously viewed pages → should work offline
    - Try accessing new pages → may show offline message or cached content

**How It Works:**

-   When the app loads, the service worker registers and starts caching files
-   Static assets (JS, CSS, HTML) are cached immediately
-   API responses are cached as they're fetched (using NetworkFirst strategy)
-   When offline, the service worker intercepts requests and serves cached content
-   If no cache exists for a request, it fails gracefully (shows error or offline message)

**Testing:**

-   Build the app for production
-   Verify service worker registers in browser DevTools
-   Test offline mode: disable network, refresh page → app should still load
-   Navigate to previously viewed pages → should work offline
-   Check that cached API data is available offline
-   Verify cache expiration works (old data is cleared after expiration time)
-   Test on mobile device → turn off WiFi, app should still function for cached content

**Deliverable:** Service worker configured and working. App can load and display cached content when offline. Users can access previously viewed pages and data without an internet connection.

---

## Phase 3.5: Deployment (For Real Device Testing)

**Goal:** Deploy the PWA to a public URL so you can test on real phones and share with others.

**Why Deploy After Phase 3:**

-   You have a complete working feature (auth + animals CRUD)
-   PWA is ready - can test "Add to Home Screen" on real devices
-   Makes sense to deploy a PWA (not just a web app)
-   Early enough for testing, but meaningful enough to be useful
-   Verify environment variables work in production
-   Learn deployment process (it's easier than it seems!)

**When to Deploy:**

-   **Recommended:** After Phase 3 (PWA Setup) is complete
-   **Alternative:** After Phase 2 if you want to test earlier (but you'll miss PWA features)
-   **Can skip:** If you're only testing locally for now

### Milestone 3.5.1: Deploy to Vercel (Recommended)

**Goal:** Deploy Vite PWA to Vercel (free, easy, fast).

**Tasks:**

1. **Create Vercel account**:

    - Go to https://vercel.com
    - Sign up with GitHub (recommended) or email

2. **Install Vercel CLI** (optional but helpful):

    ```bash
    brew install vercel
    ```

3. **Deploy via Vercel Dashboard** (easiest for first time):

    - Go to Vercel dashboard → Add New Project
    - Import your GitHub repository (or connect Git provider)
    - Configure project:
        - **Root Directory:** `foster-app`
        - **Framework Preset:** Vite
        - **Build Command:** `bun run build` (or `npm run build`)
        - **Output Directory:** `dist`
        - **Install Command:** `bun install` (or `npm install`)
    - Add environment variables:
        - `VITE_SUPABASE_URL` = your Supabase URL
        - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
    - Click "Deploy"

4. **Deploy via CLI** (alternative):

    ```bash
    cd foster-app
    vercel
    # Follow prompts to configure
    # Add environment variables when prompted
    ```

5. **Verify deployment**:

    - Vercel gives you a URL (e.g., `https://your-app.vercel.app`)
    - Open URL in browser
    - Test login functionality
    - Test animals CRUD functionality
    - Check that environment variables are working

6. **Test PWA on phone**:
    - Open the Vercel URL on your phone browser
    - Test "Add to Home Screen" (should work since PWA is configured)
    - Install app to home screen
    - Test login and animals CRUD on real device
    - Verify mobile-first design works
    - Test offline functionality (if service worker is working)

**Testing:**

-   App loads on Vercel URL
-   Login works (can authenticate with Supabase)
-   Animals CRUD works (can create, view, edit animals)
-   PWA installs to home screen on phone
-   App works offline (basic cached pages)
-   Environment variables are accessible

**Deliverable:** PWA deployed to Vercel with working authentication and animals CRUD.

### Milestone 3.5.2: Alternative Deployment Options

**Option A: Netlify**

-   Similar to Vercel
-   Go to https://netlify.com
-   Drag and drop `foster-app/dist` folder (after building)
-   Add environment variables in Netlify dashboard
-   Or use Netlify CLI: `netlify deploy`

**Option B: Supabase Hosting**

-   Hosted by Supabase (same provider as database)
-   Go to Supabase dashboard → Hosting
-   Follow setup instructions
-   Automatically configured for Supabase projects

**Option C: GitHub Pages** (free but more setup)

-   Requires GitHub Actions for deployment
-   More complex, not recommended for first deployment

**Recommendation:** Use Vercel for first deployment (easiest, free, fast).

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
2. Add links using React Router's `Link` component:
    ```typescript
    import { Link, useLocation } from "react-router-dom";
    ```
3. Add links to:
    - Dashboard (`/dashboard`)
    - Animals (`/animals`)
    - Profile (`/profile`)
    - (Coordinator only: Create Animal `/animals/new`)
4. Use `useLocation` to highlight active route
5. Make navigation responsive (bottom nav on mobile, sidebar on desktop)
6. Create `src/components/Navigation.tsx` and include in layout

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
-   **Deployment:** See Phase 3.5 for dedicated deployment milestone. Recommended after Phase 3 (PWA Setup) is complete, so you can test PWA installation on real devices.
-   **React Router Benefits:** Pure SPA setup is simpler than Next.js for internal tools. Easy to share components with Expo later since it's pure React.
