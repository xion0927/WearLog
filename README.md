# WearLog

Next.js App Router と Supabase Auth（`@supabase/ssr`）を使った、コーデ記録アプリです。ログイン後のダッシュボードで、服アイテムを登録・一覧表示できます。

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

6. Supabase Dashboard の **SQL Editor** で [`supabase/items.sql`](./supabase/items.sql) の内容を実行します。`items` テーブル、ユーザーごとのRLSポリシー、`item-images` Storageバケットとアップロードポリシーが作成されます。テーブルを既に作成済みの場合も、このSQLを再実行して `image_url` を任意項目に更新してください。
7. 続けて [`supabase/outfits.sql`](./supabase/outfits.sql) を実行し、コーデ記録用テーブルとStorageバケットを作成します。
8. Supabase Dashboard の **Authentication → Email Templates → Confirm signup** は標準の確認リンク (`{{ .ConfirmationURL }}`) を使用します。メールテンプレートの変更は不要です。
9. `http://localhost:3000/signup` から登録し、届いたメールの確認リンクを開きます。リンクを開くと `/auth/callback` で認証し、成功すると `/dashboard` に移動します。

## 服アイテム登録について

服の名前とカテゴリだけで登録できます。画像を追加する場合は `item-images` の公開バケットへアップロードし、公開URLを `items.image_url` に保存します。そのため画像URLを知っている人はログインしていなくても画像を閲覧できます。アップロードはログインユーザーに限定され、オブジェクトはユーザーIDごとのフォルダーに保存されます。画像形式はJPEG、PNG、WebP、GIF、サイズは5MBまでです。

## コーデ記録

ログイン後、ダッシュボードの **今日のコーデを記録する** から `/outfits/new` を開きます。日付（初期値は今日）、メモ、任意の全体画像を入力し、カテゴリで絞り込んだ登録済みアイテムをタップして選択して保存します。カテゴリを切り替えても選択状態は維持されます。コーデ画像は `outfit-images` の公開バケットに保存されるため、画像URLを知っている人は閲覧できます。画像形式はJPEG、PNG、WebP、GIF、サイズは5MBまでです。

## Vercel へのデプロイ

Vercel の **Project Settings → Environment Variables** に `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`、`NEXT_PUBLIC_SITE_URL=https://wearlog-pi.vercel.app` を登録します。本番環境では Supabase の **Authentication → URL Configuration** で Site URL を `https://wearlog-pi.vercel.app` にし、Redirect URLs に `https://wearlog-pi.vercel.app/auth/callback` を追加してください。ローカルは `.env.local` の `NEXT_PUBLIC_SITE_URL=http://localhost:3000` を使用します。

## 実装内容

- `/login` と `/signup` の認証フォーム
- `/dashboard` での服アイテム登録・一覧表示
- `/outfits/new` での日付・メモ・全体画像・着用アイテムを含むコーデ保存
- カテゴリごとの絞り込みとカテゴリ順の一覧表示
- 登録した服アイテムの削除
- 登録アイテムの詳細メニューから名前・カテゴリ・画像の編集と削除
- Supabase Storage への画像アップロードとユーザー別アクセス制御
- Supabase SSR 用ブラウザー/サーバークライアント
- `middleware.ts` によるセッション更新と `/dashboard` の未認証アクセス保護
- メール確認用 `/auth/callback`
- `/dashboard` へのログイン後リダイレクトとログアウト
