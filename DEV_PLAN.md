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

**Goal:** Allow new users to create accounts through a simple signup form. This milestone implements basic user registration with email and password. **Note:** This open signup will be replaced in Phase 10 with confirmation code-based signup that links users to organizations and determines their role (coordinator vs foster).

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
-   Note: Profile creation will be handled automatically via database trigger (created in initial schema setup, updated in Phase 4.2 to include organization_id, and updated again in Phase 5.2 to create conversations)

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

**Goal:** Link users, animals, and animal groups to organizations for data isolation without breaking existing functionality.

**Migration Strategy (Simplified - Existing Data Deleted):**

1. **Use existing organization:**

    - Use existing "Fractal For Cats" organization (ID: `2c20afd1-43b6-4e67-8790-fac084a71fa2`)
    - This is the default organization for all new records

2. **Add organization_id columns as NOT NULL with DEFAULT:**

    - Add `organization_id UUID NOT NULL DEFAULT '2c20afd1-43b6-4e67-8790-fac084a71fa2' REFERENCES public.organizations(id)` to:
        - `public.profiles` table
        - `public.animals` table
        - `public.animal_groups` table
    - Since existing data is deleted, we can add columns directly as NOT NULL with DEFAULT
    - This ensures all new records automatically get the default organization_id

3. **Add foreign key constraints:**

    - Foreign key constraints are included in the column definition above
    - This prevents orphaned records

4. **Create profile creation trigger:**
    - **Note:** The trigger does not currently exist in migrations (checked)
    - Create trigger function: `public.handle_new_user()` that:
        - Inserts into `public.profiles` with: `id`, `email`, `role` (default 'foster'), and `organization_id` (default org UUID: `2c20afd1-43b6-4e67-8790-fac084a71fa2`)
    - Create trigger: `on_auth_user_created` that fires AFTER INSERT on `auth.users`
    - **Note:** The trigger will be updated again in Phase 5.2 (M 5.2 - Create Conversation on User Signup) to also create conversations, but for now it just needs to set organization_id
    - This ensures new signups (before Phase 10) get assigned to default organization

**Tasks:**

1. Create new migration file for adding organization_id columns
2. Add `organization_id` columns directly as NOT NULL with DEFAULT to all three tables (using org ID: `2c20afd1-43b6-4e67-8790-fac084a71fa2`)
3. Create profile creation trigger function and trigger
4. Run migration and verify data integrity

**Additional Implementation (Completed in M4.2):**

-   Update `useUserProfile` hook to fetch `organization_id` from profile
-   Update `NewAnimal.tsx` to explicitly set `organization_id` from user's profile when creating animals
-   This ensures animals are assigned to the creator's organization (better than relying on database DEFAULT)
-   Prepares for multi-org support where users from different orgs can create records

**Testing:**

-   All tables have organization_id column
-   New records automatically get default organization_id (Fractal For Cats) via DEFAULT
-   Creation forms explicitly set organization_id from user's profile (better practice)
-   Cannot create record without organization_id (enforced by NOT NULL)
-   Foreign key constraints prevent orphaned records
-   New signups automatically get assigned to default organization via trigger
-   App functionality works correctly with organization_id on all records

**Deliverable:** All core tables linked to organizations with safe migration. Creation forms explicitly set organization_id from user profile.

---

### Milestone 4.3: Update RLS Policies for Organization Isolation

**Goal:** Ensure users can only see data from their own organization.

**Tasks:**

1. **Update `profiles` RLS policies:**

    - Users can view their own profile (always allowed)
    - Users can view profiles in their organization
    - Coordinators can view all profiles in their organization

2. **Update `animals` RLS policies:**

    - Users can view animals in their organization
    - Coordinators can create/update animals in their organization

3. **Update `animal_groups` RLS policies:**

    - Users can view animal groups in their organization
    - Coordinators can create/update animal groups in their organization

4. **Update `is_coordinator()` function:**

    - Check organization if needed (for multi-org coordinator checks)
    - For now, can keep simple (role check) since all users are in default org

5. **Test policies:**
    - Existing users can still see their data (all in default org)
    - Create test user in different org (manually), verify data isolation
    - Verify users can only see their organization's data

**Note:** Since existing data can be deleted, we don't need fallback policies. All new records will have organization_id (via DEFAULT), so policies can require it.

**Testing:**

-   Existing users can still access their data (all in default org)
-   User in Org A cannot see data from Org B (when we add second org)
-   Coordinator in Org A can only manage Org A data
-   Policies work correctly for all CRUD operations
-   New signups (before Phase 10) get default org and can see default org data

**Deliverable:** RLS policies enforce organization isolation with safe fallbacks.

---

### Milestone 4.4: Update Queries to Filter by Organization

**Goal:** All frontend queries automatically filter by user's organization.

**Tasks:**

1. **Update `useUserProfile` hook:**

    - Fetch user's `organization_id` from profile
    - Return `organization_id` in hook response
    - All profiles will have organization_id (via DEFAULT in M 4.2)

2. **Update `useUserProfile` hook:**

    - Already updated in M4.2 to fetch `organization_id` from profile
    - Returns `organization_id` in hook response for use throughout app

3. **Update all animal queries:**

    - Include `.eq('organization_id', orgId)` filter
    - Update `AnimalsList.tsx` query
    - Update `AnimalDetail.tsx` query

4. **Update all profile queries:**

    - Include organization filter where appropriate
    - `useUserProfile` already fetches organization_id (updated in M4.2)

5. **Update all animal group queries:**

    - Include organization filter

6. **Update creation forms:**

    - `NewAnimal.tsx` already updated in M4.2 to set `organization_id` from user's profile
    - Update any other creation forms (animal_groups, etc.) similarly when implemented

7. **Test:**
    - Verify existing users can still see their animals (all in default org)
    - Verify creating animal assigns it to user's organization
    - Verify users only see their organization's data in UI

**Note:** Since existing data can be deleted, all new records will have organization_id. Queries should always filter by organization_id.

**Testing:**

-   Animals list only shows animals from user's organization
-   Creating animal assigns it to user's organization automatically
-   New signups (before Phase 10) get default org and see default org data

**Deliverable:** All queries filter by organization automatically with safe fallbacks.

---

## Phase 5: Messaging System (CRITICAL)

**Goal:** Enable real-time communication between coordinators and fosters, with full coordinator visibility into all conversations.

---

### Milestone 5.1: Messages & Conversations Schema

**Goal:** Create database schema for messaging system supporting foster chats and coordinator group chat.

**Tasks:**

1. Create `public.conversations` table:
    - `id` (UUID primary key)
    - `organization_id` (UUID, references organizations)
    - `type` (TEXT: 'foster_chat' or 'coordinator_group', CHECK constraint)
    - `foster_profile_id` (UUID, nullable, for foster chats - references profiles)
    - `created_at`, `updated_at`
    - Constraint: `foster_profile_id` must be set for 'foster_chat' type, NULL for 'coordinator_group'
    - Note: Future type 'organization_group' for org-wide chat (all org members)
2. Create `public.messages` table:
    - `id` (UUID primary key)
    - `conversation_id` (UUID, references conversations)
    - `sender_id` (UUID, references profiles)
    - `content` (TEXT, required)
    - `created_at` (TIMESTAMPTZ)
    - `edited_at` (TIMESTAMPTZ, nullable) - for future edit support
3. Create `public.message_links` table (for tagging animals, groups, and fosters in messages):
    - `id` (UUID primary key)
    - `message_id` (UUID, references messages)
    - `animal_id` (UUID, nullable, references animals)
    - `group_id` (UUID, nullable, references animal_groups)
    - Constraint: Exactly one of `animal_id` or `group_id` must be set
    - Index on `message_id` and `animal_id`/`group_id` for querying
    - Note: Messages are not deleted (only soft-deleted if needed), so no CASCADE needed
4. Enable RLS on all three tables
5. Create RLS policies for conversations:
    - Fosters can view their foster chat: `foster_profile_id = auth.uid()`
    - Coordinators can view all foster chats in their organization: `organization_id` matches AND `type = 'foster_chat'`
    - Coordinators can view coordinator group chat: `organization_id` matches AND `type = 'coordinator_group'` AND user role is 'coordinator'
6. Create RLS policies for messages:
    - Users can view messages in conversations they have access to (via conversation RLS)
    - Users can create messages in conversations they have access to (via conversation RLS)
7. Create RLS policies for message_links:
    - Users can view links for messages they can access (via message RLS)
8. Add indexes:
    - `conversations`: `organization_id`, `type`, `foster_profile_id`
    - `messages`: `conversation_id`, `(conversation_id, created_at DESC)` for efficient message fetching
    - `message_links`: `message_id`, `animal_id`, `group_id`, `foster_profile_id`

**Testing:**

-   Tables created with correct structure
-   Constraints prevent invalid conversation types
-   RLS policies prevent unauthorized access
-   Can create test conversations and messages
-   Foster can only see their foster chat
-   Coordinator can see all conversations in their organization
-   Message-animal links can be created and queried

**Deliverable:** Messaging schema with proper RLS policies and message tagging support.

---

### Milestone 5.2: Create Conversation on User Signup

**Goal:** Automatically create foster chat when foster signs up.

**Tasks:**

1. Update existing `handle_new_user()` trigger function:
    - Function already exists (created in M 4.2)
    - Add logic to create foster chat after profile creation
    - Check if `role = 'foster'` before creating conversation
    - Link conversation to foster's profile and organization
    - Set conversation type to 'foster_chat'
2. Handle role assignment:
    - Currently: Everyone signs up as 'foster' (default)
    - Phase 10: Confirmation codes will determine role
    - Solution: Check role from created profile - only fosters get conversations
3. Test: Sign up as foster, verify conversation is created
4. Handle edge case: Coordinator signup (no foster chat needed - handled by role check)

**Implementation:**

-   Updated `handle_new_user()` function to create foster chat after profile creation
-   Uses `RETURNING id, role` to get created profile's role
-   Only creates conversation if `role = 'foster'`
-   Works now (everyone is foster) and in Phase 10 (codes determine role)

**Testing:**

-   New foster signup creates foster chat
-   Conversation is linked to correct organization
-   Conversation is linked to foster's profile
-   Coordinator signup does not create foster chat (when Phase 10 is implemented)

**Deliverable:** Automatic conversation creation working for fosters.

---

### Milestone 5.3: Coordinator Group Chat Setup

**Goal:** Create and manage coordinator group chat for each organization, automatically created for new organizations.

**Tasks:**

1. Create database trigger `on_organization_created()`:
    - Fires when organization is inserted
    - Automatically creates coordinator_group conversation for new organization
    - Sets `organization_id`, `type = 'coordinator_group'`, `foster_profile_id = NULL`
