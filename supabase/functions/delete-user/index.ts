import { authorizeAdmin, json } from "../_shared/auth.ts";

interface DeletePayload {
  target_user_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(200, { ok: true });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await authorizeAdmin(req);
  if (!auth.ok) return auth.response;
  const { admin, actorId, actorTenantId } = auth.ctx;

  let body: DeletePayload;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Body harus JSON valid" });
  }
  const targetUserId = String(body?.target_user_id ?? "").trim();
  if (!targetUserId) return json(400, { error: "target_user_id wajib" });
  if (targetUserId === actorId) return json(400, { error: "Admin tidak boleh menghapus akun sendiri" });

  // Hapus mapping di tenant aktor dulu
  const { error: utErr } = await admin
    .from("user_tenants")
    .delete()
    .eq("user_id", targetUserId)
    .eq("tenant_id", actorTenantId);
  if (utErr) return json(500, { error: utErr.message });

  // Jika user tidak punya tenant lain, hapus auth user.
  const { count } = await admin
    .from("user_tenants")
    .select("*", { count: "exact", head: true })
    .eq("user_id", targetUserId);

  if ((count ?? 0) === 0) {
    const { error: delErr } = await admin.auth.admin.deleteUser(targetUserId);
    if (delErr) return json(500, { error: delErr.message });
  }

  return json(200, { ok: true, user_id: targetUserId });
});

