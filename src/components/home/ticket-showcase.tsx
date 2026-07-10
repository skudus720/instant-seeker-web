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
    <div className="relative mx-auto w-full max-w-[470px]">
      <div
        className="absolute -inset-3 rounded-lg border border-[#ffd400]/18"
        aria-hidden="true"
      />
      <div className="ticket-scanner relative aspect-[4/5] overflow-hidden rounded-lg border border-white/14 bg-[#121310] shadow-[0_24px_80px_rgba(0,0,0,0.44)]">
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b border-white/10 bg-black/50 px-4 py-3 text-xs text-white/65 backdrop-blur-md">
          <span className="inline-flex items-center gap-2 font-bold text-white">
            <ScanLine className="size-4 text-[#ffd400]" aria-hidden="true" />
            Ticket preview
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
              sizes="(max-width: 768px) 92vw, 470px"
              className="object-contain px-5 pt-16 pb-10"
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
          <div className="grid h-full place-items-center px-8 pt-16 text-center">
            <div>
              <span className="mx-auto grid size-14 place-items-center rounded-md border border-[#ffd400]/35 bg-[#ffd400]/8 text-[#ffd400]">
                <ImageIcon className="size-6" aria-hidden="true" />
              </span>
              <p className="mt-5 text-lg font-black text-white">
                Winning ticket image not supplied
              </p>
              <p className="mt-2 text-sm leading-6 text-white/54">
                Add an owner-approved, privacy-safe image at
                <span className="mt-2 block font-mono text-xs text-[#ffd400]">
                  /public/images/winning-ticket.png
                </span>
              </p>
            </div>
          </div>
        )}
        <span className="scanner-line" aria-hidden="true" />
        <span className="absolute right-4 bottom-3 text-[10px] font-bold text-white/35">
          IDENTIFIERS MASKED
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-white/40">
        <span>Private IDs stay hidden</span>
        <span className="text-[#82f6b3]">Secure visual review</span>
      </div>
    </div>
  );
}
