# Cold Call Pro - Roofing Edition

A production-grade cold calling web application built with Next.js 14, PocketBase, and shadcn/ui.

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript**
- **Tailwind CSS** + shadcn/ui components
- **PocketBase** (backend database)
- **Google Places API** (lead verification)

## Features

### Authentication
- Simple username-only login (no passwords, no OAuth)
- Auto-creates new users on first login
- Session persisted in localStorage

### CSV Upload & Import
- Drag-and-drop CSV file upload
- Auto-detect column mappings
- Preview first 5 rows before import
- Duplicate detection (business_name + phone)
- Batch import with progress tracking

### Dialer Interface
- One prospect card at a time
- Large tappable "Call" button with tel: link
- Real-time call tracking (increments call_count, sets last_called)
- 6 outcome buttons with color coding:
  - ✅ Answered
  - 📱 Voicemail
  - ❌ No Answer
  - 🚫 Not Interested
  - 📅 Callback (with date/time picker)
  - 🛡️ Gatekeeper
- Notes field with auto-save
- All changes sync to PocketBase in real-time

### Lead Verification System (Gold Mine Scoring)
- Click "Verify Lead" to run Google Places lookup
- Scoring algorithm (0-100 points):
  - Has Google listing: +20 pts
  - Review count < 15: +20 pts
  - Rating 3.0-4.2: +20 pts
  - No website: +20 pts
  - Roofing business type: +10 pts
  - Operational status: +10 pts
- Score tiers:
  - 🔥 80-100: Gold Mine
  - ✅ 50-79: Solid Lead
  - 🌤 20-49: Lukewarm
  - ❌ 0-19: Skip
- Verification runs once per lead, then disabled

### Script Panel
- Collapsible Sheet component (desktop) / bottom sheet (mobile)
- 3 script branches:
  - Gatekeeper (get past receptionist)
  - Decision Maker (pitch to owner)
  - Voicemail (leave effective message)
- Dynamic injection of business_name, city, contact_name
- Roofing-specific scripts with modern website offer

### Pipeline Tracking
- Session stats bar: calls, answer rate, callbacks, not interested
- Color-coded lead list in sidebar:
  - Gray: not_called
  - Green: answered
  - Yellow: callback
  - Orange: voicemail
  - Red: not_interested
  - 🔥 badge for Gold Mine leads
- Filter tabs: All, Not Called, Callbacks, Answered
- Sessions saved to PocketBase

### Export
- Export All: full CSV with all fields + outcomes + scores
- Export Callbacks: only callback-status leads
- Export Gold Mines: only verification_score >= 80

## Setup Instructions

### 1. Install Dependencies

```bash
cd "/Users/mac/Downloads/new project"
npm install
```

### 2. Configure Environment Variables

Edit `.env.local`:

```
NEXT_PUBLIC_POCKETBASE_URL=https://your-render-url.onrender.com
GOOGLE_PLACES_API_KEY=your_google_places_api_key
```

### 3. Setup PocketBase

1. Deploy PocketBase to Render/Railway/VPS
2. Create collections with these exact fields:

**Collection: users**
- username (text, required, unique)
- created_at (autodate)

**Collection: leads**
- username (text, required)
- business_name (text)
- contact_name (text)
- phone (text)
- city (text)
- state (text)
- niche (text)
- website (text)
- notes (text)
- status (text, default: "not_called")
- callback_datetime (text)
- call_count (number, default: 0)
- last_called (text)
- verified (bool, default: false)
- verification_data (json)
- verification_score (number, default: 0)
- imported_at (autodate)

**Collection: sessions**
- username (text, required)
- date (text) - YYYY-MM-DD format for easy filtering
- start_time (text) - ISO timestamp when session started
- end_time (text, optional) - ISO timestamp when session ended
- total_paused_time_ms (number, default: 0) - Total time paused in milliseconds
- status (text, default: "completed") - "active" | "paused" | "completed"
- calls_made (number, default: 0) - Total number of calls made
- answered (number, default: 0) - Count of answered calls
- voicemails (number, default: 0) - Count of voicemails left
- no_answers (number, default: 0) - Count of no answers
- not_interested (number, default: 0) - Count of not interested responses
- callbacks (number, default: 0) - Count of scheduled callbacks
- gatekeepers (number, default: 0) - Count of gatekeeper encounters
- calls (json, optional) - Full array of call details stored as JSON

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

### 5. Build for Production

```bash
npm run build
```

## Folder Structure

```
/app
  /login              → Username entry page
  /dashboard          → Main dialer interface
  /upload             → CSV import with mapping
  /api/verify         → Google Places verification API
  layout.tsx          → Root layout
  page.tsx            → Redirect to /login
  globals.css         → Tailwind + CSS variables

/components
  LeadCard.tsx        → Prospect card with dialer
  ScriptPanel.tsx     → Collapsible script panel
  Sidebar.tsx         → Lead list with filters
  VerifyButton.tsx    → Lead verification trigger
  SessionStats.tsx    → Live stats bar
  /ui                 → shadcn/ui components

/lib
  pocketbase.ts       → PB client + types
  scoring.ts          → Gold mine scoring logic
  csvParser.ts        → CSV parsing + export
  utils.ts            → Tailwind CN utility

Config Files
  package.json
  tsconfig.json
  tailwind.config.ts
  next.config.js
  .env.local
  next-env.d.ts
```

## Mobile Usage

The app is fully mobile-responsive:
- Sidebar becomes bottom filter bar on mobile
- Script panel opens as bottom sheet
- Large tappable buttons for calling
- Works while holding phone to ear

## Notes

- All state is in PocketBase - no local backend needed
- Google Places API has a free tier (up to 10,000 requests/day)
- Each lead verification counts as 2 API calls (search + details)
- Username filters all queries - users only see their own data
