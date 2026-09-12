"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { changePassword } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle, Separator, Label } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import {
  Monitor,
  Moon,
  Sun,
  Download,
  Loader2,
  Shield,
  Bell,
  User,
  Palette,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────
interface SettingsData {
  user: { id: string; name: string | null; email: string; createdAt: string };
  profile: {
    bio: string | null;
    timezone: string;
    wellnessGoal: string | null;
    dailyReminderTime: string | null;
    journalingReminderTime: string | null;
    notificationsEnabled: boolean;
    shareDataForInsights: boolean;
    darkMode: boolean;
  };
}

// ─── Settings Page ──────────────────────────────────────────────────
export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ data: SettingsData }>({
    queryKey: ["user-settings"],
    queryFn: async () => {
      const r = await fetch("/api/user/settings");
      if (!r.ok) throw new Error("Failed to load settings");
      return r.json();
    },
  });

  const settings = data?.data;

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const r = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Save failed");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
      toast({ title: "Settings saved successfully", type: "success" });
    },
    onError: (err: Error) => {
      toast({ title: err.message || "Failed to save settings", type: "error" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="size-8 animate-spin text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm text-muted-foreground">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile, preferences, and security</p>
      </div>

      {/* Profile */}
      <ProfileCard settings={settings} onSave={(payload) => saveMutation.mutate(payload)} isSaving={saveMutation.isPending} />

      {/* Appearance */}
      <AppearanceCard />

      {/* Notifications & Reminders */}
      <NotificationsCard settings={settings} onSave={(payload) => saveMutation.mutate(payload)} isSaving={saveMutation.isPending} />

      {/* Privacy */}
      <PrivacyCard settings={settings} onSave={(payload) => saveMutation.mutate(payload)} />

      {/* Security */}
      <SecurityCard />

      {/* Danger zone */}
      <DangerCard />

      <div className="text-center pt-2">
        <p className="text-xs text-muted-foreground font-medium">
          MindEase v1.0 · Built with care for your wellness journey
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          This application is a wellness tool — not a replacement for professional mental health care.
        </p>
      </div>
    </div>
  );
}

// ─── Profile Card ───────────────────────────────────────────────────
function ProfileCard({
  settings,
  onSave,
  isSaving,
}: {
  settings?: SettingsData;
  onSave: (p: Record<string, unknown>) => void;
  isSaving: boolean;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [wellnessGoal, setWellnessGoal] = useState("");

  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (settings) {
      setName(settings.user.name || "");
      setBio(settings.profile.bio || "");
      setTimezone(settings.profile.timezone || "UTC");
      setWellnessGoal(settings.profile.wellnessGoal || "");
    }
  }, [settings]);

  const timezones = [
    "UTC",
    "Asia/Kathmandu",
    "Asia/Kolkata",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Europe/London",
    "Europe/Paris",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Australia/Sydney",
  ];

  const handleSaveProfile = () => {
    if (!name.trim()) {
      setNameError("Display name is required");
      toast({ title: "Display name cannot be empty", type: "error" });
      return;
    }
    setNameError("");
    onSave({
      name: name.trim(),
      bio: bio.trim() || null,
      timezone,
      wellnessGoal: wellnessGoal.trim() || null,
    });
  };

  return (
    <Card className="rounded-2xl border border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <User className="size-4" />
          </div>
          <CardTitle className="text-base font-semibold">Profile</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="mb-1.5 block text-xs font-medium">Display name</Label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError("");
            }}
            placeholder="Your name"
            className={nameError ? "border-destructive focus-visible:ring-destructive" : ""}
          />
          {nameError && <p className="text-[11px] font-medium text-destructive mt-1">{nameError}</p>}
        </div>

        <div>
          <Label className="mb-1.5 block text-xs font-medium">Email address</Label>
          <Input value={settings?.user.email || ""} disabled className="bg-muted/40 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground mt-1">Email is associated with your account and cannot be changed here</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-xs font-medium">Bio</Label>
            <span className="text-[11px] text-muted-foreground">{bio.length}/500</span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A little about yourself and your journey…"
            rows={3}
            maxLength={500}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none transition-colors"
          />
        </div>

        <div>
          <Label className="mb-1.5 block text-xs font-medium">Timezone</Label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs font-medium">Wellness goal</Label>
          <Input
            value={wellnessGoal}
            onChange={(e) => setWellnessGoal(e.target.value)}
            placeholder="e.g. Reduce anxiety, practice gratitude, sleep better…"
            maxLength={200}
          />
        </div>

        <Button isLoading={isSaving} onClick={handleSaveProfile} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Appearance Card ────────────────────────────────────────────────
