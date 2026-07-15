import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before purging legacy analysis screenshots.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const bucket = supabase.storage.from("analysis-screenshots");

async function listFiles(prefix = "") {
  const files = [];
  let offset = 0;
  while (true) {
    const { data, error } = await bucket.list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    for (const item of data || []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) files.push(path);
      else files.push(...(await listFiles(path)));
    }
    if (!data || data.length < 100) break;
    offset += data.length;
  }
  return files;
}

const files = await listFiles();
for (let index = 0; index < files.length; index += 100) {
  const { error } = await bucket.remove(files.slice(index, index + 100));
  if (error) throw error;
}

const { error: updateError } = await supabase
  .from("analyses")
  .update({ private_image_path: null })
  .not("private_image_path", "is", null);
if (updateError) throw updateError;

console.log(`Purged ${files.length} legacy analysis screenshot object(s).`);
