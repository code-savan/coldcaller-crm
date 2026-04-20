import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

// Force dynamic rendering to avoid static generation errors
export const dynamic = 'force-dynamic';

const { AccessToken } = twilio.jwt;
const { VoiceGrant } = AccessToken;

export async function GET(request: NextRequest) {
  try {
    // Get username from query params
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // Get environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    console.log("[Twilio Token] Request for user:", username);
    console.log("[Twilio Token] Env vars check:", {
      hasAccountSid: !!accountSid,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
      hasTwimlAppSid: !!twimlAppSid,
      hasPhoneNumber: !!phoneNumber,
      accountSidPrefix: accountSid ? accountSid.substring(0, 6) : 'missing',
    });

    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
      console.error("[Twilio Token] Missing required Twilio environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Create access token
    const token = new AccessToken(accountSid, apiKey, apiSecret, {
      identity: username,
      ttl: 3600, // 1 hour
    });

    // Create voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    });

    // Add grant to token
    token.addGrant(voiceGrant);

    // Return token
    return NextResponse.json({
      token: token.toJwt(),
    });
  } catch (error) {
    console.error("Error generating token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