function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <Card className="rounded-2xl border border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Palette className="size-4" />
          </div>
          <CardTitle className="text-base font-semibold">Appearance</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">Choose how MindEase looks on this device</p>
        <div className="grid grid-cols-3 gap-2.5">
          {options.map((opt) => {
            const Icon = opt.icon;
            const active = mounted && theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-all",
                  active
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-sm"
                    : "border-border/70 hover:bg-muted/50 text-muted-foreground"
                )}
              >
                <Icon className="size-4" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Notifications Card ─────────────────────────────────────────────
function NotificationsCard({
  settings,
  onSave,
  isSaving,
}: {
  settings?: SettingsData;
  onSave: (p: Record<string, unknown>) => void;
  isSaving: boolean;
}) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dailyReminderTime, setDailyReminderTime] = useState("");
  const [journalingReminderTime, setJournalingReminderTime] = useState("");

  useEffect(() => {
    if (settings) {
      setNotificationsEnabled(settings.profile.notificationsEnabled);
      setDailyReminderTime(settings.profile.dailyReminderTime || "");
      setJournalingReminderTime(settings.profile.journalingReminderTime || "");
    }
  }, [settings]);

  return (
    <Card className="rounded-2xl border border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Bell className="size-4" />
          </div>
          <CardTitle className="text-base font-semibold">Notifications & Reminders</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-foreground">Enable all notifications</p>
            <p className="text-xs text-muted-foreground">Master toggle for daily reminders and notifications</p>
          </div>
          <ToggleSwitch value={notificationsEnabled} onChange={(v) => setNotificationsEnabled(v)} />
        </div>

        <Separator />

        <div className={cn("space-y-4 transition-opacity", !notificationsEnabled && "opacity-40 pointer-events-none")}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-xs font-medium block">Daily mood reminder time</Label>
              <p className="text-[11px] text-muted-foreground">Receive a reminder to log your mood</p>
            </div>
            <Input
              type="time"
              value={dailyReminderTime}
              onChange={(e) => setDailyReminderTime(e.target.value)}
              className="w-32 h-9 text-xs rounded-xl"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-xs font-medium block">Journaling reminder time</Label>
              <p className="text-[11px] text-muted-foreground">Receive an evening reflection reminder</p>
            </div>
            <Input
              type="time"
              value={journalingReminderTime}
              onChange={(e) => setJournalingReminderTime(e.target.value)}
              className="w-32 h-9 text-xs rounded-xl"
            />
          </div>
        </div>

        <Button
          isLoading={isSaving}
          onClick={() =>
            onSave({
              notificationsEnabled,
              dailyReminderTime: dailyReminderTime || null,
              journalingReminderTime: journalingReminderTime || null,
            })
          }
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
        >
          Save reminders
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Privacy Card ───────────────────────────────────────────────────
function PrivacyCard({
  settings,
  onSave,
}: {
  settings?: SettingsData;
  onSave: (p: Record<string, unknown>) => void;
}) {
  const [shareData, setShareData] = useState(true);

  useEffect(() => {
    if (settings) setShareData(settings.profile.shareDataForInsights);
  }, [settings]);

  return (
    <Card className="rounded-2xl border border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Shield className="size-4" />
          </div>
          <CardTitle className="text-base font-semibold">Privacy</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Share data for insights</p>
            <p className="text-xs text-muted-foreground">Allow anonymized patterns to improve your AI wellness suggestions</p>
          </div>
          <ToggleSwitch
            value={shareData}
            onChange={(v) => {
              setShareData(v);
              onSave({ shareDataForInsights: v });
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Security Card (Change Password) ────────────────────────────────
function SecurityCard() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [currentErr, setCurrentErr] = useState("");
  const [newErr, setNewErr] = useState("");
  const [confirmErr, setConfirmErr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password strength meter
  const getStrength = (pass: string) => {
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

  const strength = getStrength(newPassword);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentErr("");
    setNewErr("");
    setConfirmErr("");

    let valid = true;
    if (!currentPassword) {
      setCurrentErr("Current password is required");
      valid = false;
    }
    if (!newPassword) {
      setNewErr("New password is required");
      valid = false;
    } else if (newPassword.length < 8) {
      setNewErr("Password must be at least 8 characters");
      valid = false;
    }
    if (!confirmPassword) {
      setConfirmErr("Please confirm your new password");
      valid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmErr("Passwords do not match");
      valid = false;
    }

    if (!valid) return;

    setIsSubmitting(true);
    try {
      // Use better-auth client changePassword API
      const res = await changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });

      if (res?.error) {
        toast({ title: res.error.message || "Failed to change password", type: "error" });
        if (res.error.message?.toLowerCase().includes("current")) {
          setCurrentErr(res.error.message);
        }
        return;
      }

      toast({ title: "Password updated successfully!", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      toast({ title: msg, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="rounded-2xl border border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Lock className="size-4" />
          </div>
          <CardTitle className="text-base font-semibold">Security</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-4" noValidate>
          <p className="text-xs text-muted-foreground">Change your account password below</p>

          {/* Current Password */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Current password</Label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (currentErr) setCurrentErr("");
                }}
                placeholder="••••••••"
                className={`pr-10 rounded-xl ${currentErr ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {currentErr && <p className="text-[11px] font-medium text-destructive mt-0.5">{currentErr}</p>}
          </div>

          {/* New Password */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">New password</Label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (newErr) setNewErr("");
                  if (confirmPassword) {
                    if (e.target.value === confirmPassword) setConfirmErr("");
                  }
                }}
                placeholder="At least 8 characters"
                className={`pr-10 rounded-xl ${newErr ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {newPassword && (
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
            {newErr && <p className="text-[11px] font-medium text-destructive mt-0.5">{newErr}</p>}
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Confirm new password</Label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmErr) setConfirmErr("");
                }}
                placeholder="Re-enter new password"
                className={`pr-10 rounded-xl ${confirmErr ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {confirmPassword && !confirmErr && confirmPassword === newPassword && (
              <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                <CheckCircle2 className="size-3" /> Passwords match
              </p>
            )}
            {confirmErr && <p className="text-[11px] font-medium text-destructive mt-0.5">{confirmErr}</p>}
          </div>

          <Button type="submit" isLoading={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Danger Zone Card ───────────────────────────────────────────────
function DangerCard() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const r = await fetch("/api/user/export");
      if (!r.ok) throw new Error("Export failed");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mindease-data-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Data exported successfully", type: "success" });
    } catch {
      toast({ title: "Export failed. Please try again.", type: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="rounded-2xl border border-destructive/30 bg-destructive/5 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="size-4" />
          </div>
          <CardTitle className="text-base font-semibold text-destructive">Danger zone</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Export your data</p>
            <p className="text-xs text-muted-foreground">Download all your mood logs, journal entries, goals, and habits in JSON format</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting} className="rounded-xl shrink-0">
            {isExporting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Download className="size-3.5 mr-1.5" />}
            Export JSON
          </Button>
        </div>

        <Separator className="bg-destructive/20" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-destructive">Delete account</p>
            <p className="text-xs text-muted-foreground">Permanently delete your account and all associated personal data</p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => toast({ title: "Please contact support to delete your account", type: "warning" })}
            className="rounded-xl shrink-0"
          >
            Delete Account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Toggle Switch ──────────────────────────────────────────────────
function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative w-10 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        value ? "bg-emerald-600" : "bg-muted-foreground/30"
      }`}
      style={{ height: "22px" }}
    >
      <span
        className={`absolute top-0.5 left-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          value ? "translate-x-[18px]" : "translate-x-0"
        }`}
        style={{ width: "18px", height: "18px" }}
      />
    </button>
  );
}
