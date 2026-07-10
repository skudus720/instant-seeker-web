import type { ReactNode } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

export function LegalShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <>
      <Header />
      <main id="main-content">
        <header className="bg-[#090909] px-5 py-16 text-white sm:px-8 sm:py-20">
          <div className="mx-auto max-w-4xl">
            <p className="text-xs font-black text-[#ffd400] uppercase">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-black sm:text-6xl">{title}</h1>
            <p className="mt-6 max-w-3xl text-base leading-7 text-white/58">
              {intro}
            </p>
          </div>
        </header>
        <article className="legal-copy mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
          {children}
        </article>
      </main>
      <Footer />
    </>
  );
}
