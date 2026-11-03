import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-[#e7ebe7] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage font-semibold text-forest">
              W
            </div>
            <span className="font-semibold tracking-wide text-forest">WEARLOG</span>
          </div>
          <form action={signOut}>
            <button className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition hover:bg-sage hover:text-forest">
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
        <p className="text-sm font-semibold tracking-wide text-forest">YOUR WARDROBE JOURNAL</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          コーデ記録の準備ができました。
        </h1>
        <p className="mt-4 text-muted">
          {user.email} でログイン中です。ここから毎日のコーデを記録していきましょう。
        </p>
        <div className="mt-10 rounded-2xl border border-dashed border-[#cbd8ce] bg-white p-8 sm:p-12">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sage text-2xl text-forest">
              +
            </div>
            <h2 className="mt-5 text-lg font-semibold">最初のコーデを記録する</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              認証機能の実装が完了しました。次のステップで、写真やメモを保存するコーデ記録機能を追加できます。
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
