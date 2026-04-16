import PocketBase from 'pocketbase'

export const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL)

// Disable auto-cancellation for parallel requests
pb.autoCancellation(false)

// Types based on PocketBase collections
export interface Lead {
  id: string
  username: string
  business_name: string
  contact_name: string
  phone: string
  city: string
  state: string
  niche: string
  website: string
  notes: string
  status: 'not_called' | 'answered' | 'voicemail' | 'no_answer' | 'not_interested' | 'callback' | 'gatekeeper'
  callback_datetime: string
  call_count: number
  last_called: string
  verified: boolean
  verification_data: any
  verification_score: number
  imported_at: string
  created: string
  updated: string

  // Meta Ads Discovery fields
  source: 'google_places' | 'meta_ads' | 'facebook_group' | 'linkedin' | 'manual'
  source_url?: string
  source_id?: string
  discovery_context?: string
  ad_start_date?: string
  ad_spend_indicator?: 'low' | 'medium' | 'high'

  // Owner enrichment
  owner_name?: string
  owner_title?: string
  owner_linkedin?: string
  owner_email?: string
  owner_phone?: string
  enrichment_confidence?: number

  // AI scoring
  source_priority_score?: number
  ai_recommended?: boolean
  ai_reason?: string
  ai_flags?: string[] // ['agency_keywords', 'multiple_advertisers', etc.]
  review_status?: 'approved' | 'flagged' | 'rejected'
}

export interface DiscoveryJob {
  id: string
  username: string
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed'
  source: 'meta_ads' | 'google_places' | 'facebook_group'
  niche: string
  location: string
  ad_recency_days: number
  target_count: number

  // Progress tracking
  leads_found: number
  leads_approved: number
  leads_flagged: number
  current_page: number

  // Results
  leads: string[] // Lead IDs created
  error_message?: string

  // Rate limiting
  last_api_call_at: string
  total_api_calls: number

  created: string
  updated: string
}

export interface Session {
  id: string
  username: string
  date: string
  start_time: string
  end_time: string | null
  total_paused_time_ms: number
  status: 'active' | 'paused' | 'completed'
  calls_made: number
  answered: number
  voicemails: number
  no_answers: number
  not_interested: number
  callbacks: number
  gatekeepers: number
  calls: any // JSON field
  created: string
  updated: string
}

export interface User {
  id: string
  username: string
  name?: string
  email?: string
  is_admin: boolean
  last_active?: string
  session_active: boolean
  created: string
  updated: string
}
