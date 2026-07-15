import { existsSync } from "node:fs";
import { ImageIcon, LockKeyhole, ScanLine } from "lucide-react";
import Image from "next/image";
import path from "node:path";

export function TicketShowcase() {
  const ticketPath = path.join(
    process.cwd(),
    "public",
    "images",
    "winning-ticket.png",
  );
  const ticketExists = existsSync(ticketPath);

  return (
    <div className="relative mx-auto w-full max-w-[360px] lg:max-w-[390px]">
      <div
        className="absolute -inset-4 rounded-[3rem] border border-signal/18 bg-signal/[0.03]"
        aria-hidden="true"
      />
      <div className="ticket-scanner relative aspect-[9/14] overflow-hidden rounded-[2.5rem] border-[10px] border-graphite bg-black shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b border-white/10 bg-black/68 px-5 py-4 text-xs text-white/65 backdrop-blur-md">
          <span className="inline-flex items-center gap-2 font-bold text-white">
            <ScanLine className="size-4 text-signal" aria-hidden="true" />
            AI scanner
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LockKeyhole className="size-3.5" aria-hidden="true" />
            Privacy protected
          </span>
        </div>

        {ticketExists ? (
          <>
            <Image
              src="/images/winning-ticket.png"
              alt="Owner-supplied SportyBet result ticket with privacy masks over sensitive identifiers"
              fill
              priority
              sizes="(max-width: 768px) 86vw, 390px"
              className="object-contain px-4 pt-20 pb-14"
            />
            <span
              className="privacy-mask top-[18%] right-[7%]"
              aria-hidden="true"
            />
            <span
              className="privacy-mask right-[8%] bottom-[12%] w-2/3"
              aria-hidden="true"
            />
          </>
        ) : (
          <div className="grid h-full place-items-center px-8 pt-20 text-center">
            <div>
              <span className="mx-auto grid size-16 place-items-center rounded-2xl border border-signal/35 bg-signal/10 text-signal">
                <ImageIcon className="size-6" aria-hidden="true" />
              </span>
              <p className="mt-5 text-lg font-black text-white">
                Screenshot preview slot
              </p>
              <p className="mt-2 text-sm leading-6 text-white/54">
                Add an owner-approved, privacy-safe image at
                <span className="mt-2 block font-mono text-xs text-signal">
                  /public/images/winning-ticket.png
                </span>
              </p>
            </div>
          </div>
        )}
        <span className="scanner-line" aria-hidden="true" />
        <span className="absolute right-5 bottom-5 rounded-full border border-signal/25 bg-signal/10 px-3 py-1 text-[10px] font-black text-signal">
          GUARANTEED
        </span>
      </div>
      <div className="absolute top-1/4 -right-3 hidden rounded-2xl border border-white/12 bg-graphite/90 px-3 py-2 text-xs font-black text-white shadow-xl backdrop-blur sm:block">
        Analysis ready
      </div>
      <div className="mt-5 flex items-center justify-between text-xs text-white/42">
        <span>Visible data only</span>
        <span className="text-signal">Private visual review</span>
      </div>
    </div>
  );
}
