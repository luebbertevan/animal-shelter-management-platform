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
    - Error handling using `errorUtils` for consistent user-friendly messages
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

**Goal:** Allow new users to create accounts through a simple signup form. This milestone implements basic user registration with email and password. **Note:** This open signup will be replaced in Phase 7 with confirmation code-based signup that links users to organizations and determines their role (coordinator vs foster).

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
    - Handle errors from Supabase using `errorUtils` for consistent user-friendly messages
    - Show loading state while submitting (disable form, show loading indicator)
    - On success, automatically log user in and redirect to dashboard (M1.6)

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
    - Import `LoadingSpinner` component for loading state
    - Check `loading` state from `useAuth()` hook and show spinner if loading
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
    - Handle errors from Supabase using `errorUtils` for consistent user-friendly messages
    - Verify data was inserted (check both error and data response)
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
        - Handle errors from Supabase using `errorUtils` and throw them so React Query can catch them

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
        - Handle errors using `errorUtils` and throw them so React Query can catch them

4. **Display all animal fields**:

    - Show all available animal information in a readable format
    - Organize information in sections or a clean vertical layout
    - Display fields like: name, species, breed, status, dates (intake, available, etc.), notes
    - Handle missing/optional fields gracefully (don't show empty fields or show "Not specified")
    - Use mobile-first design with adequate spacing and readable font sizes
    - Consider using a card or section-based layout for visual organization

5. **Add edit functionality (for coordinators)**:

    - Add an "Edit" button or link (will be functional in a later milestone)
    - For now, this can just be a placeholder that shows the button
    - Consider role-based visibility (only show for coordinators, not fosters)
    - **Note: Coordinator Fostering Edge Case:** Coordinators may also foster animals. When a coordinator is fostering an animal, they should see both:
        - Coordinator features (can edit all animals, view all animals)
        - Foster features (can upload photos/updates for animals they're fostering)

6. **Add routing**:
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

---

## Phase 4: Schema Rework & Multi-Tenancy Foundation

**Goal:** Add organizations to support multiple shelters and prepare schema for future expansion based on customer feedback.

### Milestone 4.1: Add Organizations Table

**Goal:** Create organizations table to support multiple shelters using the same system.

**Tasks:**

1. Create new migration file for organizations
2. Create `public.organizations` table with:
    - `id` (UUID primary key)
    - `name` (TEXT, required)
    - `created_at` (TIMESTAMPTZ)
    - `updated_at` (TIMESTAMPTZ)
3. Enable RLS on organizations table
4. Create RLS policy: "Users can view organizations they belong to"
5. **Note:** Organizations are created manually by admin (via Supabase dashboard). Coordinators and fosters are assigned to organizations via confirmation codes during signup.
6. Run migration and verify table creation

**Testing:**

-   Organizations table exists in Supabase
-   Can insert organization via Supabase dashboard
-   RLS policies prevent unauthorized access

**Deliverable:** Organizations table created with RLS policies.

---

### Milestone 4.2: Add Organization ID to Core Tables

**Goal:** Link users, animals, and animal groups to organizations for data isolation.

**Tasks:**

1. Create new migration file for adding organization_id columns
2. Add `organization_id UUID REFERENCES public.organizations(id)` to:
    - `public.profiles` table
    - `public.animals` table
    - `public.animal_groups` table
3. Make `organization_id` NOT NULL for new records (add default for existing)
4. Create default organization record (e.g., "Default Shelter")
5. Update existing records to reference default organization
6. Add foreign key constraints
7. Run migration and verify data integrity

**Testing:**

-   All tables have organization_id column
-   Existing records are assigned to default organization
-   Cannot create record without organization_id
-   Foreign key constraints prevent orphaned records

**Deliverable:** All core tables linked to organizations.

---

### Milestone 4.3: Update RLS Policies for Organization Isolation

**Goal:** Ensure users can only see data from their own organization.

**Tasks:**

1. Update `profiles` RLS policies:
    - Users can view profiles in their organization
    - Coordinators can view all profiles in their organization
2. Update `animals` RLS policies:
    - Users can view animals in their organization
    - Coordinators can create/update animals in their organization
3. Update `animal_groups` RLS policies:
    - Users can view animal groups in their organization
    - Coordinators can create/update animal groups in their organization
4. Test policies: Create test user in different org, verify data isolation
5. Update `is_coordinator()` function to check organization if needed

**Testing:**

-   User in Org A cannot see data from Org B
-   Coordinator in Org A can only manage Org A data
-   Policies work correctly for all CRUD operations

**Deliverable:** RLS policies enforce organization isolation.

---

### Milestone 4.4: Update Queries to Filter by Organization

**Goal:** All frontend queries automatically filter by user's organization.

**Tasks:**

1. Update `useUserProfile` hook to fetch user's organization_id
2. Create `useOrganization` hook that returns current user's organization
3. Update all animal queries to include `.eq('organization_id', orgId)`
4. Update all profile queries to include organization filter
5. Update all animal group queries to include organization filter
6. Test: Verify users only see their organization's data in UI
7. Update `NewAnimal.tsx` to set organization_id on creation
8. Update any other creation forms to include organization_id

**Testing:**

-   Animals list only shows animals from user's organization
-   Creating animal assigns it to user's organization
-   Switching organizations (if implemented) shows different data

**Deliverable:** All queries filter by organization automatically.

---

## Phase 5: Messaging System (CRITICAL)

**Goal:** Enable real-time communication between coordinators and fosters, with full coordinator visibility into all conversations.

---

### Milestone 5.1: Messages & Conversations Schema

**Goal:** Create database schema for messaging system supporting household chats and coordinator group chat.

**Tasks:**

1. Create `public.conversations` table:
    - `id` (UUID primary key)
    - `organization_id` (UUID, references organizations)
    - `type` (TEXT: 'household' or 'coordinator_group')
    - `foster_household_id` (UUID, nullable, for household chats - references profiles)
    - `created_at`, `updated_at`
2. Create `public.messages` table:
    - `id` (UUID primary key)
    - `conversation_id` (UUID, references conversations)
    - `sender_id` (UUID, references profiles)
    - `content` (TEXT, required)
    - `created_at` (TIMESTAMPTZ)
3. Enable RLS on both tables
4. Create RLS policies for conversations:
    - Fosters can view their household conversation
    - Coordinators can view all conversations in their organization
    - Coordinators can view coordinator group chat
5. Create RLS policies for messages:
    - Users can view messages in conversations they have access to
    - Users can create messages in conversations they have access to
6. Add indexes on `conversation_id` and `created_at` for performance

**Testing:**

-   Tables created with correct structure
-   RLS policies prevent unauthorized access
-   Can create test conversations and messages
-   Foster can only see their household conversation
-   Coordinator can see all conversations

**Deliverable:** Messaging schema with proper RLS policies.

---

### Milestone 5.2: Create Conversation on User Signup

**Goal:** Automatically create household conversation when foster signs up.

**Tasks:**

1. Update profile creation trigger (or create new trigger):
    - When foster profile is created, create household conversation
    - Link conversation to foster's profile and organization
    - Set conversation type to 'household'
2. Test: Sign up as foster, verify conversation is created
3. Handle edge case: What if coordinator signs up? (No household conversation needed)

**Testing:**

-   New foster signup creates household conversation
-   Conversation is linked to correct organization
-   Coordinator signup does not create household conversation

**Deliverable:** Automatic conversation creation working.

---

### Milestone 5.3: Coordinator Group Chat Setup

**Goal:** Create and manage coordinator group chat for each organization.

**Tasks:**

1. Create function or trigger to ensure coordinator group chat exists:
    - Check if coordinator group chat exists for organization
    - If not, create it
    - Link all coordinators in organization to it
2. Create migration or seed script to create coordinator group chat for existing organizations
3. Update coordinator creation logic to add them to group chat
4. Test: Verify coordinator group chat exists and coordinators can access it

**Testing:**

-   Coordinator group chat exists for each organization
-   All coordinators in org can access group chat
-   New coordinators are automatically added to group chat

**Deliverable:** Coordinator group chat system working.

---

### Milestone 5.4: Chat UI - Message List Component

**Goal:** Create reusable message list component that displays messages in chronological order.

**Tasks:**

1. Create `src/components/messaging/MessageList.tsx`:
    - Accept `conversationId` as prop
    - Fetch messages for conversation using React Query
    - Display messages in chronological order (oldest first)
    - Show sender name, message content, timestamp
    - Style for mobile-first design
    - Handle loading and error states
2. Create `src/components/messaging/MessageBubble.tsx`:
    - Display individual message
    - Show different styling for own messages vs others
    - Display timestamp in readable format
3. Add scroll-to-bottom functionality when new messages arrive
4. Test: Display messages correctly, handle empty state

**Testing:**

-   Messages display in correct order
-   Sender names and timestamps are correct
-   Empty state shows when no messages
-   Loading and error states work

**Deliverable:** Message list component working.

---

### Milestone 5.5: Chat UI - Message Input Component

**Goal:** Allow users to type and send messages in conversations.

**Tasks:**

1. Create `src/components/messaging/MessageInput.tsx`:
    - Text input field for message content
    - Send button (or Enter key to send)
    - Disable input while sending
    - Clear input after successful send
    - Handle validation (non-empty message)
2. Create function to send message:
    - Insert message into `messages` table
    - Link to conversation_id
    - Set sender_id to current user
    - Handle errors with user-friendly messages
3. Integrate with MessageList to show new message immediately
4. Test: Send message, verify it appears in list, verify it's saved to database

**Testing:**

-   Can type and send messages
-   Message appears immediately in list
-   Message is saved to database
-   Error handling works for failed sends

**Deliverable:** Message input and sending working.

---

### Milestone 5.6: Real-Time Message Updates

**Goal:** Messages appear instantly when sent by other users without page refresh.

**Tasks:**

1. Set up Supabase Realtime subscription for messages:
    - Subscribe to new messages in conversation
    - Update message list when new message arrives
    - Handle connection errors gracefully
2. Update MessageList to use Realtime:
    - Subscribe when component mounts
    - Unsubscribe when component unmounts
    - Append new messages to list
    - Scroll to bottom when new message arrives
3. Test: Open conversation on two devices, send message from one, verify it appears on other
4. Handle edge cases: Multiple tabs, connection loss, reconnection

**Testing:**

-   Message sent on Device A appears instantly on Device B
-   No page refresh needed
-   Works when offline then reconnects
-   Multiple conversations update independently

**Deliverable:** Real-time messaging working.

---

### Milestone 5.7: Conversation List for Fosters

**Goal:** Fosters can see and access their household conversation.

**Tasks:**

1. Create `src/pages/messaging/ConversationsList.tsx`:
    - Fetch user's household conversation
    - Display conversation in list format
    - Show last message preview and timestamp
    - Link to conversation detail page
2. Create route `/messages` for conversations list
3. Add navigation link to messages page
4. Style for mobile-first design
5. Test: Foster can see their conversation, can navigate to it

**Testing:**

-   Foster sees their household conversation
-   Last message and timestamp are correct
-   Can click to open conversation
-   Empty state if no conversation exists

**Deliverable:** Foster conversation list working.

---

### Milestone 5.8: Conversation List for Coordinators

**Goal:** Coordinators can see all household conversations and coordinator group chat.

**Tasks:**

1. Update `src/pages/messaging/ConversationsList.tsx`:
    - Fetch all household conversations in organization
    - Fetch coordinator group chat
    - Display all conversations in list
    - Show foster name for household conversations
    - Show "Coordinator Chat" for group chat
    - Show last message preview and unread counts
2. Add filtering/search (optional, can be Phase 8):
    - Filter by foster name
    - Search message content
3. Test: Coordinator sees all conversations, can navigate to any

**Testing:**

-   Coordinator sees all household conversations
-   Coordinator sees coordinator group chat
-   Can navigate to any conversation
-   List updates when new messages arrive

**Deliverable:** Coordinator conversation list working.

---

### Milestone 5.9: Conversation Detail Page

**Goal:** Full conversation view with message list and input.

**Tasks:**

1. Create `src/pages/messaging/ConversationDetail.tsx`:
    - Accept `conversationId` from URL params
    - Fetch conversation details
    - Display conversation header (foster name or "Coordinator Chat")
    - Include MessageList component
    - Include MessageInput component
    - Handle loading and error states
2. Create route `/messages/:conversationId`
3. Add back button to return to conversations list
4. Test: Can view conversation, send messages, see real-time updates

**Testing:**

-   Conversation loads correctly
-   Messages display properly
-   Can send new messages
-   Real-time updates work
-   Navigation works

**Deliverable:** Conversation detail page working.

---

## Phase 6: Push Notifications (PWA)

**Goal:** Enable push notifications for messaging and important updates, ensuring users are alerted even when app is closed.

---

### Milestone 6.1: Firebase Cloud Messaging Setup

**Goal:** Configure FCM for web push notifications on Android and desktop browsers.

**Tasks:**

1. Create Firebase project at console.firebase.google.com
2. Add web app to Firebase project
3. Get Firebase configuration (API key, project ID, etc.)
4. Install Firebase SDK: `bun add firebase`
5. Create `src/lib/firebase.ts`:
    - Initialize Firebase app with config
    - Initialize messaging service
    - Create function to request notification permission
    - Create function to get FCM push token
    - Create function to handle foreground messages
6. Get VAPID key from Firebase Console → Project Settings → Cloud Messaging
7. Store VAPID key in environment variables
8. Test: Request permission, verify token is generated

**Testing:**

-   Can request notification permission
-   FCM token is generated and logged
-   Permission prompt appears correctly
-   Token is valid format

**Deliverable:** FCM configured and ready to use.

---

### Milestone 6.2: Push Token Storage

**Goal:** Store user's push token in database so backend can send notifications.

**Tasks:**

1. Create `public.push_tokens` table:
    - `id` (UUID primary key)
    - `user_id` (UUID, references profiles)
    - `token` (TEXT, unique, required)
    - `platform` (TEXT: 'web', 'ios', 'android')
    - `organization_id` (UUID, references organizations)
    - `created_at`, `updated_at`
2. Enable RLS on push_tokens table
3. Create RLS policies:
    - Users can manage their own tokens
    - Coordinators can view tokens in their organization (for sending notifications)
4. Create `src/hooks/usePushNotifications.ts`:
    - Request notification permission on mount
    - Get FCM token when permission granted
    - Upsert token to database (handle token updates)
    - Listen for foreground messages
    - Show browser notification for foreground messages
5. Add hook to main app layout
6. Test: Grant permission, verify token saved to database

**Testing:**

-   Token is saved to database when permission granted
-   Token is updated if user grants permission again
-   Token is linked to correct user and organization
-   Foreground notifications appear when app is open

**Deliverable:** Push tokens stored and managed automatically.

---

### Milestone 6.3: In-App Notifications System

**Goal:** Store notifications in database so users see missed notifications when they return.

**Tasks:**

1. Complete `public.notifications` table (from Phase 4.5):
    - Ensure all columns exist: `id`, `user_id`, `organization_id`, `type`, `title`, `body`, `read`, `created_at`
2. Enable RLS on notifications table
3. Create RLS policies:
    - Users can view their own notifications
    - Users can update read status
    - Coordinators can create notifications (for sending)
4. Create `src/hooks/useNotifications.ts`:
    - Fetch unread notifications for current user
    - Mark notifications as read
    - Subscribe to new notifications via Realtime
5. Create notification badge component:
    - Show unread count
    - Display in navigation/header
6. Test: Create notification, verify it appears, verify read status updates

**Testing:**

-   Notifications are stored in database
-   Users see their notifications
-   Unread count is accurate
-   Marking as read updates database

**Deliverable:** In-app notifications system working.

---

### Milestone 6.4: Send Push Notifications for Messages

**Goal:** Send push notification when new message arrives in conversation.

**Tasks:**

1. Create Supabase Edge Function `send-push-notification`:
    - Accept user_id, title, body as parameters
    - Fetch user's push tokens from database
    - Send notification via FCM API
    - Handle errors gracefully
2. Create database trigger or function:
    - When new message is inserted
    - Get conversation participants (excluding sender)
    - For each participant, create in-app notification
    - For each participant with push token, call Edge Function
3. Test: Send message, verify recipients receive push notification
4. Handle edge cases:
    - User has no push token (only in-app notification)
    - Multiple devices (send to all tokens)
    - Notification permission denied

**Testing:**

-   Message sent triggers push notification to recipients
-   Notification appears on recipient's device
-   Works when app is closed
-   In-app notification also created

**Deliverable:** Push notifications for messages working.

---

### Milestone 6.5: Notification Preferences

**Goal:** Allow users to control what types of notifications they receive.

**Tasks:**

1. Add `notification_preferences` JSONB column to profiles table:
    - Store preferences as JSON object
    - Types: `messages`, `assignments`, `reminders`, `updates`
    - Each type: boolean (enabled/disabled)
2. Create `src/pages/settings/NotificationSettings.tsx`:
    - Fetch user's notification preferences
    - Display toggles for each notification type
    - Save preferences to database
    - Show current preference state
3. Add route `/settings/notifications`
4. Add link to settings in navigation
5. Update notification sending logic:
    - Check user's preferences before sending
    - Respect disabled notification types
6. Test: Toggle preferences, verify notifications respect settings

**Testing:**

-   Users can view and update preferences
-   Preferences are saved correctly
-   Notifications respect disabled types
-   Enabled types still send notifications

**Deliverable:** Notification preferences working.

---

## Phase 7: Confirmation Codes (For Both Coordinators & Fosters)

**Goal:** Enable coordinators to generate confirmation codes for both coordinators and fosters in their organization, controlling platform access. Codes are linked to email addresses and organizations, and determine user role. This replaces open signup and eliminates the need for separate signup pages or organization creation flows.

---

### Milestone 7.1: Confirmation Codes Schema

**Goal:** Create database schema for confirmation codes that link users to organizations and determine their role.

**Tasks:**

1. Create `public.confirmation_codes` table:
    - `id` (UUID primary key)
    - `code` (TEXT, unique, required) - human-readable code (e.g., "ABC123")
    - `email` (TEXT, required) - email address the code is assigned to
    - `organization_id` (UUID, references organizations, required)
    - `role` (TEXT, required, CHECK role IN ('coordinator', 'foster')) - determines user role
    - `created_by` (UUID, references profiles - coordinator who created the code)
    - `used_by` (UUID, nullable, references profiles - user who used it)
    - `used_at` (TIMESTAMPTZ, nullable) - when code was used
    - `expires_at` (TIMESTAMPTZ, nullable) - optional expiration
2. Enable RLS on confirmation_codes table
3. Create RLS policies:
    - Anyone can view unused codes (for validation during signup)
    - Coordinators can view codes in their organization
    - Coordinators can create codes in their organization
    - Coordinators can revoke codes in their organization (mark as used or delete)
4. Add indexes:
    - Index on `code` for fast lookup during signup
    - Index on `email` for lookup by email
    - Index on `organization_id` for filtering
5. Test: Create test code, verify it's stored correctly

**Testing:**

-   Table created with correct structure
-   Can create confirmation code with email, organization, and role
-   RLS policies work correctly
-   Code lookup is fast
-   Email matching works correctly

**Deliverable:** Confirmation codes schema ready with email and role support.

---

### Milestone 7.2: Coordinator Code Generation UI

**Goal:** Coordinators can generate confirmation codes via a simple form UI, linking codes to email addresses and roles.

**Tasks:**

1. Create function to generate unique code:
    - Generate random alphanumeric code (e.g., "ABC123")
    - Ensure uniqueness in database
    - Make it readable and shareable
2. Create `src/pages/coordinators/ConfirmationCodes.tsx`:
    - Form to generate new code:
        - Email address input (required, type="email")
        - Role selector (dropdown: "Coordinator" or "Foster")
        - "Generate Code" button
    - When code is generated:
        - Save to database with:
            - Email from form
            - Role from form
            - Organization from coordinator's organization (automatic)
            - Created by coordinator's user ID (automatic)
            - Generated code
        - Display generated code prominently
        - Show "Copy Code" button
        - Show "Email Code" button (opens email client)
    - Display list of previously generated codes:
        - Show code, email, role, status (active/used), created date
        - Filter by role or status (optional)
3. Add route `/coordinators/codes` (coordinator-only)
4. Add navigation link for coordinators
5. Test: Coordinator can generate codes, codes are unique, codes are linked to correct organization and email

**Testing:**

-   Coordinator can generate codes with email and role
-   Codes are unique
-   Codes are automatically linked to coordinator's organization
-   Codes have correct role assigned
-   Codes appear in list after generation
-   Can copy and email codes

**Deliverable:** Coordinator code generation UI working.

---

### Milestone 7.3: Update Signup to Use Confirmation Codes

**Goal:** Replace open signup with confirmation code-based signup. Codes determine role and organization assignment.

**Tasks:**

1. Update `src/pages/SignUp.tsx`:
    - Add "Confirmation Code" input field (required)
    - Add email validation to match code's email
    - Validate code before submitting:
        - Code exists in database
        - Code is not already used
        - Email matches code's email address
        - Code is not expired (if expiration implemented)
    - Show clear error messages for invalid codes
2. Create function to validate code:
    - Query database for code
    - Check if code is valid, unused, and email matches
    - Return validation result with organization_id and role
3. On successful signup:
    - Create user account with Supabase auth
    - Create profile with:
        - Role from confirmation code
        - Organization from confirmation code
        - Email from signup form
    - Mark code as used (set `used_by` to new user's ID, `used_at` to now)
    - Auto-login user (as in M 1.6)
4. Handle role-based routing after signup:
    - Coordinators → coordinator dashboard
    - Fosters → foster dashboard
5. Test: Try signup with valid coordinator code, valid foster code, invalid code, used code, wrong email

**Testing:**

-   Valid coordinator code creates coordinator account
-   Valid foster code creates foster account
-   Invalid code shows error
-   Used code shows error
-   Wrong email shows error
-   Code is marked as used after signup
-   User is assigned to correct organization and role
-   User is auto-logged in after signup

**Deliverable:** Confirmation code-based signup working for both coordinators and fosters.

---

### Milestone 7.4: Code Management & Sharing

**Goal:** Coordinators can view, manage, and share confirmation codes they've generated.

**Tasks:**

1. Update `src/pages/coordinators/ConfirmationCodes.tsx`:
    - Display list of all codes in coordinator's organization:
        - Show: code, email, role, status (active/used), created date, created by (coordinator name), used date (if used)
        - Filter by role or status (optional, for better organization)
        - Show used codes with clear "Used" indicator
    - For each code:
        - "Copy Code" button (copies to clipboard)
        - "Email Code" button (opens email client with code and signup URL)
        - Show who used the code (if used) - link to user profile
2. Implement code sharing:
    - Generate mailto link with code in email body
    - Include signup URL with code as parameter (e.g., `https://app.vercel.app/signup?code=ABC123`)
    - Pre-fill recipient email address from code's email
    - Include friendly message explaining what the code is for
3. Add code management features:
    - View all codes (active and used)
    - See which codes have been used and by whom
    - Resend code via email if needed
4. Test: View codes, copy code, email code, verify codes are filtered by organization

**Testing:**

-   Coordinator can view all codes in their organization
-   Can copy code to clipboard
-   Can email code via mailto link
-   Codes display correctly with all information
-   Used codes show who used them
-   Codes are properly filtered by organization

**Deliverable:** Code management and sharing working for coordinators.

---

## Phase 8: Quality of Life Features

**Goal:** Add filtering, search, and timestamp display to improve usability and tracking.

---

### Milestone 8.1: Animal Filtering & Search

**Goal:** Allow users to filter and search animals by various criteria.

**Tasks:**

1. Create `src/components/animals/AnimalFilters.tsx`:
    - Filter by status (dropdown/multi-select)
    - Filter by priority (high priority toggle)
    - Filter by sex (dropdown)
    - Clear filters button
    - Show active filter count
2. Update `src/pages/animals/AnimalsList.tsx`:
    - Add filter state management
    - Apply filters to Supabase query
    - Display filtered results
    - Show "No results" when filters match nothing
3. Add search functionality:
    - Search input field
    - Search by name (case-insensitive)
    - Search by characteristics
    - Combine search with filters
4. Test: Apply filters, verify results update, clear filters, search works

**Testing:**

-   Filters work correctly
-   Search works correctly
-   Filters and search can be combined
-   Results update in real-time
-   Empty states show correctly

**Deliverable:** Animal filtering and search working.

---

### Milestone 8.2: Timestamp Display & History

**Goal:** Display timestamps on messages and data edits to show when information changed.

**Tasks:**

1. Ensure all relevant tables have `created_at` and `updated_at` timestamps:
    - Verify `animals` table has both timestamps
    - Verify `messages` table has `created_at`
    - Verify `animal_groups` table has both timestamps
    - Add `updated_at` triggers if missing
2. Display timestamps in UI:
    - Show `created_at` timestamp on all messages
    - Show `created_at` and `updated_at` on animal detail page
    - Format timestamps in readable format (e.g., "2 hours ago", "Jan 15, 2024")
3. Create timestamp display component:
    - `src/components/ui/Timestamp.tsx` for consistent timestamp formatting
    - Handle relative time (e.g., "just now", "5 minutes ago")
    - Handle absolute time for older items
4. Add to animal detail page:
    - Show "Created: [timestamp]"
    - Show "Last updated: [timestamp]" if different from created
5. Add to message display:
    - Show timestamp with each message
    - Format consistently across all messages
6. Test: Verify timestamps display correctly and update when data changes

**Testing:**

-   Timestamps display on all messages
-   Timestamps display on animal records
-   Timestamps update when data is edited
-   Timestamp formatting is readable and consistent

**Deliverable:** Timestamp display working throughout app.

**Note:** This milestone focuses on displaying existing timestamps. A separate activity logging system (tracking who did what) may be added later based on customer feedback - see QUESTIONS_FOR_RESCUE.md.

---

### Milestone 8.3: Photo Uploads for Animals

**Goal:** Allow coordinators and fosters to upload photos for animals.

**Tasks:**

1. Set up Supabase Storage:
    - Create storage bucket for animal photos
    - Configure bucket policies for organization isolation
    - Set up RLS policies: users can upload/view photos in their organization
2. Add `photos` JSONB column to `animals` table (if not already added):
    - Structure: `[{"url": "...", "uploaded_at": "...", "uploaded_by": "..."}, ...]`
    - Store array of photo objects with metadata
3. Create photo upload component:
    - `src/components/animals/PhotoUpload.tsx`
    - File input for selecting photos
    - Upload to Supabase Storage
    - Show upload progress
    - Handle errors gracefully
4. Update animal detail page:
    - Display photo gallery
    - Show uploaded photos with timestamps
    - Allow coordinators to upload new photos
    - Allow fosters to upload photos for assigned animals
5. Update animal creation form:
    - Optional photo upload during creation
    - Store photos in `photos` JSONB array
6. Test: Upload photos, verify they appear, verify organization isolation

**Testing:**

-   Can upload photos to Supabase Storage
-   Photos are linked to correct animal and organization
-   Photos display correctly in gallery
-   Upload progress and errors are handled
-   RLS policies prevent cross-organization access

**Deliverable:** Photo upload functionality working.

---

## Phase 9: UX Polish & Navigation

**Goal:** Improve user experience with polished design, better navigation, and refined interactions based on Figma designs.

---

### Milestone 9.1: Navigation Structure

**Goal:** Create consistent, mobile-friendly navigation throughout the app.

**Tasks:**

1. Create `src/components/Navigation.tsx`:
    - Bottom navigation bar for mobile (fixed at bottom)
    - Sidebar navigation for desktop (collapsible)
    - Show active route highlighting
    - Include icons for each route
2. Navigation links:
    - Dashboard (all users)
    - Animals (all users)
    - Messages (all users)
    - Settings (all users)
    - Coordinator-only: Create Animal, Confirmation Codes
3. Use React Router's `useLocation` to highlight active route
4. Make navigation responsive:
    - Mobile: Bottom nav (always visible)
    - Desktop: Sidebar (collapsible)
5. Add navigation to main app layout
6. Test: Navigate between pages, verify active state, test on mobile and desktop

**Testing:**

-   Navigation works on mobile and desktop
-   Active route is highlighted
-   Coordinator-only links only show for coordinators
-   Navigation is always accessible

**Deliverable:** Responsive navigation structure working.

---

### Milestone 9.2: Figma Design Implementation

**Goal:** Implement polished UI designs from Figma, improving visual consistency and user experience.

**Tasks:**

1. Review Figma designs for key screens:
    - Dashboard
    - Animals list
    - Animal detail
    - Messages/conversations
    - Forms
2. Update component styling to match designs:
    - Colors, spacing, typography
    - Button styles, input styles
    - Card layouts, list layouts
    - Icons and imagery
3. Create or update design system:
    - Color palette
    - Typography scale
    - Spacing system
    - Component variants
4. Update existing components:
    - FormContainer, Input, Button, etc.
    - Animal cards, message bubbles
    - Navigation components
5. Ensure mobile-first responsive design
6. Test: Compare UI to Figma designs, verify consistency

**Testing:**

-   UI matches Figma designs
-   Components are consistent
-   Mobile and desktop layouts work
-   Design system is applied consistently

**Deliverable:** Figma designs implemented.

---

### Milestone 9.3: Loading States & Empty States

**Goal:** Improve perceived performance and user guidance with better loading and empty states.

**Tasks:**

1. Review all pages for loading states:
    - Add spinners/skeletons where data is fetching
    - Ensure loading states are consistent
    - Remove any blank screens during loading
2. Review all pages for empty states:
    - Animals list: "No animals yet"
    - Messages: "No messages yet"
    - Activity: "No activity yet"
    - Make empty states helpful and actionable
3. Create reusable empty state component
4. Add loading skeletons for better UX:
    - Skeleton for animal cards
    - Skeleton for message list
    - Skeleton for activity timeline
5. Test: Verify all loading and empty states work correctly

**Testing:**

-   Loading states appear during data fetch
-   Empty states are helpful and clear
-   Skeletons improve perceived performance
-   No blank screens

**Deliverable:** Improved loading and empty states.

---

### Milestone 9.4: Error Handling Improvements

**Goal:** Provide better error messages and recovery options throughout the app.

**Tasks:**

1. Review error handling across all pages:
    - Network errors
    - Permission errors
    - Validation errors
    - Not found errors
2. Ensure consistent error message format
3. Add retry mechanisms for failed requests:
    - "Try Again" buttons
    - Automatic retry for transient errors
4. Add error boundaries for React errors:
    - Catch component errors
    - Show user-friendly error page
    - Provide recovery options
5. Improve form validation errors:
    - Show inline errors
    - Highlight invalid fields
    - Provide helpful error messages
6. Test: Trigger various errors, verify handling works

**Testing:**

-   Errors are caught and displayed nicely
-   Retry mechanisms work
-   Error boundaries prevent crashes
-   Form errors are helpful

**Deliverable:** Robust error handling throughout app.

---

### Milestone 9.5: Quick Actions & Shortcuts

**Goal:** Add convenient shortcuts and quick actions to improve workflow efficiency.

**Tasks:**

1. Add quick actions to Dashboard:
    - "Create Animal" button (coordinators)
    - "View Animals" button
    - "View Messages" button
    - Recent activity shortcuts
2. Add context actions:
    - Quick status change on animal cards
    - Quick reply in message list
    - Quick filters in animals list
3. Add keyboard shortcuts (desktop):
    - `/` to focus search
    - `n` for new animal (coordinators)
    - `m` for messages
4. Add swipe actions (mobile):
    - Swipe to mark message as read
    - Swipe to change animal status (coordinators)
5. Test: Verify quick actions work, shortcuts work, swipe actions work

**Testing:**

-   Quick actions are accessible
-   Keyboard shortcuts work
-   Swipe actions work on mobile
-   Actions perform correctly

**Deliverable:** Quick actions and shortcuts working.

---

## Phase 10: Expo Wrapping (For Reliable iOS Notifications)

**Goal:** Wrap PWA in Expo to enable App Store distribution and reliable iOS push notifications via APNs.

---

### Milestone 10.1: Initialize Expo Project

**Goal:** Create Expo app that wraps the existing PWA.

**Tasks:**

1. Install Expo CLI: `bunx create-expo-app@latest`
2. Create new Expo app: `bunx create-expo-app@latest foster-mobile --template blank-typescript`
3. Install dependencies:
    - `expo-web-browser` for WebView
    - `expo-linking` for deep linking
4. Create WebView wrapper:
    - Load deployed PWA URL in WebView
    - Handle navigation within WebView
    - Handle deep links from PWA
5. Configure app.json:
    - Set app name, bundle identifier
    - Configure icons and splash screen
    - Set up deep linking
6. Test: Run Expo app, verify PWA loads in WebView

**Testing:**

-   Expo app runs successfully
-   PWA loads in WebView
-   Navigation works within WebView
-   Deep linking works

**Deliverable:** Expo wrapper created and working.

---

### Milestone 10.2: Expo Push Notifications

**Goal:** Replace FCM with Expo Push Notifications for reliable iOS support.

**Tasks:**

1. Install Expo Notifications: `bun add expo-notifications`
2. Configure push notifications:
    - Set up APNs (iOS) and FCM (Android) credentials
    - Configure app.json for push notifications
    - Request notification permissions
3. Update push token storage:
    - Get Expo push token instead of FCM token
    - Store token with platform identifier ('ios' or 'android')
    - Update token when it changes
4. Update notification sending:
    - Use Expo Push API instead of FCM
    - Send to Expo push tokens
    - Handle platform-specific formatting
5. Test: Send notification, verify it appears on iOS and Android

**Testing:**

-   Push notifications work on iOS
-   Push notifications work on Android
-   Tokens are stored correctly
-   Notifications appear when app is closed

**Deliverable:** Expo push notifications working on iOS and Android.

---

### Milestone 10.3: Build & Publish

**Goal:** Build and publish app to App Store and Play Store.

**Tasks:**

1. Set up Expo EAS Build:
    - Install EAS CLI
    - Configure `eas.json`
    - Set up build profiles
2. Configure app details:
    - Update app.json with app information
    - Set up app icons and splash screens
    - Configure app store listings
3. Build for iOS:
    - Create iOS build with EAS
    - Test build on physical device
    - Submit to App Store (requires Apple Developer account)
4. Build for Android:
    - Create Android build with EAS
    - Test build on physical device
    - Submit to Play Store (requires Google Play Developer account)
5. Test: Verify app installs and works from stores

**Testing:**

-   App builds successfully
-   App installs from App Store
-   App installs from Play Store
-   All features work in native app

**Deliverable:** App published to App Store and Play Store.

---

## Notes

-   **Start Small:** Don't try to build everything at once. Complete each milestone fully before moving on.
-   **Test on Real Phones:** The PWA approach means you can test on actual devices immediately—use this advantage!
-   **Customer Feedback Throughout:** Gather feedback from rescue team regularly as you build features. Don't wait for a dedicated feedback phase—incorporate feedback continuously to ensure the app meets their needs.
-   **Push Notifications are Critical:** Messaging and notifications are core to the communication-focused app.
-   **PWA First, Native Later:** Get the PWA working perfectly before considering Expo wrapping. Many users are fine with "Add to Home Screen."
-   **Use Bun:** All commands use `bun` instead of `npm` for faster installs and runs.
-   **Test Frequently:** Run your app after every small change to catch errors early.
-   **Use Supabase Docs:** The Supabase documentation is excellent—refer to it often.
-   **Ask for Help:** If stuck on a milestone for more than a few hours, step back and break it down further.
-   **Version Control:** Commit after each milestone so you can roll back if needed.
-   **Deployment:** See Phase 3.5 for dedicated deployment milestone. Recommended after Phase 3 (PWA Setup) is complete, so you can test PWA installation on real devices.
-   **React Router Benefits:** Pure SPA setup is simpler than Next.js for internal tools. Easy to share components with Expo later since it's pure React.

---

## Success Criteria for MVP

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

## Success Criteria for MVP

At the end of these milestones, you should have:

✅ **Working PWA**

-   App installs on phone (Add to Home Screen)
-   Works offline with service worker
-   Mobile-first responsive design

✅ **Working Authentication**

-   Users can log in via web (works on phone browser)
-   Auth state is managed and persisted
-   Routes are protected

✅ **Multi-Tenant Foundation**

-   Organizations table and multi-tenancy support
-   Data isolation between organizations
-   All queries filter by organization

✅ **Basic Animal Management**

-   Coordinators can create animals
-   Everyone can view animals list
-   Everyone can view animal details
-   Data persists in Supabase database

✅ **Messaging System (CRITICAL)**

-   Fosters can message coordinators via household chat
-   Coordinators can see all household conversations
-   Coordinator group chat for admin communication
-   Real-time message updates

✅ **Push Notifications (CRITICAL)**

-   Users receive push notifications on phone
-   Notifications for messages and important updates
-   In-app notifications for missed messages
-   Token management and preferences working

✅ **Foster Access Control**

-   Confirmation code system for approved fosters
-   Coordinators can generate and manage codes
-   Code validation during signup

✅ **Quality of Life Features**

-   Animal filtering and search
-   Activity logging and timeline display

✅ **Polished UI & Navigation**

-   Consistent navigation structure
-   Figma designs implemented
-   Improved loading and empty states
-   Better error handling

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
