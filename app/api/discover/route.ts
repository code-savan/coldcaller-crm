import { NextRequest, NextResponse } from "next/server";
import { calculateLeadScore } from "@/lib/scoring";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Niche to search query templates
const NICHE_QUERIES: Record<string, string[]> = {
  "Roofing": ["roofing contractor", "roof repair", "residential roofing", "roofing company"],
  "HVAC": ["hvac services", "air conditioning repair", "heating contractor", "ac installation"],
  "Plumbing": ["plumbing services", "emergency plumber", "drain cleaning", "plumbing contractor"],
  "Electrical": ["electrician", "electrical contractor", "electrical services"],
  "Landscaping": ["landscaping services", "lawn care", "landscape design"],
  "Pest Control": ["pest control", "exterminator", "termite control"],
  "Pressure Washing": ["pressure washing", "power washing", "exterior cleaning"],
  "Pool Service": ["pool service", "pool cleaning", "pool maintenance"],
  "Auto Detailing": ["auto detailing", "car detailing", "mobile detailing"],
  "Tree Service": ["tree service", "tree removal", "arborist"],
  "Cleaning Services": ["cleaning services", "house cleaning", "maid service"],
  "Garage Door": ["garage door repair", "garage door service", "overhead door"],
};

interface DiscoveredLead {
  business_name: string;
  phone: string;
  city: string;
  state: string;
  address: string;
  website: string;
  rating: number;
  review_count: number;
  place_id: string;
  niche: string;
  verification_score?: number;
  verification_tier?: string;
  verification_tier_label?: string;
  verified?: boolean;
}

interface ProgressUpdate {
  status: string;
  message: string;
  found: number;
  target?: number;
  currentQuery?: string;
  completed?: boolean;
  results?: DiscoveredLead[];
}

