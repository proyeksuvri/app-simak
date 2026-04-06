import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AppRole = "Admin" | "Approver" | "Operator";
export type TreasurerCategory =
  | "bendahara_penerimaan"
  | "bendahara_induk"
  | "bendahara_pembantu";

export interface AuthContext {
  admin: ReturnType<typeof createClient>;
  userClient: ReturnType<typeof createClient>;
  actorId: string;
  actorEmail: string;
  actorTenantId: string;
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim();
}

export function json(
  status: number,
  body: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

export async function authorizeAdmin(req: Request): Promise<
  { ok: true; ctx: AuthContext } | { ok: false; response: Response }
> {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return { ok: false, response: json(500, { error: "Missing env variables" }) };
  }

  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, response: json(401, { error: "Missing bearer token" }) };
  }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const admin = createClient(url, service);

  const { data: authData, error: authErr } = await userClient.auth.getUser();
  if (authErr || !authData.user) {
    return { ok: false, response: json(401, { error: "Invalid auth session" }) };
  }

  const actorId = authData.user.id;
  const actorEmail = authData.user.email ?? "";

  const { data: actorUT } = await admin
    .from("user_tenants")
    .select("tenant_id, role_id")
    .eq("user_id", actorId)
    .single();
  if (!actorUT?.tenant_id || !actorUT?.role_id) {
    return { ok: false, response: json(403, { error: "Aktor tidak terdaftar di tenant" }) };
  }

  const { data: actorRole } = await admin
    .from("roles")
    .select("name")
    .eq("id", actorUT.role_id)
    .single();
  if (actorRole?.name !== "Admin") {
    return { ok: false, response: json(403, { error: "Hanya Admin yang diizinkan" }) };
  }

  return {
    ok: true,
    ctx: {
      admin,
      userClient,
      actorId,
      actorEmail,
      actorTenantId: actorUT.tenant_id,
    },
  };
}

export async function resolveRoleId(
  admin: ReturnType<typeof createClient>,
  tenantId: string,
  role: AppRole,
): Promise<string | null> {
  const { data } = await admin
    .from("roles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", role)
    .single();
  return data?.id ?? null;
}

export function isTreasurerCategory(value: string): value is TreasurerCategory {
  return value === "bendahara_penerimaan"
    || value === "bendahara_induk"
    || value === "bendahara_pembantu";
}

