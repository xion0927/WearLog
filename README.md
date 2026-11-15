# WearLog

Next.js App Router と Supabase Auth（`@supabase/ssr`）を使った、コーデ記録アプリです。ログイン後はコーデ記録が最初に表示され、上部ナビゲーションからコーデの記録とクローゼットを切り替えられます。クローゼットではテンプレート・登録した服の一覧表示と、服の新規登録ができます。

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

6. Supabase Dashboard の **SQL Editor** で [`supabase/items.sql`](./supabase/items.sql) の内容を実行します。`items` テーブル、ユーザーごとのRLSポリシー、`item-images` Storageバケットとポリシーが作成されます。テーブルを既に作成済みの場合も、このSQLを再実行して `image_url` を任意項目に更新してください。
7. 続けて [`supabase/outfits.sql`](./supabase/outfits.sql) を実行し、コーデ記録用テーブルとStorageバケットを作成します。既に実行済みでも、更新後のSQLをもう一度実行してください（同じ日の既存記録は最新1件に整理されます）。未使用画像の自動整理にはStorageオブジェクト一覧ポリシーも必要なため、`items.sql` と `outfits.sql` の両方を最新版にして実行してください。テンプレートの着用月を記録するテーブルと保存処理も `outfits.sql` に含まれます。以前の年月形式の着用月データは月だけの形式に移行され、同じテンプレートで同じ月が重複する場合は1件にまとめられます。コーデ名の必須カラムも追加し、既存記録は紐づくテンプレート名、または着用アイテムが完全一致するテンプレートが1つだけある場合にその名前を設定します。該当テンプレートがない・複数ある場合は日付名を使用します。
   アカウント削除機能を使う場合も、認証ユーザーを削除する `delete_current_user()` 関数を追加するため、最新版の `outfits.sql` の実行が必要です。
8. Supabase Dashboard の **Authentication → Email Templates → Confirm signup** は標準の確認リンク (`{{ .ConfirmationURL }}`) を使用します。メールテンプレートの変更は不要です。
9. `http://localhost:3000/signup` から登録し、届いたメールの確認リンクを開きます。リンクを開くと `/auth/callback` で認証し、成功すると `/dashboard` に移動します。

ログイン状態はブラウザーのCookieに最大400日間保存され、サイトを閉じて再度開いても維持されます（Supabase側でセッションが無効化・期限切れになった場合を除く）。ローカル開発ではCookieがホスト名ごとに分かれるため、`http://localhost:3000` と `http://127.0.0.1:3000` を切り替えず、同じURLを使ってください。

## 服アイテム登録について

服の名前とカテゴリだけで登録できます。服の詳細画面では、その服を含む保存済みコーデテンプレートの名前を確認できます。テンプレート名を選ぶと、画像、メモ、着用月、着用アイテムの詳細を確認できます。画像を追加する場合は `item-images` の公開バケットへアップロードし、公開URLを `items.image_url` に保存します。そのため画像URLを知っている人はログインしていなくても画像を閲覧できます。アップロードはログインユーザーに限定され、オブジェクトはユーザーIDごとのフォルダーに保存されます。画像形式はJPEG、PNG、WebP、GIF、サイズは5MBまでです。

## コーデ記録

ログイン後、ダッシュボードの **今日のコーデを記録する** から `/outfits/new` を開きます。新規作成では、コーデ名・全体画像・着用アイテムのいずれか1つ以上が必要です。名前を省略した場合は日付を使った名前を自動設定し、日付未入力時は今日の日付で登録します。メモは任意です。「テンプレートとして登録する」を選ぶと、入力したコーデ名（未入力の場合は自動設定した名前）をテンプレート名として保存します。保存したテンプレートはクローゼットの一覧から詳細メニューを開き、名前・メモ・画像・着用アイテム・着用月の編集や削除ができます。テンプレートを選んでコーデを保存すると記録日の月を着用月として記録し、新規コーデをテンプレートとして保存した場合も初回着用月を登録します。年は保存せず、月（1〜12月）のみを管理します。着用月はテンプレートの詳細画面で確認でき、過去分の追加・解除はテンプレートの編集画面から行えます。実際のコーデ記録から自動登録された月と、手動で追加した月は区別して表示します。既存のコーデ記録にはテンプレートとの紐付け情報がないため、過去の着用月はテンプレートごとに手動で追加してください。同じ日付のコーデを再度保存すると既存の名前・メモ・着用アイテムを上書きし、全体画像を選ばずテンプレートも使わない場合は画像なしに更新します。テンプレートから作成する場合は、選択したテンプレート名と画像を引き継ぎます。コーデ画像は `outfit-images` の公開バケットに保存されるため、画像URLを知っている人はログインしていなくても画像を閲覧できます。画像形式はJPEG、PNG、WebP、GIF、サイズは5MBまでです。

ホーム画面では対象月を選び、その月のタグが付いたテンプレートに絞って、着用回数が少ない順に5件を表示します。「もっと見る」で残りのランキングも確認でき、多い順にも切り替えられます。ランキングのテンプレートを選ぶと詳細を確認でき、詳細から今日のコーデ記録フォームへテンプレートを選択した状態で移動できます。クローゼットのテンプレート一覧も着用月タグで絞り込めます。回数は年を区別せず、コーデ記録に紐付いた着用履歴を月ごとに集計します。手動で月タグだけを追加したテンプレートは着用回数が1回以上として扱います。

服・コーデ・テンプレートの画像を差し替えたり、画像を参照しているデータを削除したりすると、他の服・コーデ・テンプレートからも参照されていない画像ファイルだけを自動削除します。また、ダッシュボードを開くたびにユーザー自身の画像フォルダーを照合し、過去に残った未使用画像も整理します。共用中の画像や、利用状況を確認できなかった画像は安全のため削除しません。Storageの一覧・削除ポリシーが未設定の場合はダッシュボードに警告が表示されます。

## Vercel へのデプロイ

Vercel の **Project Settings → Environment Variables** に `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`、`NEXT_PUBLIC_SITE_URL=https://wearlog-pi.vercel.app` を登録します。本番環境では Supabase の **Authentication → URL Configuration** で Site URL を `https://wearlog-pi.vercel.app` にし、Redirect URLs に `https://wearlog-pi.vercel.app/auth/callback` を追加してください。ローカルは `.env.local` の `NEXT_PUBLIC_SITE_URL=http://localhost:3000` を使用します。

## 実装内容

- `/login` と `/signup` の認証フォーム
- `/dashboard` での1週間・1ヶ月のコーデ記録表示
- カレンダーの日別詳細からコーデ記録を確認付きで削除する機能
- `/closet` でのテンプレート・服アイテム一覧表示と服アイテム登録
- クローゼットのテンプレート・服カードを選択して画像やメモ、アイテム情報を確認する機能
- ユーザーメニューでのメールアドレス表示、ログアウト、アカウントと関連データの削除
- `/outfits/new` での日付・メモ・全体画像・着用アイテムを含むコーデ保存
- 保存したコーデからテンプレートを作成し、コーデ記録時に呼び出す機能
- カテゴリごとの絞り込みとカテゴリ順の一覧表示
- 登録した服アイテムの削除
- 登録アイテムの詳細メニューから名前・カテゴリ・画像の追加・変更・削除、アイテムの削除
- Supabase Storage への画像アップロードとユーザー別アクセス制御
- Supabase SSR 用ブラウザー/サーバークライアント
- `middleware.ts` によるセッション更新と `/dashboard` の未認証アクセス保護
- メール確認用 `/auth/callback`
- `/dashboard` へのログイン後リダイレクトとログアウト
