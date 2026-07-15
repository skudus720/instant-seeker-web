import { LockKeyhole } from "lucide-react";
import Link from "next/link";

export default function Unauthorized() {
  return (
    <main
      id="main-content"
      className="grid min-h-screen place-items-center bg-ink px-5 text-white"
    >
      <div className="max-w-lg text-center">
        <LockKeyhole
          className="mx-auto size-10 text-signal"
          aria-hidden="true"
        />
        <p className="mt-6 text-xs font-black text-signal uppercase">
          401 unauthorized
        </p>
        <h1 className="mt-3 text-3xl font-black sm:text-5xl">
          Sign in is required
        </h1>
        <Link
          href="/login?next=/admin"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-signal px-6 py-3 text-sm font-black text-ink"
        >
          Log in securely
        </Link>
      </div>
    </main>
  );
}
