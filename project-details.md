# CallFlow - Cold Calling CRM

## Overview

**CallFlow** (also referenced as "Cold Call Pro") is a production-grade cold calling Customer Relationship Management (CRM) web application built for sales teams and agencies who need to manage outbound phone sales campaigns. The application is specifically optimized for local service businesses (roofing, HVAC, plumbing, etc.) but can handle any type of lead.

The core value proposition is a streamlined workflow that enables sales reps to:
1. Discover leads automatically via Google Places API
2. Verify and score leads using intelligent scoring algorithms
3. Make calls with integrated dialer functionality
4. Track call outcomes and session performance
5. Follow structured sales scripts embedded in the application

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend Framework** | Next.js 14 with App Router |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui components |
| **Backend/Database** | PocketBase |
| **External APIs** | Google Places API, Twilio Voice SDK |
| **State Management** | React Hooks + Zustand + localStorage |
| **Notifications** | Sonner (toast notifications) |
| **Icons** | Lucide React |
| **VoIP/Telephony** | @twilio/voice-sdk, twilio |

---

## Project Structure

```
/Users/mac/Downloads/crm/
├── app/                          # Next.js App Router pages
│   ├── admin/                    # Admin section (admin-only access)
│   │   ├── page.tsx              # Redirects to /admin/overview
│   │   ├── overview/page.tsx     # Live caller monitoring & leaderboard
│   │   ├── leads/page.tsx        # Cross-caller lead management
│   │   └── callers/[username]/   # Individual caller deep-dive
│   ├── api/
│   │   ├── discover/route.ts     # Google Places discovery API
│   │   ├── twilio/
│   │   │   ├── token/route.ts    # Twilio access token generation
│   │   │   └── voice/route.ts    # TwiML webhook for call routing
│   │   └── verify/route.ts       # Lead verification API
│   ├── dashboard/page.tsx        # Main dashboard with stats
│   ├── discover/page.tsx         # Lead discovery interface
│   ├── leads/page.tsx            # Lead management and editing
│   ├── login/page.tsx            # Simple username authentication
│   ├── operations/page.tsx       # Active calling/dialer interface
│   ├── sessions/page.tsx         # Session history and management
│   ├── settings/page.tsx         # User preferences and profile
│   ├── upload/page.tsx           # CSV import with column mapping
│   ├── layout.tsx                # Root layout with navigation
│   ├── globals.css               # Global styles and Tailwind
│   └── page.tsx                  # Root redirect to login
├── components/
│   ├── admin/                    # Admin-specific components
│   │   ├── AdminLayout.tsx       # Admin top navigation
│   │   ├── AdminLeadsTable.tsx   # Cross-caller leads table
│   │   ├── CallerCard.tsx        # Live caller status card
│   │   ├── CallerStats.tsx       # Caller statistics display
│   │   ├── LeaderboardTable.tsx  # Daily ranking table
│   │   ├── ReassignModal.tsx     # Lead reassignment dialog
│   │   └── SessionTable.tsx      # Expandable session history
│   ├── ActiveCallScreen.tsx      # Full-screen VoIP call interface
│   ├── Header.tsx                # Top navigation bar with scripts panel
│   ├── LeadCard.tsx              # Single lead display with actions
│   ├── ScriptPanel.tsx           # Collapsible sales scripts
│   ├── SessionStats.tsx          # Dashboard statistics component
│   ├── SideNav.tsx               # Left sidebar navigation
│   ├── Sidebar.tsx               # Lead list sidebar with filters
│   ├── ToastProvider.tsx         # Toast notification wrapper
│   ├── VerifyButton.tsx          # Lead verification trigger
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── callState.ts              # Zustand store for active call state
│   ├── countries.json            # US cities data for autocomplete
│   ├── csvParser.ts              # CSV parsing and export utilities
│   ├── pocketbase.ts             # PocketBase client and types
│   ├── scoring.ts                # Lead verification scoring algorithm
│   ├── sessions.ts               # Session management utilities
│   ├── twilioDevice.ts           # Twilio Device singleton manager
│   └── utils.ts                  # Tailwind CN utility
├── .env.local                    # Environment variables
├── package.json                  # Dependencies
├── tailwind.config.ts            # Tailwind configuration
└── README.md                     # Original documentation
```

---

## Database Schema (PocketBase Collections)

### Collection: `users`
| Field | Type | Description |
|-------|------|-------------|
| `username` | text, required, unique | Login identifier (no passwords) |
| `name` | text | Display name (optional) |
| `email` | text | Contact email (optional) |
| `is_admin` | bool, default: false | Admin status flag |
| `last_active` | text | ISO timestamp of last activity |
| `session_active` | bool, default: false | Currently in active call session |
| `created` | autodate | Timestamp |

