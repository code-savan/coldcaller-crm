export interface GooglePlace {
  name: string
  rating?: number
  user_ratings_total?: number
  website?: string
  types?: string[]
  photos?: any[]
  business_status?: string
  formatted_address?: string
  place_id: string
}

export interface VerificationResult {
  score: number
  tier: 'gold' | 'solid' | 'lukewarm' | 'skip'
  tierLabel: string
  tierEmoji: string
  data: GooglePlace
}

export function calculateLeadScore(place: GooglePlace): VerificationResult {
  let score = 0
  const reasons: string[] = []

  // Has Google listing found: +20 pts
  if (place.place_id) {
    score += 20
    reasons.push('Has Google listing')
  }

  // Review count < 15: +20 pts
  if (place.user_ratings_total !== undefined && place.user_ratings_total < 15) {
    score += 20
    reasons.push('Low review count (< 15)')
  }

  // Rating between 3.0–4.2: +20 pts
  if (place.rating !== undefined && place.rating >= 3.0 && place.rating <= 4.2) {
    score += 20
    reasons.push('Rating in sweet spot (3.0-4.2)')
  }

  // No website: +20 pts
  if (!place.website || place.website === '') {
    score += 20
    reasons.push('No website listed')
  }

  // Business type includes "roofing": +10 pts
  if (place.types?.some(type => type.toLowerCase().includes('roofing') || type.toLowerCase().includes('roof'))) {
    score += 10
    reasons.push('Roofing business type')
  }

  // Business status === "OPERATIONAL": +10 pts
  if (place.business_status === 'OPERATIONAL') {
    score += 10
    reasons.push('Business is operational')
  }

  // Determine tier
  let tier: 'gold' | 'solid' | 'lukewarm' | 'skip'
  let tierLabel: string
  let tierEmoji: string

  if (score >= 80) {
    tier = 'gold'
    tierLabel = 'Gold Mine'
    tierEmoji = '🔥'
  } else if (score >= 50) {
    tier = 'solid'
    tierLabel = 'Solid Lead'
    tierEmoji = '✅'
  } else if (score >= 20) {
    tier = 'lukewarm'
    tierLabel = 'Lukewarm'
    tierEmoji = '🌤'
  } else {
    tier = 'skip'
    tierLabel = 'Skip'
    tierEmoji = '❌'
  }

  return {
    score,
    tier,
    tierLabel,
    tierEmoji,
    data: place
  }
}
