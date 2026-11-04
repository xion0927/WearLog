import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tokenType = searchParams.get("type");
  const authError = searchParams.get("error_description");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }

  const pendingCookies: Array<{
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        pendingCookies.push(...cookiesToSet);
      },
    },
  });

  let verificationError: string | null = authError;
  if (!verificationError && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verificationError = error?.message ?? null;
  } else if (!verificationError && tokenHash && tokenType) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: tokenType,
    });
    verificationError = error?.message ?? null;
  } else if (!verificationError) {
    verificationError = "確認リンクに必要な認証情報がありません。";
  }

  if (verificationError) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set(
        "message",
        "確認リンクを開きました。登録したメールアドレスとパスワードでログインしてください。",
      );
      return withCookies(NextResponse.redirect(loginUrl), pendingCookies);
    }
  }

  return withCookies(
    NextResponse.redirect(new URL("/dashboard", origin)),
    pendingCookies,
  );
}

function withCookies(
  response: NextResponse,
  cookies: Array<{
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }>,
) {
  cookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  return response;
}
