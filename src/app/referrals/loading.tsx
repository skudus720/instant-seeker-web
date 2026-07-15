import { Logo } from "@/components/ui/logo";

export default function ReferralLoading() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#080808] px-5 py-7 text-white sm:px-8"
    >
      <div className="mx-auto max-w-[1280px]">
        <Logo />
        <div className="mt-14 max-w-2xl">
          <div className="h-3 w-32 animate-pulse rounded-md bg-signal/35 motion-reduce:animate-none" />
          <div className="mt-5 h-10 w-3/4 animate-pulse rounded-md bg-white/12 motion-reduce:animate-none" />
          <div className="mt-4 h-5 w-full animate-pulse rounded-md bg-white/7 motion-reduce:animate-none" />
        </div>
        <div className="mt-10 h-60 animate-pulse rounded-lg border border-white/10 bg-white/5 motion-reduce:animate-none" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-lg border border-white/10 bg-white/5 motion-reduce:animate-none"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
