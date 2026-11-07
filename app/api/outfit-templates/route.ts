import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { removeImageIfUnused } from "@/lib/supabase/image-cleanup";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "テンプレートの閲覧にはログインが必要です。" },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("outfit_templates")
    .select(
      "id, name, memo, image_url, outfit_template_items(item:items(id, name, category, image_url))",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: `テンプレートを読み込めませんでした: ${error.message}` },
      { status: 500 },
    );
  }

  const templates = data.map((template) => ({
    id: template.id,
    name: template.name,
    memo: template.memo,
    imageUrl: template.image_url,
    items: template.outfit_template_items.flatMap(({ item }) =>
      Array.isArray(item) ? item : item ? [item] : [],
    ),
  }));

  return NextResponse.json({ templates });
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
    !("outfitId" in body) ||
    typeof body.outfitId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      body.outfitId,
    ) ||
    !("name" in body) ||
    typeof body.name !== "string" ||
    body.name.trim().length < 1 ||
    body.name.trim().length > 80
  ) {
    return NextResponse.json(
      { error: "コーデと1〜80文字のテンプレート名を指定してください。" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "テンプレートの保存にはログインが必要です。" },
      { status: 401 },
    );
  }

  const { data, error } = await supabase.rpc("save_outfit_template", {
    p_outfit_id: body.outfitId,
    p_name: body.name.trim(),
  });

  if (error) {
    return NextResponse.json(
      { error: `テンプレートを保存できませんでした: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
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
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      body.templateId,
    ) ||
    !("name" in body) ||
    typeof body.name !== "string" ||
    body.name.trim().length < 1 ||
    body.name.trim().length > 80 ||
    !("memo" in body) ||
    (body.memo !== null &&
      (typeof body.memo !== "string" || body.memo.length > 2000)) ||
    !("imageUrl" in body) ||
    (body.imageUrl !== null && typeof body.imageUrl !== "string") ||
    !("itemIds" in body) ||
    !Array.isArray(body.itemIds) ||
    !body.itemIds.every(
      (itemId) =>
        typeof itemId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          itemId,
        ),
    )
  ) {
    return NextResponse.json(
      { error: "テンプレートの入力内容が正しくありません。" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "テンプレートの編集にはログインが必要です。" },
      { status: 401 },
    );
  }

  const { data: currentTemplate, error: currentTemplateError } = await supabase
    .from("outfit_templates")
    .select("image_url")
    .eq("id", body.templateId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (currentTemplateError) {
    return NextResponse.json(
      { error: `テンプレートを確認できませんでした: ${currentTemplateError.message}` },
      { status: 500 },
    );
  }
  if (!currentTemplate) {
    return NextResponse.json(
      { error: "テンプレートが見つからないか、編集する権限がありません。" },
      { status: 404 },
    );
  }

  const { error } = await supabase.rpc("update_outfit_template", {
    p_template_id: body.templateId,
    p_name: body.name.trim(),
    p_memo: body.memo,
    p_image_url: body.imageUrl,
    p_item_ids: body.itemIds,
  });

  if (error) {
    return NextResponse.json(
      { error: `テンプレートを更新できませんでした: ${error.message}` },
      { status: 500 },
    );
  }

  const cleanupResult =
    currentTemplate.image_url !== body.imageUrl
      ? await removeImageIfUnused(currentTemplate.image_url, user.id)
      : { removed: false };

  return NextResponse.json({
    updated: true,
    cleanupWarning: cleanupResult.warning,
  });
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
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      body.templateId,
    )
  ) {
    return NextResponse.json(
      { error: "テンプレートIDが正しくありません。" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "テンプレートの削除にはログインが必要です。" },
      { status: 401 },
    );
  }

  const { data: template, error: templateError } = await supabase
    .from("outfit_templates")
    .select("id, image_url")
    .eq("id", body.templateId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (templateError) {
    return NextResponse.json(
      { error: `テンプレートを確認できませんでした: ${templateError.message}` },
      { status: 500 },
    );
  }
  if (!template) {
    return NextResponse.json(
      { error: "テンプレートが見つからないか、削除する権限がありません。" },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("outfit_templates")
    .delete()
    .eq("id", body.templateId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `テンプレートを削除できませんでした: ${error.message}` },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "テンプレートが見つからないか、削除する権限がありません。" },
      { status: 404 },
    );
  }

  const cleanupResult = await removeImageIfUnused(template.image_url, user.id);
  return NextResponse.json({
    deleted: true,
    cleanupWarning: cleanupResult.warning,
  });
}
