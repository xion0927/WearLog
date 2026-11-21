import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    !("name" in body) ||
    typeof body.name !== "string" ||
    body.name.trim().length > 80 ||
    !("imageUrl" in body) ||
    (body.imageUrl !== null && typeof body.imageUrl !== "string") ||
    !("itemIds" in body) ||
    !Array.isArray(body.itemIds) ||
    !body.itemIds.every(
      (itemId) => typeof itemId === "string" && uuidPattern.test(itemId),
    ) ||
    (!body.name.trim() && !body.imageUrl && body.itemIds.length === 0)
  ) {
    return NextResponse.json(
      {
        error:
          "テンプレート名、全体画像、着用アイテムのいずれかを登録してください。",
      },
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
      { error: "テンプレートの登録にはログインが必要です。" },
      { status: 401 },
    );
  }

  const { data: templateId, error: createError } = await supabase.rpc(
    "create_outfit_template",
    {
      p_name: body.name.trim() || null,
      p_image_url: body.imageUrl,
      p_item_ids: body.itemIds,
    },
  );

  if (createError) {
    return NextResponse.json(
      { error: `テンプレートを登録できませんでした: ${createError.message}` },
      { status: 500 },
    );
  }

  const { data: template, error: templateError } = await supabase
    .from("outfit_templates")
    .select("id, name")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .single();

  if (templateError) {
    return NextResponse.json(
      { error: `登録したテンプレートを確認できませんでした: ${templateError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(template, { status: 201 });
}
