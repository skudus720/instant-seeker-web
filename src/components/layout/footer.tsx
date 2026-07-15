import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { appConfig } from "@/lib/config";

export function Footer({
  content,
  supportContent,
}: {
  content?: Record<string, unknown>;
  supportContent?: Record<string, unknown>;
}) {
  const description =
    typeof content?.description === "string" && content.description.trim()
      ? content.description.slice(0, 500)
      : "Independent screenshot analysis that returns guaranteed matches to win. Instant Seeker does not accept bets or handle gambling funds.";
  const contactEmail =
    typeof supportContent?.email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportContent.email)
      ? supportContent.email
      : appConfig.contactEmail;
  return (
    <footer className="border-t border-white/10 bg-ink text-white">
      <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 lg:py-16">
        <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <Logo inverse />
            <p className="mt-5 max-w-md text-sm leading-6 text-white/55">
              {description}
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
              href={`mailto:${contactEmail}`}
              className="text-white/58 hover:text-white"
            >
              Contact
            </a>
          </nav>
        </div>
        <div className="flex flex-col gap-5 pt-8 text-xs leading-5 text-white/48 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex shrink-0 items-center gap-3">
            <span className="rounded-full border border-signal px-2.5 py-1 font-black text-signal">
              18+
            </span>
            <span>&copy; {new Date().getFullYear()} Instant Seeker</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
