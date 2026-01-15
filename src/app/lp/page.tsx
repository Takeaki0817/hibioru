import dynamic from 'next/dynamic'
import { HeroSection } from './components/hero-section'

// Below-the-fold sections - dynamic imports for bundle optimization
const PainPointsSection = dynamic(() =>
  import('./components/pain-points-section').then((m) => ({ default: m.PainPointsSection }))
)
const FailureStorySection = dynamic(() =>
  import('./components/failure-story-section').then((m) => ({ default: m.FailureStorySection }))
)
const SolutionSection = dynamic(() =>
  import('./components/solution-section').then((m) => ({ default: m.SolutionSection }))
)
const FeaturesSection = dynamic(() =>
  import('./components/features-section').then((m) => ({ default: m.FeaturesSection }))
)
const DemoSection = dynamic(() =>
  import('./components/demo-section').then((m) => ({ default: m.DemoSection }))
)
const HowToUseSection = dynamic(() =>
  import('./components/how-to-use-section').then((m) => ({ default: m.HowToUseSection }))
)
const SocialProofSection = dynamic(() =>
  import('./components/social-proof-section').then((m) => ({ default: m.SocialProofSection }))
)
const FAQSection = dynamic(() =>
  import('./components/faq-section').then((m) => ({ default: m.FAQSection }))
)
const FinalCTASection = dynamic(() =>
  import('./components/final-cta-section').then((m) => ({ default: m.FinalCTASection }))
)

export default function LandingPage() {
  return (
    <div className="lp-page min-h-screen bg-background">
      {/* 1. ファーストビュー - Attention */}
      <HeroSection />

      {/* 2. ペインポイント - Problem */}
      <PainPointsSection />

      {/* 3. 開発者ストーリー - Agitation */}
      <FailureStorySection />

      {/* 4. 解決策 - Solution */}
      <SolutionSection />

      {/* 5. 機能紹介 - Interest */}
      <FeaturesSection />

      {/* 6. デモ体験 - Desire */}
      <DemoSection />

      {/* 7. 使い方 - Narrow */}
      <HowToUseSection />

      {/* 8. 社会的証明 - Trust */}
      <SocialProofSection />

      {/* 9. FAQ - Overcome Objections */}
      <FAQSection />

      {/* 10. 最終CTA + フッター - Action */}
      <FinalCTASection />
    </div>
  )
}
