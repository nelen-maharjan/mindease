"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp, signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const validateName = (val: string) => {
    if (!val.trim()) return "Full name is required.";
    if (val.trim().length < 2) return "Name must be at least 2 characters.";
    return "";
  };

  const validateEmail = (val: string) => {
    if (!val.trim()) return "Email address is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val.trim())) return "Please enter a valid email address.";
    return "";
  };

  const validatePassword = (val: string) => {
    if (!val) return "Password is required.";
    if (val.length < 8) return "Password must be at least 8 characters.";
    return "";
  };

  const validateConfirmPassword = (val: string, pass: string) => {
    if (!val) return "Please confirm your password.";
    if (val !== pass) return "Passwords do not match.";
    return "";
  };

  // Password strength score (0 to 4)
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return { score: 0, label: "", color: "bg-muted" };
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-destructive" };
    if (score === 2 || score === 3) return { score: 2, label: "Medium", color: "bg-amber-500" };
    return { score: 3, label: "Strong", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength(password);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGeneralError("");

    const errName = validateName(name);
    const errEmail = validateEmail(email);
    const errPass = validatePassword(password);
    const errConfirm = validateConfirmPassword(confirmPassword, password);

    setNameError(errName);
    setEmailError(errEmail);
    setPasswordError(errPass);
    setConfirmPasswordError(errConfirm);

    if (errName || errEmail || errPass || errConfirm) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (res?.error) {
        setGeneralError(res.error.message || "Failed to create account.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setGeneralError("Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="rounded-2xl border border-border/80 bg-card/95 shadow-xl backdrop-blur-sm">
      <CardContent className="p-6 space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Create your account</h2>
          <p className="text-xs text-muted-foreground">Start building healthier habits today</p>
        </div>

        {generalError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
          {/* Full Name */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-foreground">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(validateName(e.target.value));
                }}
                onBlur={() => setNameError(validateName(name))}
                placeholder="John Doe"
                autoComplete="name"
                className={`h-10 rounded-xl pl-10 text-sm transition-colors ${
                  nameError ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
              />
            </div>
            {nameError && <p className="text-[11px] font-medium text-destructive mt-0.5">{nameError}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-foreground">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(validateEmail(e.target.value));
                }}
                onBlur={() => setEmailError(validateEmail(email))}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className={`h-10 rounded-xl pl-10 text-sm transition-colors ${
                  emailError ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
              />
            </div>
            {emailError && <p className="text-[11px] font-medium text-destructive mt-0.5">{emailError}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-foreground">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(validatePassword(e.target.value));
                  if (confirmPassword) setConfirmPasswordError(validateConfirmPassword(confirmPassword, e.target.value));
                }}
                onBlur={() => setPasswordError(validatePassword(password))}
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                autoComplete="new-password"
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

            {/* Strength indicator */}
            {password && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Strength:</span>
                  <span className="font-medium">{strength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex gap-1">
                  <div className={`h-full flex-1 transition-all ${strength.score >= 1 ? strength.color : "bg-muted"}`} />
                  <div className={`h-full flex-1 transition-all ${strength.score >= 2 ? strength.color : "bg-muted"}`} />
                  <div className={`h-full flex-1 transition-all ${strength.score >= 3 ? strength.color : "bg-muted"}`} />
                </div>
              </div>
            )}
            {passwordError && <p className="text-[11px] font-medium text-destructive mt-0.5">{passwordError}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-foreground">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmPasswordError) setConfirmPasswordError(validateConfirmPassword(e.target.value, password));
                }}
                onBlur={() => setConfirmPasswordError(validateConfirmPassword(confirmPassword, password))}
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter password"
                autoComplete="new-password"
                className={`h-10 rounded-xl pl-10 pr-10 text-sm transition-colors ${
                  confirmPasswordError ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {confirmPassword && !confirmPasswordError && confirmPassword === password && (
              <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                <CheckCircle2 className="size-3" /> Passwords match
              </p>
            )}
            {confirmPasswordError && <p className="text-[11px] font-medium text-destructive mt-0.5">{confirmPasswordError}</p>}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading}
            className="h-10 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm transition-all"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Creating account…
              </span>
            ) : (
              "Create Account"
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
          onClick={() => signIn.social({ provider: "google" })}
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
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
            Sign in
          </Link>
        </p>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground/70">
          MindEase is a wellness tool and not a medical service.
        </p>
      </CardContent>
    </Card>
  );
}