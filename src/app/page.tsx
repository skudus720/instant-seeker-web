import { FinalCta } from "@/components/home/final-cta";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { ReviewsCarousel } from "@/components/home/reviews-carousel";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import {
  getDailyPublicReviews,
  getPublishedContent,
  getPublicStats,
} from "@/lib/public-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stats, reviews, content] = await Promise.all([
    getPublicStats(),
    getDailyPublicReviews(),
    getPublishedContent(),
  ]);
  const reviewSettings = content["homepage.reviews"];
  const maintenance = content["banner.maintenance"];
  const announcement = content["banner.announcement"];

  return (
    <>
      <Header />
      {maintenance?.enabled === true &&
      typeof maintenance.message === "string" ? (
        <div
          role="status"
          className="bg-signal px-5 py-3 text-center text-sm font-black text-ink"
        >
          {maintenance.message}
        </div>
      ) : null}
      {announcement?.enabled === true &&
      typeof announcement.message === "string" ? (
        <div
          role="status"
          className="border-b border-white/10 bg-graphite px-5 py-3 text-center text-sm font-bold text-white"
        >
          {announcement.message}
        </div>
      ) : null}
      <main id="main-content">
        <Hero
          stats={stats}
          content={content["homepage.hero"]}
          tickerContent={content["homepage.activity_ticker"]}
        />
        <HowItWorks content={content["homepage.how_it_works"]} />
        {reviewSettings?.visible === false ? null : (
          <ReviewsCarousel reviews={reviews} />
        )}
        <FinalCta content={content["homepage.cta"]} />
      </main>
      <Footer
        content={content.footer}
        supportContent={content["support.contact"]}
      />
    </>
  );
}
