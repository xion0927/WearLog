import Link from "next/link";
import { signUp } from "@/app/auth/actions";

type SignupPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[#e7ebe7] bg-white p-8 shadow-[0_20px_60px_-40px_rgba(38,53,47,0.35)] sm:p-10">
        <div className="mb-9 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sage text-xl font-semibold text-forest">
            W
          </div>
          <p className="text-sm font-semibold tracking-[0.18em] text-forest">WEARLOG</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">今日から記録をはじめる</h1>
          <p className="mt-2 text-sm text-muted">メールアドレスとパスワードを登録してください。</p>
        </div>

        {error && (
          <p role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <form action={signUp} className="space-y-5">
          <label className="block text-sm font-medium">
            メールアドレス
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-2 w-full rounded-xl border border-[#dce3dd] bg-white px-4 py-3 text-ink outline-none transition placeholder:text-[#a0aaa3] focus:border-forest focus:ring-4 focus:ring-sage"
              placeholder="you@example.com"
            />
          </label>
          <label className="block text-sm font-medium">
            パスワード
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="mt-2 w-full rounded-xl border border-[#dce3dd] bg-white px-4 py-3 text-ink outline-none transition placeholder:text-[#a0aaa3] focus:border-forest focus:ring-4 focus:ring-sage"
              placeholder="8文字以上"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-forest px-4 py-3 font-semibold text-white transition hover:bg-[#264b39] focus:outline-none focus:ring-4 focus:ring-sage"
          >
            アカウントを作成
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-muted">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="font-semibold text-forest hover:underline">
            ログイン
          </Link>
        </p>
      </section>
    </main>
  );
}