### Collection: `leads`
| Field | Type | Description |
|-------|------|-------------|
| `username` | text, required | Owner of the lead |
| `business_name` | text | Company/business name |
| `contact_name` | text | Contact person's name |
| `phone` | text | Phone number |
| `city` | text | City location |
| `state` | text | State abbreviation |
| `niche` | text | Business category/niche |
| `website` | text | Website URL |
| `notes` | text | Call notes |
| `status` | text | Call outcome status |
| `callback_datetime` | text | Scheduled callback time |
| `call_count` | number | Times called |
| `last_called` | text | Last call timestamp |
| `verified` | bool | Google Places verified |
| `verification_data` | json | Raw verification data |
| `verification_score` | number | Quality score (0-100) |
| `imported_at` | autodate | Import timestamp |

### Collection: `sessions`
| Field | Type | Description |
|-------|------|-------------|
| `username` | text | Session owner |
| `date` | text | YYYY-MM-DD format |
| `start_time` | text | ISO timestamp |
| `end_time` | text | ISO timestamp (optional) |
| `total_paused_time_ms` | number | Paused duration |
| `status` | text | active/paused/completed |
| `calls_made` | number | Total calls |
| `answered` | number | Answered count |
| `voicemails` | number | Voicemail count |
| `no_answers` | number | No answer count |
| `not_interested` | number | Not interested count |
| `callbacks` | number | Callback count |
| `gatekeepers` | number | Gatekeeper count |
| `calls` | json | Detailed call records |

---

## Lead Status System

| Status | Color | Description |
|--------|-------|-------------|
| `not_called` | Gray | Default state, never called |
| `answered` | Green | Call connected and answered |
| `voicemail` | Amber | Left voicemail message |
| `no_answer` | Red | Phone rang, no answer |
| `not_interested` | Gray | Explicitly declined |
| `callback` | Blue | Scheduled for callback |
| `gatekeeper` | Violet | Spoke with gatekeeper/receptionist |

---

## Lead Verification Scoring System

### Scoring Criteria (0-100 points)

| Criteria | Points | Condition |
|----------|--------|-----------|
| Has Google listing | +20 | Place ID found |
| Low review count | +20 | < 15 reviews |
| Rating in sweet spot | +20 | Rating 3.0-4.2 |
| No website | +20 | Website field empty |
| Roofing business | +10 | Business type contains "roofing" |
| Operational status | +10 | Business status = "OPERATIONAL" |

### Score Tiers

| Tier | Score Range | Label | Emoji | Description |
|------|-------------|-------|-------|-------------|
| Gold Mine | 80-100 | "Gold Mine" | 🔥 | High priority, excellent prospect |
| Solid | 50-79 | "Solid Lead" | ✅ | Good prospect worth pursuing |
| Lukewarm | 20-49 | "Lukewarm" | 🌤 | Moderate potential |
| Skip | 0-19 | "Skip" | ❌ | Low priority |

---

## Pages & Functionality

### 1. Login Page (`/login`)
**Purpose:** Simple authentication entry point

**Features:**
- Username-only authentication (no passwords)
- Auto-creates new users on first login
- Stores username in localStorage
- Clean dark-themed UI with "CallFlow" branding

**Flow:**
1. User enters username
2. System checks if user exists in PocketBase
3. Creates new user if not found
4. Redirects to `/dashboard`

---

### 2. Dashboard Page (`/dashboard`)
**Purpose:** Main overview and analytics hub

**Features:**
- **SessionStats Component:** Shows total leads, calls made, answered, gold mines, callbacks, and remaining
- **Quick Actions Grid:** Navigation cards to Operations, Discover, Leads, and Upload
- **Recent Leads:** Display of 5 most recent leads with status badges
- **Pipeline Progress:** Visual progress bar showing call completion percentage
- **Quality Breakdown:** Distribution of Gold Mine, Solid, and Lukewarm leads
- **Export Functionality:** Export all leads, callbacks only, or gold mines to CSV

**Statistics Tracked:**
- Total leads count
- Called vs not called
- Callbacks scheduled
- Gold Mine leads (score ≥ 80)
- Answer rate percentage

---

### 3. Leads Page (`/leads`)
**Purpose:** Comprehensive lead management and editing

**Features:**
- **Search:** Filter by business name, phone, or city
- **Status Filter:** Dropdown for all status types
- **Niche Filter:** Filter by business category
- **Score Filter:** Filter by Gold/Solid/Warm/Low tiers
- **Pagination:** 20 items per page with navigation
- **Inline Actions:**
  - Call button (redirects to operations)
  - Edit button (opens edit modal)
  - Delete button (with confirmation)
- **Export:** Export filtered results to CSV
- **Edit Modal:** Full form to edit all lead fields

**Lead Cards Display:**
- Business name with Gold Mine flame indicator
- Phone, city/state, website links
- Status badge (color-coded)
- Verification score badge
- Notes preview (truncated)

---

### 4. Operations Page (`/operations`)
**Purpose:** Active calling interface with lead queue and integrated VoIP dialer

**Features:**
- **Session Management:**
  - Start/Pause/End session
  - Live session timer (total and active duration)
  - Session persists in localStorage