2. Create function `ensure_coordinator_group_chat(org_id UUID)` (optional safety function):
    - Check if coordinator group chat exists for organization
    - If not, create it
    - Returns conversation ID
    - **Purpose:** Safety net for edge cases:
        - If trigger fails for any reason
        - If coordinator group chat is accidentally deleted and needs recreation
        - For data recovery/maintenance scenarios
    - **Note:** Not required for normal operation (trigger handles automatic creation)
3. Handle existing organizations:
    - Existing organizations can be deleted manually if needed
    - New organizations will automatically get coordinator group chat via trigger
4. Test automatic creation:
    - Create new organization via Supabase dashboard
    - Verify coordinator group chat is automatically created
5. Test access:
    - New coordinators automatically have access via RLS (role = 'coordinator' AND organization_id matches)
    - All coordinators in org can access group chat
    - No manual linking needed - RLS handles access control

**Implementation:**

-   Created `handle_new_organization()` trigger function with `SET search_path = public` for security
-   Created trigger `on_organization_created` that fires AFTER INSERT on `public.organizations`
-   Automatically creates coordinator_group conversation with `foster_profile_id = NULL`
-   Created optional `ensure_coordinator_group_chat(org_id UUID)` safety function for edge cases

**Flow Summary:**

-   New organization created → trigger automatically creates coordinator_group conversation
-   New coordinator signs up → automatically has access via RLS (no action needed)
-   No manual group chat creation needed for coordinators

**Testing:**

-   New organization creation automatically creates coordinator group chat
-   All coordinators in org can access group chat via RLS
-   New coordinators automatically have access when they join org
-   `ensure_coordinator_group_chat()` function works if manually called (for edge cases)

**Deliverable:** Coordinator group chat system working with automatic creation.

---

### Milestone 5.4a: Basic Message List (MVP)

**Goal:** Get messages displaying on screen - minimal viable version to verify data fetching works.

**Tasks:**

1. Create `src/components/messaging/MessageList.tsx`:
    - Accept `conversationId` as prop
    - Fetch messages for conversation using React Query
    - Display messages in simple list format (just text, no MessageBubble component yet)
    - Show messages in chronological order (oldest first)
    - Show basic message content (can include sender name and timestamp as plain text for now)
    - Basic styling (just enough to see messages clearly)
    - Mobile-first design
2. Create minimal `src/pages/messaging/ConversationDetail.tsx` page (scaffold):
    - Accept `conversationId` from URL params
    - Fetch conversation details (basic - just to get conversation info)
    - Display conversation header (foster name or "Coordinator Chat" - can be simple text)
    - Include MessageList component
    - Basic layout (no MessageInput yet - that comes in M 5.5b)
3. Create route `/messages/:conversationId`
4. Add basic back button or navigation

**Testing:**

-   Can navigate to conversation page via URL
-   Messages appear on screen
-   Messages are in correct chronological order
-   Can see message content
-   Basic styling is readable

**Deliverable:** Basic message list showing messages on a page (no polish yet, but functional and testable).

---

### Milestone 5.4b: Extract MessageBubble Component

**Goal:** Extract message rendering into a reusable component for better code organization.

**Tasks:**

1. Create `src/components/messaging/MessageBubble.tsx`:
    - Display individual message
    - Accept message data and `isOwnMessage` as props
    - Show different styling for own messages vs others (visual distinction)
    - Display timestamp in readable format (e.g., "2 hours ago", "Jan 15, 2024")
2. Update `src/components/messaging/MessageList.tsx`:
    - Replace inline message rendering with MessageBubble components
    - Pass necessary props to MessageBubble
    - Keep existing loading, error, and empty states (already implemented)

**Testing:**

-   Messages still display correctly after extraction
-   Own messages vs others are visually distinct
-   Timestamps are readable and formatted correctly
-   All existing functionality works (loading, error, empty states)

**Deliverable:** MessageBubble component extracted and working in MessageList.

---

### Milestone 5.4c: Scroll-to-bottom & Polish

**Goal:** Add scroll behavior and improve states/styling.

**Tasks:**

1. Add scroll-to-bottom functionality to `MessageList.tsx`:
    - Use `useRef` and `useEffect` to scroll to bottom when messages load
    - Scroll to bottom when new messages arrive
    - Handle edge cases (user scrolling up, etc.)
2. Improve existing states (optional polish):
    - Replace "Loading messages..." with `LoadingSpinner` component
    - Add retry button to error state
    - Improve empty state message styling
3. Improve mobile-first styling:
    - Refine spacing, colors, bubble shapes
    - Ensure touch-friendly tap targets
    - Optimize for mobile viewing

**Testing:**

-   Scroll-to-bottom works on initial load
-   Scroll-to-bottom works when new messages arrive
-   Loading state uses spinner component
-   Error state has retry option
-   Empty state is friendly and clear
-   Mobile styling is polished

**Deliverable:** Polished message list with scroll-to-bottom and improved states.

---

### Milestone 5.5a: Basic MessageInput Component

**Goal:** Create message input component that allows users to type and send messages (without tagging).

**Tasks:**

1. Create `src/components/messaging/MessageInput.tsx`:
    - Text input field for message content
    - Send button (or Enter key to send)
    - **Send button disabled when input field is empty**
    - Disable input while sending
    - Clear input after successful send
    - Handle validation (non-empty message)
2. Create function to send message:
    - Insert message into `messages` table
    - Link to conversation_id
    - Set sender_id to current user
    - Handle errors with user-friendly messages
    - Return success/error status
3. Accept `conversationId` and `onMessageSent` callback as props:
    - `conversationId`: Required to link message to conversation
    - `onMessageSent`: Callback to notify parent when message is sent (for refetching)

**Testing:**

-   Can type messages in input field
-   Send button is disabled when input is empty
-   Send button is enabled when input has text
-   Can send message with button or Enter key
-   Input is disabled while sending
-   Input clears after successful send
-   Validation prevents sending empty messages
-   Error handling works for failed sends
-   Message is saved to database correctly

**Deliverable:** Basic MessageInput component ready to use (without tagging).

---

### Milestone 5.5b: Add MessageInput to Conversation Detail Page

**Goal:** Add message sending capability to the existing conversation detail page.

**Tasks:**

1. Update `src/pages/messaging/ConversationDetail.tsx`:
    - Add MessageInput component (from M 5.5a - basic version without tagging)
    - Integrate MessageList and MessageInput:
        - After sending message, refetch messages to show new message in list
        - Message appears in list after successful send (manual refetch, no real-time yet)
    - Improve conversation header display
    - Handle loading and error states for the full page
2. Test: Can view conversation, send messages, see messages appear (no real-time yet)

**Testing:**

-   Conversation loads correctly
-   Messages display properly
-   Can send new messages
-   Messages appear in list after sending (via refetch)
-   Navigation works

**Deliverable:** Complete conversation detail page with message sending (without real-time).

---

### Milestone 5.6: Direct Navigation to Foster Chat

**Goal:** Fosters can access their foster chat directly from the dashboard.

**Tasks:**

1. Add "Chat" button on Dashboard page:
    - Fetch foster's conversation ID (foster chat for their profile)
    - Add "Chat" button that links directly to `/messages/:conversationId`
    - No preview needed (just a button)
    - Style appropriately for mobile-first design
2. Update `ConversationDetail.tsx` back button behavior:
    - For fosters: Back button navigates to Dashboard (`/dashboard`)
    - For coordinators: Back button behavior unchanged (will be updated in M 5.7)
    - Check user role to determine navigation target
3. Test: Foster can click "Chat" button, opens conversation, back button returns to dashboard

**Testing:**

-   "Chat" button appears on Dashboard for fosters
-   Button links directly to foster's conversation
-   Conversation loads correctly
-   Back button navigates to Dashboard (for fosters)
-   Works if foster has no conversation (handle gracefully)

**Deliverable:** Direct navigation to foster chat from dashboard with proper back button behavior.

---

### Milestone 5.7: Conversation List for Coordinators

**Goal:** Coordinators can see all foster chats and coordinator group chat in a list view.

**Tasks:**

1. Create `src/pages/messaging/ConversationsList.tsx`:
    - Fetch all foster chats in organization
    - Fetch coordinator group chat
    - Display all conversations in list format
    - Show foster name for foster chats
    - Show "Coordinator Chat" for group chat
    - Link to conversation detail page
2. Create route `/messages` for conversations list
3. Add navigation to messages:
    - Add "Messages" link/button on Dashboard page (for coordinators)
    - Link navigates to `/messages` route
    - Style appropriately for mobile-first design
4. Update `ConversationDetail.tsx` back button behavior:
    - For coordinators: Back button navigates to conversation list (`/messages`)
    - For fosters: Back button already navigates to Dashboard (from M 5.6)
5. Style for mobile-first design
6. Test: Coordinator sees all conversations, can navigate to any, back button returns to list

**Testing:**

-   Coordinator sees all foster chats in list
-   Coordinator sees coordinator group chat in list
-   Can click to open any conversation
-   Back button navigates to conversation list (for coordinators)
-   Dashboard has navigation link to messages page
-   Empty state if no conversations exist

**Deliverable:** Coordinator conversation list working with proper navigation flow.

---

### Milestone 5.8: Real-Time Message Updates

**Goal:** Add real-time updates to existing conversation detail page so messages appear instantly.

**Tasks:**

1. Set up Supabase Realtime subscription for messages:
    - Subscribe to new messages in conversation
    - Update message list when new message arrives
    - Handle connection errors gracefully
2. Update MessageList component to use Realtime:
    - Subscribe when component mounts
    - Unsubscribe when component unmounts
    - Append new messages to list
    - Scroll to bottom when new message arrives
3. Update ConversationDetail to handle real-time subscriptions
4. **Implement message pagination (REQUIRED):**
    - Load only the last 100 messages initially, with a "Load Older Messages" button to fetch the next 100 messages
    - Update `fetchMessages` to accept optional `beforeDate` parameter and limit to 100 messages
    - Use `.order("created_at", { ascending: false }).limit(100)` for initial load (newest first, then reverse for display)
    - Track oldest message date to determine where to load from
    - Add "Load Older Messages" button that fetches messages where `created_at < oldestMessageDate`
    - Prepend older messages to the array (not append)
    - The existing index `idx_messages_conversation_created` makes this efficient
    - Keep the sort in Realtime handler as a safety net when appending new messages
    - **Critical:** Conversations will quickly grow to 100+ messages. Pagination must be implemented before launch to prevent performance issues.
5. Test: Open conversation on two devices, send message from one, verify it appears on other
6. Handle edge cases: Multiple tabs, connection loss, reconnection

**Testing:**

-   Message sent on Device A appears instantly on Device B
-   No page refresh needed
-   Works when offline then reconnects
-   Multiple conversations update independently
-   Tags in real-time messages display correctly

**Deliverable:** Real-time messaging working on conversation detail page.

---

### Milestone 5.9: Photo Sharing in Messages

**Goal:** Allow users to send and receive photos in chat messages, with proper storage and display.

---

### Milestone 5.9a: Storage & Database Setup

**Goal:** Set up infrastructure for photo storage and database schema.

**Tasks:**

