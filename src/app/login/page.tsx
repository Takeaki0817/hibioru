import { redirect } from 'next/navigation'

// 後方互換性のため /login → / へリダイレクト
export default function LoginRedirect() {
  redirect('/')
}
