"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (val: string) => {
    if (!val.trim()) {
      return "Email is required.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val.trim())) {
      return "Please enter a valid email address.";
    }
    return "";
  };

  const validatePassword = (val: string) => {
    if (!val) {
      return "Password is required.";
    }
    return "";
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (emailError) setEmailError(validateEmail(val));
    if (generalError) setGeneralError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (passwordError) setPasswordError(validatePassword(val));
    if (generalError) setGeneralError("");
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGeneralError("");

    const errEmail = validateEmail(email);
    const errPass = validatePassword(password);

    setEmailError(errEmail);
    setPasswordError(errPass);

    if (errEmail || errPass) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn.email({
        email: email.trim(),
        password,
      });

      if (result?.error) {
        setGeneralError(result.error.message || "Invalid email or password.");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setGeneralError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      await signIn.social({ provider: "google", callbackURL: callbackUrl });
    } catch {
      setGeneralError("Failed to sign in with Google.");
    }
  };

  return (
    <Card className="rounded-2xl border border-border/80 bg-card/95 shadow-xl backdrop-blur-sm">
      <CardContent className="p-6 space-y-5">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Welcome back</h2>
          <p className="text-xs text-muted-foreground">Sign in to continue your wellness journey</p>
        </div>

        {generalError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email field */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={() => setEmailError(validateEmail(email))}
                className={`h-10 rounded-xl pl-10 text-sm transition-colors ${
                  emailError ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
              />
            </div>
            {emailError && <p className="text-[11px] font-medium text-destructive mt-1">{emailError}</p>}
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-foreground">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={handlePasswordChange}
                onBlur={() => setPasswordError(validatePassword(password))}
                className={`h-10 rounded-xl pl-10 pr-10 text-sm transition-colors ${
                  passwordError ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {passwordError && <p className="text-[11px] font-medium text-destructive mt-1">{passwordError}</p>}
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="h-10 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm transition-all"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Signing in…
              </span>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">or</span>
          <div className="h-px flex-1 bg-border/60" />
        </div>

        {/* Google SSO */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          className="h-10 w-full rounded-xl text-sm font-medium border-border/80 hover:bg-muted/50"
        >
          <svg className="mr-2 size-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continue with Google
        </Button>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
            Create one
          </Link>
        </p>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground/70">
          MindEase is a wellness tool and not a replacement for medical care.
        </p>
      </CardContent>
    </Card>
  );
}