1. **Set up Supabase Storage for message photos:**

    - Create storage bucket `photos` (unified bucket for all photos - messages, animals, groups)
    - Configure bucket policies for organization isolation:
        - Users can upload photos to their organization's folder
        - Users can view photos from conversations they have access to
    - Set up RLS policies: users can only access photos from their organization's conversations
    - Configure file size limits: **max 8MB per photo** (accommodates most smartphone photos while preventing abuse)
    - Configure allowed file types (e.g., jpg, jpeg, png, webp)
    - Path structure: `{organization_id}/messages/{conversation_id}/{timestamp}_{filename}`

2. **Update database schema:**

    - Create migration to add `photo_urls` JSONB column to `messages` table (nullable):
        - Structure: `["url1", "url2", ...]` - array of photo URLs
        - Store full Supabase Storage URLs
    - Alternative: Create separate `message_photos` table if more metadata needed (uploader, timestamp per photo)
    - For MVP: JSONB array is simpler and sufficient

**Testing:**

-   Storage bucket exists and is accessible
-   RLS policies prevent cross-organization photo access
-   Database migration runs successfully
-   `photo_urls` column exists and accepts JSONB arrays

**Deliverable:** Storage bucket configured and database schema updated.

---

### Milestone 5.9b: Photo Upload Backend Function

**Goal:** Create reusable photo upload utility function.

**Tasks:**

1. **Create `uploadPhoto()` utility function:**

    - Location: `src/lib/photoUtils.ts` or similar
    - Function signature: `uploadPhoto(file: File, organizationId: string, conversationId: string): Promise<string>`
    - Upload photo to Supabase Storage:
        - Path structure: `{organization_id}/messages/{conversation_id}/{uuid}_{filename}`
        - Use UUID to ensure unique filenames
        - Handle file size validation (max 8MB)
        - Handle file type validation (jpg, jpeg, png, webp)
    - Return public URL for uploaded photo
    - Handle upload errors gracefully (throw descriptive errors)

2. **Error handling:**

    - Network errors
    - File size too large
    - Invalid file type
    - Storage quota exceeded
    - Permission errors

**Testing:**

-   Can upload a photo and get back a URL
-   Function throws appropriate errors for invalid files
-   File size limits are enforced
-   Only allowed file types are accepted
-   Can test function independently (via console or test file)

**Deliverable:** Working `uploadPhoto()` function that can be tested independently.

---

### Milestone 5.9c: Photo Selection UI

**Goal:** Add UI for selecting and previewing photos before sending.

**Tasks:**

1. **Add photo selection to MessageInput:**

    - Add photo/attachment button (camera/gallery icon)
    - File input (hidden, triggered by button)
    - Allow selecting multiple photos (max 10 photos per message to prevent bulk abuse)
    - Client-side validation: Check file size (max 8MB) and file type before allowing selection

2. **Photo preview UI:**

    - Show preview thumbnails of selected photos
    - Display photo count (e.g., "3 photos selected")
    - Allow removing photos from selection (X button on each thumbnail)
    - Show file size for each photo
    - Show error message if file is too large or wrong type

3. **State management:**

    - Track selected photos in component state
    - Clear selection after message is sent
    - Handle file input reset

**Testing:**

-   Can click photo button and select files
-   Preview thumbnails appear for selected photos
-   Can remove photos from selection
-   File size validation works (rejects files > 8MB)
-   File type validation works (rejects non-image files)
-   Can test UI without upload working (just selection/preview)

**Deliverable:** Photo selection and preview UI working (no upload yet).

---

### Milestone 5.9d: Integrate Upload with Message Sending

**Goal:** Connect photo selection UI to upload function and message creation.

**Tasks:**

1. **Update MessageInput to handle photo uploads:**

    - When send button clicked and photos are selected:
        - Upload all photos in parallel using `uploadPhoto()` function
        - Show single "Uploading photos..." message with spinner
        - Disable send button while uploading
        - Wait for all uploads to complete before creating message
    - Handle upload errors (partial success approach):
        - Track which photos succeed and which fail
        - If all photos succeed → send message normally, clear photos
        - If some photos fail → send message with successful photos, keep failed photos in selection, show error message (e.g., "3 photos failed to upload")
        - If all photos fail → don't send message, keep photos in selection, show error message
        - Failed photos remain visible in the input area so user can retry
    - Allow sending messages with photos only (no text content required):
        - Update validation to allow sending if photos are selected, even if message is empty
        - Message can have text only, photos only, or both

