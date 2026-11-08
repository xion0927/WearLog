"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { removeAllImagesForAccount } from "@/lib/supabase/image-cleanup";

function getCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=" + encodeURIComponent("メールアドレスとパスワードを入力してください。"));
  }

  return { email, password };
}

export async function signIn(formData: FormData) {
  const { email, password } = getCredentials(formData);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const message =
      error.code === "email_not_confirmed"
        ? "メールアドレスの確認がまだ完了していません。確認メールのリンクを開いてから、もう一度ログインしてください。"
        : "ログインできませんでした。メールアドレスとパスワードをご確認ください。";
    redirect("/login?error=" + encodeURIComponent(message));
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || password.length < 8) {
    redirect(
      "/signup?error=" +
        encodeURIComponent("メールアドレスを入力し、パスワードは8文字以上にしてください。"),
    );
  }

  const supabase = await createClient();
  const callbackOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_ENV === "production"
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "wearlog-pi.vercel.app"}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: new URL("/auth/callback", callbackOrigin).toString(),
    },
  });

  if (error) {
    const errorMessage = error.message.toLowerCase();
    const message =
      errorMessage.includes("redirect") &&
      (errorMessage.includes("allow") || errorMessage.includes("url"))
        ? "確認メールの送信先URLがSupabaseで許可されていません。SupabaseのRedirect URLsに https://wearlog-pi.vercel.app/auth/callback を追加してください。"
        : error.code === "user_already_exists" ||
            errorMessage.includes("already registered")
          ? "このメールアドレスは既に登録されています。ログインをお試しください。"
          : error.code === "over_email_send_rate_limit" ||
              errorMessage.includes("rate limit")
            ? "確認メールの送信回数が上限に達しました。しばらく待ってからもう一度お試しください。"
            : `アカウントを作成できませんでした: ${error.message}`;
    redirect(
      "/signup?error=" + encodeURIComponent(message),
    );
  }

  revalidatePath("/", "layout");
  if (data.session) {
    redirect("/dashboard");
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  redirect(
    "/login?message=" +
      encodeURIComponent("確認メールを送信しました。メール内のリンクを開いて認証を完了してください。"),
  );
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(`ログアウトできませんでした: ${error.message}`);
  }

  revalidatePath("/", "layout");
  redirect("/login?message=" + encodeURIComponent("ログアウトしました。"));
}

export async function deleteAccount(): Promise<
  { success: true } | { error: string }
> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return { error: "Supabase URLが未設定のためアカウントを削除できません。" };
  }
  let projectReference: string;
  try {
    projectReference = new URL(supabaseUrl).hostname.split(".")[0];
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? `Supabase URLを確認できませんでした: ${error.message}`
          : "Supabase URLを確認できませんでした。",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: userError
        ? `ログイン状態を確認できませんでした: ${userError.message}`
        : "ログインしてください。",
    };
  }

  const imageCleanup = await removeAllImagesForAccount(user.id);
  if (imageCleanup.warning) {
    return { error: imageCleanup.warning };
  }

  const { error: deleteError } = await supabase.rpc("delete_current_user");
  if (deleteError) {
    return {
      error: `アカウントを削除できませんでした: ${deleteError.message}`,
    };
  }

  const authCookiePrefix = `sb-${projectReference}-`;
  const cookieStore = await cookies();
  cookieStore
    .getAll()
    .filter(({ name }) => name.startsWith(authCookiePrefix))
    .forEach(({ name }) => cookieStore.delete(name));

  revalidatePath("/", "layout");
  return { success: true };
}