- **Lead Queue:** Sidebar showing filtered leads
- **Lead Card Display:** Full lead information with actions
- **Active Call Screen:** Full-screen VoIP calling interface
- **Filters:**
  - Status filter tabs (All, Not Called, Callbacks, Answered)
  - Niche filter dropdown
- **Navigation:** Previous/Next lead buttons with keyboard support
- **Twilio Device Integration:**
  - Device initialized on page load
  - Auto-refreshes token every 55 minutes
  - Cleanup on unmount

**LeadCard Component Features:**
- Business name with verification badge
- Contact information grid (contact name, phone, city, website)
- **Call Button:** Initiates Twilio Voice call with fallback to `tel:`
  - Updates call count in PocketBase
  - Stores call in global state
  - Opens ActiveCallScreen
- **Outcome Buttons:** 6 buttons for call outcomes
  - Answered (green)
  - Voicemail (amber)
  - No Answer (red)
  - Not Interested (gray)
  - Callback (blue with datetime picker)
  - Gatekeeper (violet)
- **Notes Field:** Auto-saving textarea for call notes
- **Verification Display:** Shows score and tier badge

**Session Integration:**
- Automatically logs calls to active session
- Updates call statistics in real-time
- Tracks all call outcomes

---

### 5. Discover Page (`/discover`)
**Purpose:** Automated lead discovery via Google Places API

**Features:**
- **Search Form:**
  - Niche selector (13 business types)
  - City input with autocomplete
  - State selector (50 US states + DC)
  - Target count slider (10-200 leads)
  - Cost estimation ($0.034 per lead)
- **Discovery Progress:**
  - Animated progress indicators
  - Step-by-step status messages
  - Cancel discovery button
- **Results Grid:**
  - Card-based lead display
  - Verification score badges
  - Select/deselect functionality
  - Select All/Deselect All buttons
- **Duplicate Detection:**
  - Filters out existing phone numbers
  - Filters out existing place IDs
  - Shows duplicates filtered count
- **Import Action Bar:**
  - Import selected leads
  - Discard all button
  - Import progress with batch processing (5 concurrent)

**Smart Mixing Algorithm:**
- Every 4 lukewarm leads (<50 score), system prioritizes finding a high-value lead (≥50)
- Ensures quality distribution in results

**Supported Niches:**
- Roofing, HVAC, Plumbing, Electrical, Landscaping
- Pest Control, Pressure Washing, Pool Service
- Auto Detailing, Tree Service, Cleaning Services, Garage Door

---

### 6. Upload Page (`/upload`)
**Purpose:** CSV import with intelligent column mapping

**Features:**
- **3-Step Wizard:**
  1. Upload: Drag-and-drop or file selection
  2. Mapping: Map CSV columns to lead fields
  3. Preview: Review first 5 rows before import

- **Required Fields:**
  - `business_name`
  - `phone`

- **Optional Fields:**
  - `contact_name`, `city`, `state`, `niche`, `website`, `notes`

- **Auto-Detection:**
  - Automatically detects column mappings based on keywords
  - Smart matching for common column names

- **Import Process:**
  - Duplicate detection (business_name + phone combination)
  - Batch processing (5 concurrent requests)
  - Progress tracking with ETA
  - Small delays between batches to avoid rate limiting
  - Success/error reporting

---

### 7. Sessions Page (`/sessions`)
**Purpose:** Call session history and management

**Features:**
- **Current Session Card:**
  - Shows active session details
  - Live duration counter
  - Call statistics (total, answered, callbacks, etc.)
  - End Session button
  - Continue to Operations button

- **Past Sessions List:**
  - Chronological list of completed sessions
  - Session date and time range
  - Duration statistics
  - Call outcome breakdown (badges)
  - View Details button (links to session detail)
  - Delete button with confirmation

- **Session Statistics Displayed:**
  - Total calls made
  - Active duration
  - Answer rate percentage
  - Individual outcome counts

**Data Sources:**
- Merges localStorage sessions with PocketBase sessions
- Deduplicates by session ID
- Sorts by start time (newest first)

---

### 8. Settings Page (`/settings`)
**Purpose:** User profile and application preferences

**Features:**
- **Profile Section:**
  - Display name (editable)
  - Email (editable)
  - Username (read-only)
  - Save to PocketBase

- **Preferences Section:**
  - Daily call goal (number input)
  - Sound effects toggle
  - Auto-save toggle
  - Saved to localStorage

- **Danger Zone:**
  - Clear All Leads button
  - Double confirmation required
  - Permanently deletes all user's leads from PocketBase

---

## Component Details

### ScriptPanel Component
**Purpose:** Embedded sales scripts for cold calling

**Dynamic Variables:** All scripts automatically inject `{business_name}`, `{city}`, and `{niche}` from the current lead.

---

#### Tab 1: The Script (4-Step Framework)

**Step 1 — Opener (Pattern Interrupt)**

