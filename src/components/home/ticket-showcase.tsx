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
    <div className="relative mx-auto w-full max-w-[340px] lg:max-w-[380px]">
      <div
        className="pointer-events-none absolute -inset-6 rounded-[3rem] bg-signal/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -inset-3 rounded-[2.75rem] border border-signal/20"
        aria-hidden="true"
      />
      <div className="ticket-scanner relative aspect-[9/14] overflow-hidden rounded-[2.25rem] border-[10px] border-[#141414] bg-black shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
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
              sizes="(max-width: 768px) 86vw, 380px"
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
              <p className="mt-2 text-sm leading-6 text-white/45">
                Add `public/images/winning-ticket.png` to show a private sample.
              </p>
            </div>
          </div>
        )}

        <div className="scanner-line" aria-hidden="true" />
        <div
          className="absolute inset-x-8 bottom-5 z-30 h-1 rounded-full bg-signal shadow-[0_0_18px_rgba(255,202,39,0.65)]"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
