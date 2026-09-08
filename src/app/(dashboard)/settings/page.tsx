"use client";

import { useSession } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, Separator, Label } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const user = session?.user;
  const [name, setName] = useState(user?.name || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setIsSaving(false);
    toast({ title: "Settings saved", type: "success" });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Display name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <Label className="mb-1.5 block">Email</Label>
            <Input value={user?.email || ""} disabled className="bg-muted/40" />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
          </div>
          <Button onClick={handleSave} isLoading={isSaving}>Save changes</Button>
        </CardContent>
      </Card>

      <AppearanceCard />

      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Daily mood reminder", desc: "Get reminded to log your mood each day" },
            { label: "Journaling reminder", desc: "Remind me to journal in the evening" },
            { label: "Habit reminders", desc: "Daily reminders to complete habits" },
            { label: "Motivational quotes", desc: "Receive a daily wellness quote" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ToggleSwitch />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Privacy</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Share data for insights</p>
              <p className="text-xs text-muted-foreground">Allow anonymized data to improve AI suggestions</p>
            </div>
            <ToggleSwitch defaultOn />
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader><CardTitle className="text-destructive">Danger zone</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Export data</p>
              <p className="text-xs text-muted-foreground">Download all your mood logs, journals, and habits</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => toast({ title: "Export started — check your email", type: "success" })}>
              Export
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">Delete account</p>
              <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => toast({ title: "Please contact support to delete your account", type: "warning" })}>
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

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

function ToggleSwitch({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn((v) => !v)}
      className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 focus:outline-none ${on ? "bg-primary" : "bg-muted-foreground/30"}`}
      style={{ height: "22px" }}
      role="switch" aria-checked={on}
    >
      <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? "translate-x-[18px]" : "translate-x-0"}`}
        style={{ width: "18px", height: "18px" }} />
    </button>
  );
}
