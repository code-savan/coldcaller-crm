import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { to, from } = await request.json();

    console.log("[Twilio REST Call] Request:", { to, from });

    // Validate environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
    const callerId = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twimlAppSid || !callerId) {
      console.error("[Twilio REST Call] Missing env vars:", {
        hasAccountSid: !!accountSid,
        hasAuthToken: !!authToken,
        hasTwimlAppSid: !!twimlAppSid,
        hasCallerId: !!callerId,
      });
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Clean the phone number
    let cleanTo = to?.trim().replace(/\s/g, "").replace(/[^\d+]/g, "") || "";
    if (cleanTo && !cleanTo.startsWith("+")) {
      cleanTo = "+" + cleanTo.replace(/^1/, "").replace(/^(\d{10})$/, "1$1");
    }

    if (!cleanTo || cleanTo.length < 10) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      );
    }

    // Create Twilio client
    const client = twilio(accountSid, authToken);

    // Make the call using the TwiML App
    const call = await client.calls.create({
      to: cleanTo,
      from: callerId,
      applicationSid: twimlAppSid,
    });

    console.log("[Twilio REST Call] Success:", {
      sid: call.sid,
      status: call.status,
      to: call.to,
      from: call.from,
    });

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      status: call.status,
    });
  } catch (error: any) {
    console.error("[Twilio REST Call] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create call" },
      { status: 500 }
    );
  }
}
