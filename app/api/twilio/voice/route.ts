import { NextRequest, NextResponse } from "next/server";
import { twiml } from "twilio";

export async function POST(request: NextRequest) {
  try {
    // Parse form data from Twilio webhook
    const formData = await request.formData();
    // Handle both uppercase and lowercase parameter names
    const to = (formData.get("To") || formData.get("to")) as string;
    const direction = (formData.get("Direction") || formData.get("direction")) as string;
    const callStatus = (formData.get("CallStatus") || formData.get("callStatus")) as string;
    const from = (formData.get("From") || formData.get("from")) as string;
    const callSid = (formData.get("CallSid") || formData.get("callSid")) as string;

    // Create TwiML response
    const voiceResponse = new twiml.VoiceResponse();

    // Log all parameters for debugging
    const allParams: Record<string, string> = {};
    formData.forEach((value, key) => {
      allParams[key] = value.toString();
    });
    console.log("[Twilio Voice Webhook] All params:", allParams);
    console.log("[Twilio Voice Webhook] Direction:", direction, "To:", to, "From:", from, "CallSid:", callSid, "CallStatus:", callStatus);

    if (direction === "inbound") {
      // Inbound call - route to the client (username is the To parameter)
      if (to) {
        voiceResponse.dial().client(to);
      } else {
        voiceResponse.say("Sorry, we could not route your call. Goodbye.");
      }
    } else {
      // Outbound call - dial the number
      const callerId = process.env.TWILIO_PHONE_NUMBER;

      // Clean and format the phone number to E.164
      let cleanTo = to?.trim().replace(/\s/g, "").replace(/[^\d+]/g, "") || "";
      if (cleanTo && !cleanTo.startsWith("+")) {
        // Assume US number if no country code
        cleanTo = "+" + cleanTo.replace(/^1/, "").replace(/^(\d{10})$/, "1$1");
      }

      console.log("[Twilio Voice Webhook] CallerId:", callerId, "Raw To:", to, "Clean To:", cleanTo);

      if (!callerId) {
        console.error("[Twilio Voice Webhook] Missing TWILIO_PHONE_NUMBER environment variable");
        voiceResponse.say("Sorry, the call cannot be completed. Goodbye.");
      } else if (!cleanTo || cleanTo.length < 10) {
        console.error("[Twilio Voice Webhook] Invalid destination number:", cleanTo);
        voiceResponse.say("Sorry, invalid phone number. Goodbye.");
      } else {
        // Remove answerOnBridge to prevent early disconnects
        voiceResponse.dial({ callerId, timeout: 30 }).number(cleanTo);
        console.log("[Twilio Voice Webhook] Dialing number:", cleanTo, "from:", callerId);
      }
    }

    // Return TwiML XML response
    return new NextResponse(voiceResponse.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    console.error("Error handling voice webhook:", error);

    // Return error TwiML
    const voiceResponse = new twiml.VoiceResponse();
    voiceResponse.say("Sorry, an error occurred. Please try again later.");

    return new NextResponse(voiceResponse.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
      status: 500,
    });
  }
}
