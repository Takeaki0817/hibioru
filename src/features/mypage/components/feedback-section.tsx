import { ExternalLink } from 'lucide-react'
import { FeatureCard } from '@/components/ui/feature-card'
import { Button } from '@/components/ui/button'

const FEEDBACK_FORM_URL = 'https://forms.gle/SnpKuyYi3G9XTnAU9'

export function FeedbackSection() {
  return (
    <FeatureCard title="フィードバック" titleSize="xl">
      <p className="text-sm text-muted-foreground mb-4">
        ベータテストへのご参加ありがとうございます。
        バグ報告や改善要望など、お気軽にお聞かせください。
      </p>
      <Button variant="outline" className="w-full" asChild>
        <a
          href={FEEDBACK_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          フィードバックを送る
          <ExternalLink className="ml-2 h-4 w-4" />
        </a>
      </Button>
    </FeatureCard>
  )
}
