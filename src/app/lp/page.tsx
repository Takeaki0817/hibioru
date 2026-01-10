import { HeroSection } from './components/hero-section'
import { PainPointsSection } from './components/pain-points-section'
import { FailureStorySection } from './components/failure-story-section'
import { SolutionSection } from './components/solution-section'
import { FeaturesSection } from './components/features-section'
import { DemoSection } from './components/demo-section'
import { HowToUseSection } from './components/how-to-use-section'
import { SocialProofSection } from './components/social-proof-section'
import { FAQSection } from './components/faq-section'
import { FinalCTASection } from './components/final-cta-section'

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
