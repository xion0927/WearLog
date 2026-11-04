"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
        ? "メールアドレスの確認がまだ完了していません。確認メールのコードを /verify-email に入力してください。"
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
  const { data, error } = await supabase.auth.signUp({ email, password });

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

  redirect("/verify-email?message=" + encodeURIComponent("確認コードをメールで送信しました。メールに記載されたコードを入力してください。"));
}

export async function verifySignupOtp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();

  if (!email || !/^\d{6,12}$/.test(token)) {
    redirect(
      "/verify-email?error=" +
        encodeURIComponent("メールアドレスと、メールに記載された確認コードを入力してください。"),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });

  if (error) {
    redirect(
      "/verify-email?error=" +
        encodeURIComponent("確認コードが正しくないか、有効期限が切れています。新しいコードを再送してください。"),
    );
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function resendSignupOtp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect(
      "/verify-email?error=" +
        encodeURIComponent("確認コードを再送するメールアドレスを入力してください。"),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    const message =
      error.code === "over_email_send_rate_limit"
        ? "確認コードの送信回数が上限に達しました。しばらく待ってから再度お試しください。"
        : "確認コードを再送できませんでした。メールアドレスをご確認のうえ、時間をおいて再度お試しください。";
    redirect("/verify-email?error=" + encodeURIComponent(message));
  }

  redirect(
    "/verify-email?message=" +
      encodeURIComponent("確認コードを再送しました。最新のメールに記載されたコードを入力してください。"),
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