> *"Hi, is this **{businessName}**?"*
>
> *[They say yes]*
>
> *"Hey, my name is [Name], I'm calling from Codesavan — quick question for you: do you currently have a website for the business?"*

**Note:** Don't introduce yourself fully upfront — a question disarms gatekeeping. Keep tone casual, not corporate.

---

**Step 2 — The Hook (The Demo Reveal)**

**If NO website:**
> *"Perfect — so here's the reason I'm calling. My team actually went ahead and built a free demo website specifically for **{niche}** businesses in **{city}**. I built it to show you what your business could look like online — no charge, no obligation, nothing to sign. I just need about 10 minutes to walk you through it and get your thoughts."*

**If they HAVE a website:**
> *"Got it — I actually still built one for you because I wanted to show you what a modern, mobile-optimized version could look like versus what most **{niche}** businesses are running right now. It takes 10 minutes — worth a look?"*

**Note:** Key phrase: "I already built it" — shifts dynamic from selling to showing. They feel obligated to look.

---

**Step 3 — Book the Demo (The Ask)**

> *"I can jump on a quick Zoom with you today around [time] or tomorrow morning — which works better for you?"*

**Note:** Always give two options. Never ask "are you free?" — invites a no. Force a choice between two yeses.

---

**Step 4 — Confirm The Booking**

> *"Perfect. So I have you down for [Day] at [Time] — I'll send a calendar invite to your email right now. What's the best address?"*
>
> *[Get email]*
>
> *"Got it. You'll get an invite in the next 2 minutes with the Zoom link. Looking forward to showing you what we put together — I think you'll really like it. Have a great rest of your day."*

**Note:** Always confirm day + time + email. Send invite IMMEDIATELY while on line. No invite = no show.

---

#### Tab 2: Objections & Responses

| Prospect Says | You Say |
|--------------|---------|
| **"Just send me the link."** | *"I totally can — and I will. But honestly, the demo looks 10x better when I walk you through it and explain what we built specific to your business. It takes 10 minutes and I think you'll actually enjoy it. Does today at [time] work, or is tomorrow better?"* |
| **"I'm really busy right now."** | *"No worries at all — that's exactly why I want to schedule a proper time instead of keeping you now. What's your calendar like tomorrow morning? I'll send you a link and we'll keep it to 10 minutes flat."* |
| **"Not interested."** | *"I get that — you haven't seen it yet, so I wouldn't expect you to be. All I'm asking is 10 minutes to show you something I already built for free. If you look at it and don't like it, no problem at all. Fair enough?"* |
| **"How much does it cost?"** | *"That's a great question — and I'll be completely transparent about pricing on the call. But honestly, I don't want to throw out a number before you've even seen what we built. If you look at it and hate it, the price doesn't matter. If you love it, we'll talk numbers — and I think you'll be surprised at how affordable it is. Can we do tomorrow at [time]?"* |
| **"I already have someone handling my website."** | *"Totally fair — I'm not asking you to fire anyone. I built this as a comparison, just so you can see what's possible. A lot of our clients had someone before us too. Takes 10 minutes — worth knowing your options, right?"* |
| **"Is this a sales call?"** | *"Honestly? There's an offer at the end — I won't lie to you. But your only job today is to show up and look at a free demo we built. No pressure, no pitch deck, no contracts. If you like it, we talk. If you don't, no hard feelings."* |

---

#### Tab 3: Target Niches Guide

Target niches ranked by urgency and deal tolerance. 🔥 = HOT (very high urgency), 🔶 = WARM (medium urgency)

| Niche | Urgency | Deal Size | Description |
|-------|---------|-----------|-------------|
| **Roofers** | 🔥 HOT (VERY HIGH) | $1K–$2K | Storm-chasing, seasonal. $10K-$30K avg job. Many zero web presence. |
| **HVAC** | 🔥 HOT (HIGH) | $1K–$1.5K | Year-round demand. Owners cash-rich, time-poor. |
| **Plumbers** | 🔥 HOT (HIGH) | $800–$1.5K | Emergency-call business. Google = everything. Outdated sites. |
| **Pest Control** | 🔥 HOT (HIGH) | $1K–$1.5K | Recurring revenue. Need steady leads. Perfect for SEO upsell. |
| **Pressure Washing** | 🔥 HOT (HIGH) | $700–$1K | Low barrier entry. Solo operators. Easy demo wins. |
| **Tree Service** | 🔥 HOT (HIGH) | $1K–$1.5K | High job value ($500-$5K). Storm season urgency. |
| **Garage Door Repair** | 🔥 HOT (VERY HIGH) | $1K–$1.5K | Emergency niche. Google = everything. Fast closers. |
| **Electricians** | 🔶 WARM (MEDIUM) | $800–$1.2K | Licensed pros. High job values. Skeptical but loyal. |
| **Landscapers** | 🔶 WARM (MEDIUM-HIGH) | $800–$1.2K | Seasonal rush. Visual buyers. Quick in-season. |
| **Pool Service** | 🔶 WARM (MEDIUM) | $1K–$1.5K | High LTV clients. Summer rush. Repeat buyer mindset. |
| **Auto Detailers** | 🔶 WARM (MEDIUM) | $700–$1K | Mobile segment. Instagram-first, no websites. |
| **Cleaning Services** | 🔶 WARM (MEDIUM) | $700–$1K | Recurring clients. Trust-focused. Women-owned mostly. |

