import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* ヘッダー */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900">ヒビオル</h1>
          <p className="mt-2 text-xl text-gray-600">日々を織る</p>
        </div>

        {/* サービス紹介 */}
        <div className="space-y-4 text-center">
          <p className="text-gray-700">
            ADHD当事者のための
            <br />
            瞬間記録アプリ
          </p>

          <div className="py-4 space-y-3 text-sm text-gray-600">
            <p>2タップで記録完了</p>
            <p>毎日続けることが目的</p>
            <p>立派な日記は要らない</p>
          </div>
        </div>

        {/* CTAボタン */}
        <div className="mt-8">
          <Link
            href="/login"
            className="w-full flex items-center justify-center px-4 py-3 rounded-lg shadow-sm bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            はじめる
          </Link>
        </div>

        {/* フッター */}
        <p className="mt-8 text-center text-xs text-gray-500">
          継続することが最大の目的。
          <br />
          立派な日記を書くことではない。
        </p>
      </div>
    </div>
  )
}
