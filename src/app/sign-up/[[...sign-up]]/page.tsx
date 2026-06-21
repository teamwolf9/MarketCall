import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto p-6">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
        <span className="font-display text-2xl font-semibold text-ink">
          MarketCall
        </span>
      </div>
      <SignUp />
    </main>
  );
}
