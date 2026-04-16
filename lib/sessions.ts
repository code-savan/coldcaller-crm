// Session management utilities for localStorage and PocketBase
import { pb } from "./pocketbase";

export interface SessionCall {
  leadId: string;
  businessName: string;
  phone: string;
  status: string;
  timestamp: string;
  notes?: string;
}

export interface SessionData {
  id: string;
  username: string;
  startTime: string;
  endTime?: string;
  totalPausedTimeMs: number;
  lastPauseTime?: string;
  status: 'active' | 'paused' | 'completed';
  calls: SessionCall[];
  // Stats summary
  totalCalls: number;
  answered: number;
  voicemails: number;
  noAnswers: number;
  notInterested: number;
  callbacks: number;
  gatekeepers: number;
}

const SESSIONS_KEY = 'callflow_sessions';
const CURRENT_SESSION_KEY = 'callflow_current_session';

export function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function createSession(username: string): Promise<SessionData> {
  const session: SessionData = {
    id: generateSessionId(),
    username,
    startTime: new Date().toISOString(),
    totalPausedTimeMs: 0,
    status: 'active',
    calls: [],
    totalCalls: 0,
    answered: 0,
    voicemails: 0,
    noAnswers: 0,
    notInterested: 0,
    callbacks: 0,
    gatekeepers: 0,
  };

  localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));

  // Update user's session status in PocketBase
  await updateUserSessionStatus(username, true);

  return session;
}

export function getCurrentSession(): SessionData | null {
  const stored = localStorage.getItem(CURRENT_SESSION_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as SessionData;
  } catch {
    return null;
  }
}

export function pauseSession(): SessionData | null {
  const session = getCurrentSession();
  if (!session || session.status !== 'active') return null;

  session.status = 'paused';
  session.lastPauseTime = new Date().toISOString();

  localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function resumeSession(): SessionData | null {
  const session = getCurrentSession();
  if (!session || session.status !== 'paused') return null;

  // Calculate paused duration
  if (session.lastPauseTime) {
    const pauseStart = new Date(session.lastPauseTime).getTime();
    const now = Date.now();
    session.totalPausedTimeMs += now - pauseStart;
  }

  session.status = 'active';
  session.lastPauseTime = undefined;

  localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function endSession(): Promise<SessionData | null> {
  const session = getCurrentSession();
  if (!session) return null;

  // If currently paused, add final paused time
  if (session.status === 'paused' && session.lastPauseTime) {
    const pauseStart = new Date(session.lastPauseTime).getTime();
    session.totalPausedTimeMs += Date.now() - pauseStart;
  }

  session.status = 'completed';
  session.endTime = new Date().toISOString();

  // Save to sessions history (localStorage)
  const sessions = getAllSessions();
  sessions.unshift(session);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));

  // Also save to PocketBase
  const saved = await saveSessionToDB(session);
  if (saved) {
    console.log("Session saved to database");
  } else {
    console.warn("Failed to save session to database");
  }

  // Update user's session status in PocketBase
  await updateUserSessionStatus(session.username, false);

  // Clear current session
  localStorage.removeItem(CURRENT_SESSION_KEY);

  return session;
}

