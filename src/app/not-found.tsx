import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="grid min-h-screen place-items-center bg-[#090909] px-5 text-white"
    >
      <div className="w-full max-w-xl text-center">
        <div className="flex justify-center">
          <Logo inverse />
        </div>
        <SearchX
          className="mx-auto mt-14 size-10 text-[#ffd400]"
          aria-hidden="true"
        />
        <p className="mt-6 text-sm font-black text-[#ffd400]">404</p>
        <h1 className="mt-3 text-4xl font-black sm:text-6xl">
          This page is out of frame.
        </h1>
        <p className="mt-5 text-white/58">
          The address may have changed, or the page may no longer exist.
        </p>
        <Link
          href="/"
          className="mx-auto mt-9 inline-flex min-h-12 items-center gap-2 rounded-md bg-[#ffd400] px-6 py-3 font-black text-[#090909] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back home
        </Link>
      </div>
    </main>
  );
}
