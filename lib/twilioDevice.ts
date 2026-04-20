import { Device } from "@twilio/voice-sdk";
import { toast } from "sonner";

let deviceInstance: Device | null = null;
let tokenRefreshInterval: NodeJS.Timeout | null = null;
let username: string | null = null;

export async function initDevice(user: string): Promise<Device | null> {
  try {
    // If already initialized with same user, return existing
    if (deviceInstance && username === user) {
      return deviceInstance;
    }

    // If initialized with different user, destroy first
    if (deviceInstance) {
      await destroyDevice();
    }

    username = user;

    // Fetch access token
    const response = await fetch(`/api/twilio/token?username=${encodeURIComponent(user)}`);
    if (!response.ok) {
      throw new Error("Failed to fetch token");
    }

    const { token } = await response.json();
    console.log("[TwilioDevice] Token received, length:", token.length);

    // Initialize device
    deviceInstance = new Device(token, {
      codecPreferences: ["opus", "pcmu"] as any,
      enableRingingState: true,
    } as any);

    // Register event handlers
    deviceInstance.on("registered", () => {
      console.log("[TwilioDevice] Device registered successfully");
    });

    deviceInstance.on("error", (error) => {
      console.error("[TwilioDevice] Device error:", error);
      toast.error("Connection error — check your internet");
    });

    deviceInstance.on("connect", (connection) => {
      console.log("[TwilioDevice] Connection established:", connection);
    });

    deviceInstance.on("disconnect", (connection) => {
      console.log("[TwilioDevice] Connection disconnected:", connection);
    });

    deviceInstance.on("incoming", (call) => {
      console.log("[TwilioDevice] Incoming call:", call);

      // Import dynamically to avoid circular dependency
      const { useCallStore } = require("./callState");
      const store = useCallStore.getState();

      // If there's already an active call, reject incoming and show toast
      if (store.activeCall) {
        toast.info("Incoming call — finish current call first");
        call.reject();
        return;
      }

      // Set incoming call in store
      store.setIncomingCall(call);
    });

    // Register device
    await deviceInstance.register();

    // Set up token refresh every 55 minutes
    setupTokenRefresh(user);

    return deviceInstance;
  } catch (error) {
    console.error("Failed to initialize Twilio device:", error);
    toast.error("Failed to initialize calling");
    return null;
  }
}

export function getDevice(): Device | null {
  return deviceInstance;
}

export async function destroyDevice(): Promise<void> {
  // Clear refresh interval
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
  }

  // Destroy device instance
  if (deviceInstance) {
    try {
      deviceInstance.destroy();
    } catch (error) {
      console.error("Error destroying device:", error);
    }
    deviceInstance = null;
  }

  username = null;
}

function setupTokenRefresh(user: string): void {
  // Clear any existing interval
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
  }

  // Refresh token every 55 minutes (3300000 ms)
  tokenRefreshInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/twilio/token?username=${encodeURIComponent(user)}`);
      if (!response.ok) {
        throw new Error("Failed to refresh token");
      }

      const { token } = await response.json();

      // Update device with new token
      if (deviceInstance) {
        deviceInstance.updateToken(token);
      }
    } catch (error) {
      console.error("Failed to refresh token:", error);
      toast.error("Connection error — check your internet");
    }
  }, 55 * 60 * 1000); // 55 minutes
}

// Helper to check if device is ready
export function isDeviceReady(): boolean {
  return deviceInstance !== null && deviceInstance.state === "registered";
}
