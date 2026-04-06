import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { json } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(200, { ok: true });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const auth = req.headers.get("Authorization") ?? "";
  if (!url || !anon || !service) return json(500, { error: "Missing env variables" });
  if (!auth.startsWith("Bearer ")) return json(401, { error: "Missing bearer token" });

  const token = auth.slice("Bearer ".length).trim();
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const admin = createClient(url, service);

  const { data: authData, error: authErr } = await userClient.auth.getUser();
  if (authErr || !authData.user) return json(401, { error: "Invalid auth session" });

  const user = authData.user;
  const { data: ut } = await admin
    .from("user_tenants")
    .select("tenant_id, role_id")
    .eq("user_id", user.id)
    .single();

  let roleName = "";
  if (ut?.role_id) {
    const { data: role } = await admin
      .from("roles")
      .select("name")
      .eq("id", ut.role_id)
      .single();
    roleName = role?.name ?? "";
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const treasurerCategory = String(
    meta.treasurer_category ?? meta.bendahara_category ?? meta.category ?? "",
  ) || null;
  const workUnitId = String(meta.work_unit_id ?? "") || null;

  return json(200, {
    ok: true,
    user_id: user.id,
    email: user.email ?? "",
    tenant_id: ut?.tenant_id ?? null,
    role_name: roleName,
    treasurer_category: treasurerCategory,
    work_unit_id: workUnitId,
    nama: String(meta.nama ?? ""),
  });
});

