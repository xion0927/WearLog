import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidWearMonth(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 12
  );
}

async function getOwnedTemplate(templateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: "テンプレートの着用月を変更するにはログインが必要です。" },
        { status: 401 },
      ),
    };
  }

  const { data: template, error: templateError } = await supabase
    .from("outfit_templates")
    .select("id")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (templateError) {
    return {
      error: NextResponse.json(
        { error: `テンプレートを確認できませんでした: ${templateError.message}` },
        { status: 500 },
      ),
    };
  }
  if (!template) {
    return {
      error: NextResponse.json(
        { error: "テンプレートが見つからないか、変更する権限がありません。" },
        { status: 404 },
      ),
    };
  }

  return { supabase, user };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "送信内容を読み取れませんでした。" },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("templateId" in body) ||
    typeof body.templateId !== "string" ||
    !uuidPattern.test(body.templateId) ||
    !("month" in body) ||
    !isValidWearMonth(body.month)
  ) {
    return NextResponse.json(
      { error: "テンプレートと1〜12の月を指定してください。" },
      { status: 400 },
    );
  }

  const owned = await getOwnedTemplate(body.templateId);
  if ("error" in owned) {
    return owned.error;
  }

  const { error } = await owned.supabase
    .from("outfit_template_manual_months")
    .insert({
      template_id: body.templateId,
      user_id: owned.user.id,
      wear_month: body.month,
    });

  if (error?.code === "23505") {
    return NextResponse.json({ saved: true, alreadyExists: true });
  }
  if (error) {
    return NextResponse.json(
      { error: `着用月を追加できませんでした: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ saved: true, alreadyExists: false });
}

export async function DELETE(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "送信内容を読み取れませんでした。" },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("templateId" in body) ||
    typeof body.templateId !== "string" ||
    !uuidPattern.test(body.templateId) ||
    !("month" in body) ||
    !isValidWearMonth(body.month)
  ) {
    return NextResponse.json(
      { error: "テンプレートと1〜12の月を指定してください。" },
      { status: 400 },
    );
  }

  const owned = await getOwnedTemplate(body.templateId);
  if ("error" in owned) {
    return owned.error;
  }

  const { error } = await owned.supabase
    .from("outfit_template_manual_months")
    .delete()
    .eq("template_id", body.templateId)
    .eq("user_id", owned.user.id)
    .eq("wear_month", body.month);

  if (error) {
    return NextResponse.json(
      { error: `手動の着用月を解除できませんでした: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ deleted: true });
}
