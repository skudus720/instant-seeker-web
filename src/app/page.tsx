import { Features } from "@/components/home/features";
import { FinalCta } from "@/components/home/final-cta";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { LiveWinnerTicker } from "@/components/home/live-winner-ticker";
import { ProductExplainer } from "@/components/home/product-explainer";
import { ReviewsCarousel } from "@/components/home/reviews-carousel";
import { Statistics } from "@/components/home/statistics";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import {
  getDailyPublicReviews,
  getPublicStats,
  getPublicWins,
} from "@/lib/public-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stats, wins, reviews] = await Promise.all([
    getPublicStats(),
    getPublicWins(),
    getDailyPublicReviews(),
  ]);

  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />
        <Statistics stats={stats} />
        <LiveWinnerTicker initialWins={wins} />
        <ProductExplainer />
        <HowItWorks />
        <Features />
        <ReviewsCarousel reviews={reviews} />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
