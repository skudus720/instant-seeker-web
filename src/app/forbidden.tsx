import { ShieldX } from "lucide-react";
import Link from "next/link";

export default function Forbidden() {
  return (
    <main
      id="main-content"
      className="grid min-h-screen place-items-center bg-ink px-5 text-white"
    >
      <div className="max-w-lg text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-lg border border-signal/35 bg-signal/10 text-signal">
          <ShieldX className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-6 text-xs font-black text-signal uppercase">
          403 forbidden
        </p>
        <h1 className="mt-3 text-3xl font-black sm:text-5xl">
          Access is not permitted
        </h1>
        <p className="mt-4 text-sm leading-7 text-white/55">
          Your account does not have permission to view this protected area.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-signal px-6 py-3 text-sm font-black text-ink"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
