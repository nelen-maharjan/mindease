"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { signUp } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await signUp.email({
        name,
        email,
        password,
      });

      if (res?.error) {
        setError(res.error.message || "Something went wrong.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Failed to create account. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Start building healthier habits today.
          </p>
        </div>

        <Card className="w-full rounded-2xl border border-border shadow-xl bg-card">
          <CardContent className="p-6 space-y-4">

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Name */}
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  autoComplete="name"
                  required
                  className="h-11 rounded-xl"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="h-11 rounded-xl"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label>Password</Label>

                <div className="relative">
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    required
                    className="h-11 rounded-xl pr-12"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label>Confirm Password</Label>

                <div className="relative">
                  <Input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    required
                    className="h-11 rounded-xl pr-12"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((v) => !v)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
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
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
              >
                {isLoading ? "Creating account..." : "Create Account"}
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
              className="w-full h-11 rounded-xl"
            >
              Continue with Google
            </Button>

            {/* Footer */}
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-emerald-600 font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>

            <p className="text-center text-xs text-muted-foreground leading-relaxed">
              MindEase is a wellness tool and not a medical service.
              If you are experiencing a mental health emergency, seek
              professional help immediately.
            </p>
          </CardContent>
        </Card>
    </div>
  );
}