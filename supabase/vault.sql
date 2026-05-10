-- Vault migration: encrypt Akahu user tokens at rest
-- Run this in the Supabase SQL editor

-- Add vault secret ID column (UUID pointer into vault.secrets)
alter table user_settings add column if not exists akahu_token_id uuid;

-- Save/update Akahu token in vault (own user only)
-- Falls back to creating a new secret if none exists yet.
create or replace function save_akahu_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select akahu_token_id into v_existing_id
  from user_settings where user_id = v_user_id;

  if v_existing_id is null then
    v_existing_id := vault.create_secret(p_token, 'akahu:' || v_user_id::text);
    insert into user_settings (user_id, akahu_token_id, updated_at)
    values (v_user_id, v_existing_id, now())
    on conflict (user_id) do update
      set akahu_token_id = v_existing_id, updated_at = now();
  else
    perform vault.update_secret(v_existing_id, p_token);
    update user_settings set updated_at = now() where user_id = v_user_id;
  end if;
end;
$$;

grant execute on function save_akahu_token(text) to authenticated;

-- Get Akahu token for own user (falls back to legacy plaintext column during migration)
create or replace function get_akahu_token()
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_user_id uuid := auth.uid();
  v_token_id uuid;
  v_token text;
begin
  if v_user_id is null then
    return null;
  end if;

  select akahu_token_id, akahu_user_token
  into v_token_id, v_token
  from user_settings where user_id = v_user_id;

  -- Prefer vault; fall back to plaintext for existing users
  if v_token_id is not null then
    select decrypted_secret into v_token
    from vault.decrypted_secrets where id = v_token_id;
  end if;

  return v_token;
end;
$$;

grant execute on function get_akahu_token() to authenticated;

-- Optional: after all users have re-entered their tokens, run this to wipe the plaintext column:
-- update user_settings set akahu_user_token = null where akahu_token_id is not null;
