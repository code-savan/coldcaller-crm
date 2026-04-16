"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { pb, User } from "@/lib/pocketbase";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (stored) {
      setUsername(stored);
    }
  }, []);

  const handleLogin = async () => {
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Check if user exists
      const existing = await pb.collection("users").getList(1, 1, {
        filter: `username = "${username.trim()}"`,
      });

      let user: User;

      if (existing.items.length === 0) {
        // Create new user
        user = await pb.collection("users").create({
          username: username.trim(),
          is_admin: false,
          session_active: false,
        }) as unknown as User;
      } else {
        user = existing.items[0] as unknown as User;
      }

      // Store username and admin status
      localStorage.setItem("username", username.trim());
      localStorage.setItem("isAdmin", user.is_admin ? "true" : "false");

      // Redirect based on admin status
      if (user.is_admin) {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold gradient-text">
            CallFlow
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Lead Management & Dialer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Enter your username
            </label>
            <Input
              placeholder="e.g., john.smith"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">
              New users are created automatically. No password needed.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-12 text-base"
          >
            {loading ? "Loading..." : "Get Started"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