export function logCall(sessionId: string, call: SessionCall): SessionData | null {
  const session = getCurrentSession();
  if (!session || session.id !== sessionId) return null;

  session.calls.push(call);
  session.totalCalls++;

  // Update stats based on status
  switch (call.status) {
    case 'answered':
      session.answered++;
      break;
    case 'voicemail':
      session.voicemails++;
      break;
    case 'no_answer':
      session.noAnswers++;
      break;
    case 'not_interested':
      session.notInterested++;
      break;
    case 'callback':
      session.callbacks++;
      break;
    case 'gatekeeper':
      session.gatekeepers++;
      break;
  }

  localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getAllSessions(): SessionData[] {
  const stored = localStorage.getItem(SESSIONS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as SessionData[];
  } catch {
    return [];
  }
}

export function getSessionById(id: string): SessionData | null {
  const sessions = getAllSessions();
  return sessions.find(s => s.id === id) || null;
}

export function deleteSession(id: string): boolean {
  const sessions = getAllSessions();
  const filtered = sessions.filter(s => s.id !== id);
  if (filtered.length === sessions.length) return false;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
  return true;
}

// PocketBase sync functions
export async function saveSessionToDB(session: SessionData): Promise<boolean> {
  try {
    const sessionData = {
      username: session.username,
      date: session.startTime.split('T')[0], // YYYY-MM-DD format
      start_time: session.startTime,
      end_time: session.endTime || null,
      total_paused_time_ms: session.totalPausedTimeMs,
      status: session.status,
      calls_made: session.totalCalls,
      answered: session.answered,
      voicemails: session.voicemails,
      no_answers: session.noAnswers,
      not_interested: session.notInterested,
      callbacks: session.callbacks,
      gatekeepers: session.gatekeepers,
      calls: JSON.stringify(session.calls), // Store full call details as JSON
    };

    console.log("Saving session to DB:", sessionData);
    const result = await pb.collection("sessions").create(sessionData);
    console.log("Session saved successfully:", result.id);
    return true;
  } catch (err: any) {
    console.error("Failed to save session to database:");
    console.error("Error:", err);
    if (err.response) {
      console.error("Response data:", err.response.data);
      console.error("Response status:", err.response.status);
    }
    return false;
  }
}

export async function loadSessionsFromDB(username: string): Promise<SessionData[]> {
  try {
    const result = await pb.collection("sessions").getFullList({
      filter: `username = "${username}"`,
      sort: "-created",
    });

    // Map PocketBase records to SessionData format
    return result.map((record: any) => mapDBRecordToSessionData(record));
  } catch (err) {
    console.error("Failed to load sessions from database:", err);
    return [];
  }
}

// Helper to map DB record to SessionData
function mapDBRecordToSessionData(record: any): SessionData {
  // Parse calls JSON if present
  let calls: SessionCall[] = [];
  if (record.calls) {
    try {
      calls = JSON.parse(record.calls);
    } catch {
      calls = [];
    }
  }

  return {
    id: `db_${record.id}`,
    username: record.username,
    startTime: record.start_time || record.date + "T00:00:00.000Z",
    endTime: record.end_time || undefined,
    totalPausedTimeMs: record.total_paused_time_ms || 0,
    status: (record.status || 'completed') as 'active' | 'paused' | 'completed',
    calls: calls,
    totalCalls: record.calls_made || 0,
    answered: record.answered || 0,
    voicemails: record.voicemails || 0,
    noAnswers: record.no_answers || 0,
    notInterested: record.not_interested || 0,
    callbacks: record.callbacks || 0,
    gatekeepers: record.gatekeepers || 0,
  };
}

// Fetch single session from DB by ID (without db_ prefix)
export async function getSessionFromDB(sessionId: string): Promise<SessionData | null> {
  try {
    // Remove db_ prefix if present
    const dbId = sessionId.startsWith('db_') ? sessionId.slice(3) : sessionId;
    const record = await pb.collection("sessions").getOne(dbId);
    return mapDBRecordToSessionData(record);
  } catch (err) {
    console.error("Failed to load session from database:", err);
    return null;
  }
}

// Time calculations
export function getSessionDuration(session: SessionData): number {
  const start = new Date(session.startTime).getTime();
  const end = session.endTime ? new Date(session.endTime).getTime() : Date.now();
  return end - start;
}

export function getActiveDuration(session: SessionData): number {
  const totalDuration = getSessionDuration(session);
  return Math.max(0, totalDuration - session.totalPausedTimeMs);
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${seconds}s`;
  }
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// User session status tracking for admin view
export async function updateUserSessionStatus(username: string, sessionActive: boolean): Promise<boolean> {
  try {
    // Find user by username
    const users = await pb.collection("users").getList(1, 1, {
      filter: `username = "${username}"`,
    });

    if (users.items.length === 0) {
      console.warn("User not found for session status update:", username);
      return false;
    }

    const userId = users.items[0].id;

    await pb.collection("users").update(userId, {
      session_active: sessionActive,
      last_active: new Date().toISOString(),
    });

    return true;
  } catch (err) {
    console.error("Failed to update user session status:", err);
    return false;
  }
}

export async function updateUserLastActive(username: string): Promise<boolean> {
  try {
    // Find user by username
    const users = await pb.collection("users").getList(1, 1, {
      filter: `username = "${username}"`,
    });

    if (users.items.length === 0) {
      console.warn("User not found for last active update:", username);
      return false;
    }

    const userId = users.items[0].id;

    await pb.collection("users").update(userId, {
      last_active: new Date().toISOString(),
    });

    return true;
  } catch (err) {
    console.error("Failed to update user last active:", err);
    return false;
  }
}