2. **Update message creation:**

    - If photos were uploaded, include `photo_urls` array in message
    - Array should contain URLs of only successfully uploaded photos
    - Handle case where all uploads fail (don't create message, show error, keep photos selected)
    - Handle case where some uploads fail (send message with successful photos, keep failed photos selected)
    - Allow message creation with empty content if photos are present
    - Message content can be empty string if photos exist

3. **Upload progress UI:**

    - Show single "Uploading photos..." message with spinner during upload
    - After upload completes:
        - If all succeed: Clear photos, send message normally
        - If some fail: Show error message with count (e.g., "3 photos failed to upload"), keep failed photos visible in selection
        - If all fail: Show error message, keep all photos visible in selection
    - Failed photos remain in the input area (user can see them and retry by clicking send again)

**Testing:**

-   Can select photos and send message (with or without text)
-   Can send message with photos only (no text content)
-   Photos upload before message is created
-   "Uploading photos..." message shown during upload
-   Send button is disabled during upload
-   Message is created with `photo_urls` array containing only successful uploads
-   All photos succeed: Message sent, photos cleared
-   Some photos fail: Message sent with successful photos, failed photos remain in selection, error message shown (e.g., "3 photos failed to upload")
-   All photos fail: Message not sent, all photos remain in selection, error message shown
-   Failed photos can be retried by clicking send again
-   Error handling works for failed uploads
-   Can test full send flow end-to-end

**Deliverable:** Full photo upload and message sending flow working.

---

### Milestone 5.9e: Display Photos in Messages

**Goal:** Display photos in message bubbles.

**Tasks:**

1. **Update MessageBubble component:**

    - Check if message has `photo_urls` array
    - Display photos in grid layout:
        - 1 column on mobile (stacked)
        - 2 columns on larger screens
        - Responsive grid that adapts to screen size
    - Show photo thumbnails (optimized size for performance)
    - Show loading state while photos load (skeleton or spinner)
    - Handle broken/missing images gracefully (show placeholder or error icon)

2. **Photo styling:**

    - Photos should fit within message bubble
    - Maintain aspect ratio
    - Add border radius for consistency
    - Show photo count if multiple photos

3. **Real-time updates:**

    - Photos should appear automatically when message arrives via real-time
    - No additional work needed (real-time subscriptions already handle this)

**Testing:**

-   Photos appear in message bubbles
-   Grid layout works on mobile and desktop
-   Photos load correctly
-   Broken images are handled gracefully
-   Photos appear in real-time on other devices
-   Can test viewing (use test URLs or already-uploaded photos)

**Deliverable:** Photos display correctly in message bubbles with proper layout.

---

### Milestone 5.9f: Photo Viewing Polish

**Goal:** Add lightbox for full-size photo viewing.

**Tasks:**

1. **Add lightbox/modal for full-size viewing:**

    - Click on photo thumbnail opens lightbox
    - Display full-size photo in modal/overlay
    - Add close button (X or click outside to close)
    - Support keyboard navigation (ESC to close)
    - If multiple photos, add navigation (prev/next arrows)
    - Show photo index (e.g., "2 of 5")
    - Add download button in lightbox to download full-size photo
    - Dark overlay behind photo

**Note on Error Handling:**

-   Current error handling is sufficient for MVP:
    -   Clear error messages already implemented (e.g., "3 photos failed to upload. Message sent with 2 photos.")
    -   Specific error types handled (file size, quota, permission, network)
    -   Partial success handling works correctly
    -   Users can retry by clicking send again
-   Enhanced error handling (explicit retry buttons, offline detection) can be added post-MVP if needed

**Note on Edge Cases:**

-   Edge cases are already handled:
    -   Very large photos: Loading states implemented in MessageBubble
    -   Slow network: Loading spinner shows during upload
    -   Storage quota: Specific error message already implemented
    -   Permission errors: Specific error message already implemented

**Testing:**

-   Can click photos to view full size
-   Lightbox opens and closes correctly
-   Navigation works for multiple photos
-   Download button works
-   Keyboard navigation works (ESC to close)
-   Click outside closes lightbox

**Deliverable:** Lightbox functionality for full-size photo viewing with navigation and download.

---

### Milestone 5.9.5: Minimal Group Management UI (Prerequisite for Group Tagging)

**Goal:** Create minimal group management UI to enable testing of group tagging in messages. This provides basic create/view functionality for groups without full editing capabilities.

### Milestone 5.9.5a: Database - Add Priority Field

**Goal:** Add priority field to groups table. Priority will default to high if any animal in the group is high priority (handled in frontend), but coordinators can override this.

**Tasks:**

1. **Create migration to add priority field:**

    - Add `priority BOOLEAN DEFAULT false` column to `animal_groups` table
    - Match the priority field structure from `animals` table
    - No database triggers needed - priority is set by frontend logic and can be manually changed

2. **Update TypeScript type:**
    - Add `priority?: boolean` to `AnimalGroup` interface in `src/types/index.ts`

**Testing:**

-   Priority field exists in `animal_groups` table
-   Can set priority to `true` or `false` when creating/updating groups
-   TypeScript type includes priority field

**Deliverable:** Priority field added to groups table. Priority defaults and updates are handled in the frontend, allowing coordinators to override as needed.

---

### Milestone 5.9.5b: Groups

**Tasks:**

1. **Create Groups List page** (`src/pages/animals/GroupsList.tsx`):

    - Fetch all animal groups in organization using React Query
    - Display groups in simple list/card format
    - Show group name, description (if available), and member count
    - Link each group to group detail page
    - Add "Create Group" button (coordinator-only)
    - Handle loading and error states
    - Mobile-first responsive design

2. **Create Group Detail page** (`src/pages/animals/GroupDetail.tsx`):

    - Fetch group by ID from URL params using React Query
    - Display group information (name, description)
    - Show list of animals in group (from `animal_ids` array):
        - Fetch animal details for each animal_id
        - Display animal names with links to animal detail pages
        - Show "No animals in group" if array is empty
    - Handle loading and error states
    - Mobile-first responsive design

3. **Create New Group form** (`src/pages/animals/NewGroup.tsx`):

    - Simple form with:
        - Group name (required, text input)
        - Description (optional, textarea)
        - Priority toggle (boolean checkbox - defaults based on selected animals, but editable)
        - Animal selection (multi-select):
            - Fetch all animals in organization
            - Allow selecting multiple animals to add to group
            - Display as checkboxes or multi-select dropdown
            - Show priority indicator for high priority animals
    - **Priority default logic (frontend):**
        - When animals are selected, check if any selected animal has `priority = true`
        - If yes → default priority checkbox to checked (`true`)
        - If no → default priority checkbox to unchecked (`false`)
        - Coordinator can manually override the default by toggling the checkbox
        - Priority updates reactively as animals are selected/deselected
    - Form validation (name required)
    - On submit:
        - Create group with `name`, `description`, `animal_ids` array, and `priority` (from checkbox state)
        - Set `organization_id` from user's profile
        - Handle errors with user-friendly messages
    - Redirect to group detail page on success
    - Mobile-first responsive design

4. **Add routing**:

    - Add route `/groups` for groups list
    - Add route `/groups/:id` for group detail
    - Add route `/groups/new` for new group (coordinator-only, can use ProtectedRoute with role check)
    - Ensure routes are protected (require authentication)

5. **Add navigation**:
    - Add "Groups" link to Dashboard or navigation (for coordinators)
    - Add back button on group detail page
    - Add "Create Group" button on groups list page

**Note:** This is a minimal implementation. Full editing (M 6.4) will add:

-   Edit group functionality
-   Add/remove animals from existing groups
-   Update group information
-   More sophisticated group management features

**Testing:**

-   Coordinator can access new group form
-   Form validation works (name required)
-   Can select multiple animals to add to group
-   Priority checkbox defaults to checked if any selected animal is high priority
-   Priority checkbox defaults to unchecked if no selected animals are high priority
-   Priority checkbox updates reactively as animals are selected/deselected
-   Coordinator can manually override priority checkbox (toggle it regardless of animal selection)
-   Group is created with correct data including priority
-   Redirects to group detail page on success
-   Error handling works correctly
-   Fosters cannot access new group form
-   Mobile layout is usable

**Deliverable:** New group form working. Coordinators can create groups with animals, enabling testing of group tagging in messages.

---

### Milestone 5.9.5c: Foster List and Detail Pages

**Goal:** Create foster list and detail pages so coordinators can view foster information, contact details, experience, and assigned animals. This enables foster tagging in coordinator chat.

**Tasks:**

1. **Add foster-specific fields to profiles table:**

    - Create migration to add foster-specific fields to `profiles` table:
        - `phone_number TEXT` (nullable, for foster contact)
        - `full_address TEXT` (nullable, for foster location)
        - `home_inspection TEXT` (nullable, free-form text field for home inspection notes/information)
    - These fields are only relevant for fosters (role='foster'), not coordinators
    - Update TypeScript `Profile` type to include these fields

2. **Create Foster List page** (`src/pages/fosters/FostersList.tsx`):

    - Fetch all fosters in organization (profiles with `role='foster'`)
    - Display fosters in list/card format
    - Show foster name, contact info (phone if available), availability status
    - Link each foster to foster detail page
    - Coordinator-only access
    - Handle loading and error states
    - Mobile-first responsive design

3. **Create Foster Detail page** (`src/pages/fosters/FosterDetail.tsx`):

    - Fetch foster profile by ID from URL params
    - Display foster information:
        - Name, email, phone number, address
        - Home inspection information (text field)
        - Experience level (if tracked)
        - Availability status
        - Currently assigned animals/groups:
            - Query `animals` table for `current_foster_id = foster.id`
            - Query `animal_groups` table for `current_foster_id = foster.id`
            - Display list with links to animal/group detail pages
    - Coordinator-only access
    - Handle loading and error states
    - Mobile-first responsive design

4. **Add routing:**

    - Add route `/fosters` for fosters list (coordinator-only)
    - Add route `/fosters/:id` for foster detail (coordinator-only)
    - Ensure routes are protected and coordinator-only

5. **Add navigation:**

    - Add "Fosters" link to Dashboard (coordinator-only)
    - Add back button on foster detail page

6. **Update RLS policies:**
    - Ensure only coordinators can view foster profiles with full information
    - Fosters should only see their own profile (limited information)

**Design Decisions:**

-   **Foster-specific fields:** Added directly to `profiles` table rather than separate table for simplicity
-   **Home inspection tracking:** Single text field for flexibility (can include date, inspector, notes, etc.)
-   **Contact information:** Phone and address are optional fields (can be added later)
-   **Assigned animals:** Queried from `animals` and `animal_groups` tables using `current_foster_id`

**Note:** This is a minimal implementation focused on viewing foster information. Future enhancements (M 6.4+) may include:

-   Edit foster information
-   Foster history/assignments timeline
-   More detailed experience tracking
-   Foster preferences and availability calendar

**Testing:**

-   Coordinator can access fosters list
-   Coordinator can view foster detail pages
-   Foster information displays correctly (name, contact, inspection info)
-   Assigned animals/groups display correctly
-   Fosters cannot access other fosters' detail pages
-   Fosters cannot access fosters list
-   Mobile layout is usable

**Deliverable:** Foster list and detail pages working. Coordinators can view foster information, enabling foster tagging in coordinator chat.

---

### Milestone 5.10a: Update Database Schema for Foster Tagging

**Goal:** Extend `message_links` table to support tagging fosters in addition to animals and groups, and rename table to reflect its broader purpose.

**Tasks:**

1. Create migration to rename and update table:
    - Rename `message_animal_links` to `message_links` (more accurate name since it supports multiple entity types)
    - Add `foster_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE` column (nullable)
    - Update constraint `exactly_one_link` to allow exactly one of:
        - `animal_id` (not null, others null)
        - `group_id` (not null, others null)
        - `foster_profile_id` (not null, others null)
    - Add index on `foster_profile_id` for query performance
    - Rename indexes to match new table name:
        - `idx_message_animal_links_message_id` → `idx_message_links_message_id`
        - `idx_message_animal_links_animal_id` → `idx_message_links_animal_id`
        - `idx_message_animal_links_group_id` → `idx_message_links_group_id`
        - Add new: `idx_message_links_foster_profile_id`
2. Update RLS policies for `message_links`:
    - Ensure users can view/create links for fosters in their organization
    - Policy should allow tagging any foster profile in user's organization
3. Test schema changes:
    - Can insert link with `animal_id` only
    - Can insert link with `group_id` only
    - Can insert link with `foster_profile_id` only
    - Cannot insert link with multiple IDs set
    - Cannot insert link with no IDs set
    - RLS policies prevent unauthorized access

**Testing:**

-   Migration runs successfully
-   Can create message-animal links (existing functionality still works)
-   Can create message-group links (existing functionality still works)
-   Can create message-foster links (new functionality)
-   Constraint prevents invalid combinations
-   RLS policies work correctly

**Deliverable:** Database schema updated to support tagging animals, groups, and fosters. All three entity types can be linked to messages.

---

### Milestone 5.10b: Backend Support for Foster Tagging

**Goal:** Create backend queries and functions to fetch and create message tags for animals, groups, and fosters.

**Tasks:**

1. **Create message link fetching queries:**

    - Create query function to fetch `message_links` for a given message ID
    - Join with `animals` table to get animal name when `animal_id` is set
    - Join with `animal_groups` table to get group name when `group_id` is set
    - Join with `profiles` table to get foster name when `foster_profile_id` is set
    - Return all three entity types with their display names
    - Handle cases where multiple links exist for a single message

2. **Update message fetching in MessageList:**

    - Modify `fetchMessages` function to also fetch `message_links` for each message
    - Use Supabase's `.select()` with nested queries to fetch links alongside messages
    - Transform link data to include entity type and display name
    - Return messages with tags array attached

3. **Create helper functions/types:**

    - Type for message link result (includes `animal_id`, `group_id`, `foster_profile_id`, and joined data)
    - Type for tag data (includes `type: 'animal' | 'group' | 'foster'`, `id`, `name`)
    - Helper function to determine entity type from link (animal, group, or foster)
    - Helper function to get display name for each entity type
    - Helper function to transform raw link data into tag format

4. **Create message link insertion function:**

    - Create function to insert tags into `message_links` table
    - Accept array of tags (each with `type` and `id`)
    - Insert into `message_links` with appropriate field set based on type:
        - If `type === 'animal'`: set `animal_id`, leave others null
        - If `type === 'group'`: set `group_id`, leave others null
        - If `type === 'foster'`: set `foster_profile_id`, leave others null
    - Handle multiple tags for a single message (insert multiple rows)
    - Handle errors gracefully (invalid IDs, permission errors, etc.)

5. **Update message sending function:**

    - Modify `sendMessage` function in `MessageInput.tsx` to accept optional `tags` parameter
    - After message is created, if tags exist, call link insertion function
    - Handle errors: if message is created but tags fail, show appropriate error
    - Return message ID so tags can be linked to it

6. **Test:**
    - Verify queries return tags with correct names for all three entity types
    - Verify tag insertion works for animals, groups, and fosters
    - Verify helper functions correctly identify entity types
    - Verify display names are correct for all entity types
    - Test error cases (invalid IDs, permission errors)

**Testing:**

-   Can fetch message links with animal names
-   Can fetch message links with group names
-   Can fetch message links with foster names
-   Can insert tags for animals, groups, and fosters
-   Helper functions correctly identify entity types
-   Display names are correct for all entity types
-   Multiple tags per message work correctly
-   Error handling works for invalid tags

**Deliverable:** Backend fully supports fetching and creating tags for animals, groups, and fosters. Messages can be tagged with any combination of animals, groups, and fosters.

---

### Milestone 5.10c: Tag Selection UI in MessageInput

**Goal:** Add UI to select and display tags (animals, groups, fosters) before sending a message.

**Tasks:**

1. Add tag selection UI to `MessageInput.tsx`:
    - Add button/icon to open tag selector (e.g., "@" button or "Tag" button)
    - Create tag selector component/modal:
        - Search/autocomplete input
        - Tabs or filter buttons for entity types (Animals, Groups, Fosters)
        - **Fosters tab should only be visible in coordinator chat** (hide for foster conversations)
        - List of selectable entities with names
        - Allow selecting multiple entities
    - Fetch entities from organization:
        - Animals: fetch from `animals` table (filtered by organization)
        - Groups: fetch from `animal_groups` table (filtered by organization)
        - Fosters: fetch from `profiles` table (filtered by organization, role='foster') - **only in coordinator chat**
    - Display selected tags as chips above input field:
        - Show entity name and type indicator (e.g., "Fluffy (Animal)", "John (Foster)", "Litter of 4 (Group)")
        - Allow removing tags (X button on chip)
        - Style chips distinctively
2. **Restrict foster tagging to coordinator chat:**
    - Check if current conversation is coordinator chat (check conversation type or user role)
    - Hide "Fosters" tab in tag selector for foster conversations
    - Only show "Fosters" tab when coordinators are messaging in coordinator chat
3. Update message sending:
    - Collect selected tags before sending
    - Pass tags to send message function (from M 5.10b)
    - Clear selected tags after successful send
4. Test: Can open tag selector, search/filter entities, select multiple tags, remove tags, tags appear as chips

**Testing:**

-   Tag selector opens and closes correctly
-   Can search/filter animals, groups, and fosters (in coordinator chat)
-   Fosters tab is hidden in foster conversations
-   Fosters tab is visible in coordinator chat
-   Can select multiple entities of different types
-   Selected tags appear as chips with type indicators
-   Can remove tags before sending
-   Tags are passed to send function correctly

**Deliverable:** Tag selection UI working in MessageInput. Coordinators can select animals, groups, and fosters to tag in coordinator chat. Fosters can only tag animals and groups in their conversations.

---

### Milestone 5.10d: Display Tags in MessageBubble

**Goal:** Display tags as clickable chips in message bubbles with proper navigation.

**Tasks:**

1. Update `MessageList.tsx` to fetch tags:
    - Include `message_links` in message query (already done for animals/groups)
    - Join with `profiles` table to get foster names for foster tags
    - Transform tag data to include entity type and display name
2. Update `MessageBubble.tsx` to display tags:
    - Accept tags array as prop (from MessageList)
    - Display tags as clickable chips/badges below message content
    - Show entity type indicator on each tag (e.g., "Animal", "Group", "Foster")
    - Style tags distinctively from message content
    - Use different colors/styles for different entity types (optional enhancement)
3. Add navigation for tags:
    - Animals → link to `/animals/:id` (animal detail page)
    - Groups → link to `/groups/:id` (group detail page - already created in M 5.9.5b)
    - Fosters → link to `/fosters/:id` (foster detail page - created in M 5.9.5c)
4. Test: Tags display correctly, tags are clickable, navigation works, styling is clear

**Testing:**

-   Tags appear in message bubbles for all entity types
-   Tags show correct names and type indicators
-   Animal tags link to animal detail pages
-   Group tags link to group detail pages (when available)
-   Foster tags display foster names
-   Tags are visually distinct from message content
-   Works for messages with multiple tags of different types

**Deliverable:** Tags display correctly in message bubbles with proper styling and navigation. Complete tagging feature working end-to-end.

---

### Milestone 5.11: Polish Conversation Detail Page

**Goal:** Refine and polish conversation detail page based on testing, add any missing features.

**Tasks:**

1. Refine `src/pages/messaging/ConversationDetail.tsx`:
    - Improve loading states and error handling
    - Add message editing UI (if needed for future)
    - Improve mobile responsiveness
    - Add keyboard shortcuts if helpful
    - Optimize performance (virtual scrolling if many messages)
2. Enhance message display:
    - Show message status indicators (sent, delivered, read - if implemented)
    - Improve timestamp formatting (relative vs absolute)
    - Add message grouping by sender/time
    - Improve tag display and interaction
3. Add additional features:
    - Search within conversation (if needed)
    - Message reactions/emojis (optional)
    - File/image attachments (if needed)
4. Test: Full end-to-end testing with multiple users and devices

**Testing:**

-   All features work smoothly
-   Performance is acceptable with many messages
-   Mobile experience is polished
-   Real-time updates work reliably
-   Tagging works seamlessly

**Deliverable:** Polished conversation detail page ready for production.

---

## Phase 6: Animal Forms & Groups Management

**Goal:** Complete animal creation/editing forms with all data attributes, enable group management, and allow coordinators to edit animals and groups.

---

### Milestone 6.1: Complete Animal Creation Form

**Goal:** Expand NewAnimal form to include all animal data attributes from schema.

**Tasks:**

1. Update `src/pages/animals/NewAnimal.tsx`:
    - Add all optional fields from animals schema:
        - Basic Info: `name`, `primary_breed`, `physical_characteristics`, `sex`, `spay_neuter_status`, `life_stage`
        - Dates & Age: `intake_date`, `date_of_birth`, `age_estimate`, `date_available_for_adoption`
        - Source & Placement: `source`, `intake_type`
        - Medical: `medical_needs`, `vaccines`, `felv_fiv_test`, `felv_fiv_test_date`
        - Behavioral: `behavioral_needs`, `socialization_level`
        - Tags: `tags` (array of text)
        - Additional: `additional_notes`, `priority`
    - Group fields into logical sections (Basic Info, Medical, Behavioral, etc.)
    - Add validation where appropriate
    - Keep all fields optional as per schema design
    - Show "Info Missing" indicators for key fields
2. Add smart data entry features:
    - Autocomplete for `primary_breed` (show recently used values)
    - Autocomplete for `source`, `intake_type` (show recently used values)
    - Tag input with autocomplete from existing tags
3. Style form for mobile-first design with collapsible sections
4. Test: Create animal with minimal data, create with full data, verify all fields save correctly

**Testing:**

-   Can create animal with only required fields (species, status)
-   Can create animal with all optional fields populated
-   All field values save correctly to database
-   Autocomplete suggestions appear for repeatable fields
-   Form is mobile-friendly

**Deliverable:** Complete animal creation form working.

---

### Milestone 6.2: Animal Editing for Coordinators

**Goal:** Enable coordinators to edit existing animals with all data attributes.

**Tasks:**

1. Create `src/pages/animals/EditAnimal.tsx`:
    - Fetch animal by ID from URL params
    - Pre-populate form with existing animal data
    - Include all fields from NewAnimal form
    - Handle loading and error states
    - Update animal in database on submit
    - Redirect to animal detail page after successful update
2. Create route `/animals/:id/edit` (coordinator-only)
3. Add "Edit" button to AnimalDetail page (coordinator-only)
4. Update RLS policies if needed to ensure only coordinators can update
5. Test: Coordinator can edit animals, fosters cannot

**Testing:**

-   Coordinator can access edit page for animals
-   All fields pre-populate correctly
-   Changes save to database
-   Foster cannot access edit page
-   Navigation works correctly

**Deliverable:** Animal editing working for coordinators.

---

### Milestone 6.3: Reusable Search & Filter Component

**Goal:** Create reusable search and filter components that can be used across the app (animals list, animal selection in groups, tagging, fosters needed page, etc.).

**Tasks:**

1. **Create reusable search component** (`src/components/shared/SearchInput.tsx`):

    - Text input with search icon
    - Debounced search (wait for user to stop typing)
    - Clear button
    - Accept props: `value`, `onChange`, `placeholder`, `disabled`
    - Mobile-friendly styling

2. **Create reusable filter component** (`src/components/animals/AnimalFilters.tsx`):

    - Filter by status (dropdown/multi-select)
    - Filter by priority (toggle)
    - Filter by sex (dropdown)
    - Filter by group (dropdown - shows all groups)
    - Clear filters button
    - Show active filter count
    - Accept props: `filters`, `onFiltersChange`, `availableGroups`
    - Return filter object that can be applied to Supabase queries

3. **Create filter utility functions** (`src/lib/filterUtils.ts`):

    - Function to build Supabase query from filter object
    - Function to check if filters are active
    - Function to clear all filters
    - Reusable across different pages

4. **Update AnimalsList to use new components**:

    - Integrate SearchInput and AnimalFilters
    - Apply filters to Supabase query
    - Display filtered results
    - Show "No results" when filters match nothing
    - Preserve filter state in URL params (optional, for shareable links)

5. **Update NewGroup animal selection to use SearchInput**:

    - Add search input above animal checkboxes
    - Filter animals by name as user types
    - Improve UX for selecting animals from large lists

6. **Update FostersList to use SearchInput**:

    - Add search input to foster list page
    - Filter fosters by name as user types
    - Improve UX for finding fosters in large lists

7. **Test:**
    - Search works correctly in animals list
    - Filters work correctly and can be combined
    - Search works in group animal selection
    - Search works in fosters list
    - Components are reusable and work in different contexts

**Testing:**

-   Search component works correctly with debouncing
-   Filter component applies filters correctly
-   Filters can be combined (status + priority + sex, etc.)
-   Search works in animals list
-   Search works in group animal selection
-   Search works in fosters list
-   Clear filters button works
-   Active filter count is accurate
-   Components are reusable across different pages

**Deliverable:** Reusable search and filter components working across the app.

---

### Milestone 6.4: Group Management UI Polish & Edit Functionality

**Goal:** Add missing features to group management UI, including edit functionality, validation, and polish. Note: Basic group management (list, detail, create) was completed in M 5.9.5.

**Tasks:**

1. **Create Edit Group page** (`src/pages/animals/EditGroup.tsx`):

    - Fetch group by ID from URL params
    - Pre-populate form with existing group data (name, description, priority)
    - Allow editing `name`, `description`, and `priority`
    - Allow adding/removing animals from group using search/filter component (from M 6.3)
    - Update `animal_groups.animal_ids` array on save
    - Handle loading and error states
    - Redirect to group detail page after successful update
    - Add route `/groups/:id/edit` (coordinator-only)

2. **Add Edit button to GroupDetail page**:

    - Show "Edit" button for coordinators only
    - Link to edit page

3. **Add validation and notifications**:

    - **Duplicate group assignment detection:**
        - When adding animals to a group, check if animal is already in another group
        - Show warning notification: "Animal [name] is already in group [group name]. Do you want to move it to this group?"
        - Allow coordinator to confirm or cancel
        - If confirmed, remove animal from previous group and add to new group
        - Show success notification after update
    - **Empty group validation:**
        - Warn if trying to save group with no animals
        - Allow saving empty groups (for future use) but show confirmation

4. **Polish existing group pages**:

    - Improve loading states and error handling
    - Add better empty states
    - Improve mobile responsiveness
    - Add confirmation dialogs for destructive actions (if delete functionality added)

5. **Add missing fields** (if any identified during testing):
    - Review schema and ensure all relevant fields are displayed/editable
    - Add any missing fields to forms

**Testing:**

-   Coordinator can edit group name, description, and priority
-   Coordinator can add/remove animals from existing groups
-   Duplicate group assignment shows warning and handles correctly
-   Empty group validation works correctly
-   Edit page pre-populates with correct data
-   Changes save correctly to database
-   Navigation works correctly
-   Mobile layout is polished

**Deliverable:** Complete group management UI with edit functionality, validation, and polish.

---

### Milestone 6.5: Display Groups in Animal UI

**Goal:** Show group information throughout animal UI and allow adding animals to groups during creation/editing.

**Tasks:**

1. Update `AnimalDetail.tsx`:
    - Display group membership if animal is in a group
    - Link to group detail page
    - Show group name and other group members
2. Update `NewAnimal.tsx`:
    - Add field to select/create group when creating animal
    - Link animal to selected group on creation
3. Update `EditAnimal.tsx`:
    - Add field to change group membership
    - Allow adding animal to existing group or removing from group
4. Update `AnimalsList.tsx`:
    - Show group indicator/badge for animals in groups
    - Show group name in animal preview cards
    - Note: Group filtering is already implemented in M 6.3 (Search & Filter Component)
5. Test: Groups display correctly throughout UI, animals can be added to groups during creation

**Testing:**

-   Animal detail shows group membership
-   Animals list shows group indicators
-   Can create animal and assign to group in one step
-   Can change group membership when editing animal
-   Group indicators display correctly in animals list

**Deliverable:** Group display and assignment working throughout animal UI.

---

### Milestone 6.6: Foster Assignment for Animals and Groups

**Goal:** Enable coordinators to assign animals and groups to fosters during creation and editing, with automatic consistency enforcement between individual animal assignments and group assignments.

**Design Decisions:**

-   **Data Model:** Both `animals.current_foster_id` and `animal_groups.current_foster_id` exist. This is intentional redundancy for query performance:
    -   Querying "all animals assigned to a foster" is fast (direct filter on `animals.current_foster_id`)
    -   Querying "all groups assigned to a foster" is fast (direct filter on `animal_groups.current_foster_id`)
    -   We maintain consistency through application logic, not database constraints
-   **Consistency Rules:**
    1. When assigning a **group** to a foster, automatically assign all animals in that group to the same foster
    2. When assigning an **individual animal** to a foster:
        - If animal is in a group that's assigned to a different foster → show warning/error, require resolution
        - If animal is in a group that's not assigned → allow individual assignment
        - If animal is in a group assigned to the same foster → allow (already consistent)
    3. When removing an animal from a group, preserve its individual foster assignment
    4. When removing a group assignment, preserve individual animal assignments (animals may be assigned individually)
-   **Resolution Strategy:** When conflicts are detected, offer coordinator options:
    -   Assign the whole group to the foster (recommended if most animals should be together)
    -   Remove animal from group and assign individually
    -   Cancel the assignment
-   **Status Change Handling:** (See Questions 19.5 in QUESTIONS_FOR_RESCUE.md - implementation depends on rescue's workflow)
    -   When status changes FROM "in_foster" to another status, handle foster assignment based on rescue's preference:
        -   Option A: Automatically clear foster assignment (if status change means animal is no longer with foster)
        -   Option B: Preserve foster assignment for historical tracking
        -   Option C: Conditional based on target status (e.g., clear for "adopted", preserve for "medical_hold")
    -   When status changes TO "in_foster", may require foster assignment (or allow without assignment)
    -   Implementation will be determined after reviewing answers to Question 19.5
-   **Adoption Status Handling:** (See Questions 34.5 in QUESTIONS_FOR_RESCUE.md - implementation depends on rescue's workflow)
    -   When status changes to "adopted", may require adopter information entry
    -   May automatically clear foster assignment when adopted
    -   Adopter information fields and requirements will be determined after reviewing answers to Question 34.5

**Tasks:**

1. **Create foster assignment utilities** (`src/lib/assignmentUtils.ts`):

    - `assignGroupToFoster(groupId, fosterId, organizationId)` - Assigns group and all its animals
    - `assignAnimalToFoster(animalId, fosterId, organizationId)` - Assigns individual animal with conflict checking
    - `checkAssignmentConflict(animalId, fosterId, organizationId)` - Checks if assignment would create conflict
    - `removeGroupAssignment(groupId, organizationId)` - Removes group assignment (preserves individual animal assignments)
    - `removeAnimalAssignment(animalId, organizationId)` - Removes individual animal assignment
    - All functions handle database transactions/consistency

2. **Update `NewAnimal.tsx`**:

    - Add foster assignment field (dropdown/autocomplete of fosters)
    - When foster is selected, check if animal will be added to a group
    - If group assignment exists and conflicts, show warning before save
    - Save `current_foster_id` on animal creation

3. **Update `EditAnimal.tsx`**:

    - Add foster assignment field (dropdown/autocomplete, with "None" option)
    - Display current foster assignment
    - When changing assignment:
        - Check for conflicts with group assignment
        - Show resolution dialog if conflict detected
        - Update `current_foster_id` on save
    - Handle removing assignment (set to null)
    - **Status change handling:** (Implementation depends on answers to Question 19.5)
        - When status changes FROM "in_foster" to another status, handle foster assignment per rescue's workflow
        - When status changes TO "adopted", handle adopter information entry and foster assignment per Question 34.5
        - Show confirmation dialogs for status changes that affect assignments

4. **Update `NewGroup.tsx`**:

    - Add foster assignment field (dropdown/autocomplete of fosters)
    - When foster is selected and group is saved:
        - Assign group to foster
        - Automatically assign all selected animals in group to same foster
        - Show confirmation: "Group and [X] animals will be assigned to [Foster Name]"

5. **Update `EditGroup.tsx`**:

    - Add foster assignment field (dropdown/autocomplete, with "None" option)
    - Display current foster assignment
    - When changing group assignment:
        - Automatically update all animals in group to match
        - Show confirmation: "Group and [X] animals will be assigned to [Foster Name]"
    - When removing group assignment:
        - Preserve individual animal assignments (don't clear them)
        - Show confirmation: "Group assignment removed. Individual animal assignments preserved."
    - When adding animals to a group that's assigned to a foster:
        - Automatically assign new animals to the same foster
        - Show notification: "[X] animals added to group and assigned to [Foster Name]"
    - When removing animals from a group:
        - Preserve their individual foster assignments

6. **Create conflict resolution UI component** (`src/components/animals/AssignmentConflictDialog.tsx`):

    - Shows when assignment conflict is detected
    - Displays: "Animal [name] is in group [group name] assigned to [foster A], but you're trying to assign to [foster B]"
    - Options:
        - "Assign whole group to [foster B]" (recommended)
        - "Remove from group and assign individually"
        - "Cancel"
    - Handles the selected resolution

7. **Update `AnimalDetail.tsx`**:

    - Display current foster assignment (if assigned)
    - Show group assignment if animal is in an assigned group
    - If individual and group assignments differ, show warning badge
    - Link to foster detail page

8. **Update `GroupDetail.tsx`**:

    - Display current foster assignment (if assigned)
    - Show count of animals in group assigned to foster
    - If any animals have different assignments, show warning

9. **Add validation and error handling**:
    - Validate foster exists and is in same organization
    - Handle database errors gracefully
    - Show success/error notifications
    - Update React Query cache after assignments

**Testing:**

-   Can assign individual animal to foster during creation
-   Can assign individual animal to foster during editing
-   Can assign group to foster during creation (all animals auto-assigned)
-   Can assign group to foster during editing (all animals auto-assigned)
-   Conflict detection works when assigning animal to different foster than its group
-   Conflict resolution dialog appears and handles all options correctly
-   Removing group assignment preserves individual animal assignments
-   Removing animal from group preserves its foster assignment
-   Adding animals to assigned group auto-assigns them to group's foster
-   Database consistency maintained (no orphaned assignments)
-   UI updates correctly after assignments
-   Error handling works for invalid fosters, network errors, etc.

**Deliverable:** Foster assignment working for animals and groups with automatic consistency enforcement and conflict resolution.

---

## Phase 7: Photo Uploads for Animals and Groups

**Goal:** Allow coordinators and fosters to upload photos for animals and groups, with proper permission controls.

---

### Milestone 7.1: Photo Uploads for Animals and Groups

**Goal:** Allow coordinators and fosters to upload photos for animals and groups, with proper permission controls.

**Tasks:**

1. **Set up Supabase Storage:**
    - Use unified storage bucket `photos` (same bucket as message photos, organized by path structure)
    - Configure bucket policies for organization isolation
    - Set up RLS policies: users can upload/view photos in their organization
    - Path structure: `{organization_id}/animals/{animal_id}/{timestamp}_{filename}` or `{organization_id}/groups/{group_id}/{timestamp}_{filename}`
    - Configure file size limits: **max 8MB per photo** (same as message photos)
    - Configure allowed file types (e.g., jpg, jpeg, png, webp)
2. **Update database schema:**
    - Add `photos` JSONB column to `animals` table (if not already added):
        - Structure: `[{"url": "...", "uploaded_at": "...", "uploaded_by": "...", "caption": "..."}, ...]`
        - Store array of photo objects with metadata (url, uploaded_at, uploaded_by, optional caption)
    - Add `photos` JSONB column to `animal_groups` table:
        - Same structure as animals: `[{"url": "...", "uploaded_at": "...", "uploaded_by": "...", "caption": "..."}, ...]`
        - Store array of photo objects with metadata
3. **Create reusable photo upload component:**
    - `src/components/shared/PhotoUpload.tsx` (generic, reusable)
    - File input for selecting photos
    - Upload to Supabase Storage
    - Show upload progress
    - Handle errors gracefully
    - Accept props: `bucketName`, `pathPrefix`, `onUploadComplete`, `maxPhotos` (optional)
4. **Create reusable photo gallery component:**
    - `src/components/shared/PhotoGallery.tsx` (generic, reusable)
    - Display photo grid with thumbnails
    - Show photo metadata (uploaded_at, uploaded_by name)
    - Lightbox/modal for full-size viewing
    - Download button to download full-size photos
    - Handle loading states and broken images
    - Accept props: `photos` (array), `onDelete` (optional, for permission-based deletion)
5. **Update animal detail page:**
    - Display photo gallery using `PhotoGallery` component
    - Show uploaded photos with timestamps and uploader names
    - **Permissions:**
        - Coordinators: can upload new photos, can delete any photo
        - Fosters: can upload photos for assigned animals, can only delete their own photos
    - Add photo upload UI using `PhotoUpload` component
    - Show delete button on photos (only for users with permission)
6. **Update group detail page:**
    - Display photo gallery using `PhotoGallery` component
    - Show uploaded photos with timestamps and uploader names
    - **Permissions:**
        - Coordinators: can upload new photos, can delete any photo
        - Fosters: can upload photos for assigned groups, can only delete their own photos
    - Add photo upload UI using `PhotoUpload` component
    - Show delete button on photos (only for users with permission)
7. **Update animal creation form:**
    - Optional photo upload during creation (coordinators only)
    - Store photos in `photos` JSONB array
8. **Update group creation form:**
    - Optional photo upload during creation (coordinators only)
    - Store photos in `photos` JSONB array
9. **Implement permission logic:**
    - Check user role (coordinator vs foster)
    - For fosters: check if animal/group is assigned to them
    - For photo deletion: check if `uploaded_by` matches current user (for fosters)
    - Coordinators can always delete any photo
10. **Test:**
    - Upload photos for animals and groups
    - Verify photos appear in galleries
    - Verify organization isolation
    - Test permission controls (fosters can only delete their own photos)
    - Test coordinators can delete any photo
    - Verify upload progress and error handling

**Testing:**

-   Can upload photos to Supabase Storage for animals
-   Can upload photos to Supabase Storage for groups
-   Photos are linked to correct animal/group and organization
-   Photos display correctly in galleries with metadata
-   Coordinators can upload and delete any photos
-   Fosters can upload photos for assigned animals/groups
-   Fosters can only delete their own photos (not others' photos)
-   Upload progress and errors are handled
-   RLS policies prevent cross-organization access
-   Photo deletion works correctly with permission checks

**Deliverable:** Photo upload functionality working for animals and groups with proper permission controls and download functionality.

**Photo Retention Policy:**

-   **Animal/Group photos:** Kept forever (no limit) - these are documentation photos that should be preserved long-term
-   **Message photos:** See M 5.9 for per-user retention limits (1,000 photos per user)
-   **Storage impact:** With 500 animals/year × 5 photos = 2,500 photos/year, storage grows to ~37.5GB by year 5. Combined with message photos (100-200GB), total storage stays within Pro tier limits (100GB) or slightly over, keeping costs at $25-30/month for 5+ years

---

## Phase 8: Fosters Needed Page

**Goal:** Create a page where fosters can browse animals and groups needing placement and request them through messaging.

---

### Milestone 8.1: Fosters Needed Page

**Goal:** Display animals and groups that need foster placement, allowing fosters to browse and request them.

**Tasks:**

1. **Create Fosters Needed page** (`src/pages/fosters/FostersNeeded.tsx`):

    - Fetch animals and groups with status `needs_foster` or `available` (filtered by organization)
    - Display animals and groups in a browseable list/grid format
    - Show key information: name, photos, priority indicator, basic needs
    - Use search/filter components from M 6.3 to allow filtering by:
        - Species
        - Priority (high priority animals/groups)
        - Group vs individual animals
    - Link to animal/group detail pages for more information
    - Mobile-first responsive design

2. **Add "Request to Foster" functionality:**

    - Add "Request to Foster" button on animal/group detail pages (foster-only)
    - Button should be visible on Fosters Needed page items and detail pages
    - When clicked, open messaging interface with auto-filled content:
        - Navigate to foster's conversation (foster chat)
        - Pre-fill message content with request template:
            - Include animal/group name
            - Include basic information (species, priority if applicable)
            - Template: "Hi, I'm interested in fostering [Animal/Group Name]. [Optional: Add any relevant information about my experience or availability]."
        - Auto-tag the animal/group in the message (using tagging from M 5.10)
        - Allow foster to edit message before sending
        - Send message to coordinators (visible in coordinator group chat and foster's conversation)

3. **Update routing:**

    - Add route `/fosters-needed` (accessible to all users, but primarily for fosters)
    - Add navigation link for fosters (e.g., in Dashboard or navigation menu)

4. **Handle request flow:**

    - When foster clicks "Request to Foster":
        - Check if foster already has an active request for this animal/group (optional - prevent duplicates)
        - Open conversation with pre-filled message
        - Auto-tag animal/group in message
        - Foster can edit and send message
        - Coordinators see request in their conversation list and coordinator group chat

5. **Display request status (optional enhancement):**
    - Show if foster has already requested an animal/group
    - Display "Requested" indicator on animals/groups that have been requested
    - Allow viewing previous requests in conversation history

**Implementation Notes:**

-   **Messaging Integration:** Requests go through the existing messaging system (Phase 5), ensuring all coordinators can see requests
-   **Auto-tagging:** Uses message tagging feature (M 5.10) to link requests to specific animals/groups
-   **No New Database Tables:** Uses existing `animals`, `animal_groups`, and `messages` tables with `message_links` for tagging
-   **Simple Request Flow:** Fosters send a message with auto-filled content and tags - coordinators respond through existing messaging

**Testing:**

-   Fosters can view animals/groups needing placement
-   Can filter by species, priority, and group status
-   "Request to Foster" button opens conversation with pre-filled message
-   Message includes animal/group tag
-   Coordinators see requests in their conversation list
-   Requests appear in coordinator group chat
-   Foster can edit message before sending
-   Mobile layout is usable

**Deliverable:** Fosters Needed page working with request functionality through messaging system.

---

### Milestone 8.2: Coordinator Request Handling & Assignment

**Goal:** Enable coordinators to view, approve, and handle foster requests, assigning animals/groups to fosters and updating relevant information.

**Tasks:**

1. **Create coordinator request management UI:**

    - Display foster requests in coordinator dashboard or dedicated requests page
    - Show requests with:
        - Foster name and contact info
        - Requested animal/group information
        - Request message content
        - Request timestamp
        - Request status (pending, approved, rejected)
    - Filter requests by status, priority, or foster
    - Link to full conversation where request was made

2. **Implement request approval workflow:**

    - "Approve Request" button/action for coordinators
    - When approved:
        - Assign animal/group to foster (update `current_foster_id` on animal/group)
        - Update animal/group status (e.g., change from `needs_foster` to `in_foster`)
        - Update foster's assigned animals/groups list
        - Send confirmation message to foster (auto-generated or coordinator can customize)
        - Tag animal/group in confirmation message
    - Handle group assignments:
        - If approving group request, assign entire group to foster
        - Update all animals in group to show foster assignment
        - Ensure group status reflects assignment

3. **Create assignment UI/flow:**

    - Assignment confirmation dialog/page
    - Show what will be assigned (animal/group details)
    - Optional: Add pickup/transfer event:
        - Date/time for pickup
        - Location for pickup
        - Special instructions
        - Store as event or note (design decision needed)
    - Allow coordinator to add notes or instructions during assignment
    - Send assignment notification to foster

4. **Update animal/group data on assignment:**

    - Set `current_foster_id` on animal or group record
    - Update status field appropriately
    - Record assignment timestamp
    - Link assignment to requesting message (optional - for audit trail)

5. **Handle request rejection:**

    - "Reject Request" action (optional - coordinator can just not respond)
    - If implemented: Send polite rejection message to foster
    - Mark request as rejected (for coordinator tracking)

6. **Request status tracking:**
    - Track request status in database (design decision needed):
        - Option 1: Use message metadata or tags
        - Option 2: Create simple `foster_requests` table
        - Option 3: Track through message content and assignment status
    - Display request history for coordinators
    - Show which requests have been fulfilled

**Design Decisions Needed (To be made during implementation):**

-   **Request tracking:** How to track request status (database table vs. message-based)
-   **Pickup/Transfer events:** Whether to create dedicated event system or use notes/messages
-   **Assignment workflow:** Single-step approval vs. multi-step (approve → schedule pickup → confirm)
-   **Notification preferences:** How fosters want to be notified of approvals
-   **Multiple requests:** Handling when multiple fosters request same animal/group
-   **Assignment history:** Whether to track assignment history or just current assignment

**Testing:**

-   Coordinators can view all foster requests
-   Can approve requests and assign animals/groups to fosters
-   Animal/group status updates correctly on assignment
-   Foster receives assignment notification
-   Assignment information is stored correctly
-   Group assignments work correctly (all animals in group assigned)
-   Request status is tracked appropriately

**Deliverable:** Coordinator request handling and assignment workflow working. Coordinators can approve requests and assign animals/groups to fosters with proper data updates.

**Note:** Specific implementation details (pickup events, request tracking method, etc.) will be finalized based on rescue organization feedback and testing during development.

---

## Planning Phase: Organization Record-Keeping Requirements

**Goal:** Meet with rescue organization to plan additional pages and record-keeping needs.

**Note:** Before proceeding to Phase 9 (Timestamp Display & History), schedule a planning meeting with the rescue organization to discuss:

1. **Additional Record Types:**

    - Determine which records the organization wants tracked (e.g., medical records, adoption records, foster history, intake records)
    - Decide which records are essential for MVP vs. post-MVP

2. **Data Structure Decisions:**

    - How each record type should be structured
    - What data fields are needed for each record type
    - Whether records should be linked to animals, groups, fosters, or organizations
    - What relationships exist between different record types

3. **Page Requirements:**

    - What pages/views are needed for each record type
    - Who should have access to each type of record (coordinators vs. fosters)
    - What actions can be performed on each record type (create, view, edit, delete)

4. **Timeline and Priority:**
    - Prioritize which record types are most critical
    - Determine which can be added post-MVP
    - Plan implementation order for additional features

**Outcome:** Document decisions and create implementation plan for additional record-keeping features based on organization's needs.

---

## Phase 9: Timestamp Display & History

**Goal:** Display timestamps on messages and data edits to show when information changed.

---

### Milestone 9.1: Timestamp Display & History

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

## Phase 10: Confirmation Codes (For Both Coordinators & Fosters)

**Goal:** Enable coordinators to generate confirmation codes for both coordinators and fosters in their organization, controlling platform access. Codes are linked to email addresses and organizations, and determine user role. This replaces open signup and eliminates the need for separate signup pages or organization creation flows.

---

### Milestone 10.1: Confirmation Codes Schema

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
    - Coordinators can view codes in their organization
    - Coordinators can create codes in their organization
    - Coordinators can revoke codes in their organization (mark as used or delete)
4. Create PostgreSQL function for code validation (security):
    - Function: `public.validate_confirmation_code(code TEXT, email TEXT)`
    - Returns: JSON with `valid` (boolean), `organization_id`, `role` (if valid)
    - Only checks if specific code exists, is unused, matches email, and is not expired
    - Does NOT expose other codes or allow listing
    - Mark function as `SECURITY DEFINER` to bypass RLS for validation
    - This allows signup validation without exposing all codes
5. Add indexes:
    - Index on `code` for fast lookup during signup
    - Index on `email` for lookup by email
    - Index on `organization_id` for filtering
6. Test: Create test code, verify it's stored correctly

**Testing:**

-   Table created with correct structure
-   Can create confirmation code with email, organization, and role
-   RLS policies work correctly
-   Code lookup is fast
-   Email matching works correctly

**Deliverable:** Confirmation codes schema ready with email and role support.

---

### Milestone 10.2: Coordinator Code Generation UI

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

### Milestone 10.3: Update Signup to Use Confirmation Codes

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
    - Call PostgreSQL function `public.validate_confirmation_code(code, email)`
    - Function returns validation result with organization_id and role (if valid)
    - This is more secure than querying the table directly (doesn't expose other codes)
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

### Milestone 10.4: Code Management & Sharing

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

## Phase 11: UX Polish & Navigation

**Goal:** Improve user experience with polished design, better navigation, and refined interactions based on Figma designs.

---

### Milestone 11.1: Navigation Structure

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

### Milestone 11.2: Figma Design Implementation

**Goal:** Implement polished UI designs from Figma, improving visual consistency and user experience.

**Tasks:**

1. **Set up Figma workflow:**
    - Purchase Figma subscription (if needed)
    - Set up Figma MCP (Model Context Protocol) for integration
    - Sample color palette from Co Kitty Coalition website
    - Create color palette in Figma based on organization's brand colors (replacing current pink theme)
2. Review Figma designs for key screens:
    - Dashboard
    - Animals list
    - Animal detail
    - Messages/conversations
    - Forms
3. Update component styling to match designs:
    - Colors (using Co Kitty Coalition color palette from website)
    - Spacing, typography
    - Button styles, input styles
    - Card layouts, list layouts
    - Icons and imagery
4. Create or update design system:
    - Color palette (from Co Kitty Coalition website)
    - Typography scale
    - Spacing system
    - Component variants
5. Update existing components:
    - FormContainer, Input, Button, etc.
    - Animal cards, message bubbles
    - Navigation components
6. Ensure mobile-first responsive design
7. Test: Compare UI to Figma designs, verify consistency
8. **Create custom thematic loading spinner:**
    - Design cat-themed spinner animation in Figma
    - Replace generic loading spinners with thematic spinner
    - Ensure spinner works on both light and dark backgrounds
    - Add spinner to photo lightbox and other loading states
    - Make it subtle and professional (not too playful)
9. **Post-milestone:** Schedule meeting with UX designer contact to gather feedback on design implementation

**Testing:**

-   UI matches Figma designs
-   Components are consistent
-   Mobile and desktop layouts work
-   Design system is applied consistently
-   Thematic spinner is consistent and professional

**Deliverable:** Figma designs implemented with Co Kitty Coalition color palette, including custom thematic loading spinner.

**Notes:**

-   Color palette should be sampled from Co Kitty Coalition website and replace current pink theme
-   Figma MCP setup and subscription needed before starting design work
-   UX designer feedback meeting scheduled after milestone completion

---

### Milestone 11.3: Loading States & Empty States

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
5. Add offline/online status indicator:
    - Detect when user is offline using `navigator.onLine` and `online`/`offline` events
    - Display visual indicator (banner, badge, or icon) when offline
    - Show clear message that app is in offline mode (service worker is serving cached content)
    - Important: Prevents confusion when service worker makes app appear functional while offline
    - Display indicator in header or as a banner at top of page
    - Update indicator when connection is restored
    - Style distinctly (e.g., yellow/orange banner) to draw attention
6. Test: Verify all loading and empty states work correctly, verify offline indicator appears when network is disconnected

**Testing:**

-   Loading states appear during data fetch
-   Empty states are helpful and clear
-   Skeletons improve perceived performance
-   No blank screens
-   Offline indicator appears when network is disconnected
-   Offline indicator disappears when connection is restored
-   Indicator is clearly visible and informative

**Deliverable:** Improved loading and empty states, plus offline status indicator to prevent user confusion when service worker is serving cached content.

---

### Milestone 11.4: Error Handling Improvements

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

### Milestone 11.5: Quick Actions & Shortcuts

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

## Phase 12: Landing Page & Marketing Site

**Goal:** Create a professional, impressive landing page to attract rescue organizations, showcase the app, and provide information for portfolio visitors.

---

### Milestone 12.1: Landing Page Structure & Navigation

**Goal:** Set up the landing page route structure and navigation to existing app functionality.

**Tasks:**

1. Create landing page route:
    - Add public route `/` (landing page) - not protected by authentication
    - Update routing so landing page is accessible without login
    - Ensure `/login` and `/signup` routes remain accessible
2. Create `src/pages/Landing.tsx` component:
    - Basic page structure with sections (will be filled in subsequent milestones)
    - Navigation header with links to Login and Sign Up
    - Footer with links and information
3. Update `App.tsx` routing:
    - Landing page (`/`) is public (not wrapped in ProtectedRoute)
    - Login and signup routes remain public
    - All other routes remain protected
4. Add navigation from landing page:
    - "Login" button/link in header
    - "Sign Up" button/link in header (or CTA button)
    - Links navigate to `/login` and `/signup` routes
5. Test: Can access landing page without login, can navigate to login/signup, protected routes still require auth

**Testing:**

-   Landing page loads at `/` without requiring authentication
-   Login and Sign Up links work correctly
-   Protected routes still require authentication
-   Navigation is clear and professional

**Deliverable:** Landing page structure with navigation to app functionality.

---

### Milestone 12.2: App Description & Partner Showcase

**Goal:** Display compelling app information and showcase partners/testimonials (e.g., Co Kitty Coalition).

**Tasks:**

1. Create hero section:
    - Eye-catching headline about the app's purpose
    - Subheadline explaining value proposition
    - Call-to-action buttons (Sign Up, Learn More, etc.)
    - Professional, modern design
2. Create app features section:
    - Key features of the platform (messaging, animal management, etc.)
    - Benefits for rescue organizations
    - Visual elements (icons, illustrations, or screenshots)
3. Create partner showcase section:
    - Display partner organizations (e.g., Co Kitty Coalition logo/name)
    - Testimonials/quotes from partners about the app
    - "Trusted by" or "Used by" messaging
    - Professional presentation of social proof
4. Create "How It Works" section:
    - Step-by-step explanation of the app
    - Visual flow or simple graphics
    - Clear, easy-to-understand language
5. Style for professional appearance:
    - Modern, clean design
    - Mobile-responsive layout
    - Consistent with app's design system (if available)

**Testing:**

-   Hero section is compelling and clear
-   Features are well-presented and understandable
-   Partner showcase looks professional
-   Testimonials/quotes are displayed attractively
-   Mobile and desktop layouts work well

**Deliverable:** App description and partner showcase sections complete.

---

### Milestone 12.3: App Demo & Advertising

**Goal:** Showcase the app with demos, screenshots, or interactive elements to demonstrate value.

**Tasks:**

1. Create demo/screenshots section:
    - Screenshots of key app features (dashboard, messaging, animal management)
    - Image carousel or gallery for multiple screenshots
    - Captions explaining what each screenshot shows
    - High-quality, professional screenshots
2. Add interactive demo (optional):
    - Embedded video demo (if available)
    - Or interactive prototype/walkthrough
    - Or animated GIFs showing app flow
3. Create "Key Benefits" section:
    - Highlight main value propositions
    - Compare to current solutions (spreadsheets, text chains)
    - Show time savings, efficiency gains
    - Use data/statistics if available
4. Add "Request Demo" or "Schedule a Call" CTA:
    - Button to contact for personalized demo
    - Links to contact form or email
5. Style for visual appeal:
    - Professional screenshot presentation
    - Clear, readable captions
    - Engaging layout

**Testing:**

-   Screenshots are high-quality and clear
-   Demo section is engaging
-   Benefits are clearly communicated
-   CTAs are prominent and functional
-   Mobile layout works well

**Deliverable:** App demo and advertising sections complete with screenshots and compelling messaging.

---

### Milestone 12.4: Contact & Personal Story

**Goal:** Provide contact information and share personal story to build trust and connection.

**Tasks:**

1. Create "About the Developer" section:
    - Personal story and background
    - Why you built this app
    - Your connection to animal rescue
    - Professional but personal tone
2. Create contact section:
    - Contact form for rescue organizations interested in using the app
    - Email address for inquiries
    - Clear call-to-action for organizations to reach out
    - Form fields: organization name, email, message, etc.
3. Implement contact form functionality:
    - Form submission handler
    - Send emails (via email service or Supabase Edge Function)
    - Success/error messaging
    - Validation and spam protection (optional)
4. Add "For Rescue Organizations" section:
    - Information about how to get started
    - What to expect when signing up
    - How the app can help their organization
5. Style for professional yet approachable appearance:
    - Personal but not overly casual
    - Clear contact information
    - Easy-to-use contact form

**Testing:**

-   Personal story is engaging and builds trust
-   Contact form works correctly
-   Form submissions are received
-   Success/error messages display properly
-   Contact information is clear and accessible

**Deliverable:** Contact section and personal story complete with working contact form.

---

### Milestone 12.5: Donation Section

**Goal:** Provide a way for visitors to support the project through donations.

**Tasks:**

1. Create donation section:
    - Explanation of how donations support the project
    - What donations are used for (development, hosting, etc.)
    - Clear, transparent messaging
2. Add donation options:
    - Payment links (PayPal, Venmo, etc.)
    - Or embedded donation form
    - Multiple payment methods if possible
3. Add "Why Donate" information:
    - Impact of donations
    - How donations help rescue organizations
    - Optional: Show donation goals or impact metrics
4. Style for trust and transparency:
    - Professional payment presentation
    - Clear donation amounts (if applicable)
    - Secure payment messaging
5. Test donation flow:
    - Verify payment links work
    - Test on mobile and desktop
    - Ensure secure payment handling

**Testing:**

-   Donation section is clear and compelling
-   Payment links/forms work correctly
-   Multiple payment methods are available
-   Mobile and desktop donation flows work
-   Secure payment messaging is present

**Deliverable:** Donation section complete with working payment options.

---

### Milestone 12.6: Landing Page Polish & Figma Design

**Goal:** Refine landing page design using Figma, ensuring professional, impressive appearance.

**Tasks:**

1. **Set up Figma design:**
    - Create landing page designs in Figma
    - Design all sections (hero, features, demo, contact, donate)
    - Ensure cohesive visual design
    - Use color palette from app (Co Kitty Coalition colors if available)
2. Review Figma designs:
    - Hero section layout and typography
    - Feature sections and spacing
    - Partner showcase presentation
    - Demo/screenshot presentation
    - Contact form design
    - Donation section design
3. Update component styling to match Figma:
    - Colors, spacing, typography from designs
    - Button styles, form styles
    - Section layouts and spacing
    - Responsive breakpoints
4. Create or update design system:
    - Landing page specific components
    - Reusable sections/components
    - Typography scale for marketing content
    - Color usage for landing page
5. Ensure mobile-first responsive design:
    - All sections work on mobile
    - Navigation is mobile-friendly
    - Forms are usable on mobile
    - Images/screenshots scale properly
6. Test: Compare landing page to Figma designs, verify consistency, test on multiple devices

**Testing:**

-   Landing page matches Figma designs
-   Components are consistent
-   Mobile and desktop layouts work
-   Design system is applied consistently
-   Professional, impressive appearance

**Deliverable:** Polished landing page matching Figma designs, ready for production.

---

## Phase 13: Expo Wrapping (For Reliable iOS Notifications)

**Goal:** Wrap PWA in Expo to enable App Store distribution and reliable iOS push notifications via APNs.

---

### Milestone 13.1: Initialize Expo Project

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

### Milestone 13.2: Expo Push Notifications

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

### Milestone 13.3: Build & Publish

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

-   Fosters can message coordinators via foster chat
-   Coordinators can see all foster chats
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

## Post-MVP Features & Enhancements

### Photo Retention Policy

**Goal:** Implement per-user photo limits to prevent storage abuse while allowing dedicated fosters to share many photos.

**Policy Details:**

-   **Per-user limit:** 1,000 photos per user across all conversations (prevents abuse while allowing dedicated fosters to share many photos)
-   **Cleanup logic:** When a user exceeds 1,000 photos, delete oldest photos uploaded by that user
-   **Implementation:** Track total photo count per user, check on upload, delete oldest photos if limit exceeded
-   **Rationale:** Most fosters send ~50 photos/year, dedicated fosters may send 200-500/year. 1,000 photos is generous for active users but prevents blatant abuse (10,000+ photos)
-   **Storage impact:** With 200 users × 1,000 photos max = 600GB theoretical max, but realistic usage is much lower (most users under 500 photos). Estimated actual storage: 100-200GB for message photos, keeping costs around $25-30/month for 5+ years
-   **Note:** Animal/group photos are kept forever (documentation), only message photos have retention limits

**When to implement:** After MVP launch, when storage costs become a concern or abuse is detected.

---