---

### VerifyButton Component
**Purpose:** Trigger Google Places verification for a lead

**States:**
1. **Unverified:** Shows "Verify Lead" button
2. **Loading:** Shows spinner with progress steps
   - "Searching Google Places..."
   - "Analyzing business data..."
   - "Calculating lead score..."
   - "Saving verification..."
3. **Verified:** Shows tier badge (Gold/Solid/Lukewarm/Skip)

**Process:**
- Calls `/api/verify` endpoint
- Searches Google Places by business name + city
- Fetches detailed place information
- Calculates score using scoring algorithm
- Updates lead record in PocketBase
- Calls onVerified callback

---

### SessionStats Component
**Purpose:** Dashboard statistics display

**Stat Cards:**
1. Total Leads (violet)
2. Calls Made (emerald)
3. Answered (blue)
4. Gold Mines (amber with flame)
5. Callbacks (pink)
6. Remaining (zinc)

**Progress Section:**
- Session progress bar
- Status breakdown pills (Voicemail, No Answer, Not Interested, Gatekeeper)

---

### Sidebar Component
**Purpose:** Lead list with filtering (used in Operations)

**Features:**
- Quick navigation links (Leads, Discover, Upload)
- Status filter tabs
- Niche filter dropdown
- Scrollable lead list
- Color-coded status indicators
- Verification badges
- Call progress footer

---

### SideNav Component
**Purpose:** Main application navigation

**Navigation Items:**
- Dashboard
- Leads
- Operations
- Sessions
- Discover
- Upload

**Footer:**
- Settings link
- Sign Out button (clears localStorage)

---

## API Endpoints

### POST `/api/discover`
**Purpose:** Search Google Places for leads

**Request Body:**
```json
{
  "niche": "Roofing",
  "city": "Houston",
  "state": "TX",
  "target_count": 50,
  "existing_phones": [],
  "existing_place_ids": []
}
```

**Response:**
```json
{
  "leads": [...],
  "total_found": 45,
  "api_calls": 90,
  "estimated_cost": "1.53",
  "duplicates_filtered": 5,
  "high_value_count": 12
}
```

**Features:**
- Searches multiple locations per query
- Handles state-wide and city-specific searches
- Duplicate detection
- Smart mixing algorithm for quality distribution
- Progress tracking

---

### POST `/api/verify`
**Purpose:** Verify a single lead against Google Places

**Request Body:**
```json
{
  "business_name": "ABC Roofing",
  "city": "Houston"
}
```

**Response:**
```json
{
  "found": true,
  "score": 85,
  "tier": "gold",
  "tierLabel": "Gold Mine",
  "tierEmoji": "🔥",
  "data": { ... }
}
```

---

### GET `/api/twilio/token`
**Purpose:** Generate Twilio access token for Voice SDK authentication

**Query Parameters:**
- `username` (required) - The username to use as device identity

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Features:**
- Creates JWT access token with 3600 second TTL
- Includes VoiceGrant for outgoing and incoming calls
- Uses `twilio.jwt.AccessToken` for token generation

---

### POST `/api/twilio/voice`
**Purpose:** TwiML webhook for call routing (inbound/outbound)

**Request Body (FormData from Twilio):**
- `To` - Destination number or client identifier
- `Direction` - 'inbound' or 'outbound'
- `CallStatus` - Current call status

**Response:** TwiML XML

**Routing Logic:**
- **Inbound:** Routes to `dial.client(To)` where To is the username
- **Outbound:** Routes to `dial.number(To)` with callerId from TWILIO_PHONE_NUMBER

---

## Twilio Voice SDK Integration

### Overview
CallFlow now includes a fully integrated VoIP dialer using Twilio Voice SDK, enabling browser-based calling directly from the Operations page.

### Architecture

| Component | Purpose |
|-----------|---------|
| `twilioDevice.ts` | Singleton Device manager with token refresh |
| `callState.ts` | Zustand store for global call state |
| `ActiveCallScreen.tsx` | Full-screen call interface |
| `/api/twilio/token` | Token generation endpoint |
| `/api/twilio/voice` | TwiML webhook handler |

### Device Lifecycle

1. **Initialization** (`/lib/twilioDevice.ts`)
   - `initDevice(username)` - Fetches token and initializes Device
   - Registered for incoming calls with `enableRingingState: true`
   - Codecs: opus, pcmu
   - Auto-refresh token every 55 minutes

2. **Call State Management** (`/lib/callState.ts`)
   - Global Zustand store tracks: activeCall, callStatus, activeLead, callDuration
   - Supports states: idle, calling, connected, incoming, post_call, disconnecting
   - Timer increments every second during connected calls

