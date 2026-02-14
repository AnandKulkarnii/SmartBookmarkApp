# Smart Bookmarks 🔖

A modern, real-time bookmark manager built with Next.js, Supabase, and Google OAuth. Save, organize, and sync your favorite links across all your devices.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-green?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwind-css)

## ✨ Features

- 🔐 **Google OAuth Authentication** - Secure sign-in with your Google account
- 📱 **Real-time Sync** - Changes appear instantly across all open tabs and devices
- 🔒 **Private & Secure** - Your bookmarks are private with Row Level Security
- ⚡ **Fast & Responsive** - Built with Next.js 14 App Router for optimal performance
- 🌐 **Easy Deployment** - Deployed to Vercel

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works great)
- A Google Cloud account for OAuth setup

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd smart-bookmark-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Supabase**

   Follow the detailed guide in [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) to:
   - Create a Supabase project
   - Configure Google OAuth
   - Set up the database schema
   - Enable real-time features

4. **Configure environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

5. **Run the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## 📦 Project Structure

```
smart-bookmark-app/
├── app/
│   ├── auth/
│   │   ├── callback/          # OAuth callback handler
│   │   └── auth-code-error/   # Error page
│   ├── bookmarks/             # Main bookmark manager page
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Landing page with sign-in
│   └── globals.css            # Global styles
├── components/
│   └── BookmarkList.tsx       # Bookmark list with real-time updates
├── lib/
│   └── supabase/
│       ├── client.ts          # Browser Supabase client
│       ├── server.ts          # Server Supabase client
│       └── middleware.ts      # Auth middleware helper
├── middleware.ts              # Next.js middleware
└── supabase-schema.sql        # Database schema
```

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Authentication**: [Supabase Auth](https://supabase.com/auth) with Google OAuth
- **Database**: [Supabase PostgreSQL](https://supabase.com/database)
- **Real-time**: [Supabase Realtime](https://supabase.com/realtime)
- **Deployment**: [Vercel](https://vercel.com/)

## 🎯 Key Features Explained

### Real-time Synchronization

The app uses Supabase Realtime to listen for database changes. When you add or delete a bookmark in one tab, it instantly appears/disappears in all other open tabs without requiring a page refresh.

```typescript
// Real-time subscription in BookmarkList.tsx
const channel = supabase
  .channel('bookmarks-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'bookmarks',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    // Handle INSERT, UPDATE, DELETE events
  })
  .subscribe()
```

### Row Level Security (RLS)

Supabase RLS ensures users can only access their own bookmarks. The policies are defined in `supabase-schema.sql`:

- Users can only SELECT their own bookmarks
- Users can only INSERT bookmarks with their own user_id
- Users can only DELETE their own bookmarks

### Server-Side Authentication

The app uses Next.js middleware to refresh auth sessions on every request, ensuring users stay logged in and protecting routes from unauthorized access.

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |
| `NEXT_PUBLIC_SITE_URL` | Your site URL (for OAuth redirects) | Yes (production) |

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [Supabase](https://supabase.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Deployed on [Vercel](https://vercel.com/)

# Problems & Solutions 🛠️

This document chronicles all the challenges encountered during the development of the Smart Bookmark App and how they were resolved. This serves as a reference for debugging similar issues and understanding the development journey.

---

## Table of Contents

1. [Database & Supabase Issues](#database--supabase-issues)
2. [Authentication Problems](#authentication-problems)
3. [Real-time Synchronization Issues](#real-time-synchronization-issues)
4. [Environment Configuration](#environment-configuration)
5. [Deployment Challenges](#deployment-challenges)

---

## Database & Supabase Issues

### Problem 1: "Insert error: {}" When Adding Bookmarks

**Symptom:**

- Users could sign in successfully
- Adding bookmarks failed with generic error: `Insert error: {}`
- No detailed error information in the console

**Root Cause:**
Row Level Security (RLS) policies were not properly configured or missing entirely. Supabase was blocking INSERT operations because:

1. RLS was enabled on the `bookmarks` table
2. No policy existed to allow authenticated users to insert their own bookmarks
3. The database permissions weren't granted to the `authenticated` role

**Solution:**
Created comprehensive RLS policies in `supabase-schema.sql`:

```sql
-- Enable Row Level Security
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only insert their own bookmarks
CREATE POLICY "Users can insert their own bookmarks"
    ON public.bookmarks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;
```

**Key Learnings:**

- Always verify RLS policies match your application's security requirements
- Test database operations immediately after schema creation
- Use Supabase SQL Editor to test queries directly before implementing in code
- Check both RLS policies AND table-level permissions (GRANT statements)

---

### Problem 2: Invalid Supabase URL Error on Startup

**Symptom:**

```
Error: Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.
```

**Root Cause:**
The `.env.local` file contained placeholder values instead of actual Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

**Solution:**

1. Created a Supabase project at <https://supabase.com>
2. Retrieved actual credentials from Project Settings → API
3. Updated `.env.local` with real values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...actual-key-here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Restarted the development server

**Key Learnings:**

- Environment variables must be set before the app can run
- Always restart the dev server after changing `.env.local`
- Create comprehensive setup documentation (resulted in `QUICKSTART.md`)

---

## Authentication Problems

### Problem 3: OAuth Redirect URI Mismatch

**Symptom:**

- Clicking "Sign in with Google" redirected to Google
- After authentication, received error: `redirect_uri_mismatch`
- Users couldn't complete the sign-in flow

**Root Cause:**
The authorized redirect URIs in Google Cloud Console didn't match the actual callback URL that Supabase uses. Common mistakes:

- Using the Next.js callback URL instead of Supabase's callback URL
- Forgetting to add both development and production URLs
- Typos in the project reference ID

**Solution:**

1. In Google Cloud Console → Credentials → OAuth 2.0 Client ID
2. Added the correct redirect URIs:

```
https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
http://localhost:3000/auth/callback
```

3. Ensured the project reference matched the Supabase project URL exactly

**Key Learnings:**

- OAuth redirect URIs must match EXACTLY (including trailing slashes)
- Supabase handles the OAuth flow, so use Supabase's callback URL
- Add both local and production URLs during development
- Document the OAuth setup process thoroughly (resulted in detailed `SUPABASE_SETUP.md`)

---

### Problem 4: Session Not Persisting Across Page Refreshes

**Symptom:**

- Users could sign in successfully
- After refreshing the page, users were logged out
- Session cookies weren't being maintained

**Root Cause:**
Missing middleware to refresh the Supabase session on each request. Without this, the auth token would expire and not be renewed.

**Solution:**
Created `middleware.ts` to handle session refresh:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  await supabase.auth.getUser()
  return response
}
```

**Key Learnings:**

- Next.js middleware is essential for maintaining auth sessions
- Use `@supabase/ssr` package for proper server-side auth handling
- Test session persistence by refreshing pages and opening new tabs

---

## Real-time Synchronization Issues

### Problem 5: DELETE Events Not Broadcasting in Real-time

**Symptom:**

- Adding bookmarks synced across tabs instantly ✅
- Deleting bookmarks only updated the current tab ❌
- Other tabs didn't receive DELETE events

**Root Cause:**
The Supabase Realtime publication wasn't configured to broadcast DELETE events. By default, some Supabase projects only publish INSERT and UPDATE events.

**Solution:**
Created `fix-realtime-delete.sql` to reconfigure the publication:

```sql
-- Drop and recreate the publication with all events
DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;

CREATE PUBLICATION supabase_realtime FOR TABLE bookmarks 
WITH (publish = 'insert,update,delete');
```

Also added to the main schema file:

```sql
-- Add bookmarks table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookmarks;

-- Verify the publication is set up correctly
SELECT schemaname, tablename, pubinsert, pubupdate, pubdelete 
FROM pg_publication_tables 
WHERE tablename = 'bookmarks';
```

**Key Learnings:**

- Always verify which events are published in Supabase Realtime
- Test all CRUD operations (Create, Read, Update, Delete) for real-time sync
- Use SQL queries to verify publication settings
- Document fixes for future reference

---

### Problem 6: Real-time Subscription Not Filtering by User

**Symptom:**

- Users could see other users' bookmarks being added/deleted in real-time
- Privacy violation - users shouldn't see each other's data

**Root Cause:**
The real-time subscription wasn't filtering events by `user_id`, so all bookmark changes were broadcast to all connected clients.

**Solution:**
Added user-specific filtering to the real-time subscription:

```typescript
const channel = supabase
  .channel('bookmarks-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'bookmarks',
    filter: `user_id=eq.${userId}`,  // ← Critical filter
  }, (payload) => {
    // Handle events
  })
  .subscribe()
```

**Key Learnings:**

- Always filter real-time subscriptions by user ID for multi-tenant apps
- Test with multiple user accounts to verify data isolation
- RLS policies protect the database, but client-side filtering improves UX

---

## Environment Configuration

### Problem 7: Environment Variables Not Working in Production

**Symptom:**

- App worked perfectly in development
- After deploying to Vercel, OAuth failed
- Console showed `undefined` for environment variables

**Root Cause:**
Environment variables weren't configured in Vercel's deployment settings. Vercel doesn't automatically copy `.env.local` from your repository.

**Solution:**

1. In Vercel Dashboard → Project Settings → Environment Variables
2. Added all required variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (set to production URL)
3. Redeployed the application

**Key Learnings:**

- Environment variables must be set separately for each deployment platform
- Use `NEXT_PUBLIC_` prefix for client-side accessible variables
- Always redeploy after changing environment variables
- Document deployment configuration (resulted in `DEPLOYMENT.md`)

---

### Problem 8: OAuth Redirect Failing in Production

**Symptom:**

- OAuth worked in development
- In production, got redirect URI mismatch error
- Users couldn't sign in on the deployed site

**Root Cause:**
Google Cloud Console only had the localhost redirect URI, not the production Vercel URL.

**Solution:**

1. Deployed the app to get the Vercel URL (e.g., `https://your-app.vercel.app`)
2. Updated Google Cloud Console → Credentials → OAuth 2.0 Client ID
3. Added production redirect URI:

```
https://your-app.vercel.app/auth/callback
```

4. Updated `NEXT_PUBLIC_SITE_URL` in Vercel to match
2. Redeployed

**Key Learnings:**

- OAuth redirect URIs must be updated for each environment
- Deploy first, then update OAuth settings with the actual URL
- Keep development and production redirect URIs both active
- Test the entire OAuth flow in production after deployment

---

## Deployment Challenges

### Problem 9: Build Failing with TypeScript Errors

**Symptom:**

```
Type error: Property 'user' does not exist on type 'AuthResponse'
```

**Root Cause:**
Using incorrect types from the Supabase SDK. The API had changed between versions.

**Solution:**
Updated to use the correct Supabase SSR package and types:

```typescript
// Before (incorrect)
const { data: { user } } = await supabase.auth.getUser()

// After (correct)
const { data: { user }, error } = await supabase.auth.getUser()
```

Ensured package versions were compatible:

```json
{
  "@supabase/ssr": "^0.8.0",
  "@supabase/supabase-js": "^2.95.3"
}
```

**Key Learnings:**

- Always check the official documentation for the package version you're using
- TypeScript errors in production builds are stricter than in development
- Keep Supabase packages in sync (`@supabase/ssr` and `@supabase/supabase-js`)

---

### Problem 10: Realtime Not Enabled in Supabase

**Symptom:**

- Real-time code was correct
- No errors in console
- Changes didn't sync across tabs

**Root Cause:**
Realtime wasn't enabled for the `bookmarks` table in Supabase dashboard. This is a separate setting from the publication configuration.

**Solution:**

1. In Supabase Dashboard → Database → Replication
2. Found the `bookmarks` table
3. Toggled **Realtime** to ON
4. Clicked Save

**Key Learnings:**

- Realtime requires BOTH database publication AND dashboard toggle
- Always verify Realtime is enabled in the Supabase UI
- Test real-time features with multiple browser tabs
- Document this step clearly in setup guides

---
