import { NextRequest, NextResponse } from "next/server";
import { calculateLeadScore } from "@/lib/scoring";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { business_name, city } = await req.json();

    if (!business_name || !city) {
      return NextResponse.json(
        { error: "business_name and city are required" },
        { status: 400 }
      );
    }

    if (!GOOGLE_PLACES_API_KEY) {
      return NextResponse.json(
        { error: "Google Places API key not configured" },
        { status: 500 }
      );
    }

    // Search for the business
    const searchQuery = `${business_name} ${city}`;
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      searchQuery
    )}&key=${GOOGLE_PLACES_API_KEY}`;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    console.log("Google Places Search Status:", searchData.status);
    console.log("Results count:", searchData.results?.length || 0);

    if (searchData.status !== "OK") {
      console.error("Google Places API error:", searchData.status, searchData.error_message);
      return NextResponse.json({
        found: false,
        score: 0,
        tier: "skip",
        tierLabel: "Skip",
        tierEmoji: "❌",
        data: null,
        error: `Google API: ${searchData.status}`,
        errorMessage: searchData.error_message || "Unknown error",
      });
    }

    if (!searchData.results || searchData.results.length === 0) {
      return NextResponse.json({
        found: false,
        score: 0,
        tier: "skip",
        tierLabel: "Skip",
        tierEmoji: "❌",
        data: null,
        error: "No results found",
      });
    }

    const place = searchData.results[0];

    // Get detailed place info
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,rating,user_ratings_total,website,types,photos,business_status,formatted_address&key=${GOOGLE_PLACES_API_KEY}`;

    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    const placeDetails = detailsData.result || place;

    // Calculate score
    const result = calculateLeadScore({
      place_id: place.place_id,
      name: placeDetails.name,
      rating: placeDetails.rating,
      user_ratings_total: placeDetails.user_ratings_total,
      website: placeDetails.website,
      types: placeDetails.types,
      photos: placeDetails.photos,
      business_status: placeDetails.business_status,
      formatted_address: placeDetails.formatted_address,
    });

    return NextResponse.json({
      found: true,
      score: result.score,
      tier: result.tier,
      tierLabel: result.tierLabel,
      tierEmoji: result.tierEmoji,
      data: result.data,
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
