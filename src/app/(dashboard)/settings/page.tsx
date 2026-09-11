"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, Separator, Label } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { Monitor, Moon, Sun, Download, Loader2, Shield, Bell } from "lucide-react";
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
      if (!r.ok) throw new Error("Save failed");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
      toast({ title: "Settings saved", type: "success" });
    },
    onError: () => toast({ title: "Failed to save settings", type: "error" }),
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
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

      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          MindEase v1.0 · Built with care for your wellness journey
        </p>
        <p className="text-xs text-muted-foreground mt-1">
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
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [wellnessGoal, setWellnessGoal] = useState("");

  useEffect(() => {
    if (settings) {
      setName(settings.user.name || "");
      setBio(settings.profile.bio || "");
      setTimezone(settings.profile.timezone || "UTC");
      setWellnessGoal(settings.profile.wellnessGoal || "");
    }
  }, [settings]);

  const timezones = [
    "UTC", "Asia/Kathmandu", "Asia/Kolkata", "Asia/Tokyo", "Asia/Shanghai",
    "Europe/London", "Europe/Paris", "America/New_York", "America/Chicago",
    "America/Denver", "America/Los_Angeles", "Australia/Sydney",
  ];

  return (
    <Card>
      <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="mb-1.5 block">Display name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <Label className="mb-1.5 block">Email</Label>
          <Input value={settings?.user.email || ""} disabled className="bg-muted/40" />
          <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
        </div>
        <div>
          <Label className="mb-1.5 block">Bio</Label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A little about yourself…"
            rows={3}
            maxLength={500}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
        </div>
        <div>
          <Label className="mb-1.5 block">Timezone</Label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="mb-1.5 block">Wellness goal</Label>
          <Input
            value={wellnessGoal}
            onChange={(e) => setWellnessGoal(e.target.value)}
            placeholder="e.g. Reduce anxiety, sleep better…"
            maxLength={200}
          />
        </div>
        <Button
          isLoading={isSaving}
          onClick={() => onSave({ name, bio: bio || null, timezone, wellnessGoal: wellnessGoal || null })}
        >
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
    <Card>
      <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">Choose how MindEase looks on this device</p>
        <div className="grid grid-cols-3 gap-2">
          {options.map((opt) => {
            const Icon = opt.icon;
            const active = mounted && theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border px-3 py-3 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted/60 text-muted-foreground"
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-muted-foreground" />
          <CardTitle>Notifications & Reminders</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium">Enable all notifications</p>
            <p className="text-xs text-muted-foreground">Master toggle for all reminders</p>
          </div>
          <ToggleSwitch
            value={notificationsEnabled}
            onChange={(v) => setNotificationsEnabled(v)}
          />
        </div>
        <Separator />
        <div className={cn("space-y-4 transition-opacity", !notificationsEnabled && "opacity-40 pointer-events-none")}>
          <div>
            <Label className="mb-1.5 block text-sm">Daily mood reminder time</Label>
            <Input
              type="time"
              value={dailyReminderTime}
              onChange={(e) => setDailyReminderTime(e.target.value)}
              className="w-36"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Journaling reminder time</Label>
            <Input
              type="time"
              value={journalingReminderTime}
              onChange={(e) => setJournalingReminderTime(e.target.value)}
              className="w-36"
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
    <Card>
      <CardHeader><CardTitle>Privacy</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Share data for insights</p>
            <p className="text-xs text-muted-foreground">Allow anonymized data to improve AI suggestions</p>
          </div>
          <ToggleSwitch value={shareData} onChange={(v) => { setShareData(v); onSave({ shareDataForInsights: v }); }} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Security Card ──────────────────────────────────────────────────
function SecurityCard() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "All fields are required", type: "error" }); return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "New passwords do not match", type: "error" }); return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", type: "error" }); return;
    }

    setIsSaving(true);
    try {
      // Use better-auth's built-in change password endpoint
      const r = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.message || "Failed to change password");
      }
      toast({ title: "Password changed successfully", type: "success" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (e) {
      toast({ title: (e as Error).message || "Failed to change password", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-muted-foreground" />
          <CardTitle>Security</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">Change your account password</p>
        <div>
          <Label className="mb-1.5 block">Current password</Label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div>
          <Label className="mb-1.5 block">New password</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div>
          <Label className="mb-1.5 block">Confirm new password</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <Button isLoading={isSaving} onClick={handleChangePassword}>
          Change password
        </Button>
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
    <Card className="border-destructive/30">
      <CardHeader><CardTitle className="text-destructive">Danger zone</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Export data</p>
            <p className="text-xs text-muted-foreground">Download all your mood logs, journals, goals, and habits as JSON</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            {isExporting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Download className="size-3.5 mr-1.5" />}
            Export
          </Button>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-destructive">Delete account</p>
            <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => toast({ title: "Please contact support to delete your account", type: "warning" })}
          >
            Delete
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
      className={`relative w-10 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${value ? "bg-primary" : "bg-muted-foreground/30"}`}
      style={{ height: "22px" }}
    >
      <span
        className={`absolute top-0.5 left-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${value ? "translate-x-[18px]" : "translate-x-0"}`}
        style={{ width: "18px", height: "18px" }}
      />
    </button>
  );
}
