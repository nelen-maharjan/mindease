import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-background to-teal-50 dark:from-background dark:via-background dark:to-indigo-950/40 p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-white text-xl font-bold shadow-lg mx-auto mb-4">
            M
          </div>
          <h1 className="text-xl font-semibold">MindEase</h1>
          <p className="text-xs text-muted-foreground mt-1">Your AI wellness companion</p>
        </div>
        {children}
      </div>
    </div>
  );
}
