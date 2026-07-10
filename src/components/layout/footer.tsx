import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { appConfig } from "@/lib/config";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#090909] text-white">
      <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 lg:py-16">
        <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <Logo inverse />
            <p className="mt-5 max-w-md text-sm leading-6 text-white/55">
              Independent screenshot analysis for clearer probability,
              confidence, and risk context. Instant Seeker does not accept bets
              or handle gambling funds.
            </p>
          </div>
          <nav
            aria-label="Footer product links"
            className="grid content-start gap-3 text-sm"
          >
            <p className="mb-1 font-black text-white">Product</p>
            <Link
              href="/#how-it-works"
              className="text-white/58 hover:text-white"
            >
              How It Works
            </Link>
            <Link href="/#results" className="text-white/58 hover:text-white">
              Results
            </Link>
            <Link href="/#reviews" className="text-white/58 hover:text-white">
              Reviews
            </Link>
            <Link href="/dashboard" className="text-white/58 hover:text-white">
              Dashboard
            </Link>
          </nav>
          <nav
            aria-label="Footer legal links"
            className="grid content-start gap-3 text-sm"
          >
            <p className="mb-1 font-black text-white">Trust & legal</p>
            <Link href="/privacy" className="text-white/58 hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="text-white/58 hover:text-white">
              Terms
            </Link>
            <Link
              href="/responsible-gaming"
              className="text-white/58 hover:text-white"
            >
              Responsible Gaming
            </Link>
            <a
              href={`mailto:${appConfig.contactEmail}`}
              className="text-white/58 hover:text-white"
            >
              Contact
            </a>
          </nav>
        </div>
        <div className="flex flex-col gap-5 pt-8 text-xs leading-5 text-white/48 md:flex-row md:items-start md:justify-between">
          <p className="max-w-3xl">
            Instant Seeker is an independent service and is not affiliated with
            or endorsed by SportyBet or any other betting platform. References
            to third-party platforms are instructional only. Probability
            estimates are not guarantees.
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <span className="rounded-full border border-[#ffd400] px-2.5 py-1 font-black text-[#ffd400]">
              18+
            </span>
            <span>&copy; {new Date().getFullYear()} Instant Seeker</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
