import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Logo } from "@/components/ui/logo";

export default function Loading() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#f4f5f0] px-5 py-8 sm:px-8"
    >
      <div className="mx-auto max-w-[1200px]">
        <Logo />
        <div className="mt-16 max-w-3xl">
          <div className="h-10 w-2/3 animate-pulse rounded-md bg-black/8 motion-reduce:animate-none" />
          <div className="mt-8">
            <LoadingSkeleton rows={4} />
          </div>
        </div>
      </div>
    </main>
  );
}
