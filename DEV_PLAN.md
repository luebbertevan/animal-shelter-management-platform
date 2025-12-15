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

## Phase: Environment Setup & Project Initialization

### Local Development Environment

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

### Supabase Project Setup

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

### Initialize PWA Web App (Vite + React Router)

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
    │   └── manifest.json (we'll create this in PWA Setup phase)
    └── vite.config.ts
    ```
5. Set up React Router in `src/App.tsx` (see existing file for reference)

6. Test run: `bun run dev`
    - Open http://localhost:5173 (Vite default port)
    - Open DevTools → Device Toolbar (Cmd+Shift+M) to test mobile view

**Testing:** Web app launches and shows React app. Mobile view works in DevTools. Routing works.

**Deliverable:** PWA-ready web app structure initialized and running with React Router.

---

### TypeScript Types

**Goal:** Define core data models for the app.

**Tasks:**

1. Create `src/types/index.ts` with all type definitions (see existing file for reference)

**Testing:** TypeScript compiles without errors: `bunx tsc --noEmit`

**Deliverable:** Type definitions ready.

---

## Phase: Database Schema & Authentication

### Database Schema Setup

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

### Supabase Client Setup

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

### Authentication UI

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

**Note:** Deployment to production is covered in Deployment phase (recommended after PWA Setup is complete).

---

### Auth State Management

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

### Sign Up

**Goal:** Allow new users to create accounts through a simple signup form. This milestone implements basic user registration with email and password. **Note:** This open signup will be replaced in Confirmation Codes phase with confirmation code-based signup that links users to organizations and determines their role (coordinator vs foster).

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
-   Note: Profile creation will be handled automatically via database trigger (created in initial schema setup, updated in Add Organization ID to Core Tables to include organization_id, and updated again in Create Conversation on User Signup to create conversations)

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

### Auto-Login After Signup

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

### Sign Out

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

## Phase: First End-to-End Feature (Animals CRUD)

### Create Animal

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
        - Status dropdown (required, defaults to 'in_shelter' - options: in_shelter, in_foster, adopted, medical_hold, transferring)
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

### List Animals

**Goal:** Display all animals in a mobile-friendly, scrollable list that allows users to browse and navigate to individual animal details. This milestone creates a page that fetches and displays all animals from the database. It uses React Query for efficient data fetching, caching, and automatic refetching. The list should be visually appealing and easy to navigate on mobile devices.

**Note:** View Animals and View Groups are separate pages (not combined). They share reusable components (AnimalCard, GroupCard, search/filter components) but remain distinct pages for clarity and different use cases.

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

### View Animal Details

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

## Phase: PWA Setup (Install to Home Screen)

### PWA Manifest

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

### Service Worker (Offline Support)

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

## Phase: Deployment (For Real Device Testing)

**Goal:** Deploy the PWA to a public URL so you can test on real phones and share with others.

**Why Deploy After PWA Setup:**

-   You have a complete working feature (auth + animals CRUD)
-   PWA is ready - can test "Add to Home Screen" on real devices
-   Makes sense to deploy a PWA (not just a web app)
-   Early enough for testing, but meaningful enough to be useful
-   Verify environment variables work in production
-   Learn deployment process (it's easier than it seems!)

**When to Deploy:**

-   **Recommended:** After PWA Setup phase is complete
-   **Alternative:** After First End-to-End Feature phase if you want to test earlier (but you'll miss PWA features)
-   **Can skip:** If you're only testing locally for now

### Deploy to Vercel (Recommended)

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

## Phase: Schema Rework & Multi-Tenancy Foundation

**Goal:** Add organizations to support multiple shelters and prepare schema for future expansion based on customer feedback.

### Add Organizations Table

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

### Add Organization ID to Core Tables

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
    - **Note:** The trigger will be updated again in Create Conversation on User Signup to also create conversations, but for now it just needs to set organization_id
    - This ensures new signups (before Confirmation Codes phase) get assigned to default organization

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

### Update RLS Policies for Organization Isolation

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
-   New signups (before Confirmation Codes phase) get default org and can see default org data

**Deliverable:** RLS policies enforce organization isolation with safe fallbacks.

---

### Update Queries to Filter by Organization

**Goal:** All frontend queries automatically filter by user's organization.

**Tasks:**

1. **Update `useUserProfile` hook:**

    - Fetch user's `organization_id` from profile
    - Return `organization_id` in hook response
    - All profiles will have organization_id (via DEFAULT in Add Organization ID to Core Tables)

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
-   New signups (before Confirmation Codes phase) get default org and see default org data

**Deliverable:** All queries filter by organization automatically with safe fallbacks.

---

## Phase: Messaging System (CRITICAL)

**Goal:** Enable real-time communication between coordinators and fosters, with full coordinator visibility into all conversations.

---

### Messages & Conversations Schema

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

### Create Conversation on User Signup

**Goal:** Automatically create foster chat when foster signs up.

**Tasks:**

1. Update existing `handle_new_user()` trigger function:
    - Function already exists (created in Add Organization ID to Core Tables)
    - Add logic to create foster chat after profile creation
    - Check if `role = 'foster'` before creating conversation
    - Link conversation to foster's profile and organization
    - Set conversation type to 'foster_chat'
2. Handle role assignment:
    - Currently: Everyone signs up as 'foster' (default)
    - Confirmation Codes phase: Confirmation codes will determine role
    - Solution: Check role from created profile - only fosters get conversations
3. Test: Sign up as foster, verify conversation is created
4. Handle edge case: Coordinator signup (no foster chat needed - handled by role check)

**Implementation:**

-   Updated `handle_new_user()` function to create foster chat after profile creation
-   Uses `RETURNING id, role` to get created profile's role
-   Only creates conversation if `role = 'foster'`
-   Works now (everyone is foster) and in Confirmation Codes phase (codes determine role)

**Testing:**

-   New foster signup creates foster chat
-   Conversation is linked to correct organization
-   Conversation is linked to foster's profile
-   Coordinator signup does not create foster chat (when Confirmation Codes phase is implemented)

**Deliverable:** Automatic conversation creation working for fosters.

---

### Coordinator Group Chat Setup

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

### Basic Message List (MVP)

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
    - Basic layout (no MessageInput yet - that comes in Add MessageInput to Conversation Detail Page)
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

### Extract MessageBubble Component

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

### Scroll-to-bottom & Polish

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

### Basic MessageInput Component

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

### Add MessageInput to Conversation Detail Page

**Goal:** Add message sending capability to the existing conversation detail page.

**Tasks:**

1. Update `src/pages/messaging/ConversationDetail.tsx`:
    - Add MessageInput component (from Basic MessageInput Component - basic version without tagging)
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

### Direct Navigation to Foster Chat

**Goal:** Fosters can access their foster chat directly from the dashboard.

**Tasks:**

1. Add "Chat" button on Dashboard page:
    - Fetch foster's conversation ID (foster chat for their profile)
    - Add "Chat" button that links directly to `/messages/:conversationId`
    - No preview needed (just a button)
    - Style appropriately for mobile-first design
2. Update `ConversationDetail.tsx` back button behavior:
    - For fosters: Back button navigates to Dashboard (`/dashboard`)
    - For coordinators: Back button behavior unchanged (will be updated in Conversation List for Coordinators)
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

### Conversation List for Coordinators

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
    - For fosters: Back button already navigates to Dashboard (from Direct Navigation to Foster Chat)
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

### Real-Time Message Updates

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

### Photo Sharing in Messages

**Goal:** Allow users to send and receive photos in chat messages, with proper storage and display.

---

### Storage & Database Setup

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

### Photo Upload Backend Function

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

### Photo Selection UI

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

### Integrate Upload with Message Sending

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

### Display Photos in Messages

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

### Photo Viewing Polish

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

### Minimal Group Management UI (Prerequisite for Group Tagging)

**Goal:** Create minimal group management UI to enable testing of group tagging in messages. This provides basic create/view functionality for groups without full editing capabilities.

### Database - Add Priority Field

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

### Groups

**Note:** View Animals and View Groups are separate pages (not combined). They share reusable components but remain distinct pages.

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

**Note:** This is a minimal implementation. Full editing (Group Management UI Polish & Edit Functionality) will add:

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

### Foster List and Detail Pages

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

**Note:** This is a minimal implementation focused on viewing foster information. Future enhancements (Group Management UI Polish & Edit Functionality and later) may include:

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

### Update Database Schema for Foster Tagging

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

### Backend Support for Foster Tagging

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

### Tag Selection UI in MessageInput

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
    - Pass tags to send message function (from Backend Support for Foster Tagging)
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

### Display Tags in MessageBubble

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
    - Groups → link to `/groups/:id` (group detail page - already created in Groups)
    - Fosters → link to `/fosters/:id` (foster detail page - created in Foster List and Detail Pages)
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

### Polish Conversation Detail Page

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

### Dashboard - Currently Fostering Section

**Goal:** Add a "Currently Fostering" section to the Dashboard that displays animals and groups currently assigned to the logged-in user (both fosters and coordinators). This provides users with quick access to view the animals they're responsible for. The section only appears if the user is currently fostering animals or groups.

**Tasks:**

1. **Create query functions for assigned animals and groups**:

    - Create function `fetchAssignedAnimals(profileId, organizationId)` to fetch animals where `current_foster_id` matches the user's profile ID
    - Filter by organization (use `organizationId` parameter)
    - Query `animals` table with `.eq('current_foster_id', profileId)` and `.eq('organization_id', organizationId)`
    - Handle errors using `errorUtils`
    - Create function `fetchAssignedGroups(profileId, organizationId)` to fetch groups where `current_foster_id` matches the user's profile ID
    - Filter by organization (use `organizationId` parameter)
    - Query `animal_groups` table with `.eq('current_foster_id', profileId)` and `.eq('organization_id', organizationId)`
    - Handle errors using `errorUtils`
    - **Reviewable:** Can test query functions independently with test data, verify they return correct animals/groups for a given profile

2. **Create shared display card components**:

    - Extract animal card component from `AnimalsList.tsx` into reusable component `src/components/animals/AnimalCard.tsx`
    - Extract group card component from `GroupsList.tsx` into reusable component `src/components/animals/GroupCard.tsx`
    - Include navigation links in card components:
        - `AnimalCard` should link to `/animals/:id` (animal detail page)
        - `GroupCard` should link to `/groups/:id` (group detail page)
    - Ensure cards are clickable/linkable with proper styling (hover effects, cursor pointer)
    - Update `AnimalsList.tsx` to use shared `AnimalCard` component
    - Update `GroupsList.tsx` to use shared `GroupCard` component
    - Verify cards maintain consistent styling and behavior across all uses
    - **Reviewable:** Can test card components independently, verify they render correctly, verify navigation works, verify existing lists still work with shared components

3. **Add basic Dashboard section with data fetching**:

    - Update Dashboard component (`src/pages/Dashboard.tsx`):
        - Add a new "Currently Fostering" section below Quick Actions section
        - Use React Query's `useQuery` to fetch assigned animals and groups using functions from Task 1
        - Display animals and groups using shared `AnimalCard` and `GroupCard` components from Task 2
        - Show loading state while fetching (use `LoadingSpinner` component)
        - Display in a card-based list format (consistent with AnimalsList and GroupsList styling)
        - For now, show all assigned animals and groups (group prioritization comes in Task 4)
    - **Reviewable:** Can test Dashboard section displays assigned animals/groups, verify loading states, verify section appears for users with assignments

4. **Implement conditional rendering and group prioritization logic**:

    - Update Dashboard section to only display if user has assigned animals/groups:
        - Check if fetched data has any animals or groups
        - Only render section if data exists (conditional rendering)
        - If no assigned animals/groups, section should not appear at all
    - Implement group prioritization logic:
        - For each assigned animal, check if it belongs to a group (via `group_id` field)
        - Fetch group data for animals that have `group_id` set
        - If animal is in a group that's also assigned to this user, display the group instead of the individual animal
        - Logic: If `animal.group_id` exists AND the group's `current_foster_id` matches user, show group; otherwise show individual animal
        - Prevent duplicate display: if a group is shown, don't show individual animals from that group
        - Handle edge case: animals in groups but group isn't assigned to user (show individual animal)
    - **Reviewable:** Can test conditional rendering (section appears/disappears correctly), can test group prioritization logic (groups shown instead of individual animals when appropriate), can test edge cases

5. **Polish and handle remaining edge cases**:

    - Handle animals assigned individually (not in a group) - ensure they display correctly
    - Handle groups with no animals (edge case, but should still display)
    - Ensure section doesn't flash briefly when loading (use conditional rendering based on data existence, not just loading state)
    - Verify section appears for ALL users (both fosters and coordinators) when they have assignments
    - Test that section filters by organization correctly
    - **Reviewable:** Can test all edge cases, verify smooth loading experience, verify works for both user roles

**How It Works:**

-   When a user (foster or coordinator) logs in and views the Dashboard, the app checks if they have any assigned animals or groups
-   If assigned animals/groups exist, the "Currently Fostering" section appears below Quick Actions
-   The app queries for animals and groups where `current_foster_id` matches the user's profile ID
-   If an animal belongs to a group that's also assigned to the user, the group is displayed instead of the individual animal
-   Clicking on an animal or group card navigates to the respective detail page (using shared card components)
-   The section uses the same card components as AnimalsList and GroupsList for consistency
-   The section updates automatically when assignments change (via React Query refetching)
-   If user has no assigned animals/groups, the section doesn't appear at all

**Testing:**

-   Section appears for fosters with assigned animals/groups
-   Section appears for coordinators with assigned animals/groups
-   Section does NOT appear if user has no assigned animals/groups
-   Assigned animals appear in the list using shared AnimalCard component
-   Assigned groups appear in the list using shared GroupCard component
-   Individual animals in assigned groups are not shown separately (group is shown instead)
-   Individual animals not in groups are shown
-   Clicking animal card navigates to animal detail page
-   Clicking group card navigates to group detail page
-   Cards match styling from AnimalsList and GroupsList
-   Loading state shows while fetching
-   Error handling works for failed queries
-   Section filters by organization correctly
-   Section is positioned below Quick Actions

**Deliverable:** "Currently Fostering" section on Dashboard working for all users. Section only appears when user has assigned animals/groups. Uses shared card components for consistency with AnimalsList and GroupsList.

**Note:** This milestone can be implemented even if groups aren't fully implemented yet. The group prioritization logic can be simplified to show all assigned animals initially and enhanced when group management is complete. The shared card components should be created to ensure consistency across the app.

---

## Phase: Animal Forms & Groups Management

**Goal:** Complete animal creation/editing forms with all data attributes, enable group management, and allow coordinators to edit animals and groups.

**Implementation Order:**

1. **Update Animal Types and Schema** (foundation - must be first)
2. **Complete Animal Creation Form - Basic Fields** (gets form working with core fields, includes bio)
3. **Complete Animal Creation Form - Combined Sex/SpayNeuter Field** (moderate complexity)
4. **Complete Animal Creation Form - Physical Characteristics** (simple text field)
5. **Complete Animal Creation Form - Medical and Behavioral Needs** (simple textareas)
6. **Complete Animal Creation Form - Date and Age Fields** (most complex - bidirectional auto-fill)
7. **Complete Animal Creation Form - Life Stage Auto-Fill** (depends on date/age fields)
8. **Complete Animal Creation Form - Photo Upload** (complex - separate milestone before editing)
9. **Enable Animal Editing** (reuse form components, includes photos and bio)
10. **Copy Data from Animal Feature** (high priority - really nice feature)
11. **Foster Photo & Bio Editing** (dedicated milestone - only thing fosters can edit)
12. **Update Animal Preview Card & Detail Page** (display all new fields, do after all form milestones)
13. **Group Management** (separate milestone - includes "Display Groups in Animal UI" which handles adding animals to groups in forms)

**Future Features (Not Implementing Now):**

-   Age auto-update over time based on DOB (will need background job or scheduled task)
-   Physical characteristics dropdown with autocomplete
-   Advanced form features (collapsible sections, etc.)
-   Coordinator auto-fill message feature: Auto-fill messages requesting bios and pictures with instructions, auto-tagging current animals or groups
-   Photo captions (optional field in photo metadata)
-   Optimistic locking for concurrent edits (if race conditions become an issue)

---

### Update Animal Types and Schema

**Goal:** Update TypeScript types and database schema to reflect new field requirements.

**Tasks:**

1. **Update TypeScript types** (`src/types/index.ts`):

    - Create new combined type `SexSpayNeuterStatus` with values: `"female"`, `"male"`, `"spayed_female"`, `"neutered_male"` (field can be left blank/undefined if unknown)
    - Remove separate `Sex` and `SpayNeuterStatus` types
    - Update `AnimalStatus` type: Remove `"needs_foster"`, keep: `"in_shelter"`, `"medical_hold"`, `"transferring"`, `"adopted"`, `"in_foster"`
    - Update `LifeStage` type: Add `"unknown"` option (keep: `"kitten"`, `"adult"`, `"senior"`, `"unknown"`)
    - Remove from `Animal` interface: `vaccines`, `felv_fiv_test`, `felv_fiv_test_date`, `socialization_level`
    - Update `Animal` interface: Replace `sex` and `spay_neuter_status` with single `sex_spay_neuter_status?: SexSpayNeuterStatus`
    - Add `display_placement_request?: boolean` to `Animal` interface
    - Add `photos?: PhotoMetadata[]` to `Animal` interface (array of photo objects with minimal metadata)
    - Create `PhotoMetadata` type: `{ url: string, uploaded_by?: string }`
        - `url`: Photo URL (required)
        - `uploaded_by`: User/profile ID (needed for permission checks - fosters can only delete their own photos)
        - Keep it simple - mirror messaging approach but add minimal metadata for permissions
        - Timestamps can be derived from file metadata if needed
    - Add `bio?: string` to `Animal` interface (text field for animal biography) - fosters will be able to edit
    - Keep `additional_notes` (already exists)
    - Keep `tags` in interface but note it won't be handled in UI yet
    - Keep `medical_needs` and `behavioral_needs` (already exist)

2. **Create database migration** (if schema changes needed):
    - Add `sex_spay_neuter_status` column (TEXT, nullable)
    - Add `display_placement_request` column (BOOLEAN, default false)
    - Add `photos` column (JSONB, nullable):
        - Structure: `[{"url": "...", "uploaded_by": "..."}, ...]` - simple array of photo objects
        - Minimal metadata: just `url` (required) and `uploaded_by` (optional, for permission checks)
        - Keep it simple - mirror messaging approach (`photo_urls` is just `["url1", "url2"]`) but add `uploaded_by` for permission checks
        - Timestamps can be derived from file metadata if needed
        - Captions can be added later if needed
        - Fosters will be able to edit photos for assigned animals
    - Add `bio` column (TEXT, nullable) - fosters will be able to edit
    - Remove `vaccines`, `felv_fiv_test`, `felv_fiv_test_date`, `socialization_level` columns (or mark as deprecated)
    - Update `status` column CHECK constraint to remove `needs_foster`
    - Migrate existing `sex` and `spay_neuter_status` data to combined field (if data exists)
    - **Note:** Migration strategy depends on whether existing data needs to be preserved

**Testing:**

-   TypeScript types compile without errors
-   Migration runs successfully
-   Existing code that uses old types is updated (if any)

**Deliverable:** Updated types and schema ready for form implementation.

---

### Complete Animal Creation Form - Basic Fields

**Goal:** Add basic required and simple optional fields to the animal creation form.

**Design Decisions:**

1. **Default Status**: Default to `in_shelter` if left blank
2. **Display Placement Request**: Checkbox that auto-updates when status changes (but persists if custom edited). Simple handling: when status changes, auto-update checkbox, but don't enforce any rules otherwise (allows custom edits). Place checkbox next to status field to make relationship obvious.
3. **Form Layout**: Single scrollable form (no collapsible sections)
4. **Complex Fields**: Use text inputs for now (physical characteristics, etc.). Plan to upgrade to dropdowns/autocomplete later.
5. **Life Stage**: Auto-fill based on age but remain editable. Rollover ages TBD (kitten→adult, adult→senior).
6. **Age Auto-Update**: Future feature - age will auto-update over time based on DOB. Not implementing now.

**Proposed Field Display Order:**

1. Name (text, optional)
2. Status (dropdown, required, default: `in_shelter`)
3. Display Placement Request (checkbox, auto-updates with status) - _Next to status field_
4. Sex/SpayNeuter Status (combined dropdown, optional) - _Task: Combined Sex/SpayNeuter Field_
5. Life Stage (dropdown, optional) - _Simple dropdown for now, auto-fill will be added later_
6. Physical Characteristics (text field, optional) - _Task: Physical Characteristics_
7. Date of Birth (date picker, optional) - _Task: Date and Age Fields_
8. Age Estimate (number input + unit dropdown: weeks/months/years, optional) - _Task: Date and Age Fields_
9. Priority (toggle)
10. Medical Needs (textarea, optional) - _Task: Medical and Behavioral Needs_
11. Behavioral Needs (textarea, optional) - _Task: Medical and Behavioral Needs_
12. Additional Notes (textarea, optional)
13. Bio (textarea, optional) - _Last entry in form, fosters will be able to edit later_
14. Tags (skip for now - not handling in UI yet)

**Tasks:**

1. **Update `src/pages/animals/NewAnimal.tsx`** with basic fields:

    - **Name** (text input, optional) - already exists
    - **Status** (dropdown, required):
        - Options: `in_shelter`, `medical_hold`, `transferring`, `adopted`, `in_foster`
        - Remove `needs_foster` option
        - Default: `in_shelter` if left blank
    - **Display Placement Request** (checkbox, optional):
        - Boolean field to control if animal appears on placement request page
        - Place next to Status field (same row or adjacent)
        - Auto-update logic: When status changes, automatically update checkbox:
            - If status is `in_shelter`, `medical_hold`, or `transferring` → set to `true`
            - If status is `adopted` or `in_foster` → set to `false`
        - User can manually change checkbox independently (no special tracking needed)
        - If status changes again after manual edit, checkbox will auto-update again based on new status
        - Default: Auto-calculated based on initial status when form loads
    - **Life Stage** (dropdown, optional):
        - Options: `kitten`, `adult`, `senior`, `unknown`
        - Include "Select..." placeholder option
        - Simple dropdown for now (no auto-fill logic yet - will be added in separate task after date/age fields)
    - **Primary Breed** (text input, optional):
        - Text field for now (will be upgraded to dropdown with custom option later)
    - **Physical Characteristics** (text input, optional):
        - Text field for now (will be upgraded to dropdown with custom option later)
    - **Medical Needs** (textarea, optional):
        - Multi-line text input for medical history, conditions, medications, special care
    - **Behavioral Needs** (textarea, optional):
        - Multi-line text input for behavioral notes, training needs, etc.
    - **Additional Notes** (textarea, optional):
        - Multi-line text input for general notes
    - **Adoption Bio** (textarea, optional):
        - Multi-line text input for adoption biography
        - Last field in form
        - Fosters will be able to edit this field later (dedicated milestone)
    - **Priority** (toggle, optional) - already exists
    - **Note:** "Add to Group" feature will be added in "Display Groups in Animal UI" milestone (part of Group Management phase) - keeping Basic Fields focused on core animal data only

2. **Form layout**:

    - Single scrollable form (no collapsible sections)
    - Mobile-first responsive design
    - Clear field labels and spacing
    - Status and Display Placement Request should be visually grouped (same row on desktop, adjacent on mobile)

3. **Validation**:
    - Status is required (already enforced)
    - All other fields optional

**Testing:**

-   Can create animal with only status (required field)
-   Can create animal with all basic fields populated
-   All field values save correctly to database
-   Form is mobile-friendly
-   Status dropdown doesn't include "needs_foster"

**Deliverable:** Basic animal creation form with core fields working.

---

### Complete Animal Creation Form - Combined Sex/SpayNeuter Field

**Goal:** Add combined sex and spay/neuter status field to animal creation form.

**Tasks:**

1. **Update `src/pages/animals/NewAnimal.tsx`**:

    - Add "Sex/SpayNeuter Status" dropdown field
    - Options: `female`, `male`, `spayed_female`, `neutered_male`
    - Include "Select..." placeholder option (can be left blank)
    - Field is optional (can be left blank if unknown)
    - Store value in `sex_spay_neuter_status` field

2. **Update form submission**:
    - Map dropdown value to database field correctly
    - Handle empty/unknown values appropriately

**Testing:**

-   Can select each option from dropdown
-   Value saves correctly to database
-   Field is optional (can create animal without it)
-   Works on mobile devices

**Deliverable:** Combined sex/spay-neuter field working in creation form.

---

### Complete Animal Creation Form - Smart Dropdowns with Custom Options

**Goal:** Upgrade Primary Breed and Physical Characteristics fields from text inputs to smart dropdowns that show most common values and allow custom input.

**Approach:** Use Headless UI Combobox component for accessible, keyboard-navigable dropdowns with custom input capability. Fetch suggestions via direct SQL query (no separate table needed).

**Performance Notes:**

-   Query fetches top 20 most common values per organization
-   Queries are fast (organization-scoped, simple aggregation)
-   Client-side caching (React Query) prevents unnecessary requests
-   Suggestions don't need real-time updates (acceptable to be slightly stale)

**Tasks:**

**Group 1: Setup & UI Component**

1. **Install Headless UI:**

    - Run `bun install @headlessui/react`

2. **Create reusable Combobox component** (`src/components/ui/Combobox.tsx`):

    - This component will be reused for both Primary Breed and Physical Characteristics fields
    - Use Headless UI `Combobox` component
    - Props: `label`, `value`, `onChange`, `suggestions`, `placeholder`, `disabled`, `error`
    - Style to match existing form components:
        - Extract shared style constants (border colors, focus colors, etc.) to match Input/Select components
        - Use same Tailwind classes: `border-pink-300`, `focus:border-pink-500`, `focus:ring-pink-500`
        - Style input field, dropdown container, option items, and hover states consistently
    - Support keyboard navigation (arrow keys, enter, escape)
    - Show suggestions dropdown when user types or clicks
    - Allow selecting from suggestions or typing custom value
    - Handle empty suggestions array gracefully (show empty dropdown, still allow custom input)
    - Mobile-friendly (close on blur, touch-friendly interactions)
    - Component must be generic/reusable - suggestions array passed as prop, no hardcoded field-specific logic
    - **Testing:** Test component with mock data (hardcoded suggestions array) before integrating with backend

**Group 2: Backend/Data Layer**

3. **Create shared field suggestions helper function** (`src/lib/animalQueries.ts`):

    - Create generic helper: `fetchFieldSuggestions(organizationId: string, fieldName: string, limit: number = 20): Promise<string[]>`
    - Query: Fetch all values for specified field where `organization_id` matches and field is not NULL
    - Use Supabase query builder (same pattern as existing `animalQueries.ts` functions):
        - Example: `supabase.from('animals').select(fieldName).eq('organization_id', orgId).not(fieldName, 'is', null)`
        - Fetch all matching rows (simple query, no aggregation in SQL)
    - Client-side processing (shared logic):
        - Count frequency of each exact value (case-sensitive matching)
        - Sort by frequency (descending), then alphabetically
        - Return top N unique values (default 20)
    - Why client-side processing: Supabase query builder doesn't easily support GROUP BY with COUNT and ORDER BY in a single query. Client-side processing is simpler and avoids needing RPC functions or raw SQL.
    - This shared function handles the common logic for both fields

4. **Create breed suggestions query function** (`src/lib/animalQueries.ts`):

    - Function: `fetchBreedSuggestions(organizationId: string): Promise<string[]>`
    - Implementation: Call `fetchFieldSuggestions(organizationId, 'primary_breed', 20)`
    - Public API wrapper for breed-specific suggestions
    - Return array of unique breed strings sorted by frequency (most frequent first)

5. **Create physical characteristics suggestions query function** (`src/lib/animalQueries.ts`):

    - Function: `fetchPhysicalCharacteristicsSuggestions(organizationId: string): Promise<string[]>`
    - Implementation: Call `fetchFieldSuggestions(organizationId, 'physical_characteristics', 20)`
    - Public API wrapper for characteristics-specific suggestions
    - For MVP, exact text matching only (no parsing or splitting)
    - Return array of unique characteristic strings sorted by frequency (most frequent first)

**Group 3: Integration**

6. **Update `src/pages/animals/NewAnimal.tsx`**:

    - Add React Query hooks to fetch suggestions for both Primary Breed and Physical Characteristics fields using `useQuery`
    - Configure React Query with 5-minute cache (stale-while-revalidate pattern)
    - Handle loading and error states (show loading spinner or fallback gracefully)
    - Replace Primary Breed text Input component with reusable Combobox component
    - Replace Physical Characteristics text Input component with reusable Combobox component
    - Pass appropriate suggestions array as prop to each Combobox instance
    - Each Combobox instance uses the same reusable component but with different suggestions data
    - Handle custom values on form submission (no special handling needed - save as-is)

**Design decisions:**

-   **Suggestion limit:** Top 20 most common values
-   **Case handling:**
    -   Use exact values as stored in database (case-sensitive matching)
    -   Headless UI handles case-insensitive filtering when user types
    -   Users typically select from dropdown after first entry, so values will match exactly
-   **Sorting:** Most frequent values appear first, then alphabetically for ties
-   **Custom values:** Always allowed - user can type anything not in suggestions
-   **Empty state:**
    -   If suggestions array is empty or query fails: Show placeholder text, dropdown shows "No suggestions" or remains empty, component still allows custom input
    -   If suggestions exist: Show suggestions when user starts typing or clicks dropdown arrow
-   **Caching:** React Query cache with 5-minute stale time (stale-while-revalidate)
-   **Performance:** Query runs on form mount, results cached. Acceptable if suggestions are slightly stale.

**Implementation details:**

-   Headless UI Combobox provides accessible dropdown with keyboard navigation out of the box
-   Styling: Match existing Input/Select component styles (border-pink-300, focus:border-pink-500, etc.)
-   Filtering: Headless UI handles filtering suggestions as user types
-   Custom input: User can type anything, even if not in suggestions list

**Testing:**

-   Can select from dropdown suggestions
-   Can type custom value not in suggestions
-   Suggestions update correctly after creating animals with new values (on next form load, after cache expires)
-   Keyboard navigation works (arrow keys, enter, escape, tab)
-   Works on mobile devices (touch interactions, dropdown closes appropriately)
-   Handles edge cases: empty values, very long values, special characters
-   Loading state shows appropriately while fetching suggestions
-   Error state handled gracefully (show empty suggestions list if query fails)

**Deliverable:** Primary Breed and Physical Characteristics fields upgraded to smart dropdowns with suggestions (top 20 most common values) and custom input support.

---

### Complete Animal Creation Form - Date and Age Fields

**Goal:** Add date of birth and age estimate fields with bidirectional auto-fill logic. Store only DOB in database; calculate age on-demand from DOB using date math.

**Storage Strategy:**

-   **Database:** Only store `date_of_birth` (TIMESTAMPTZ, optional). No `age_estimate` field needed.
-   **Display:** Always calculate age on-demand from DOB using actual calendar date math (date difference), then format in appropriate unit (weeks/months/years).
-   **Form:** Age and DOB are tied - if one is set, the other is calculated. Both fields remain editable after auto-fill.

**Tasks:**

1. **Create shared age utility functions** (`src/lib/ageUtils.ts`):

    - Define unit constants once at the top (DRY principle): `DAYS_PER_WEEK = 7`, `DAYS_PER_MONTH = 30.44`, `DAYS_PER_YEAR = 365.25`
    - `rolloverAge(value: number, unit: "days" | "weeks" | "months" | "years"): { value: number, unit: "days" | "weeks" | "months" | "years" }`
        - Converts age to appropriate unit (e.g., 24 months → 2 years, 16 weeks → 4 months, 7 days → 1 week)
        - Rollover rules: 7+ days → weeks, 16+ weeks → months, 365+ days → years (uses 365 threshold for cleaner rollover)
        - Returns integer values (rounded) for cleaner display
    - `calculateAgeFromDOB(dob: string): { value: number, unit: "days" | "weeks" | "months" | "years" }`
        - Calculates age from DOB to today using actual calendar date math via JavaScript Date methods
        - Uses Date.getFullYear(), Date.getMonth(), Date.getDate() for accurate calendar calculations
        - Handles leap years and varying month lengths automatically (no averaging)
        - Determines appropriate unit: < 7 days → days, >= 7 days and < 16 weeks → weeks, >= 16 weeks and < 1 year → months, >= 1 year → years
        - Returns integer values (rounded) for display
    - `calculateDOBFromAge(value: number, unit: "days" | "weeks" | "months" | "years"): string`
        - Calculates estimated DOB from age using day multipliers (for form input only)
        - Uses average multipliers since this is an estimate: weeks = 7 days, months = 30.44 days, years = 365.25 days
        - Returns ISO date string (YYYY-MM-DD format)

2. **Update database schema** (if needed):

    - Verify `date_of_birth` field exists in `animals` table (should already exist)
    - No `age_estimate` field needed (remove if it exists, or leave unused)

3. **Update `src/pages/animals/NewAnimal.tsx`**:

    - Add "Date of Birth" field (date picker, optional)
    - Add "Age Estimate" field (number input + unit dropdown, optional):
        - Number input: Integer value (e.g., 3, 24, 16)
        - Unit dropdown: Options "days", "weeks", "months", "years"
        - Default unit: "days" (to handle very young animals)
        - Layout: Number input and dropdown on same row (side-by-side)
        - Both fields are required if age estimate is provided (must have both number and unit)
    - Form submission: Store only `date_of_birth` (calculate from age input if age was entered)

4. **Implement auto-rollover logic** (on blur):

    - When age field loses focus, use `rolloverAge()` utility function
    - Check if rollover is needed:
        - 7 days or more → Convert to weeks (e.g., 7 days → 1 week)
        - 16 weeks or more → Convert to months (e.g., 16 weeks → 4 months)
        - 365 days or more → Convert to years (e.g., 365 days → 1 year, 24 months → 2 years)
    - Apply rollover automatically when field loses focus (onBlur)
    - Update both number and unit fields when rollover occurs
    - Examples:
        - User enters: 24 months, leaves field → Auto-changes to: 2 years
        - User enters: 16 weeks, leaves field → Auto-changes to: 4 months
        - User enters: 104 weeks, leaves field → Auto-changes to: 2 years

5. **Implement bidirectional auto-fill logic** (on blur):

    - **DOB → Age Estimate** (when DOB field loses focus):
        - Use `calculateAgeFromDOB()` utility function (uses actual calendar date math)
        - Auto-populate Age Estimate number and unit fields
        - Both fields remain editable after auto-fill
    - **Age Estimate → DOB** (when age number or unit field loses focus):
        - Use `calculateDOBFromAge()` utility function (uses day multipliers: 7, 30.44, 365.25)
        - Auto-populate Date of Birth field
        - Field remains editable after auto-fill
    - **Important**: All auto-fill happens on blur (onBlur events), NOT while typing
    - This prevents annoying auto-updates while user is still entering data
    - Handle edge cases: Invalid dates, future dates, negative ages

6. **Validation**:

    - Date of Birth: Validate date format, prevent future dates
    - Age Estimate: Number must be positive integer, unit must be selected
    - Show error messages for invalid inputs on blur
    - Both fields are optional (can leave empty)

**Testing:**

-   Entering DOB and leaving field → Auto-fills age estimate with correct unit (using date math)
-   Entering age estimate and leaving field → Auto-fills DOB correctly (using day multipliers)
-   Auto-rollover works: 24 months → 2 years (on blur)
-   Auto-rollover works: 16 weeks → 4 months (on blur)
-   Auto-rollover works: 104 weeks → 2 years (on blur)
-   Auto-fill does NOT happen while typing (only on blur)
-   Age number input accepts only integers
-   Unit dropdown shows correct options
-   Both fields remain editable after auto-fill
-   Form submission stores only `date_of_birth` (not age_estimate)
-   Invalid dates show appropriate errors
-   Future dates are prevented/rejected
-   Both fields are optional
-   Works on mobile devices (number input shows numeric keyboard)

**Deliverable:** Date and age fields with bidirectional auto-fill working. Only DOB stored in database. Age calculated on-demand using shared utility functions.

---

### Complete Animal Creation Form - Life Stage Auto-Fill

**Goal:** Auto-fill life stage based on age/DOB, but keep field editable.

**Rollover Ages:**

-   **Kitten to Adult**: 4 months
-   **Adult to Senior**: 11 years

**Tasks:**

1. **Create or update shared age utility functions** (`src/lib/ageUtils.ts`):

    - `calculateLifeStageFromDOB(dob: string): "kitten" | "adult" | "senior" | "unknown"`
        - Calculates age from DOB using `calculateAgeFromDOB()`, then determines life stage
        - Uses rollover ages: < 4 months = kitten, >= 4 months and < 11 years = adult, >= 11 years = senior
    - `calculateLifeStageFromAge(value: number, unit: "weeks" | "months" | "years"): "kitten" | "adult" | "senior" | "unknown"`
        - Determines life stage directly from age value and unit
        - Uses same rollover ages as above

2. **Update `src/pages/animals/NewAnimal.tsx`**:

    - Add auto-fill logic for Life Stage field:
        - When Date of Birth is entered: Use `calculateLifeStageFromDOB()`, auto-populate Life Stage dropdown
        - When Age Estimate is entered: Use `calculateLifeStageFromAge()`, auto-populate Life Stage dropdown
        - Life Stage field remains editable (user can override auto-filled value)
        - If age cannot be determined or is unknown, leave Life Stage as "unknown" or empty

3. **Life stage calculation logic**:

    - Use rollover ages (implemented in utility functions):
        - If age < 4 months: "kitten"
        - If age >= 4 months AND age < 11 years: "adult"
        - If age >= 11 years: "senior"
        - If age cannot be determined: "unknown" or leave empty
    - Handle edge cases: Invalid dates, future dates
    - Reuses age calculation logic from Date and Age Fields milestone

4. **Update behavior**:

    - Auto-fill happens on blur when DOB or Age Estimate fields lose focus
    - User can manually change Life Stage after auto-fill
    - Manual changes persist (don't re-auto-fill if user has edited)

**Testing:**

-   Entering DOB auto-fills life stage correctly based on age
-   Entering age estimate auto-fills life stage correctly
-   Life stage rollover logic works correctly (kitten→adult, adult→senior)
-   Life stage field remains editable after auto-fill
-   Manual edits to life stage persist
-   Works on mobile devices

**Deliverable:** Life stage auto-fill working with editable override.

---

### Complete Animal Creation Form - Photo Upload

**Goal:** Add photo upload functionality to animal creation form for coordinators.

**Design Decisions:**

1. **Photo upload position in form:**

    - Place photo upload section **immediately after the Name field** (commonly used field, early in form)

2. **Component reusability:**

    - Create a reusable `PhotoUpload` component that can be used in both creation and edit forms
    - Component should accept props for:
        - `maxPhotos` (default: 10)
        - `onPhotosChange` callback (receives array of File objects)
        - `existingPhotos` (for edit form - array of photo URLs/metadata)
        - `onRemovePhoto` (for edit form - to remove existing photos)
        - `disabled` state
    - This allows reuse in EditAnimal form later while keeping the component flexible

3. **Upload timing (following messaging precedent):**

    - **Upload photos on form submission** (not on selection)
    - Photos are selected and stored in component state with preview thumbnails
    - Upload happens when user clicks "Create Animal" button
    - This matches the messaging photo upload UX pattern

4. **Failed upload handling:**

    - **Failed uploads should NOT block animal creation**
    - If all photos fail: Create animal without photos, show error message
    - If some photos fail: Create animal with successful photos, show error for failed ones
    - This ensures animal creation isn't blocked by network/storage issues
    - User can always add photos later via edit form

5. **Photo upload UX (following messaging precedent):**

    - Show preview thumbnails immediately after selection (using `URL.createObjectURL`)
    - Display file size on each thumbnail
    - Allow removing photos from selection before upload (X button on thumbnail)
    - Show "Uploading photos..." indicator during upload
    - Validate files on selection (size, type) - show errors immediately
    - Max 10 photos, 8MB per photo
    - Allowed types: jpeg, jpg, png, webp

6. **Storage path structure:**
    - Use existing `uploadPhoto()` utility but create animal-specific wrapper
    - Path: `{organization_id}/animals/{animal_id}/{timestamp}_{filename}`
    - Note: `animal_id` is only available after animal creation, so:
        - Store selected files in state during form
        - After animal is created, upload photos with the new `animal_id`
        - If upload fails, animal still exists (can add photos via edit later)

**Tasks:**

1. **Reuse photo upload infrastructure** (from Photo Sharing in Messages phase):

    - Use existing `photos` storage bucket (unified bucket for all photos)
    - Create animal-specific wrapper around `uploadPhoto()` utility (from `photoUtils.ts`)
    - New function: `uploadAnimalPhoto(file, organizationId, animalId)`
    - Path structure: `{organization_id}/animals/{animal_id}/{timestamp}_{filename}`
    - Reuse existing validation (file size, type) from `photoUtils.ts`
    - Configure file size limits: **max 8MB per photo**
    - Configure allowed file types (jpg, jpeg, png, webp)

2. **Create reusable PhotoUpload component**:

    - Create `src/components/animals/PhotoUpload.tsx` (reusable for creation and edit)
    - Component props:
        - `maxPhotos` (default: 10)
        - `onPhotosChange` callback (receives array of File objects)
        - `existingPhotos` (optional, for edit form - array of `{url, uploaded_by}` objects)
        - `onRemovePhoto` (optional, for edit form - callback with photo URL/index)
        - `disabled` state
    - Features:
        - File input with multiple selection
        - Immediate preview thumbnails (using `URL.createObjectURL`)
        - Show file size on each thumbnail
        - Remove button (X) on each thumbnail
        - Validation on selection (size, type) with error messages
        - Max photos limit enforcement
        - Clean up object URLs on unmount

3. **Add photo upload UI to NewAnimal form**:

    - Place photo upload section **immediately after the Name field**
    - Use `PhotoUpload` component
    - Store selected photos in form state (array of File objects)
    - Display preview thumbnails in form
    - Show upload progress during creation
    - Handle upload errors gracefully

4. **Store photos with metadata**:

    - When animal is created, upload photos to Supabase Storage
    - Store photo metadata in `photos` JSONB column:
        - Structure: `[{"url": "...", "uploaded_by": "..."}, ...]` - simple structure
        - Include `url` (required) - photo URL from Supabase Storage
        - Include `uploaded_by` (optional) - user/profile ID for permission checks (fosters can only delete their own photos)
        - Keep it simple - mirror messaging approach but add minimal metadata for permissions
    - Handle case where photo uploads fail (don't fail entire animal creation, but show error)

5. **Photo upload flow**:
    - User selects photos in form (photos stored in state with previews)
    - On form submission:
        1. Create animal first (get `animal_id`)
        2. Upload photos using the new `animal_id` in storage path
        3. Update animal record with photo metadata
    - Show "Uploading photos..." indicator during upload
    - **Failed uploads do NOT block animal creation:**
        - If all uploads succeed: Animal created with all photos
        - If some uploads fail: Animal created with successful photos, show error for failed ones
        - If all uploads fail: Animal still created (without photos), show error message
    - User can add photos later via edit form if upload fails

**Testing:**

-   Can select multiple photos in creation form
-   Photo previews appear correctly
-   Can remove photos from selection
-   Photos upload successfully when animal is created
-   Photo metadata is stored correctly (url, uploaded_by)
-   Failed photo uploads don't prevent animal creation
-   Error messages are clear and helpful
-   Works on mobile devices

**Deliverable:** Photo upload working in animal creation form with proper storage and metadata.

---

### Update Animal Preview Card

**Goal:** Update `AnimalCard` component to display all new animal fields in a scannable, mobile-friendly preview card format.

**Dependencies:**

-   **Complete Animal Creation Form - Photo Upload** - Photos are now available in the `photos` array

**Proposed Preview Card Fields (AnimalCard):**

The preview card should show minimal, scannable information for quick browsing:

1. **Photo thumbnail** (if available) - first photo from `photos` array, or placeholder
2. **Name** - already exists
3. **Status** - already exists (with badge styling)
4. **Group indicator** - if animal is in a group, show group name with link to group detail page
5. **Life Stage** - new field (kitten/adult/senior) - quick visual indicator
6. **Sex/SpayNeuter Status** - updated field (replaces old `sex` field)
7. **Priority badge** - already exists (if high priority)
8. **Age** - calculated from `date_of_birth` on-demand (if available, e.g., "3 years", "4 months") - compact display

**Optional considerations:**

-   Physical characteristics (if short enough, truncate if long)
-   Group indicator badge (if animal is in a group)

**Tasks:**

1. **Update `AnimalCard` component** (`src/components/animals/AnimalCard.tsx`):

    - Add photo thumbnail (first photo from `photos` array, or placeholder)
    - Add group display: if animal is in a group (`group_id` exists), show group name with link to group detail page
        - Display as badge or text with link: "In group: [Group Name]" → links to `/groups/:id`
        - Only show if `group_id` is set
    - Update to use new `sex_spay_neuter_status` field (replaces `sex`)
    - Add `life_stage` display
    - Add age display (calculated from `date_of_birth` on-demand, compact format like "3 years" or "4 months")
    - Update TypeScript interface to include new fields (including `group_id` and group name if available)
    - Handle missing/optional fields gracefully (don't show empty fields)
    - Maintain mobile-friendly responsive design

2. **Update TypeScript types**:

    - Ensure `AnimalCardProps` includes all fields needed for preview
    - Update `Animal` type usage in `AnimalCard`

3. **Handle edge cases**:

    - Animals with no photos (show placeholder)
    - Animals with no name (already handled)
    - Missing optional fields (don't display empty fields)
    - Long text fields (truncate in preview)

**Testing:**

-   Preview card displays all new fields correctly
-   Preview card handles missing fields gracefully
-   Photo thumbnail appears in preview card (if available)
-   Group indicator displays correctly (if animal is in a group)
-   Age calculation displays correctly
-   Mobile layout works correctly
-   All fields match form data (verify data flows correctly)

**Deliverable:** Updated AnimalCard component displaying all new animal fields with proper organization and mobile-friendly design.

**Note on Component Reusability:**

-   AnimalCard component should be designed for reuse
-   Will be used in Animals List, Fosters Needed page, and other contexts
-   Group preview cards will reuse similar patterns (handled in Group Management milestone)

---

### Update Animals List

**Goal:** Update the Animals List page to use the updated `AnimalCard` component and display animals with all new fields.

**Dependencies:**

-   **Update Animal Preview Card** - Needs the updated AnimalCard component

**Tasks:**

1. **Update `AnimalsList` page** (`src/pages/animals/AnimalsList.tsx`):

    - Ensure it uses the updated `AnimalCard` component
    - Display animals in a grid/list layout using `AnimalCard`
    - Handle loading states
    - Handle empty states (no animals)
    - Ensure proper spacing and mobile responsiveness
    - Each card should link to the animal detail page

2. **Verify data flow**:

    - Ensure all new fields are fetched from database
    - Verify photos are displayed correctly
    - Verify group information is displayed (if available)
    - Verify age calculations work correctly

3. **Handle edge cases**:

    - Animals with no photos (placeholder shown)
    - Animals with missing optional fields
    - Large lists (pagination or virtual scrolling if needed)

**Testing:**

-   Animals list displays all animals correctly
-   AnimalCard components show all new fields
-   Photo thumbnails appear correctly
-   Group indicators appear correctly (if animals are in groups)
-   Cards link to correct detail pages
-   Mobile layout works correctly
-   Loading and empty states work correctly

**Deliverable:** Updated Animals List page using the new AnimalCard component with all fields displayed correctly.

---

### Update Animal Detail Page

**Goal:** Update `AnimalDetail` page to display all animal fields in the same order as the creation form, with clear indicators for blank fields.

**Dependencies:**

-   **Complete Animal Creation Form - Photo Upload** - Photos are now available in the `photos` array
-   **Update Animal Preview Card** - For consistent field display patterns

**Design Decisions:**

1. **Field Order:** Display fields in the exact same order as the `NewAnimal` form to maintain consistency:

    1. Name
    2. Photos
    3. Status + Display Placement Request (grouped together)
    4. Sex
    5. Date of Birth + Age Estimate (grouped together)
    6. Life Stage
    7. Primary Breed
    8. Physical Characteristics
    9. High Priority (toggle indicator)
    10. Medical Needs
    11. Behavioral Needs
    12. Additional Notes
    13. Adoption Bio

2. **Blank Field Display:**

    - Show all fields regardless of whether they have values
    - For blank/empty fields, display a de-emphasized indicator (e.g., "Not provided" in gray/italic text)
    - This makes it clear what information is missing vs. what information exists
    - Follows the spec requirement: "Unknown/missing information is de-emphasized or shown at the bottom of detail views"

3. **Group Indicator:**

    - Display group information (if animal is in a group) directly under the name
    - Show as a link to the group detail page: "In group: [Group Name]"
    - Navigate to group detail page on click
    - Only display if `group_id` exists

4. **Header Actions:**

    - Edit button (coordinators only) - links to edit page (from Animal Editing for Coordinators milestone)
        - **Note:** Edit page doesn't exist yet, but button can be added and linked later
    - "Edit Photos & Bio" button (fosters, if animal is assigned to them) - links to foster edit page (from Foster Photo & Bio Editing milestone)
        - **Note:** Foster edit page doesn't exist yet, but button can be added and linked later
    - Priority badge (if high priority) - displayed as a badge in the header

5. **Photo Display:**

    **Layout:**

    - Use same layout as PhotoUpload component: `flex flex-wrap gap-2` (flexbox wrap, not grid)
    - Photos wrap to new lines as needed, maintaining consistent spacing
    - This matches the create form for visual consistency

    **Photo Thumbnails:**

    - Size: `w-20 h-20` (80px x 80px) - same as PhotoUpload component
    - Object fit: `object-cover` to fill the square while maintaining aspect ratio (may crop)
    - Border: `border border-gray-300` - same as PhotoUpload component
    - Border radius: `rounded` - same as PhotoUpload component
    - Cursor: `cursor-pointer` to indicate photos are clickable (for lightbox)
    - Hover effect: Optional subtle effect to indicate clickability (e.g., `hover:opacity-90`)
    - Loading state: Show spinner or skeleton while photos load
    - Error state: Show placeholder icon if photo fails to load
    - **Key difference from PhotoUpload:** No remove button (read-only view), clicking opens lightbox instead

    **Lightbox Integration:**

    - Clicking a photo opens the PhotoLightbox component (reuse from `src/components/messaging/PhotoLightbox.tsx`)
    - Extract photo URLs from `photos` array (map `photo.url` from `PhotoMetadata[]`)
    - Pass current photo index to lightbox based on which photo was clicked
    - PhotoLightbox supports:
        - Full-screen viewing with black background
        - Navigation between photos (arrow buttons, keyboard arrows)
        - Photo counter (e.g., "1 of 5")
        - Close button (X button, Escape key, or click outside)
        - Keyboard navigation (Arrow keys, Escape)
        - Loading spinner for images
        - Responsive sizing (full screen on mobile, centered with margins on desktop)

    **Empty State:**

    - If no photos, show placeholder with de-emphasized text (e.g., "No photos provided")

6. **Age Display:**

    - If `date_of_birth` exists, calculate and display age using `calculateAgeFromDOB()` utility
    - If `date_of_birth` is missing but `age_value` and `age_unit` exist, display as "Age Estimate: [value] [unit]"
    - If both are missing, show "Not provided"

7. **Metadata Section (coordinators only):**
    - Display at the bottom: Created at, Updated at, Current foster (if assigned)
    - Always visible at the bottom (not collapsible)
    - Only show if user is coordinator

**Tasks:**

1. **Create field display utility/component** (do this first for reusability):

    - Create a reusable component or utility function for displaying field/value pairs with blank field handling
    - Example: `<FieldDisplay label="Name" value={animal.name} />` or similar
    - Handles the "Not provided" display logic consistently
    - Can be used throughout the AnimalDetail page

2. **Update TypeScript types** (ensure types are correct before implementation):

    - Update `Animal` type usage in `AnimalDetail`
    - Ensure all fields are properly typed
    - Include `group_id` and `group_name` if available

3. **Update `AnimalDetail` page** (`src/pages/animals/AnimalDetail.tsx`):

    - Display all fields in the exact order listed above
    - Use FieldDisplay component for consistent field/value display
    - For each field:
        - Show the field label
        - If value exists: display the value
        - If value is blank/empty/null: display de-emphasized "Not provided" text
    - Display group indicator directly under name if `group_id` exists (link to group detail page, navigates on click)
    - Display status as a colored badge/chip in the header
    - Display all photos using same layout as PhotoUpload component:
        - Use `flex flex-wrap gap-2` layout
        - Photo size: `w-20 h-20` (80px x 80px)
        - Styling: `object-cover rounded border border-gray-300`
        - Add `cursor-pointer` and hover effect to indicate clickability
        - Clicking a photo opens PhotoLightbox (no remove button, read-only view)
    - Integrate PhotoLightbox component (reuse from `src/components/messaging/PhotoLightbox.tsx`):
        - Import `PhotoLightbox` from `src/components/messaging/PhotoLightbox.tsx`
        - Extract photo URLs from `photos` array (map `photo.url` from `PhotoMetadata[]`)
        - Add state for lightbox open/close and current photo index
        - Add click handlers to photo thumbnails to open lightbox
        - Pass photo URLs array, initial index, and open/close handlers to PhotoLightbox
    - Show loading states while photos load
    - Show error placeholder if photo fails to load
    - Show empty state placeholder if no photos
    - Calculate and display age from `date_of_birth` if available
    - Display age estimate if `date_of_birth` is missing but `age_value`/`age_unit` exist
    - Add Edit button for coordinators (links to edit page - can be placeholder link for now)
    - Add "Edit Photos & Bio" button for fosters (if assigned - can be placeholder link for now)
    - Display priority badge in header if high priority
    - Display metadata section for coordinators at the bottom (created_at, updated_at, current_foster) - always visible
    - Handle edge cases:
        - Animals with no photos (show placeholder with "No photos" message)
        - Animals with no name (already handled: "Unnamed Animal")
        - All optional fields (show "Not provided" for each)
        - Long text fields (full display, allow scrolling if needed)
        - Animals in groups (fetch and display group name)
        - Age calculation edge cases (future dates, invalid dates)
    - Maintain mobile-friendly responsive design

    - Animals with no photos (show placeholder with "No photos" message)
    - Animals with no name (already handled: "Unnamed Animal")
    - All optional fields (show "Not provided" for each)
    - Long text fields (full display, allow scrolling if needed)
    - Animals in groups (fetch and display group name)
    - Age calculation edge cases (future dates, invalid dates)

**Testing:**

-   Detail page displays all fields in the same order as the form
-   Blank fields display "Not provided" in de-emphasized style
-   Fields with values display correctly
-   Group indicator displays under name and navigates to group detail page on click
-   Status displays as a colored badge in the header
-   Photo grid displays correctly with responsive columns (max 5 for large screens)
-   Clicking a photo opens PhotoLightbox with navigation working
-   PhotoLightbox navigation (arrows, keyboard) works correctly
-   PhotoLightbox closes correctly (X button, Escape key, click outside)
-   Age calculation displays correctly (from DOB or estimate)
-   Edit buttons appear for correct users (coordinators, assigned fosters)
-   Priority badge displays in header when applicable
-   Metadata section displays for coordinators only at the bottom (always visible)
-   Mobile layout works correctly
-   All fields match form data (verify data flows correctly)

**Deliverable:** Updated AnimalDetail page displaying all animal fields in form order with clear blank field indicators and proper organization.

**Note on Component Reusability:**

-   Sections created here should be designed for reuse
-   Group detail pages will reuse similar section patterns (handled in Group Management milestone)
-   Fosters Needed page will also reuse components

---

### Animal Editing for Coordinators

**Goal:** Enable coordinators to edit existing animals with all data attributes, including photos and bio.

**Approach:** The edit form will be very similar to the create animal form (NewAnimal), prefilled with existing animal data. This keeps the UI simple and intuitive.

**Code Reusability (DRY):**

-   **Extract shared form logic:** Before implementing EditAnimal, extract the form state management, validation, and age/DOB calculation logic from NewAnimal into a reusable `useAnimalForm` hook (`src/hooks/useAnimalForm.ts`)
-   This hook will manage all form state, calculations, and validation
-   Both NewAnimal and EditAnimal will use this hook, with minor differences:
    -   NewAnimal: initializes empty state, creates new animal
    -   EditAnimal: initializes from existing animal data, updates existing animal
-   **Create `animalToFormState` utility:** Create a utility function (`src/lib/animalFormUtils.ts` or similar) that transforms an `Animal` object into form state. This will be used by:
    -   EditAnimal: `useAnimalForm(animalToFormState(animal))` - includes all fields
    -   Copy Data from Animal: `useAnimalForm(animalToFormState(animal, { exclude: ['name', 'bio', 'photos'] }))` - excludes specified fields
-   Benefits: Single source of truth, easier maintenance, consistent behavior, reusable transformation logic

**Tasks:**

0. **Extract `useAnimalForm` hook** (before implementing EditAnimal):

    - Create `src/hooks/useAnimalForm.ts`
    - Extract all form state management from NewAnimal (name, status, age, DOB, photos, etc.)
    - Extract age/DOB bidirectional calculation logic
    - Extract life stage calculation logic
    - Extract form validation logic
    - Accept optional `initialAnimal` parameter for edit mode
    - Return form state, handlers, errors, and validation status
    - Refactor NewAnimal to use this hook
    - Test that NewAnimal still works correctly after refactoring

1. **Create `src/pages/animals/EditAnimal.tsx`**:

    - Fetch animal by ID from URL params
    - Use `useAnimalForm` hook with existing animal data to pre-populate form
    - Include all fields from NewAnimal form (including bio)
    - Include photo management:
        - Use `PhotoUpload` component (already created) with `existingPhotos` prop
        - Display existing photos in unified gallery (same UI as create form)
        - Allow uploading new photos
        - Allow deleting existing photos (delete from storage when removed)
        - Show photo info (uploaded_by if available, for permission checks)
    - **Note:** Group membership management is handled in "Display Groups in Animal UI" milestone (task 3)
    - Handle loading and error states
    - Update animal in database on submit
    - Upload new photos after form submission (same approach as NewAnimal)
    - Include `uploaded_at` timestamp when adding new photos
    - Redirect to animal detail page after successful update

2. **Photo management in edit form**:

    - Use `PhotoUpload` component (already created) for photo management
    - Display existing photos with thumbnails in unified gallery
    - Allow adding new photos (upload to storage, add to photos array)
    - Allow deleting photos: **Delete from storage when removed** (not just remove from array)
        - Create utility function to delete photos from Supabase Storage
        - When coordinator removes a photo, delete the file from storage to prevent orphaned files
    - Include `uploaded_at: new Date().toISOString()` when adding new photos
    - Update `photos` JSONB array with new/removed photos

3. **Create route `/animals/:id/edit`** (coordinator-only)

    - Route added to `App.tsx`
    - Placeholder `EditAnimal.tsx` component created (will be fully implemented in task 1)

4. **Add "Edit" button to AnimalDetail page** (coordinator-only)

    - Edit button added to AnimalDetail page
    - Button navigates to `/animals/:id/edit` route
    - Only visible to coordinators

5. **Update RLS policies** if needed to ensure only coordinators can update

    - RLS policies are already set up correctly
    - Policy "Coordinators can update animals in their organization" exists in `20250120140000_update_rls_for_organization_isolation.sql`
    - Coordinators can update animals in their organization
    - No changes needed

6. **Handle race conditions** (simple approach):

    - If two coordinators edit the same animal simultaneously, last write wins (simple overwrite)
    - No locking mechanism - this is acceptable as it's not a critical failure and won't happen often
    - If needed in future, can add optimistic locking with version numbers or timestamps
    - For now: Simple overwrite is sufficient

7. **Test**: Coordinator can edit animals, fosters cannot

**Testing:**

-   `useAnimalForm` hook works correctly with NewAnimal (refactoring doesn't break existing functionality)
-   Coordinator can access edit page for animals
-   All fields pre-populate correctly (including bio)
-   Existing photos display correctly in unified gallery
-   Can upload new photos (with `uploaded_at` timestamp)
-   Can delete existing photos (photos are deleted from storage, not just removed from array)
-   Changes save to database
-   Photo metadata updates correctly (including `uploaded_at` for new photos)
-   Failed photo uploads don't block animal update
-   Foster cannot access edit page
-   Navigation works correctly
-   Concurrent edits result in last write wins (acceptable behavior)

**Deliverable:** Animal editing working for coordinators with full field support including photos and bio, using shared form logic to maintain DRY principles.

**Note on Race Conditions:** Simple overwrite approach is used. If two users edit simultaneously, the last save wins. This is acceptable as it's not a critical failure and concurrent edits are rare. Future enhancement could add optimistic locking if needed.

**Note on Group Management:** Group membership management (adding/removing animals from groups) is handled in the "Display Groups in Animal UI" milestone, not in this milestone. This keeps the edit form focused and manageable.

---

### Group Management UI Polish & Edit Functionality

**Goal:** Add missing features to group management UI, including edit functionality, validation, and polish. Note: Basic group management (list, detail, create) was completed in Minimal Group Management UI.

**Design Decisions:**

-   **Reusability Pattern:** Follow the same pattern as create/edit animal forms:
    -   Create a reusable `GroupForm` component (similar to `AnimalForm`)
    -   Create a `useGroupForm` hook (similar to `useAnimalForm`) for form state management
    -   `NewGroup` and `EditGroup` pages will use the shared form component and hook
-   **Animal Selection UI:**
    -   Use `AnimalCard` components directly (no custom variant needed)
    -   Selected animals show a border to indicate selection state
    -   In edit mode: selected animals appear first in the list with selected border
    -   When deselected, animals stay in the same position in the list but border is removed
    -   Search/filter functionality deferred until later milestone
-   **Permissions:**
    -   Same as create/edit animal: Coordinators only, fosters cannot access edit functionality
    -   Route protection via coordinator check in page component (same pattern as `EditAnimal.tsx`)
-   **Duplicate Group Assignment:**
    -   **Important:** Animals can only be in one group at a time
    -   When animal is already in another group, show popup modal with:
        -   Message: "Animal [name] is already in group: [group_name](link to that group). Move them to this group?"
        -   Two buttons:
            1.  "Move to new" (moves animal to new group, removes from old group)
            2.  "Cancel" (cancels the action, animal stays in current group)
    -   Button labels should be concise and clear

**Component Reusability:**

-   Follow the create/edit animal pattern:
    -   `GroupForm` component (reusable form UI)
    -   `useGroupForm` hook (form state management)
    -   `NewGroup` and `EditGroup` pages use shared components
-   Reuse `PhotoUpload` component for group photos (same as animals)
-   Reuse `AnimalCard` for animal selection and display

**Photo Uploads for Groups:**

-   Implement photo upload functionality for groups (similar to animal photo uploads)
-   Use the same `PhotoUpload` component used for animals
-   Create `uploadGroupPhoto` function in `photoUtils.ts` (similar to `uploadAnimalPhoto`)
-   Create `deleteGroupPhoto` function in `photoUtils.ts` (similar to `deleteAnimalPhoto`)
-   Store photos in `photos` JSONB array on `animal_groups` table
-   Path structure: `{organization_id}/groups/{group_id}/{timestamp}_{filename}`
-   Photo metadata structure: `{ url: string, uploaded_at: string, uploaded_by: string }` (same as animal photos)
-   Coordinators can upload and delete any group photos
-   Fosters cannot upload group photos (coordinator-only feature)

**Data Model - Group Membership:**

-   **Important:** Animals can only be in one group at a time
-   `animal_groups.animal_ids` array is the source of truth for group membership
-   `animals.group_id` should always match the group the animal is in (single foreign key)
-   When moving an animal between groups:
    -   Remove animal ID from old group's `animal_ids` array
    -   Add animal ID to new group's `animal_ids` array
    -   Update `animals.group_id` to point to the new group

**Group Detail Page - Animal Display:**

-   Update `GroupDetail.tsx` to display animals in the group using `AnimalCard` components
-   Use the same grid layout as `AnimalsList.tsx`: `grid gap-1.5 grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`
-   Fetch all necessary animal fields for `AnimalCard` (photos, date_of_birth, sex_spay_neuter_status, etc.)
-   Make animal cards clickable to navigate to animal detail pages
-   Show group photos using the same photo display as animal detail pages

**Group Card Photo Display:**

-   Update `GroupCard` component to display photos:
    -   **Priority 1:** If group has `group_photos` array with at least one photo, display the first group photo
    -   **Priority 2:** If no group photos, fetch and display photos from animals in the group:
        -   Fetch animal photos for animals in `animal_ids` array
        -   Display first available animal photo (from first animal that has photos)
        -   If multiple animals have photos, prefer showing the first animal's first photo
    -   Photo should be displayed prominently (similar to how `AnimalCard` displays photos)
    -   Handle cases where group has no photos and no animals have photos (show placeholder or no image)
    -   Ensure photo display is consistent with `AnimalCard` styling and layout
    -   Update `GroupCard` props to accept photo data or fetch it internally
    -   Consider performance: may need to fetch animal photos when displaying group cards in lists

**Staged Implementation Plan:**

#### **Stage 1: Basic Edit Group Page & Routing (Foundation)**

**Tasks:**

1. **Create `useGroupForm` hook** (`src/hooks/useGroupForm.ts`):

    - Similar structure to `useAnimalForm`
    - Manage form state: `name`, `description`, `priority`
    - Validation logic
    - Accept `initialGroup` parameter for edit mode
    - Animal selection sorting: Stable sort - selected animals first, then unselected, preserving original order within each group

2. **Create `GroupForm` component** (`src/components/animals/GroupForm.tsx`):

    - Similar structure to `AnimalForm`
    - Accept form state and handlers from `useGroupForm`
    - Render fields: name (Input), description (Textarea), priority (Toggle)
    - Accept photo upload props (similar to AnimalForm)
    - Accept animal selection section (will be added in Stage 2)
    - Submit button and error/success message display

3. **Create `EditGroup` page** (`src/pages/animals/EditGroup.tsx`):

    - Fetch group by ID from URL params using `fetchGroupById`
    - Use `useGroupForm` with initial group data
    - Use `GroupForm` component
    - Handle form submission: use `updateGroup` function from `groupQueries.ts` (create if doesn't exist)
    - Coordinator-only access (redirect fosters, same pattern as `EditAnimal`)
    - Loading and error states
    - Redirect to group detail page after successful update

4. **Add route** (`src/App.tsx`):

    - Add route `/groups/:id/edit` pointing to `EditGroup` page
    - Wrap in `ProtectedRoute` (coordinator check happens in page component)

5. **Add Edit button to `GroupDetail` page**:

    - Show "Edit" button for coordinators only (check `isCoordinator`)
    - Link to `/groups/:id/edit`

6. **Create group query functions** (`src/lib/groupQueries.ts`):
    - Add `updateGroup(groupId, organizationId, data)` function for updating groups
    - Add `createGroup(organizationId, data)` function for creating groups (if not already exists)
    - Follow same pattern as animal query functions
    - Handle errors and return appropriate data structures

**Review Checkpoint:** Basic edit functionality works. Coordinator can edit name, description, priority. Navigation works correctly.

---

#### **Stage 2: Animal Selection UI & Group Membership Updates**

**Tasks:**

1. **Create animal selection section in `GroupForm`**:

    - Add section for selecting animals
    - Fetch all animals for organization
    - Display animals using `AnimalCard` components in grid layout
    - Implement selection state management:
        - Track selected animal IDs
        - In edit mode: pre-select animals already in group
        - Sort animals: selected animals first, then unselected (maintain order within each group)
    - Add visual selection indicator: border on selected cards (e.g., `border-2 border-pink-500`)
    - Click handler on cards to toggle selection

2. **Update `useGroupForm` hook**:

    - Add `selectedAnimalIds` state
    - Add `setSelectedAnimalIds` setter
    - Add `toggleAnimalSelection` handler
    - Initialize selected animals from `initialGroup?.animal_ids` in edit mode

3. **Update `EditGroup` page**:

    - Pass animal selection props to `GroupForm`
    - On save: update `animal_groups.animal_ids` array
    - Update animals' `group_id` field when adding/removing from group
    - Handle the case where animals are moved between groups:
        - Remove animal from old group's `animal_ids` array
        - Update `animals.group_id` to point to new group

4. **Update `NewGroup` page**:
    - Refactor to use `GroupForm` component and `useGroupForm` hook
    - Replace existing form with shared component
    - Use same animal selection UI as edit form
    - Use `createGroup` function from `groupQueries.ts` (create if doesn't exist)

**Review Checkpoint:** Animal selection works. Can add/remove animals from groups. Selected animals show border and appear first in edit mode.

---

#### **Stage 3: Group Photo Upload & Display**

**Tasks:**

1. **Create group photo upload functions** (`src/lib/photoUtils.ts`):

    - `uploadGroupPhoto(file, organizationId, groupId)`: Upload photo to `{organization_id}/groups/{group_id}/{timestamp}_{filename}`
    - `deleteGroupPhoto(photoUrl, organizationId)`: Delete photo from storage (extract path from URL, verify it's a group photo path)
    - Photo metadata: `{ url: string, uploaded_at: string, uploaded_by: string }` (same structure as animal photos)

2. **Update `PhotoUpload` component** (if needed):

    - Verify it works with group photos (should work as-is, but may need path verification)

3. **Update `useGroupForm` hook**:

    - Add photo state management (similar to animal form):
        - `selectedPhotos` (File[])
        - `existingPhotos` (PhotoMetadata[])
        - `photosToDelete` (string[])
        - Photo upload/delete handlers

4. **Update `GroupForm` component**:

    - Add `PhotoUpload` component section
    - Pass photo props from hook

5. **Update `EditGroup` page**:

    - Handle photo uploads on save:
        - Upload new photos using `uploadGroupPhoto`
        - Delete removed photos using `deleteGroupPhoto`
        - Update `photos` JSONB array in database with metadata (`uploaded_at`, `uploaded_by`)

6. **Update `GroupDetail` page**:
    - Display group photos using same pattern as animal detail pages
    - Show photos in a gallery/lightbox if photo display component exists

**Review Checkpoint:** Photo upload and deletion work. Photos display correctly in group detail page.

---

#### **Stage 4: Duplicate Group Assignment Validation**

**Tasks:**

1. **Create duplicate detection logic**:

    - When animal is selected, check if it's already in another group
    - Query `animal_groups` to find which group contains the animal (if any)
    - Store conflict information: animal ID, current group ID, current group name
    - Note: Animals can only be in one group, so if animal is in a different group, it must be moved

2. **Create confirmation modal component** (or reuse existing modal pattern):

    - Check if existing modal/dialog component exists in codebase
    - If not, create simple reusable modal component
    - Display message: "Animal [name] is already in group: [group_name](link). Move them to this group?"
    - Make group name a clickable link to that group's detail page
    - Two buttons:
        - "Move to new" - moves animal to new group, removes from old group (updates both `animal_groups.animal_ids` arrays and `animals.group_id`)
        - "Cancel" - cancels selection, animal stays in current group

3. **Update `EditGroup` page**:

    - On animal selection, check for conflicts
    - If conflict detected, show modal
    - Handle modal actions:
        - "Move to new": Add animal to current group, remove from old group (update both groups' `animal_ids` arrays and `animals.group_id`)
        - "Cancel": Don't add animal to current group

4. **Update `NewGroup` page**:
    - Same duplicate detection and modal handling as edit page

**Review Checkpoint:** Duplicate detection works. Modal displays correctly. "Move to new" and "Cancel" actions work as expected.

---

#### **Stage 5: Empty Group Validation & Final Polish**

**Tasks:**

1. **Add empty group validation**:

    - On form submit, check if `selectedAnimalIds.length === 0`
    - Show confirmation modal dialog (blocking, same pattern as duplicate assignment): "This group has no animals. Are you sure you want to save an empty group?"
    - Allow user to confirm or cancel
    - If confirmed, save group with empty `animal_ids` array

2. **Update `GroupDetail` page to display animals using `AnimalCard`**:

    - Replace current simple list with `AnimalCard` grid
    - Use grid layout: `grid gap-1.5 grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`
    - Fetch all necessary animal fields for `AnimalCard` (photos, date_of_birth, sex_spay_neuter_status, etc.)
    - Ensure cards are clickable and navigate to animal detail pages
    - Display group photos at the top of the detail page using same pattern as animal detail pages (reuse photo gallery/lightbox component if available)

3. **Update `GroupCard` component to display photos**:

    - Add photo display to `GroupCard` component:
        - **Priority 1:** Display first photo from `group.group_photos` array if available
        - **Priority 2:** If no group photos, display first photo from animals in the group:
            - Fetch animal data for animals in `group.animal_ids` (may need to pass animal data as prop or fetch within component)
            - Find first animal that has photos in `animal.photos` array
            - Display that animal's first photo
        - **Fallback:** Show placeholder or no image if neither group nor animal photos are available
    - Photo should match `AnimalCard` photo styling and layout (same size, aspect ratio, positioning)
    - Consider performance implications:
        - If fetching animal photos in `GroupCard`, may need to batch fetch for list views
        - Consider passing animal photo data as props from parent components that already fetch animals
        - May need to update `GroupsList`, `Dashboard`, and `FosterDetail` to fetch animal photo data when displaying groups
    - Update `GroupCard` props interface to accept optional photo URL or animal data
    - Ensure photo display is responsive and works on mobile devices

4. **Add delete group functionality**:

    - Add "Delete Group" button to `GroupDetail` page (coordinator-only, similar to edit button)
    - Create `deleteGroup` function in `groupQueries.ts`:
        - Delete group photos from storage (use `deleteGroupPhoto` for each photo in `group_photos` array)
        - Delete the group record from `animal_groups` table
        - **Important:** Do NOT delete animals - only remove the group
    - Update animals' `group_id` field:
        - Set `group_id` to `null` for all animals that were in the deleted group
        - This ensures animals are not orphaned and can be added to other groups later
    - Show confirmation modal before deletion:
        - Message: "Are you sure you want to delete this group? The animals in this group will remain but will no longer be grouped together."
        - Two buttons: "Delete Group" and "Cancel"
        - Make it clear that animals will NOT be deleted
    - After successful deletion:
        - Invalidate relevant queries (groups list, animals list)
        - Navigate to groups list page
        - Show success message
    - Handle errors gracefully:
        - If photo deletion fails, log error but continue with group deletion
        - If animal update fails, show warning but complete group deletion
        - Show user-friendly error messages

5. **Polish existing group pages**:

    - Improve loading states and error handling
    - Add better empty states (no animals, no photos)
    - Improve mobile responsiveness
    - Ensure consistent styling with animal pages

6. **Field completeness review**:

    - Review `animal_groups` schema
    - Ensure all relevant fields are displayed/editable in forms
    - Add any missing fields if needed

7. **Testing & bug fixes**:
    - Test all flows: create, edit, add/remove animals, photo upload/delete
    - Test duplicate assignment scenarios
    - Test empty group validation
    - Test delete group functionality:
        - Animals remain after group deletion
        - Animals' `group_id` is set to `null`
        - Group photos are deleted from storage
        - Navigation works correctly after deletion
    - Fix any bugs or edge cases

**Review Checkpoint:** All features complete. UI is polished. Validation works correctly.

---

**Testing:**

-   Coordinator can edit group name, description, and priority
-   Coordinator can add/remove animals from existing groups
-   Selected animals show border and appear first in edit mode (stable sort preserves order)
-   Duplicate group assignment shows modal with "Move to new" and "Cancel" options and handles correctly
-   Moving animals between groups updates both groups' `animal_ids` arrays and `animals.group_id` correctly
-   Empty group validation works correctly (modal confirmation)
-   Photo upload and deletion work correctly
-   Group photos display correctly in GroupDetail page
-   GroupCard displays photos correctly:
    -   Shows first group photo when available
    -   Falls back to first animal photo when no group photos
    -   Shows appropriate placeholder when no photos available
-   Edit page pre-populates with correct data
-   Changes save correctly to database
-   Delete group functionality works correctly:
    -   Group is deleted from database
    -   Animals remain (not deleted)
    -   Animals' `group_id` is set to `null`
    -   Group photos are deleted from storage
    -   Confirmation modal displays correctly
    -   Navigation works after deletion
-   Navigation works correctly
-   Mobile layout is polished
-   Fosters cannot access edit or delete functionality

**Deliverable:** Complete group management UI with edit functionality, validation, and polish. Shared form components and hooks following the same pattern as animal forms.

---

### Display Groups in Animal UI

**Goal:** Show group information throughout animal UI and allow adding animals to groups during creation/editing.

**Status:** Partially completed - group display is implemented in AnimalCard and AnimalDetail. Group assignment in forms still needs to be implemented.

**Already Completed:**

-   ✅ `AnimalCard.tsx` - Shows group indicator with link to group detail page
-   ✅ `AnimalDetail.tsx` - Shows group membership with link to group detail page
-   ✅ `AnimalsList.tsx` - Fetches and displays group information for animals

**Tasks:**

1. Update `NewAnimal.tsx`:
    - Add field to select/create group when creating animal
    - Link animal to selected group on creation
    - Update `group_id` field when group is selected
2. Update `EditAnimal.tsx`:
    - Add field to change group membership
    - Allow adding animal to existing group or removing from group
    - Update `group_id` field when group membership changes
3. Test: Groups display correctly throughout UI, animals can be added to groups during creation

**Testing:**

-   Animal detail shows group membership (✅ already working)
-   Animals list shows group indicators (✅ already working)
-   Can create animal and assign to group in one step
-   Can change group membership when editing animal
-   Group indicators display correctly in animals list (✅ already working)

**Deliverable:** Group display and assignment working throughout animal UI.

---

### Copy Data from Animal Feature

**Goal:** Allow coordinators to copy data from an existing animal when creating a new animal, pre-filling the form with most fields (excluding name, bio, and photos).

**Dependencies:**

-   **Reusable Search & Filter Component** - Needed for animal search/select UI
-   **Update Animal Preview Card & Detail Page** - Needed for animal list/preview cards
-   **Display Groups in Animal UI** - Needed for group support in search
-   **Animal Editing for Coordinators** - Provides `animalToFormState` utility and `useAnimalForm` hook

**Tasks:**

1. **Add "Copy from Animal" button/selector to NewAnimal form**:

    - Add a button or dropdown near the top of the form: "Copy data from existing animal"
    - When clicked, show a modal or dropdown to search/select an animal
    - Use the Reusable Search & Filter Component for animal selection (from Reusable Search & Filter Component milestone)
    - Filter by organization (only show animals from same organization)

2. **Copy logic**:

    - Use the `animalToFormState` utility function (created in Animal Editing for Coordinators milestone)
    - When animal is selected, use: `animalToFormState(animal, { exclude: ['name', 'bio', 'photos'] })`
    - This will copy the following fields to form:
        - Status (but allow editing)
        - Display Placement Request
        - Sex/SpayNeuter Status
        - Life Stage
        - Physical Characteristics
        - Date of Birth
        - Age (calculated from Date of Birth on-demand)
        - Priority
        - Medical Needs
        - Behavioral Needs
        - Additional Notes
    - **Do NOT copy**: Name (must be unique, user should enter new name)
    - **Do NOT copy**: Bio (bio is specific to each animal)
    - **Do NOT copy**: Photos (photos are specific to each animal)
    - **Do NOT copy**: Tags (if implemented later)
    - Pre-fill form fields with copied values using `useAnimalForm` hook
    - All fields remain editable after copying

3. **User experience**:

    - After selecting animal, form fields populate automatically
    - Show a brief success message or visual indicator that data was copied
    - User can edit any copied field before submitting
    - If user navigates away and comes back, copied data is lost (form resets)

4. **Implementation notes**:

    - Use React Query to fetch selected animal data
    - Handle loading state while fetching animal data
    - Handle error state if animal fetch fails
    - Ensure copied data respects organization boundaries
    - Reuse `animalToFormState` utility and `useAnimalForm` hook for consistency

**Testing:**

-   Can search and select an animal to copy from (using search/filter component)
-   All appropriate fields are copied to form
-   Name field is NOT copied (remains empty)
-   Bio field is NOT copied (remains empty)
-   Photos are NOT copied (photo upload section remains empty)
-   Copied fields are editable
-   Can submit form with copied data
-   Only shows animals from same organization
-   Works on mobile devices

**Deliverable:** Copy data from animal feature working, allowing quick creation of similar animals.

---

### Foster Assignment for Animals and Groups

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

## Phase: Fosters Needed Page

**Goal:** Create a page where fosters can browse animals and groups needing placement and request them through messaging.

---

### Fosters Needed Page

**Goal:** Display animals and groups that need foster placement, allowing fosters to browse and request them.

**Component Reusability:**

-   Reuse AnimalCard and GroupCard components from View Animals and View Groups pages
-   Share search and filter components across all list pages
-   Both fosters and coordinators can view this page (same components, different permissions)
-   Design for consistency with View Animals and View Groups pages

**Tasks:**

1. **Create Fosters Needed page** (`src/pages/fosters/FostersNeeded.tsx`):

    - Fetch animals and groups filtered by:
        - `display_placement_request = true` (boolean field controls visibility on placement page)
        - Status determines availability category:
            - **Available Now**: `status = 'in_shelter'`
            - **Available Future**: `status IN ('transferring', 'medical_hold')`
            - **Foster Pending**: Animals/groups where a foster has made a request (tracked via messages with tags)
    - Display animals and groups in a browseable list/grid format
    - Show key information: name, photos, priority indicator, basic needs, availability category
    - Group or filter by availability category (Available Now, Available Future, Foster Pending)
    - Use search/filter components from Reusable Search & Filter Component to allow filtering by:
        - Species
        - Priority (high priority animals/groups)
        - Group vs individual animals
        - Availability category (Available Now, Available Future, Foster Pending)
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
        - Auto-tag the animal/group in the message (using tagging from Update Database Schema for Foster Tagging and related milestones)
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

-   **Messaging Integration:** Requests go through the existing messaging system (Messaging System phase), ensuring all coordinators can see requests
-   **Auto-tagging:** Uses message tagging feature (Update Database Schema for Foster Tagging and related milestones) to link requests to specific animals/groups
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

### Reusable Search & Filter Component

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

### Coordinator Request Handling & Assignment

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
        - Update animal/group status (e.g., change from `in_shelter` to `in_foster`)
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

### Foster Photo & Bio Editing

**Goal:** Allow fosters to edit photos and bio for animals assigned to them. This is the ONLY field that fosters can edit on animals.

**Note:** This is a dedicated milestone because photos and bio are the only fields fosters can edit. This provides a clear, focused editing experience for fosters without giving them access to other animal data. Requires photo upload functionality and editing infrastructure to exist.

**Design Decisions Needed: Foster Photo UI/UX and Storage**

**Problem:** Fosters should only have permission to add/remove their own photos. This raises several UI/UX and storage design questions that need to be decided before implementation.

**Decision 1: How should foster photos be displayed in the UI?**

**Option 1A: Unified gallery with visual indicators**

-   All photos (coordinator + foster) displayed together in one gallery
-   Visual indicators show photo source:
    -   Badge/label showing "Uploaded by [Name]" or "Coordinator" vs "Foster"
    -   Different border color or icon for foster photos
    -   Timestamp visible for each photo
-   **UI Behavior:**
    -   Fosters see all photos but can only delete their own (delete button only on their photos)
    -   Coordinators see all photos and can delete any
    -   Photos sorted chronologically (newest first or oldest first)
-   **Pros:**
    -   Simple, unified view - all photos in one place
    -   Foster photos can be used for animal previews/thumbnails
    -   Easy to see photo history chronologically
    -   Clear visual distinction shows who uploaded what
-   **Cons:**
    -   Fosters see coordinator photos they can't interact with (might be confusing)
    -   No way to filter by source (coordinator vs foster)
    -   Mixed purposes (adoption photos + foster updates) in same view

**Option 1B: Separate sections/tabs**

-   Two distinct sections: "Coordinator Photos" and "Foster Photos"
-   Or tabs: "All Photos" | "Coordinator Photos" | "Foster Photos"
-   **UI Behavior:**
    -   Fosters only see "Foster Photos" section (can add/delete their own)
    -   Coordinators see both sections (can manage both)
    -   Each section has its own upload/delete controls
-   **Pros:**
    -   Clear separation of photo types
    -   Fosters only see what they can interact with
    -   Coordinators can easily filter/review foster photos separately
    -   Less confusion about permissions
-   **Cons:**
    -   More complex UI (multiple sections to manage)
    -   Foster photos might not be easily used for animal previews
    -   Requires separate upload components or filtering logic

**Option 1C: "Animal Photos" vs "Adoption Photos" sections**

-   Two distinct sections with different purposes:
    -   **"Animal Photos"** - Official animal documentation photos (coordinator-only editing)
    -   **"Adoption Photos"** - Photos for adoption listings (both fosters and coordinators can edit)
-   **UI Behavior:**
    -   "Animal Photos" section: Only coordinators can add/delete (used for previews, documentation)
    -   "Adoption Photos" section: Both fosters and coordinators can add/delete (used for adoption listings)
    -   Fosters see both sections but can only edit "Adoption Photos"
    -   Coordinators can manage both sections
-   **Pros:**
    -   Clear purpose separation (documentation vs adoption marketing)
    -   Fosters can contribute to adoption photos without affecting official animal photos
    -   Animal photos remain coordinator-controlled for consistency
    -   Adoption photos can be curated separately
-   **Cons:**
    -   Foster photos are NOT used for animal previews/thumbnails (only "Animal Photos" section)
    -   Foster photos don't benefit from preview/thumbnail behavior
    -   More complex UI with two distinct sections
    -   May be confusing which section to use for what purpose
    -   Requires separate storage or clear tagging to distinguish sections

**Decision 2: Should foster photos require coordinator approval?**

**Option 2A: Immediate visibility (no approval)**

-   Foster photos appear immediately after upload
-   **UI Behavior:**
    -   Photo shows up in gallery right away
    -   Can be used for previews immediately
-   **Pros:**
    -   Faster workflow - fosters see their photos immediately
    -   Simpler implementation
-   **Cons:**
    -   No quality control - undesirable photos visible immediately
    -   Coordinators can't review before photos are public

**Option 2B: Approval required (coordinator review)**

-   Foster photos marked as "pending" until coordinator approves
-   **UI Behavior:**
    -   Fosters see their photos in "Pending" section
    -   Coordinators see pending photos in review queue
    -   Approved photos move to main gallery
-   **Pros:**
    -   Quality control - coordinators can review before photos are visible
    -   Prevents inappropriate photos from being displayed
-   **Cons:**
    -   More complex workflow
    -   Delayed visibility for fosters
    -   Requires approval UI for coordinators

**Decision 3: Storage structure (affects UI implementation)**

**Option 3A: Same `photos` array (unified storage)**

-   All photos in single JSONB array: `photos: PhotoMetadata[]`
-   Use `uploaded_by` field to distinguish coordinator vs foster photos
-   **UI Impact:**
    -   Filter by `uploaded_by` to show coordinator vs foster photos
    -   Single gallery component with filtering
    -   Can easily show all photos together or filtered
-   **Pros:**
    -   Simpler database schema
    -   Flexible UI - can show unified or filtered views
    -   Easy to use foster photos for previews
-   **Cons:**
    -   Requires filtering logic in UI
    -   All photos mixed in one array

**Option 3B: Separate `foster_photos` array**

-   Two arrays: `photos: PhotoMetadata[]` (coordinator) and `foster_photos: PhotoMetadata[]` (foster)
-   **UI Impact:**
    -   Two separate gallery components or sections
    -   Clear separation in UI matches data structure
    -   Easier to implement approval workflow (separate pending array)
-   **Pros:**
    -   Clear data separation
    -   Easier to implement approval workflow
    -   Fosters only interact with their section
-   **Cons:**
    -   More complex schema
    -   Harder to show unified chronological view
    -   May need separate components

**Recommended Approach (to be confirmed with organization):**

1. **UI Display:** Option 1A (unified gallery with visual indicators) - simpler, all photos visible, clear who uploaded what
2. **Approval:** Option 2A (immediate visibility) - faster workflow, coordinators can delete if needed
3. **Storage:** Option 3A (same array) - simpler, flexible, can filter in UI if needed

**Alternative Approaches:**

**If approval needed:**

1. **UI Display:** Option 1B (separate sections) - clearer separation
2. **Approval:** Option 2B (approval required) - quality control
3. **Storage:** Option 3B (separate arrays) - matches UI separation, easier approval workflow

**If purpose-based separation needed (documentation vs adoption):**

1. **UI Display:** Option 1C ("Animal Photos" vs "Adoption Photos") - clear purpose separation
2. **Approval:** Option 2A (immediate visibility) or 2B (approval) - depends on organization preference
3. **Storage:** Option 3B (separate arrays) - `photos` for Animal Photos, `adoption_photos` for Adoption Photos
4. **Note:** This approach means foster photos won't be used for animal previews/thumbnails (only Animal Photos section)

**Decision Required:** Organization needs to decide:

-   Do foster photos need coordinator approval before being visible?
-   Should fosters see coordinator photos (even if read-only)?
-   Should photos be displayed together, in separate sections by uploader, or by purpose (Animal Photos vs Adoption Photos)?
-   How important is using foster photos for animal previews/thumbnails? (If important, unified gallery or separate by uploader works; if not, purpose-based separation is viable)
-   What is the primary purpose of foster-uploaded photos? (Adoption listings, updates, or general documentation?)

**Note:** These decisions affect UI components, data structure, and user workflows. Should be made before starting the Foster Photo & Bio Editing milestone.

**Tasks:**

1. **Create foster editing interface** (`src/pages/animals/FosterEditAnimal.tsx` or similar):

    - Fetch animal by ID from URL params
    - Verify animal is assigned to current foster (`current_foster_id` matches user's profile ID)
    - If not assigned, show error message and redirect
    - Display animal name and basic info (read-only)
    - Show editable sections: Photos and Bio only

2. **Photo editing for fosters**:

    - Display existing photos in gallery (read-only view with metadata)
    - Allow uploading new photos:
        - Use existing `PhotoUpload` component
        - Upload to Supabase Storage: `{organization_id}/animals/{animal_id}/{timestamp}_{filename}`
        - Add photo metadata to `photos` JSONB array: `{"url": "...", "uploaded_by": "..."}`
        - Include `uploaded_by` as foster's profile ID (for permission checks)
    - Allow deleting only their own photos:
        - Check if `uploaded_by` matches current user's profile ID
        - Only show delete button on photos uploaded by current foster
        - Remove photo from `photos` array (optionally delete from storage)
        - Coordinators can delete any photo (handled in coordinator edit form)

3. **Bio editing for fosters**:

    - Display current bio in textarea (editable)
    - Allow editing bio text
    - Save bio to `bio` column in database
    - Show character count or length indicator (optional)

4. **Permission checks**:

    - Verify animal is assigned to foster before allowing edit
    - Check `current_foster_id` matches user's profile ID
    - Only allow editing photos and bio (all other fields read-only)
    - Show clear indication that this is a limited editing view

5. **UI/UX considerations**:

    - Make it clear this is a "foster editing" view (different from coordinator edit)
    - Show animal name and key info at top (read-only)
    - Clearly separate editable sections (Photos, Bio)
    - Show success message after save
    - Handle errors gracefully

6. **Create route** `/animals/:id/foster-edit` (foster-only, requires assignment)

7. **Add "Edit Photos & Bio" button** to AnimalDetail page:

    - Only visible to fosters
    - Only visible if animal is assigned to current foster
    - Button text: "Edit Photos & Bio" or similar

8. **Update RLS policies** if needed:
    - Fosters can update `photos` and `bio` columns for assigned animals
    - Fosters cannot update other fields

**Testing:**

-   Foster can access edit page for assigned animals
-   Foster cannot access edit page for unassigned animals
-   Can upload new photos (photos appear in gallery)
-   Can delete own photos (cannot delete others' photos)
-   Can edit bio text
-   Changes save to database correctly
-   Photo metadata includes correct `uploaded_by` value
-   Coordinator cannot access foster edit page (uses coordinator edit instead)
-   All other fields are read-only
-   Works on mobile devices

**Deliverable:** Foster photo and bio editing working with proper permission controls.

**Note:** This is the only editing capability fosters have for animals. All other fields are managed by coordinators.

---

## Planning Phase: Organization Record-Keeping Requirements

**Goal:** Meet with rescue organization to plan additional pages and record-keeping needs.

**Note:** Before proceeding to Timestamp Display & History phase, schedule a planning meeting with the rescue organization to discuss:

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

## Phase: Timestamp Display & History

**Goal:** Display timestamps on messages and data edits to show when information changed.

---

### Timestamp Display & History

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

## Phase: Confirmation Codes (For Both Coordinators & Fosters)

**Goal:** Enable coordinators to generate confirmation codes for both coordinators and fosters in their organization, controlling platform access. Codes are linked to email addresses and organizations, and determine user role. This replaces open signup and eliminates the need for separate signup pages or organization creation flows.

---

### Confirmation Codes Schema

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

### Coordinator Code Generation UI

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

### Update Signup to Use Confirmation Codes

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
    - Auto-login user (as in Auto-Login After Signup)
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

### Code Management & Sharing

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

## Phase: UX Polish & Navigation

**Goal:** Improve user experience with polished design, better navigation, and refined interactions based on Figma designs.

---

### Navigation Structure

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

### Figma Design Implementation

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

### Loading States & Empty States

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

### Error Handling Improvements

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

### Quick Actions & Shortcuts

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

## Phase: Landing Page & Marketing Site

**Goal:** Create a professional, impressive landing page to attract rescue organizations, showcase the app, and provide information for portfolio visitors.

---

### Landing Page Structure & Navigation

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

### App Description & Partner Showcase

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

### App Demo & Advertising

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

### Contact & Personal Story

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

### Donation Section

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

### Landing Page Polish & Figma Design

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

## Phase: Expo Wrapping (For Reliable iOS Notifications)

**Goal:** Wrap PWA in Expo to enable App Store distribution and reliable iOS push notifications via APNs.

---

### Initialize Expo Project

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

### Expo Push Notifications

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

### Build & Publish

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
-   **Deployment:** See Deployment phase for dedicated deployment milestone. Recommended after PWA Setup phase is complete, so you can test PWA installation on real devices.
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

### Automatic Photo Cleanup on Record Deletion

**Goal:** Automatically delete photos from storage when animals or messages are deleted, regardless of how the deletion happens (app, SQL, table editor).

**Problem:** Currently, deleting records from the database doesn't remove associated photos from Supabase Storage, creating orphaned files that waste storage space and could pose privacy/security concerns.

**Solution:** Database triggers + Edge Function approach

-   Create PostgreSQL triggers that fire on DELETE for `animals` and `messages` tables
-   Triggers call Supabase Edge Function via `pg_net` extension
-   Edge Function deletes photos from storage using the deleted record's ID and organization_id
-   Works for all deletion methods (app code, SQL queries, Supabase table editor)

**Implementation Tasks:**

1. **Create Supabase Edge Function:**

    - Location: `supabase/functions/cleanup-photos/index.ts`
    - Accepts: `{ animalId?, organizationId, conversationId? }`
    - Lists files in storage path: `{organizationId}/animals/{animalId}/` or `{organizationId}/messages/{conversationId}/`
    - Deletes all files in that path
    - Returns success/error status

2. **Enable pg_net extension:**

    - Add to migration: `CREATE EXTENSION IF NOT EXISTS pg_net;`
    - Allows PostgreSQL to make HTTP calls to Edge Functions

3. **Create trigger functions:**

    - `cleanup_animal_photos_on_delete()` - fires after animal deletion
    - `cleanup_message_photos_on_delete()` - fires after message deletion (or conversation deletion)
    - Functions extract `OLD.id` and `OLD.organization_id` from deleted row
    - Call Edge Function asynchronously via `net.http_post()`

4. **Create triggers:**

    - `cleanup_animal_photos` trigger on `animals` table (AFTER DELETE)
    - `cleanup_message_photos` trigger on `messages` table (AFTER DELETE)
    - Optionally: trigger on `conversations` table to clean up all message photos when conversation is deleted

5. **Error handling:**
    - Edge Function failures shouldn't block record deletion
    - Log errors for monitoring
    - Consider retry logic for transient failures

**Current Workaround:**

-   Manual deletion: Delete photos from Supabase Storage dashboard when deleting records via table editor
-   Application-level cleanup: Delete photos in app code before deleting records (covers most use cases but not direct database deletions)

**When to implement:** When storage management becomes important (around same time as Photo Retention Policy), or when manual cleanup becomes too burdensome. This is a "nice to have" that prevents orphaned files but isn't critical for MVP.

**Note:** Application-level cleanup (deleting photos before deleting records in app code) covers most use cases, but doesn't work for direct database deletions via SQL or table editor. This automatic approach ensures cleanup happens regardless of deletion method.

---
