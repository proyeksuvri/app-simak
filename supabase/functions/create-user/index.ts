import {
  authorizeAdmin,
  isTreasurerCategory,
  json,
  resolveRoleId,
  type AppRole,
  type TreasurerCategory,
} from "../_shared/auth.ts";

interface CreateUserPayload {
  email: string;
  password: string;
  nama: string;
  role: AppRole;
  category?: TreasurerCategory;
  work_unit_id?: string;
}

function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validatePayload(body: unknown): { ok: true; value: CreateUserPayload } | { ok: false; msg: string } {
  if (!body || typeof body !== "object") return { ok: false, msg: "Invalid payload" };
  const p = body as Record<string, unknown>;

  const email = String(p.email ?? "").trim();
  const password = String(p.password ?? "");
  const nama = String(p.nama ?? "").trim();
  const role = String(p.role ?? "") as AppRole;
  const category = p.category ? String(p.category) : undefined;
  const workUnit = p.work_unit_id ? String(p.work_unit_id) : undefined;

  if (!email || !password || !nama) return { ok: false, msg: "email, password, nama wajib diisi" };
  if (password.length < 8) return { ok: false, msg: "password minimal 8 karakter" };
  if (role !== "Admin" && role !== "Approver" && role !== "Operator") return { ok: false, msg: "role tidak valid" };

  if (role === "Operator") {
    if (!category || !isTreasurerCategory(category)) {
      return { ok: false, msg: "kategori bendahara wajib dan harus valid untuk role Operator" };
    }
    if (category === "bendahara_pembantu" && !workUnit) {
      return { ok: false, msg: "work_unit_id wajib untuk bendahara_pembantu" };
    }
  }

  return {
    ok: true,
    value: {
      email: sanitizeEmail(email),
      password,
      nama,
      role,
      category: role === "Operator" ? (category as TreasurerCategory) : undefined,
      work_unit_id: role === "Operator" ? workUnit : undefined,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(200, { ok: true });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await authorizeAdmin(req);
  if (!auth.ok) return auth.response;
  const { admin, actorTenantId } = auth.ctx;

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return json(400, { error: "Body harus JSON valid" });
  }
  const validated = validatePayload(parsed);
  if (!validated.ok) return json(400, { error: validated.msg });
  const payload = validated.value;

  const roleId = await resolveRoleId(admin, actorTenantId, payload.role);
  if (!roleId) return json(400, { error: `Role ${payload.role} tidak ditemukan di tenant` });

  // 1) Cari user by email; create jika belum ada
  const { data: listRes, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) return json(500, { error: listErr.message });
  const existing = (listRes.users ?? []).find((u) =>
    (u.email ?? "").toLowerCase() === payload.email
  );

  let targetUserId = existing?.id ?? null;
  if (!targetUserId) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        nama: payload.nama,
        treasurer_category: payload.category ?? null,
        work_unit_id: payload.work_unit_id ?? null,
      },
    });
    if (createErr || !created.user?.id) return json(500, { error: createErr?.message ?? "Gagal create auth user" });
    targetUserId = created.user.id;
  } else {
    // update metadata + password saat user sudah ada
    const { error: updateErr } = await admin.auth.admin.updateUserById(targetUserId, {
      password: payload.password,
      user_metadata: {
        nama: payload.nama,
        treasurer_category: payload.category ?? null,
        work_unit_id: payload.work_unit_id ?? null,
      },
    });
    if (updateErr) return json(500, { error: updateErr.message });
  }

  // 2) Upsert mapping user_tenants (presisi per tenant)
  const { error: utErr } = await admin
    .from("user_tenants")
    .upsert(
      {
        user_id: targetUserId,
        tenant_id: actorTenantId,
        role_id: roleId,
      },
      { onConflict: "user_id,tenant_id" },
    );
  if (utErr) return json(500, { error: utErr.message });

  return json(200, {
    ok: true,
    user_id: targetUserId,
    email: payload.email,
    role: payload.role,
    category: payload.category ?? null,
    work_unit_id: payload.work_unit_id ?? null,
  });
});

