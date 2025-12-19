"use client";

import { WifiOff } from "lucide-react";

/**
 * オフラインページ
 * ネットワーク接続がない場合に表示されるフォールバックページ
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-muted">
        <WifiOff className="size-10 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold text-foreground">
          オフラインです
        </h1>
        <p className="text-muted-foreground">
          インターネット接続を確認してください
        </p>
      </div>

      <p className="max-w-xs text-sm text-muted-foreground">
        接続が回復したら、自動的にアプリが使えるようになります
      </p>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        再試行
      </button>
    </div>
  );
}
