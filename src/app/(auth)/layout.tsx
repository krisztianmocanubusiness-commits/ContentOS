import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar p-10 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, oklch(0.4 0.08 285 / 0.35), transparent 45%), radial-gradient(circle at 80% 70%, oklch(0.35 0.1 250 / 0.3), transparent 45%)",
          }}
        />
        <Link href="/" className="relative z-10 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Content OS
          </span>
        </Link>

        <div className="relative z-10 flex flex-col gap-3">
          <blockquote className="max-w-md text-2xl leading-snug font-medium tracking-tight text-balance">
            One workspace for every idea, draft, and post — from first
            thought to published content.
          </blockquote>
          <p className="text-sm text-muted-foreground">
            Plan, create, and analyze your content across every channel.
          </p>
        </div>

        <p className="relative z-10 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Content OS. All rights reserved.
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Content OS
          </span>
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
