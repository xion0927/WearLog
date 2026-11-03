import Link from "next/link";
import { signIn } from "@/app/auth/actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, message } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[#e7ebe7] bg-white p-8 shadow-[0_20px_60px_-40px_rgba(38,53,47,0.35)] sm:p-10">
        <div className="mb-9 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sage text-xl font-semibold text-forest">
            W
          </div>
          <p className="text-sm font-semibold tracking-[0.18em] text-forest">WEARLOG</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">おかえりなさい</h1>
          <p className="mt-2 text-sm text-muted">アカウントにログインしてください。</p>
        </div>

        {error && (
          <p role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="mb-5 rounded-xl bg-sage px-4 py-3 text-sm text-forest">
            {message}
          </p>
        )}

        <form action={signIn} className="space-y-5">
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
              autoComplete="current-password"
              required
              className="mt-2 w-full rounded-xl border border-[#dce3dd] bg-white px-4 py-3 text-ink outline-none transition placeholder:text-[#a0aaa3] focus:border-forest focus:ring-4 focus:ring-sage"
              placeholder="パスワード"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-forest px-4 py-3 font-semibold text-white transition hover:bg-[#264b39] focus:outline-none focus:ring-4 focus:ring-sage"
          >
            ログイン
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-muted">
          アカウントをお持ちでない方は{" "}
          <Link href="/signup" className="font-semibold text-forest hover:underline">
            新規登録
          </Link>
        </p>
      </section>
    </main>
  );
}
