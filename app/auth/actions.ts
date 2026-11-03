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
    redirect("/login?error=" + encodeURIComponent("ログインできませんでした。入力内容をご確認ください。"));
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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    redirect(
      "/signup?error=" +
        encodeURIComponent("アカウントを作成できませんでした。入力内容をご確認ください。"),
    );
  }

  revalidatePath("/", "layout");
  if (data.session) {
    redirect("/dashboard");
  }

  redirect(
    "/login?message=" +
      encodeURIComponent("確認メールを送信しました。メール内のリンクから登録を完了してください。"),
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
