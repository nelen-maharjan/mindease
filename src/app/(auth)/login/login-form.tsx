"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { signIn } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

import { Eye, EyeOff } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const callbackUrl = params.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Invalid email or password.");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Failed to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to continue your wellness journey.
        </p>
      </div>

      {/* Card */}
      <Card className="rounded-2xl border border-border bg-card shadow-xl">
        <CardContent className="p-6 space-y-4">

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <Label>Email</Label>

              <Input
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">

              <div className="flex items-center justify-between">
                <Label>Password</Label>

                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-emerald-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl pr-12"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full rounded-xl bg-emerald-600 font-medium text-white shadow-sm hover:bg-emerald-700"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 py-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Google */}
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl"
          >
            Continue with Google
          </Button>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-emerald-600 hover:underline"
            >
              Create one
            </Link>
          </p>

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            MindEase is a wellness tool and not a medical service.
            If you are experiencing a mental health emergency, seek
            professional help immediately.
          </p>

        </CardContent>
      </Card>
    </div>
  );
}