3. **Cleanup**
   - `destroyDevice()` clears interval and destroys device
   - Called on Operations page unmount

### ActiveCallScreen Component

**Purpose:** Full-screen overlay for active/incoming/post-call states

**States:**

| State | UI | Actions |
|-------|-----|---------|
| `incoming` | Caller ID display | Accept (green) / Decline (red) |
| `calling` | Business name, phone, status | End Call |
| `connected` | Live duration timer, mute/keypad | Mute, Keypad, End Call |
| `post_call` | Outcome selection | 6 outcome buttons + Notes + Save |

**Features:**
- **Incoming Call:** Shows caller ID, auto-rejects if another call active
- **Active Call:**
  - Live duration timer (monospace, text-4xl)
  - Mute toggle with mic/mic-off icons
  - DTMF keypad (1-9, *, 0, #)
  - Large red End Call button
- **Post-Call:**
  - 6 outcome buttons (same styling as LeadCard)
  - Notes textarea with auto-duration prefix: "[2m 34s call] — [notes]"
  - Callback datetime picker
  - Saves to PocketBase and logs to session

### Call Flow

1. User clicks "Call" in LeadCard
2. `handleCall()` updates call_count in PocketBase
3. Gets or initializes Twilio Device
4. Calls `device.connect({ params: { To: phone } })`
5. Stores Call object in Zustand store
6. ActiveCallScreen renders automatically
7. User handles call, marks outcome
8. Outcome + duration + notes saved to lead
9. Call logged to active session

### Incoming Call Handling

- Device listens for 'incoming' events at all times
- If no active call: Shows incoming call screen
- If active call: Shows toast "Incoming call — finish current call first", auto-rejects

### Environment Variables

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

### Fallback Behavior

If Twilio device fails to initialize or connect:
- Falls back silently to `tel:` link
- Logs error to console
- User experience remains seamless

---

## Session Management System

### LocalStorage Keys
- `username` - Current user identifier
- `callflow_current_session` - Active session data
- `callflow_sessions` - Completed sessions history
- `userPreferences` - User settings
- `focusLeadId` - Lead to focus on in Operations

### Session Lifecycle

1. **Create:** User starts session → `createSession(username)` generates ID, stores in localStorage
2. **Active:** Timer runs, calls logged in real-time
3. **Pause:** User pauses → `pauseSession()` calculates pause time
4. **Resume:** User resumes → `resumeSession()` adds to total paused time
5. **End:** User ends session → `endSession()` saves to PocketBase and localStorage

### Session Data Tracked
- Session ID and username
- Start/end times
- Total and active duration
- All call records (leadId, businessName, phone, status, timestamp, notes)
- Aggregated statistics by outcome type

---

## CSV Import/Export

### Import Process
1. Parse CSV file
2. Auto-detect column mappings
3. Validate required fields (business_name, phone)
4. Check for duplicates against existing leads
5. Import in batches of 5 concurrent requests
6. Show progress with ETA calculation

### Export Options
- **All Leads:** Full CSV with all fields
- **Callbacks Only:** Leads with status = "callback"
- **Gold Mines Only:** Leads with verification_score >= 80

### CSV Fields (Export)
- business_name, contact_name, phone, city, state
- niche, website, status, notes
- call_count, verification_score, verification_tier

---

## Mobile Responsiveness

The application is fully responsive with:
- Sidebar becomes bottom filter bar on mobile
- Script panel opens as bottom sheet
- Large tappable buttons for calling
- Optimized for use while holding phone to ear

---

## Security & Data Isolation

- Username-based data isolation (users only see their own data)
- All queries filtered by `username = "${user}"`
- No passwords or sensitive authentication
- Data stored in PocketBase with username scoping

---

## Key User Workflows

### Workflow 1: New User Getting Started
1. Login with username → creates user if new
2. Dashboard shows empty state
3. Clicks "Discover" or "Upload" to add leads
4. Imports/discovers leads
5. Goes to "Operations" to start calling
6. Calls leads, marks outcomes
7. Reviews session stats in "Sessions"

### Workflow 2: Daily Calling Session (with Twilio VoIP)
1. Login → Dashboard shows current stats
2. Clicks "Start Calling" → Operations page
3. Starts new session (Twilio device auto-initializes)
4. Clicks "Call" on lead → ActiveCallScreen opens
5. Call connects via Twilio Voice SDK (browser-based)
6. Uses mute/keypad during call as needed
7. Ends call → Post-call screen appears
8. Selects outcome, adds notes (auto-includes duration)
9. Saves outcome → Updates lead + logs to session
10. Continues to next lead
11. Ends session when done
12. Reviews completed session in Sessions page

### Workflow 3: Lead Quality Verification
1. Views leads in Leads or Operations
2. Clicks "Verify Lead" on unverified lead
3. System searches Google Places
4. Shows score calculation progress
5. Displays tier badge (Gold/Solid/Lukewarm)
6. Prioritizes Gold Mine leads for calling

---

## Integration Points

### Google Places API
- **Discovery:** Text search for businesses by niche and location
- **Verification:** Search by business name + city for scoring
- **Details:** Fetch phone, website, rating, reviews, status
- **Cost:** ~$0.017 per API call

### PocketBase
- **Collections:** users, leads, sessions
- **Filtering:** All queries filtered by username
- **Relations:** Sessions contain JSON array of call details

### Browser APIs
- **localStorage:** Session persistence, user preferences
- **WebRTC:** Twilio Voice SDK for browser-based calling
- **tel: protocol:** Fallback phone dialer integration
- **File API:** CSV file reading
- **Zustand:** Global call state management

---

## Customization Points

### Adding New Niches
Edit `/app/discover/page.tsx` NICHES array and `/app/api/discover/route.ts` NICHE_QUERIES object.

### Modifying Scoring Algorithm
Edit `/lib/scoring.ts` calculateLeadScore() function to adjust point values or add new criteria.

### Custom Scripts
Edit `/components/ScriptPanel.tsx` ScriptContent component to modify sales scripts.

### Export Fields
Edit export functions in `/app/dashboard/page.tsx` and `/app/leads/page.tsx` to customize CSV fields.

### Twilio Configuration
Edit `/lib/twilioDevice.ts` to adjust:
- Token refresh interval (default: 55 minutes)
- Codec preferences (default: opus, pcmu)
- Error handling behavior

### Call State Management
Edit `/lib/callState.ts` to:
- Add new call states
- Modify duration tracking
- Add new call metadata fields

### Call Interface Styling
Edit `/components/ActiveCallScreen.tsx` to:
- Modify call controls layout
- Change color schemes
- Adjust animation timing
- Add new call control buttons

---

## Deployment Requirements

### Environment Variables
```
NEXT_PUBLIC_POCKETBASE_URL=https://your-pocketbase-url.com
GOOGLE_PLACES_API_KEY=your_google_places_api_key

# Twilio Voice SDK Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

### PocketBase Setup
1. Deploy PocketBase to Render/Railway/VPS
2. Create collections with exact schema above
3. Set appropriate CORS headers
4. Configure authentication rules

### Build Commands
```bash
npm install
npm run build
npm start
```

---

## Future Enhancement Possibilities

1. **Email Integration:** Automated calendar invites for booked demos
2. **Advanced Team Features:** Lead assignment, team-wide leaderboards
3. **Advanced Analytics:** Charts, trends, performance metrics
4. **Mobile App:** React Native or PWA version
5. **AI Integration:** Call transcription, sentiment analysis
6. **Zapier/API:** Webhooks for external integrations
7. **Custom Fields:** User-defined lead fields
8. **Call Recording:** Twilio call recording with playback
9. **Voicemail Drops:** Pre-recorded voicemail messages

---

## Admin System

CallFlow includes a comprehensive admin dashboard for monitoring team performance and managing leads across all callers.

### Admin Access

**Authentication Flow:**
1. On login, system checks `is_admin` field in PocketBase users collection
2. If `is_admin === true`, stores `isAdmin: true` in localStorage
3. Admin users redirected to `/admin` → `/admin/overview`
4. Non-admin users redirected to `/dashboard`
5. All admin pages check `localStorage.getItem('isAdmin') === 'true'` and redirect non-admins

**Creating an Admin User:**
Manually set `is_admin: true` on a user record in PocketBase admin panel.

---

### 9. Admin Overview Page (`/admin/overview`)

**Purpose:** Real-time monitoring dashboard for all callers

**Features:**

#### Global Stats Bar (5 stat cards)
| Stat | Description |
|------|-------------|
| Calls Today | Total calls across all callers today |
| Answered Today | Total answered calls today |
| Callbacks Today | Total callbacks scheduled today |
| Gold Mines | Total verified gold mine leads |
| Total Leads | Total leads in system |

#### Live Callers Section
- Polls PocketBase every 30 seconds (auto-refresh)
- Grid of caller cards showing:
  - Username + display name
  - 🟢 Active / ⚫ Inactive indicator (based on `session_active`)
  - Last active timestamp (human readable: "2 mins ago")
  - Today's calls, answered, callbacks
  - Answer rate progress bar

#### Daily Leaderboard
- Ranked table of all callers by `calls_made` today
- Columns: Rank, Caller, Calls Today, Answered, Answer Rate, Callbacks, Gold Mines
- Top performer highlighted with trophy badge
- Data aggregated from sessions collection filtered by today's date

**Real-time Polling:**
- 30-second automatic refresh interval
- "Last updated X seconds ago" indicator
- Manual refresh button

---

### 10. Admin Caller Detail Page (`/admin/callers/[username]`)

**Purpose:** Deep-dive view into individual caller performance

**Header Section:**
- Large avatar with username
- Current status badge (Active/Inactive)
- Join date and last seen timestamp
- Action buttons: Export Leads, Delete All Leads

#### Today's Stats (4 cards)
- Calls Today
- Answered Today
- Answer Rate %
- Callbacks Today

#### Session History Table
- All sessions from PocketBase for this caller
- Columns: Date, Duration, Calls, Answered, Voicemail, No Answer, Callbacks, Answer Rate
- Sorted newest first
- **Expandable rows:** Click to view individual call records
  - Shows: businessName, phone, status, timestamp, notes
- Pagination: 10 sessions per page

#### Lead Quality Breakdown

**Status Breakdown:**
- Bar chart showing counts for each status:
  - Not Called, Answered, Voicemail, No Answer, Not Interested, Callback, Gatekeeper

**Verification Tier Breakdown:**
- Gold Mine (score ≥ 80)
- Solid (score 50-79)
- Lukewarm (score 20-49)
- Skip (score 1-19)
- Unverified (score 0 or not verified)

**Actions:**
- **Delete All Leads:** Confirmation dialog, permanently deletes all user's leads
- **Export Leads:** CSV download of all caller's leads

---

### 11. Admin Leads Page (`/admin/leads`)

**Purpose:** Full cross-caller lead management interface

#### Leads Table
**Columns:**
- Checkbox (for bulk selection)
- Business Name (with Gold Mine 🔥 indicator)
- Contact (phone + contact name)
- Status (color-coded badge)
- Score (verification score)
- Tier (Gold/Solid/Lukewarm/Skip/Unverified)
- Caller (username)
- Called Count + Last Called
- Actions (Edit, Reassign, Delete)

**Filters:**
- Search: Business name, phone, city
- Status dropdown: All statuses
- Tier dropdown: All tiers
- Caller dropdown: All callers

**Bulk Actions (when leads selected):**
- **Reassign:** Open modal to select new caller, updates all selected leads
- **Export:** CSV download of selected leads
- **Delete:** Confirmation dialog, deletes all selected leads

**Inline Actions per Lead:**
- **Edit:** Opens edit modal with all lead fields
- **Reassign:** Dropdown to select new caller (inline in table)
- **Delete:** Single lead deletion with confirmation

**Pagination:** 25 leads per page

---

### Admin Components (`/components/admin/`)

| Component | Purpose |
|-----------|---------|
| `AdminLayout.tsx` | Top navigation bar for admin section. Includes: logo, Overview link, Leads link, Callers dropdown selector, logged-in user display, Sign Out button. Dark theme with indigo accents. |
| `CallerCard.tsx` | Live status card for overview page. Shows: avatar with status dot, username, active/inactive badge, last active time, today's stats (calls, answered, callbacks), answer rate progress bar. |
| `LeaderboardTable.tsx` | Daily ranking table. Columns: Rank (with trophy for #1), Caller, Calls Today, Answered, Answer Rate %, Callbacks, Gold Mines. Top performer highlighted. |
| `CallerStats.tsx` | Four stat cards for caller detail page. Shows: Calls, Answered, Answer Rate, Callbacks with color-coded icons. |
| `SessionTable.tsx` | Expandable session history table. Columns: Date, Duration, Calls, Answered, Voicemail, No Answer, Callbacks, Answer Rate. Expandable rows show individual call details. Includes pagination. |
| `AdminLeadsTable.tsx` | Full-featured leads table. Checkboxes for selection, all lead fields, inline reassign dropdown, action buttons. Supports bulk selection. |
| `ReassignModal.tsx` | Dialog for bulk lead reassignment. Shows dropdown of all callers, confirms reassignment action. |

---

### Session Activity Tracking

The system automatically tracks caller activity for admin monitoring:

**`lib/sessions.ts` Functions:**

| Function | Purpose |
|----------|---------|
| `updateUserSessionStatus(username, sessionActive)` | Updates `session_active` and `last_active` in PocketBase |
| `updateUserLastActive(username)` | Updates `last_active` timestamp only |

**Automatic Updates:**
- When session starts: `session_active` → `true`
- When session ends: `session_active` → `false`
- Updates occur in `createSession()` and `endSession()`

---

## Summary

CallFlow is a focused, efficient cold calling CRM designed for sales teams that need:
- Quick lead discovery and verification
- Streamlined calling workflow with integrated VoIP dialer
- Built-in sales scripts
- Session-based performance tracking
- Browser-based calling via Twilio Voice SDK
- Simple, modern UI optimized for mobile use

The application prioritizes speed and ease of use over complex features, making it ideal for solo salespeople and small teams conducting outbound cold calling campaigns for local service businesses.

### Key Differentiators

1. **Integrated VoIP Calling:** No need for external phone systems - make calls directly from the browser
2. **Smart Lead Scoring:** Automatic verification and scoring of discovered leads
3. **Session-Based Tracking:** Complete call session analytics and performance metrics
4. **Mobile-Optimized:** Designed for use while holding phone to ear
5. **Zero Configuration:** Works out of the box with just username authentication
