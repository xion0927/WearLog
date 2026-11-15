import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { removeImageIfUnused } from "@/lib/supabase/image-cleanup";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  if (!isValidDate(from) || !isValidDate(to) || from > to) {
    return NextResponse.json({ error: "日付の指定が正しくありません。" }, { status: 400 });
  }

  const rangeLength =
    (Date.parse(`${to}T00:00:00.000Z`) -
      Date.parse(`${from}T00:00:00.000Z`)) /
      86_400_000 +
    1;
  if (rangeLength > 42) {
    return NextResponse.json(
      { error: "一度に表示できる期間は42日間までです。" },
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
      { error: "コーデの閲覧にはログインが必要です。" },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("outfits")
    .select(
      "id, date, name, memo, image_url, outfit_items(item:items(id, name, category, image_url))",
    )
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: `コーデを読み込めませんでした: ${error.message}` },
      { status: 500 },
    );
  }

  const outfits = data.map((outfit) => ({
    id: outfit.id,
    date: outfit.date,
    name: outfit.name,
    memo: outfit.memo,
    imageUrl: outfit.image_url,
    items: outfit.outfit_items.flatMap(({ item }) => (item ? [item] : [])),
  }));

  return NextResponse.json({ outfits });
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
    !("outfitId" in body) ||
    typeof body.outfitId !== "string" ||
    !uuidPattern.test(body.outfitId)
  ) {
    return NextResponse.json(
      { error: "削除するコーデの指定が正しくありません。" },
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
      { error: "コーデの削除にはログインが必要です。" },
      { status: 401 },
    );
  }

  const { data: outfit, error } = await supabase
    .from("outfits")
    .delete()
    .eq("id", body.outfitId)
    .eq("user_id", user.id)
    .select("id, image_url")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `コーデを削除できませんでした: ${error.message}` },
      { status: 500 },
    );
  }
  if (!outfit) {
    return NextResponse.json(
      { error: "コーデが見つからないか、削除する権限がありません。" },
      { status: 404 },
    );
  }

  const cleanupResult = await removeImageIfUnused(outfit.image_url, user.id);
  return NextResponse.json({
    deleted: true,
    cleanupWarning: cleanupResult.warning,
  });
}
