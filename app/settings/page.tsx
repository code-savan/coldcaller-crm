"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User,
  Mail,
  Bell,
  Palette,
  Save,
  Loader2,
  Check,
  AlertTriangle,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

interface UserData {
  id: string;
  username: string;
  email: string;
  name: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Preferences
  const [dailyGoal, setDailyGoal] = useState(50);
  const [autoSave, setAutoSave] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username) {
      router.push("/login");
      return;
    }

    // Fetch user data from PocketBase
    const fetchUser = async () => {
      try {
        const userData = await pb.collection("users").getFirstListItem(`username="${username}"`);
        if (userData) {
          setUser({
            id: userData.id,
            username: userData.username,
            email: userData.email || "",
            name: userData.name || "",
          });
          setName(userData.name || "");
          setEmail(userData.email || "");
        }
      } catch (err) {
        console.error("Failed to fetch user:", err);
        toast.error("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // Load preferences from localStorage
    const prefs = localStorage.getItem("userPreferences");
    if (prefs) {
      const parsed = JSON.parse(prefs);
      setDailyGoal(parsed.dailyGoal || 50);
      setAutoSave(parsed.autoSave !== false);
      setSoundEnabled(parsed.soundEnabled !== false);
    }
  }, [router]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await pb.collection("users").update(user.id, {
        name,
        email,
      });
      // Update local state
      setUser({ ...user, name, email });
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error("Failed to update profile");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = () => {
    const prefs = { dailyGoal, autoSave, soundEnabled };
    localStorage.setItem("userPreferences", JSON.stringify(prefs));
    toast.success("Preferences saved");
  };

  const clearAllData = async () => {
    if (!user) return;
    if (!confirm("This will delete ALL your leads. This cannot be undone. Continue?")) return;
    if (!confirm("Are you absolutely sure? All leads will be permanently deleted.")) return;

    try {
      const leads = await pb.collection("leads").getFullList({
        filter: `username = "${user.username}"`,
      });

      for (const lead of leads) {
        await pb.collection("leads").delete(lead.id);
      }

      toast.success(`Deleted ${leads.length} leads`);
    } catch (err) {
      toast.error("Failed to clear data");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Profile Card */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="h-5 w-5 text-violet-500" />
              Profile
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Manage your account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Display Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="bg-zinc-950 border-zinc-800 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="bg-zinc-950 border-zinc-800 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Username</label>
              <Input
                value={user.username}
                disabled
                className="bg-zinc-950 border-zinc-800 text-zinc-500 cursor-not-allowed"
              />
              <p className="text-xs text-zinc-500">Username cannot be changed</p>
            </div>
            <Button
              onClick={saveProfile}
              disabled={saving}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Profile
            </Button>
          </CardContent>
        </Card>

        {/* Preferences Card */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Palette className="h-5 w-5 text-violet-500" />
              Preferences
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Customize your experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Daily Call Goal</label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(parseInt(e.target.value) || 50)}
                  className="bg-zinc-950 border-zinc-800 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400 flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Sound Effects
                </label>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      soundEnabled ? "bg-violet-600" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        soundEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-zinc-400">{soundEnabled ? "On" : "Off"}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Auto-Save
                </label>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setAutoSave(!autoSave)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      autoSave ? "bg-violet-600" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoSave ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-zinc-400">{autoSave ? "On" : "Off"}</span>
                </div>
              </div>
            </div>
            <Button
              onClick={savePreferences}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Preferences
            </Button>
          </CardContent>
        </Card>

        {/* Data Management Card */}
        <Card className="bg-zinc-900/50 border-red-900/30">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Destructive actions that cannot be undone
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-950/20 rounded-lg border border-red-900/30">
              <div>
                <h4 className="text-white font-medium">Clear All Leads</h4>
                <p className="text-sm text-zinc-500">Delete all leads permanently</p>
              </div>
              <Button
                onClick={clearAllData}
                variant="outline"
                className="border-red-600 text-red-400 hover:bg-red-950/30 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
