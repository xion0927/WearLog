# WearLog

Next.js App Router と Supabase Auth（`@supabase/ssr`）を使った、コーデ記録アプリの認証部分です。

## セットアップ

1. Supabase でプロジェクトを作成します。
2. Supabase Dashboard の **Project Settings → API** から Project URL と publishable key を確認します。
3. プロジェクトのルートに `.env.local` を作成し、次の値を設定します。

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   `.env.example` をコピーして値を置き換えても構いません。`NEXT_PUBLIC_` が付く値はブラウザーにも公開されます。Supabase の publishable key のみを設定し、`service_role` / secret key は絶対に設定しないでください。`NEXT_PUBLIC_SUPABASE_ANON_KEY` という名前で設定済みの場合も互換性のため利用できますが、新規設定では publishable key 用の変数名を推奨します。

4. Supabase Dashboard の **Authentication → URL Configuration** で以下を設定します。
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback` と `https://wearlog-pi.vercel.app/auth/callback`
5. 依存関係をインストールし、開発サーバーを起動します。

   ```bash
   npm install
   npm run dev
   ```

6. Supabase Dashboard の **Authentication → Email Templates → Confirm signup** を開き、テンプレートを確認コード方式にします。確認リンク (`{{ .ConfirmationURL }}`) の代わりに、本文へ `{{ .Token }}` を表示します。例：

   ```html
   <h2>WearLog の確認コード</h2>
   <p>次のコードを登録画面で入力してください。</p>
   <p style="font-size: 24px; font-weight: bold;">{{ .Token }}</p>
   ```

7. `http://localhost:3000/signup` から登録します。メール内のコードを `/verify-email` に入力すると `/dashboard` に移動します。メールのリンクをクリックする必要はありません。コードが期限切れの場合は、同じページから新しいコードを再送できます。

## Vercel へのデプロイ

Vercel の **Project Settings → Environment Variables** に `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`、`NEXT_PUBLIC_SITE_URL=https://wearlog-pi.vercel.app` を登録します。本番環境では Supabase の **Authentication → URL Configuration** で Site URL を `https://wearlog-pi.vercel.app` にし、Redirect URLs に `https://wearlog-pi.vercel.app/auth/callback` を追加してください。ローカルは `.env.local` の `NEXT_PUBLIC_SITE_URL=http://localhost:3000` を使用します。

## 実装内容

- `/login` と `/signup` の認証フォーム
- `/verify-email` でのメール確認コード入力と再送
- Supabase SSR 用ブラウザー/サーバークライアント
- `middleware.ts` によるセッション更新と `/dashboard` の未認証アクセス保護
- メール確認用 `/auth/callback`
- `/dashboard` へのログイン後リダイレクトとログアウト
