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

    // Try multiple edge locations for better connectivity
    const edges = ["ashburn", "dublin", "singapore", "sydney", "roaming"];
    let lastError = null;

    for (const edge of edges) {
      try {
        console.log(`[TwilioDevice] Trying edge: ${edge}`);

        // Initialize device with edge location
        deviceInstance = new Device(token, {
          codecPreferences: ["opus", "pcmu"] as any,
          enableRingingState: true,
          edge: edge,
          maxCallSignalingTimeoutMs: 30000,
        } as any);

        // Try to register
        await deviceInstance.register();
        console.log(`[TwilioDevice] Successfully registered on edge: ${edge}`);
        break; // Success, exit the loop
      } catch (error) {
        console.error(`[TwilioDevice] Failed to register on ${edge}:`, error);
        lastError = error;

        // Destroy failed device before trying next edge
        if (deviceInstance) {
          try {
            deviceInstance.destroy();
          } catch (e) {
            // Ignore destroy errors
          }
          deviceInstance = null;
        }

        // Continue to next edge
        continue;
      }
    }

    if (!deviceInstance) {
      console.error("[TwilioDevice] Failed to register on all edges");
      throw lastError || new Error("Failed to initialize Twilio device on any edge");
    }

    // Register event handlers
    deviceInstance.on("registered", () => {
      console.log("[TwilioDevice] Device registered successfully");
    });

    deviceInstance.on("error", (error) => {
      console.error("[TwilioDevice] Device error:", error);
      // Check for specific error types
      if (error.message?.includes("websocket") || error.message?.includes("WebSocket")) {
        toast.error("Network error — WebSocket connection failed. Check firewall/VPN.");
      } else {
        toast.error("Connection error — check your internet");
      }
    });

    deviceInstance.on("unregistered", () => {
      console.warn("[TwilioDevice] Device unregistered");
    });

    deviceInstance.on("connecting", (connection) => {
      console.log("[TwilioDevice] Connecting:", connection);
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
