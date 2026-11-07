import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
