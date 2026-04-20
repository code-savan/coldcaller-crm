import { NextRequest, NextResponse } from "next/server";
import { twiml } from "twilio";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const callDuration = formData.get("CallDuration") as string;
    const recordingUrl = formData.get("RecordingUrl") as string;
    const dialCallStatus = formData.get("DialCallStatus") as string;
    const dialCallSid = formData.get("DialCallSid") as string;
    
    console.log("[Twilio Call Status] CallSid:", callSid, "Status:", callStatus, "DialStatus:", dialCallStatus, "Duration:", callDuration);

    // Create empty response (just acknowledge receipt)
    const voiceResponse = new twiml.VoiceResponse();
    
    return new NextResponse(voiceResponse.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    console.error("[Twilio Call Status] Error:", error);
    
    const voiceResponse = new twiml.VoiceResponse();
    return new NextResponse(voiceResponse.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }
}