export async function POST(req: NextRequest) {
  try {
    const { niche, city, state, target_count = 50, existing_phones = [], existing_place_ids = [] } = await req.json();

    if (!niche || !state) {
      return NextResponse.json(
        { error: "niche and state are required" },
        { status: 400 }
      );
    }

    if (!GOOGLE_PLACES_API_KEY) {
      return NextResponse.json(
        { error: "Google Places API key not configured" },
        { status: 500 }
      );
    }

    // Convert to sets for fast lookup
    const existingPhoneSet = new Set(existing_phones.map((p: string) => p.replace(/\D/g, "")));
    const existingPlaceIdSet = new Set(existing_place_ids);

    // Build search locations - start with provided city or just state
    const searchLocations: string[] = [];

    if (city) {
      searchLocations.push(`${city}, ${state}`);
    }

    // Always add state-level search
    searchLocations.push(state);

    // Add nearby cities if we need to expand (these are major cities by state)
    const NEARBY_CITIES: Record<string, string[]> = {
      "TX": ["Houston, TX", "Dallas, TX", "Austin, TX", "San Antonio, TX", "Fort Worth, TX", "El Paso, TX"],
      "CA": ["Los Angeles, CA", "San Francisco, CA", "San Diego, CA", "San Jose, CA", "Sacramento, CA"],
      "FL": ["Miami, FL", "Orlando, FL", "Tampa, FL", "Jacksonville, FL", "Tallahassee, FL"],
      "NY": ["New York, NY", "Buffalo, NY", "Rochester, NY", "Albany, NY", "Syracuse, NY"],
      "PA": ["Philadelphia, PA", "Pittsburgh, PA", "Allentown, PA", "Harrisburg, PA"],
      "IL": ["Chicago, IL", "Springfield, IL", "Peoria, IL", "Rockford, IL"],
      "OH": ["Columbus, OH", "Cleveland, OH", "Cincinnati, OH", "Toledo, OH"],
      "GA": ["Atlanta, GA", "Savannah, GA", "Augusta, GA", "Columbus, GA"],
      "NC": ["Charlotte, NC", "Raleigh, NC", "Greensboro, NC", "Durham, NC"],
      "MI": ["Detroit, MI", "Grand Rapids, MI", "Ann Arbor, MI", "Lansing, MI"],
      "NJ": ["Newark, NJ", "Jersey City, NJ", "Trenton, NJ", "Atlantic City, NJ"],
      "VA": ["Virginia Beach, VA", "Richmond, VA", "Norfolk, VA", "Arlington, VA"],
      "WA": ["Seattle, WA", "Spokane, WA", "Tacoma, WA", "Olympia, WA"],
      "AZ": ["Phoenix, AZ", "Tucson, AZ", "Mesa, AZ", "Scottsdale, AZ"],
      "MA": ["Boston, MA", "Cambridge, MA", "Worcester, MA", "Springfield, MA"],
      "TN": ["Nashville, TN", "Memphis, TN", "Knoxville, TN", "Chattanooga, TN"],
      "IN": ["Indianapolis, IN", "Fort Wayne, IN", "Evansville, IN", "South Bend, IN"],
      "MO": ["Kansas City, MO", "St. Louis, MO", "Springfield, MO", "Columbia, MO"],
      "MD": ["Baltimore, MD", "Frederick, MD", "Rockville, MD", "Annapolis, MD"],
      "WI": ["Milwaukee, WI", "Madison, WI", "Green Bay, WI", "Kenosha, WI"],
      "CO": ["Denver, CO", "Colorado Springs, CO", "Aurora, CO", "Boulder, CO"],
      "MN": ["Minneapolis, MN", "St. Paul, MN", "Rochester, MN", "Duluth, MN"],
      "SC": ["Columbia, SC", "Charleston, SC", "Greenville, SC", "Myrtle Beach, SC"],
      "AL": ["Birmingham, AL", "Montgomery, AL", "Mobile, AL", "Huntsville, AL"],
      "LA": ["New Orleans, LA", "Baton Rouge, LA", "Shreveport, LA", "Lafayette, LA"],
      "KY": ["Louisville, KY", "Lexington, KY", "Bowling Green, KY", "Owensboro, KY"],
      "OR": ["Portland, OR", "Eugene, OR", "Salem, OR", "Bend, OR"],
      "OK": ["Oklahoma City, OK", "Tulsa, OK", "Norman, OK", "Broken Arrow, OK"],
      "CT": ["Bridgeport, CT", "New Haven, CT", "Hartford, CT", "Stamford, CT"],
      "UT": ["Salt Lake City, UT", "Provo, UT", "Ogden, UT", "St. George, UT"],
      "IA": ["Des Moines, IA", "Cedar Rapids, IA", "Davenport, IA", "Sioux City, IA"],
      "NV": ["Las Vegas, NV", "Reno, NV", "Henderson, NV", "North Las Vegas, NV"],
      "AR": ["Little Rock, AR", "Fort Smith, AR", "Fayetteville, AR", "Jonesboro, AR"],
      "MS": ["Jackson, MS", "Gulfport, MS", "Hattiesburg, MS", "Biloxi, MS"],
      "KS": ["Wichita, KS", "Overland Park, KS", "Kansas City, KS", "Topeka, KS"],
      "NM": ["Albuquerque, NM", "Las Cruces, NM", "Santa Fe, NM", "Roswell, NM"],
      "NE": ["Omaha, NE", "Lincoln, NE", "Bellevue, NE", "Grand Island, NE"],
      "WV": ["Charleston, WV", "Huntington, WV", "Morgantown, WV", "Parkersburg, WV"],
      "ID": ["Boise, ID", "Meridian, ID", "Nampa, ID", "Idaho Falls, ID"],
      "HI": ["Honolulu, HI", "Hilo, HI", "Kailua, HI", "Kahului, HI"],
      "NH": ["Manchester, NH", "Nashua, NH", "Concord, NH", "Portsmouth, NH"],
      "ME": ["Portland, ME", "Lewiston, ME", "Bangor, ME", "Augusta, ME"],
      "RI": ["Providence, RI", "Warwick, RI", "Cranston, RI", "Pawtucket, RI"],
      "MT": ["Billings, MT", "Missoula, MT", "Great Falls, MT", "Bozeman, MT"],
      "DE": ["Wilmington, DE", "Dover, DE", "Newark, DE", "Middletown, DE"],
      "SD": ["Sioux Falls, SD", "Rapid City, SD", "Aberdeen, SD", "Brookings, SD"],
      "ND": ["Fargo, ND", "Bismarck, ND", "Grand Forks, ND", "Minot, ND"],
      "AK": ["Anchorage, AK", "Fairbanks, AK", "Juneau, AK", "Wasilla, AK"],
      "VT": ["Burlington, VT", "Rutland, VT", "Montpelier, VT", "Barre, VT"],
      "WY": ["Cheyenne, WY", "Casper, WY", "Laramie, WY", "Gillette, WY"],
      "DC": ["Washington, DC"],
    };

    // Add nearby cities if provided city is in the list
    if (city && state) {
      const cityState = `${city}, ${state}`;
      const nearby = NEARBY_CITIES[state]?.filter(c => c !== cityState) || [];
      searchLocations.push(...nearby);
    } else if (state && NEARBY_CITIES[state]) {
      // If no city provided, use all major cities in state
      searchLocations.push(...NEARBY_CITIES[state]);
    }

    const queries = NICHE_QUERIES[niche] || [niche.toLowerCase()];

    const discoveredLeads: DiscoveredLead[] = [];
    const seenPlaceIds = new Set<string>(existing_place_ids);
    const seenPhones = new Set<string>(existing_phones.map((p: string) => p.replace(/\D/g, "")));
    let apiCalls = 0;
    let locationsSearched = 0;

    // Track progress for client
    const progress: ProgressUpdate = {
      status: "searching",
      message: "Initializing search...",
      found: 0,
      target: target_count
    };
    for (const location of searchLocations) {
      if (discoveredLeads.length >= target_count) break;
      locationsSearched++;

      for (const queryTemplate of queries) {
        if (discoveredLeads.length >= target_count) break;

        const searchQuery = `${queryTemplate} in ${location}`;
        const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          searchQuery
        )}&key=${GOOGLE_PLACES_API_KEY}`;

      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      apiCalls++;

      if (searchData.status !== "OK" || !searchData.results) {
        console.error(`Search failed for "${searchQuery}":`, searchData.status);
        continue;
      }

      // Get details for each place (limited by target count)
      const placesToProcess = searchData.results.slice(0, Math.min(20, target_count - discoveredLeads.length));

      for (const place of placesToProcess) {
        if (seenPlaceIds.has(place.place_id)) continue;
        if (discoveredLeads.length >= target_count) break;

        // Get detailed info including phone number
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,website,rating,user_ratings_total,formatted_address,address_component&key=${GOOGLE_PLACES_API_KEY}`;

        const detailsRes = await fetch(detailsUrl);
        const detailsData = await detailsRes.json();
        apiCalls++;

        if (detailsData.status !== "OK" || !detailsData.result) continue;

        const details = detailsData.result;

        // Skip if no phone number
        if (!details.formatted_phone_number) continue;

        // Check for duplicate phone
        const normalizedPhone = details.formatted_phone_number.replace(/\D/g, "");
        if (seenPhones.has(normalizedPhone)) continue;
        if (existingPhoneSet.has(normalizedPhone)) continue;

        // Extract city/state from address components
        let foundCity = city;
        let foundState = state;

        if (details.address_components) {
          const cityComponent = details.address_components.find((c: any) =>
            c.types.includes("locality") || c.types.includes("sublocality")
          );
          const stateComponent = details.address_components.find((c: any) =>
            c.types.includes("administrative_area_level_1")
          );

          if (cityComponent) foundCity = cityComponent.long_name;
          if (stateComponent) foundState = stateComponent.short_name;
        }

        seenPlaceIds.add(place.place_id);
        seenPhones.add(normalizedPhone);
        discoveredLeads.push({
          business_name: details.name || place.name,
          phone: details.formatted_phone_number,
          city: foundCity,
          state: foundState,
          address: details.formatted_address || place.formatted_address || "",
          website: details.website || "",
          rating: details.rating || place.rating || 0,
          review_count: details.user_ratings_total || place.user_ratings_total || 0,
          place_id: place.place_id,
          niche: niche,
        });
      }
    }
    }

    // Calculate verification scores with smart mixing
    // Strategy: After every 4 lukewarm leads (<50 score), force find a high-value lead (>=50)
    const leadsWithScores: DiscoveredLead[] = [];
    let lukewarmCount = 0;
    let pendingLeads = [...discoveredLeads];

    for (let i = 0; i < pendingLeads.length; i++) {
      const lead = pendingLeads[i];

      try {
        const searchQuery = `${lead.business_name} ${lead.city}`;
        const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          searchQuery
        )}&key=${GOOGLE_PLACES_API_KEY}`;

        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        apiCalls++;

        let scoreResult = { score: 0, tier: "skip", tierLabel: "Skip" };

        if (searchData.status === "OK" && searchData.results && searchData.results.length > 0) {
          const place = searchData.results[0];
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,rating,user_ratings_total,website,types,photos,business_status&key=${GOOGLE_PLACES_API_KEY}`;

          const detailsRes = await fetch(detailsUrl);
          const detailsData = await detailsRes.json();
          apiCalls++;

          if (detailsData.status === "OK" && detailsData.result) {
            scoreResult = calculateLeadScore({
              place_id: place.place_id,
              name: detailsData.result.name,
              rating: detailsData.result.rating,
              user_ratings_total: detailsData.result.user_ratings_total,
              website: detailsData.result.website,
              types: detailsData.result.types,
              photos: detailsData.result.photos,
              business_status: detailsData.result.business_status,
              formatted_address: lead.address,
            });
          }
        }

        const scoredLead = {
          ...lead,
          verification_score: scoreResult.score,
          verification_tier: scoreResult.tier,
          verification_tier_label: scoreResult.tierLabel,
          verified: scoreResult.score > 0,
        };

        // Smart mixing: every 4 lukewarm leads, prioritize high-value
        if (scoreResult.score >= 50) {
          leadsWithScores.push(scoredLead);
          lukewarmCount = 0; // Reset counter
        } else if (scoreResult.score > 0) {
          lukewarmCount++;

          // If we've collected 4 lukewarm, look for a high-value one in the remaining
          if (lukewarmCount >= 4 && i < pendingLeads.length - 1) {
            // Try to find a high-value lead in the next few
            let foundHighValue = false;
            for (let j = i + 1; j < Math.min(i + 6, pendingLeads.length); j++) {
              const nextLead = pendingLeads[j];
              // Quick score check for remaining leads
              const quickQuery = `${nextLead.business_name} ${nextLead.city}`;
              const quickUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(quickQuery)}&key=${GOOGLE_PLACES_API_KEY}`;

              try {
                const quickRes = await fetch(quickUrl);
                const quickData = await quickRes.json();
                apiCalls++;

                if (quickData.status === "OK" && quickData.results?.length > 0) {
                  const quickPlace = quickData.results[0];
                  const quickDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${quickPlace.place_id}&fields=name,rating,user_ratings_total,website,types,photos,business_status&key=${GOOGLE_PLACES_API_KEY}`;

                  const quickDetailsRes = await fetch(quickDetailsUrl);
                  const quickDetailsData = await quickDetailsRes.json();
                  apiCalls++;

                  if (quickDetailsData.status === "OK" && quickDetailsData.result) {
                    const quickResult = calculateLeadScore({
                      place_id: quickPlace.place_id,
                      name: quickDetailsData.result.name,
                      rating: quickDetailsData.result.rating,
                      user_ratings_total: quickDetailsData.result.user_ratings_total,
                      website: quickDetailsData.result.website,
                      types: quickDetailsData.result.types,
                      photos: quickDetailsData.result.photos,
                      business_status: quickDetailsData.result.business_status,
                      formatted_address: nextLead.address,
                    });

                    if (quickResult.score >= 50) {
                      // Found high-value lead! Swap it in
                      const highValueLead = {
                        ...nextLead,
                        verification_score: quickResult.score,
                        verification_tier: quickResult.tier,
                        verification_tier_label: quickResult.tierLabel,
                        verified: true,
                      };
                      leadsWithScores.push(highValueLead);
                      pendingLeads.splice(j, 1); // Remove from pending
                      i--; // Adjust index since we removed an item
                      foundHighValue = true;
                      lukewarmCount = 0;
                      break;
                    }
                  }
                }
              } catch (e) {
                // Continue to next
              }
            }

            if (!foundHighValue) {
              // No high-value found, just add this lukewarm
              leadsWithScores.push(scoredLead);
            }
          } else {
            leadsWithScores.push(scoredLead);
          }
        } else {
          // Skip leads with 0 score (unverified)
        }
      } catch (err) {
        // Skip on error
      }
    }

    // Final filtering: remove any remaining duplicates by phone
    const finalLeads: DiscoveredLead[] = [];
    const finalPhones = new Set<string>();

    for (const lead of leadsWithScores) {
      const normalizedPhone = lead.phone.replace(/\D/g, "");
      if (!finalPhones.has(normalizedPhone) && !existingPhoneSet.has(normalizedPhone)) {
        finalPhones.add(normalizedPhone);
        finalLeads.push(lead);
      }
    }

    return NextResponse.json({
      leads: finalLeads,
      total_found: finalLeads.length,
      api_calls: apiCalls,
      estimated_cost: (apiCalls * 0.017).toFixed(2),
      search_location: city ? `${city}, ${state}` : state,
      locations_searched: locationsSearched,
      niche: niche,
      duplicates_filtered: discoveredLeads.length - finalLeads.length,
      high_value_count: finalLeads.filter(l => (l.verification_score || 0) >= 50).length,
    });

  } catch (error) {
    console.error("Discovery error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
