import { HeroSection } from './components/hero-section'
import { ProblemsSection } from './components/problems-section'
import { FeaturesSection } from './components/features-section'
import { HowToUseSection } from './components/how-to-use-section'
import { BetaTestCallSection } from './components/beta-test-call-section'
import { FAQSection } from './components/faq-section'

export default function LandingPage() {
  return (
    <div className="lp-page min-h-screen bg-background">
      <HeroSection />
      <ProblemsSection />
      <FeaturesSection />
      <HowToUseSection />
      <BetaTestCallSection />
      <FAQSection />
    </div>
  )
}
