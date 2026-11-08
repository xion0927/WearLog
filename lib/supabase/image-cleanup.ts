import { createClient } from "@/lib/supabase/server";

type CleanupResult = {
  removed: boolean;
  warning?: string;
};

type CleanupAllResult = {
  removedCount: number;
  warning?: string;
};

type AccountImageCleanupResult = {
  warning?: string;
};

const imageBuckets = ["item-images", "outfit-images"] as const;
const pageSize = 100;

function getImageIdentity(
  imageUrl: string,
  supabaseOrigin: string,
): { bucket: (typeof imageBuckets)[number]; objectPath: string } | null {
  try {
    const url = new URL(imageUrl);
    if (url.origin !== supabaseOrigin || url.search || url.hash) {
      return null;
    }

    for (const bucket of imageBuckets) {
      const prefix = `/storage/v1/object/public/${bucket}/`;
      if (url.pathname.startsWith(prefix)) {
        const objectPath = decodeURIComponent(url.pathname.slice(prefix.length));
        if (objectPath) {
          return { bucket, objectPath };
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function getReferencedImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Set<string> | { warning: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return { warning: "Supabase URLが未設定のため画像を確認できませんでした。" };
  }
  let supabaseOrigin: string;
  try {
    supabaseOrigin = new URL(supabaseUrl).origin;
  } catch (error) {
    return {
      warning: error instanceof Error
        ? `Supabase URLを確認できませんでした: ${error.message}`
        : "Supabase URLを確認できませんでした。",
    };
  }

  const imageUrls: string[] = [];
  for (const table of ["items", "outfits", "outfit_templates"] as const) {
    for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase
          .from(table)
          .select("image_url")
          .not("image_url", "is", null)
          .range(offset, offset + pageSize - 1);
        if (error) {
          return {
            warning: `画像の使用状況を確認できませんでした: ${error.message}`,
          };
        }
        imageUrls.push(
          ...data.flatMap(({ image_url }) => (image_url ? [image_url] : [])),
        );
        if (data.length < pageSize) {
          break;
        }
    }
  }

  const referencedImages = new Set<string>();
  for (const imageUrl of imageUrls) {
    const identity = getImageIdentity(imageUrl, supabaseOrigin);
    if (identity) {
      referencedImages.add(`${identity.bucket}/${identity.objectPath}`);
    }
  }
  return referencedImages;
}

export async function removeUnusedImagesForUser(
  expectedUserId: string,
): Promise<CleanupAllResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user || user.id !== expectedUserId) {
    return {
      removedCount: 0,
      warning: authError
        ? `画像の後片付けでログイン状態を確認できませんでした: ${authError.message}`
        : "画像の後片付けにはログインが必要です。",
    };
  }

  const initialReferences = await getReferencedImages(supabase);
  if (!(initialReferences instanceof Set)) {
    return { removedCount: 0, warning: initialReferences.warning };
  }

  let removedCount = 0;
  for (const bucket of imageBuckets) {
    const candidatePaths: string[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const { data: files, error } = await supabase.storage
        .from(bucket)
        .list(user.id, {
          limit: pageSize,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
      if (error) {
        return {
          removedCount,
          warning: `未使用画像の一覧を取得できませんでした (${bucket}): ${error.message}`,
        };
      }

      for (const file of files) {
        if (
          file.id &&
          !file.name.includes("/") &&
          file.name !== "." &&
          file.name !== ".." &&
          !initialReferences.has(`${bucket}/${user.id}/${file.name}`)
        ) {
          candidatePaths.push(`${user.id}/${file.name}`);
        }
      }
      if (files.length < pageSize) {
        break;
      }
    }

    for (let index = 0; index < candidatePaths.length; index += pageSize) {
      const paths = candidatePaths.slice(index, index + pageSize);
      const latestReferences = await getReferencedImages(supabase);
      if (!(latestReferences instanceof Set)) {
        return { removedCount, warning: latestReferences.warning };
      }
      const unusedPaths = paths.filter(
        (path) => !latestReferences.has(`${bucket}/${path}`),
      );
      if (unusedPaths.length === 0) {
        continue;
      }

      const { error } = await supabase.storage.from(bucket).remove(unusedPaths);
      if (error) {
        return {
          removedCount,
          warning: `未使用画像の削除に失敗しました (${bucket}): ${error.message}`,
        };
      }
      removedCount += unusedPaths.length;
    }
  }

  return { removedCount };
}

export async function removeAllImagesForAccount(
  expectedUserId: string,
): Promise<AccountImageCleanupResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user || user.id !== expectedUserId) {
    return {
      warning: authError
        ? `アカウント画像の削除時にログイン状態を確認できませんでした: ${authError.message}`
        : "アカウント画像の削除にはログインが必要です。",
    };
  }

  for (const bucket of imageBuckets) {
    while (true) {
      const { data: files, error } = await supabase.storage
        .from(bucket)
        .list(user.id, {
          limit: pageSize,
          offset: 0,
          sortBy: { column: "name", order: "asc" },
        });
      if (error) {
        return {
          warning: `アカウント画像の一覧を取得できませんでした (${bucket}): ${error.message}`,
        };
      }
      if (files.length === 0) {
        break;
      }

      const paths = files
        .filter(
          (file) =>
            file.id &&
            !file.name.includes("/") &&
            file.name !== "." &&
            file.name !== "..",
        )
        .map((file) => `${user.id}/${file.name}`);
      if (paths.length === 0) {
        return {
          warning: `アカウント画像のフォルダー構成を確認できませんでした (${bucket})。画像は削除されていません。`,
        };
      }
      if (paths.length > 0) {
        const { error: removeError } = await supabase.storage
          .from(bucket)
          .remove(paths);
        if (removeError) {
          return {
            warning: `アカウント画像を削除できませんでした (${bucket}): ${removeError.message}`,
          };
        }
      }

      if (files.length < pageSize) break;
    }
  }

  return {};
}

export async function removeImageIfUnused(
  imageUrl: string | null,
  expectedUserId?: string,
): Promise<CleanupResult> {
  if (!imageUrl) {
    return { removed: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || (expectedUserId && user.id !== expectedUserId)) {
    return {
      removed: false,
      warning: authError
        ? `画像の後片付けでログイン状態を確認できませんでした: ${authError.message}`
        : "画像の後片付けにはログインが必要です。",
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return {
      removed: false,
      warning: "Supabase URLが未設定のため画像を削除できませんでした。",
    };
  }

  let supabaseOrigin: string;
  try {
    supabaseOrigin = new URL(supabaseUrl).origin;
  } catch (error) {
    return {
      removed: false,
      warning:
        error instanceof Error
          ? `Supabase URLを確認できませんでした: ${error.message}`
          : "Supabase URLを確認できませんでした。",
    };
  }

  const identity = getImageIdentity(imageUrl, supabaseOrigin);
  if (!identity) {
    return { removed: false };
  }

  const { bucket, objectPath } = identity;
  const pathSegments = objectPath.split("/");
  if (
    pathSegments[0] !== user.id ||
    pathSegments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return { removed: false };
  }

  const references = await getReferencedImages(supabase);
  if (!(references instanceof Set)) {
    return { removed: false, warning: references.warning };
  }
  if (references.has(`${bucket}/${objectPath}`)) {
    return { removed: false };
  }

  const { error: storageError } = await supabase.storage
    .from(bucket)
    .remove([objectPath]);

  if (storageError) {
    return {
      removed: false,
      warning: `未使用画像の削除に失敗しました: ${storageError.message}`,
    };
  }

  return { removed: true };
}
