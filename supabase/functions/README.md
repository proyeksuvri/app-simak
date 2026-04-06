# Supabase Edge Functions

Fungsi yang ditambahkan:

- `create-user`: membuat/memperbarui user + metadata role bendahara secara presisi.
- `delete-user`: menghapus mapping tenant user (dan auth user jika tidak dipakai tenant lain).
- `get-user-profile`: mengembalikan profil + role + kategori bendahara + unit kerja.

## Prasyarat

1. Install Supabase CLI.
2. Login:

```bash
supabase login
```

3. Link project:

```bash
supabase link --project-ref bqlrbdzmexmjcumechmt
```

4. Set secrets untuk functions:

```bash
supabase secrets set \
  SUPABASE_URL=https://bqlrbdzmexmjcumechmt.supabase.co \
  SUPABASE_ANON_KEY=YOUR_ANON_KEY \
  SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

## Deploy

```bash
supabase functions deploy create-user
supabase functions deploy delete-user
supabase functions deploy get-user-profile
```

## Catatan Perilaku Role

- `role = Operator` wajib menyertakan `category`.
- `category = bendahara_pembantu` wajib menyertakan `work_unit_id`.
- Role detail bendahara disimpan ke `auth.users.user_metadata.treasurer_category`.
- Mapping tenant disimpan lewat `user_tenants` dengan upsert pada konflik `user_id,tenant_id`.

