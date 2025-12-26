import { HeroSection } from './components/hero-section'
import { ProblemsSection } from './components/problems-section'
import { FeaturesSection } from './components/features-section'
import { HowToUseSection } from './components/how-to-use-section'
import { BetaTestCallSection } from './components/beta-test-call-section'
import { FAQSection } from './components/faq-section'

export const metadata = {
  title: 'ヒビオル - 日々を織る思考記録アプリ | βテスト参加募集',
  description:
    '1日の中での心の動きを記録する思考記録アプリ。絵文字1つから始められる、継続しやすい記録習慣。ADHD当事者が作った、続けることに特化したアプリです。',
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <ProblemsSection />
      <FeaturesSection />
      <HowToUseSection />
      <BetaTestCallSection />
      <FAQSection />
    </div>
  )
}
