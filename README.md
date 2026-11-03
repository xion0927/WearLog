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
   - Redirect URLs: `http://localhost:3000/auth/callback`
5. 依存関係をインストールし、開発サーバーを起動します。

   ```bash
   npm install
   npm run dev
   ```

6. `http://localhost:3000/signup` で登録します。メール確認が有効な場合、確認メール内のリンクから認証を完了すると `/dashboard` に移動します。認証設定・メールテンプレートを変更した場合も、リンク先が `/auth/callback` になるようにしてください。

## Vercel へのデプロイ

Vercel の **Project Settings → Environment Variables** に `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`、`NEXT_PUBLIC_SITE_URL` を登録します。本番環境では `NEXT_PUBLIC_SITE_URL` を実際の HTTPS ドメインにし、Supabase の Site URL と Redirect URLs に `https://your-domain/auth/callback` を追加してください。

## 実装内容

- `/login` と `/signup` の認証フォーム
- Supabase SSR 用ブラウザー/サーバークライアント
- `middleware.ts` によるセッション更新と `/dashboard` の未認証アクセス保護
- メール確認用 `/auth/callback`
- `/dashboard` へのログイン後リダイレクトとログアウト
