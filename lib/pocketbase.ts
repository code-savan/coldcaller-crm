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
}

export interface Session {
  id: string
  username: string
  date: string
  calls_made: number
  answered: number
  voicemails: number
  no_answers: number
  not_interested: number
  callbacks: number
  created: string
  updated: string
}

export interface User {
  id: string
  username: string
  created: string
  updated: string
}
