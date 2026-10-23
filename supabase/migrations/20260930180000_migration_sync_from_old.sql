-- Import dal vecchio backend Lovable (uiowzycolsmgcsvihmhy) verso questo DB.
-- 1) select migration.fetch_old_snapshot(<url export-old-data>, <token>, <anon vecchio>);
-- 2) select migration.apply_snapshot(<id>);
-- Idempotente: inserisce le righe mancanti e, dove esiste updated_at, aggiorna
-- solo se la riga del vecchio DB è più recente. Non cancella nulla.

create extension if not exists http with schema extensions;

create schema if not exists migration;
revoke all on schema migration from public, anon, authenticated;

create table if not exists migration.snapshots (
  id bigserial primary key,
  fetched_at timestamptz not null default now(),
  source text,
  payload jsonb not null,
  applied_at timestamptz,
  summary jsonb
);

create table if not exists migration.sync_errors (
  id bigserial primary key,
  snapshot_id bigint references migration.snapshots(id) on delete cascade,
  table_name text not null,
  row_pk text,
  error text,
  created_at timestamptz not null default now()
);

alter table migration.snapshots enable row level security;
alter table migration.sync_errors enable row level security;
revoke all on migration.snapshots, migration.sync_errors from public, anon, authenticated;
grant all on migration.snapshots, migration.sync_errors to service_role;
grant usage on schema migration to service_role;
drop policy if exists "service role only" on migration.snapshots;
create policy "service role only" on migration.snapshots for all to service_role using (true) with check (true);
drop policy if exists "service role only" on migration.sync_errors;
create policy "service role only" on migration.sync_errors for all to service_role using (true) with check (true);

create or replace function migration.fetch_old_snapshot(p_url text, p_token text, p_anon_key text)
returns bigint
language plpgsql
set search_path = migration, extensions, public
as $$
declare
  v_resp extensions.http_response;
  v_id bigint;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '300');
  select * into v_resp from extensions.http((
    'GET',
    p_url,
    array[
      extensions.http_header('x-export-token', p_token),
      extensions.http_header('Authorization', 'Bearer ' || p_anon_key),
      extensions.http_header('apikey', p_anon_key)
    ],
    null,
    null
  )::extensions.http_request);

  if v_resp.status <> 200 then
    raise exception 'export HTTP %: %', v_resp.status, left(v_resp.content, 500);
  end if;

  insert into migration.snapshots (source, payload)
  values (p_url, v_resp.content::jsonb)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function migration.upsert_rows(
  p_snapshot bigint,
  p_rel regclass,
  p_rows jsonb,
  p_log_errors boolean
)
returns jsonb
language plpgsql
set search_path = migration, public
as $$
declare
  v_cols text;
  v_pk text[];
  v_pk_d text;
  v_pk_s text;
  v_has_updated boolean;
  v_row jsonb;
  v_n int;
  v_exists boolean;
  v_ins int := 0;
  v_upd int := 0;
  v_same int := 0;
  v_conflict int := 0;
  v_failed jsonb := '[]'::jsonb;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    return jsonb_build_object('inserted', 0, 'updated', 0, 'unchanged', 0, 'conflict', 0, 'failed_rows', '[]'::jsonb);
  end if;

  select string_agg(format('%I', a.attname), ',' order by a.attnum)
    into v_cols
  from pg_attribute a
  where a.attrelid = p_rel and a.attnum > 0 and not a.attisdropped
    and a.attgenerated = '' and (p_rows -> 0) ? a.attname;

  select array_agg(a.attname::text order by k.ord)
    into v_pk
  from pg_index i
  cross join lateral unnest(i.indkey) with ordinality as k(attnum, ord)
  join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
  where i.indrelid = p_rel and i.indisprimary;

  if v_pk is not null then
    select string_agg(format('d.%I', c), ','), string_agg(format('s.%I', c), ',')
      into v_pk_d, v_pk_s
    from unnest(v_pk) c;
  end if;

  v_has_updated := v_pk is not null
    and (p_rows -> 0) ? 'updated_at'
    and exists (
      select 1 from pg_attribute
      where attrelid = p_rel and attname = 'updated_at' and not attisdropped
    );

  for v_row in select value from jsonb_array_elements(p_rows) loop
    begin
      execute format(
        'insert into %1$s (%2$s) select %2$s from jsonb_populate_record(null::%1$s, $1) on conflict do nothing',
        p_rel, v_cols
      ) using v_row;
      get diagnostics v_n = row_count;

      if v_n = 1 then
        v_ins := v_ins + 1;
      elsif v_pk is null then
        v_same := v_same + 1;
      else
        execute format(
          'select exists (select 1 from %1$s d, jsonb_populate_record(null::%1$s, $1) s where (%2$s) = (%3$s))',
          p_rel, v_pk_d, v_pk_s
        ) into v_exists using v_row;

        if not v_exists then
          v_conflict := v_conflict + 1;
          if p_log_errors then
            insert into migration.sync_errors (snapshot_id, table_name, row_pk, error)
            values (p_snapshot, p_rel::text, (select string_agg(v_row ->> c, ',') from unnest(v_pk) c),
                    'duplicate on another unique key, skipped');
          end if;
        elsif v_has_updated then
          execute format(
            'update %1$s d set (%2$s) = (select %2$s from jsonb_populate_record(null::%1$s, $1)) '
            'from jsonb_populate_record(null::%1$s, $1) s '
            'where (%3$s) = (%4$s) and d.updated_at is distinct from s.updated_at '
            'and (d.updated_at is null or d.updated_at < s.updated_at)',
            p_rel, v_cols, v_pk_d, v_pk_s
          ) using v_row;
          get diagnostics v_n = row_count;
          if v_n > 0 then v_upd := v_upd + 1; else v_same := v_same + 1; end if;
        else
          v_same := v_same + 1;
        end if;
      end if;
    exception when others then
      v_failed := v_failed || jsonb_build_array(v_row);
      if p_log_errors then
        insert into migration.sync_errors (snapshot_id, table_name, row_pk, error)
        values (p_snapshot, p_rel::text,
                (select string_agg(v_row ->> c, ',') from unnest(coalesce(v_pk, array['id'])) c),
                sqlerrm);
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'inserted', v_ins, 'updated', v_upd, 'unchanged', v_same,
    'conflict', v_conflict, 'failed_rows', v_failed
  );
end;
$$;

create or replace function migration.apply_snapshot(p_snapshot bigint, p_max_passes int default 4)
returns jsonb
language plpgsql
set search_path = migration, public
as $$
declare
  v_payload jsonb;
  v_summary jsonb := '{}'::jsonb;
  v_res jsonb;
  v_tables text[];
  v_ordered text[] := '{}';
  v_remaining text[];
  v_ready text[];
  v_missing jsonb := '{}'::jsonb;
  v_disabled text[] := '{}';
  v_pending jsonb := '{}'::jsonb;
  v_stats jsonb := '{}'::jsonb;
  v_t text;
  v_pass int;
  v_last boolean;
  v_rows jsonb;
begin
  select payload into v_payload from migration.snapshots where id = p_snapshot;
  if v_payload is null then
    raise exception 'snapshot % not found', p_snapshot;
  end if;

  delete from migration.sync_errors where snapshot_id = p_snapshot;

  v_res := migration.upsert_rows(p_snapshot, 'auth.users'::regclass, v_payload -> 'auth' -> 'users', true);
  v_summary := v_summary || jsonb_build_object('auth.users',
    (v_res - 'failed_rows') || jsonb_build_object('failed', jsonb_array_length(v_res -> 'failed_rows')));
  v_res := migration.upsert_rows(p_snapshot, 'auth.identities'::regclass, v_payload -> 'auth' -> 'identities', true);
  v_summary := v_summary || jsonb_build_object('auth.identities',
    (v_res - 'failed_rows') || jsonb_build_object('failed', jsonb_array_length(v_res -> 'failed_rows')));

  select coalesce(array_agg(k order by k), '{}')
    into v_tables
  from jsonb_object_keys(v_payload -> 'public') k
  where to_regclass(format('public.%I', k)) is not null;

  select coalesce(jsonb_object_agg(k, jsonb_array_length(v_payload -> 'public' -> k)), '{}'::jsonb)
    into v_missing
  from jsonb_object_keys(v_payload -> 'public') k
  where to_regclass(format('public.%I', k)) is null;

  -- Parents before children (FK among public tables); cycles go last as a block.
  v_remaining := v_tables;
  while coalesce(array_length(v_remaining, 1), 0) > 0 loop
    select coalesce(array_agg(t order by t), '{}')
      into v_ready
    from unnest(v_remaining) t
    where not exists (
      select 1
      from pg_constraint c
      join pg_class ref on ref.oid = c.confrelid
      join pg_namespace rn on rn.oid = ref.relnamespace
      where c.contype = 'f'
        and c.conrelid = format('public.%I', t)::regclass
        and rn.nspname = 'public'
        and ref.relname <> t
        and ref.relname = any (v_remaining)
    );
    if coalesce(array_length(v_ready, 1), 0) = 0 then
      v_ready := v_remaining;
    end if;
    v_ordered := v_ordered || v_ready;
    v_remaining := array(select t from unnest(v_remaining) t where t <> all (v_ready));
  end loop;

  foreach v_t in array v_ordered loop
    begin
      execute format('alter table public.%I disable trigger user', v_t);
      v_disabled := v_disabled || v_t;
    exception when others then
      null;
    end;
    v_pending := v_pending || jsonb_build_object(v_t, v_payload -> 'public' -> v_t);
  end loop;

  for v_pass in 1..p_max_passes loop
    v_last := v_pass = p_max_passes;
    foreach v_t in array v_ordered loop
      v_rows := v_pending -> v_t;
      if v_rows is null or jsonb_array_length(v_rows) = 0 then
        continue;
      end if;
      v_res := migration.upsert_rows(p_snapshot, format('public.%I', v_t)::regclass, v_rows, v_last);
      v_stats := jsonb_set(
        v_stats, array[v_t],
        jsonb_build_object(
          'inserted', coalesce((v_stats -> v_t ->> 'inserted')::int, 0) + (v_res ->> 'inserted')::int,
          'updated', coalesce((v_stats -> v_t ->> 'updated')::int, 0) + (v_res ->> 'updated')::int,
          'unchanged', coalesce((v_stats -> v_t ->> 'unchanged')::int, 0) + (v_res ->> 'unchanged')::int,
          'conflict', coalesce((v_stats -> v_t ->> 'conflict')::int, 0) + (v_res ->> 'conflict')::int,
          'failed', jsonb_array_length(v_res -> 'failed_rows')
        )
      );
      v_pending := jsonb_set(v_pending, array[v_t], v_res -> 'failed_rows');
    end loop;
  end loop;

  foreach v_t in array v_disabled loop
    execute format('alter table public.%I enable trigger user', v_t);
  end loop;

  v_summary := v_summary || jsonb_build_object(
    'public', v_stats,
    'missing_tables_in_destination', v_missing,
    'storage_objects_in_source', jsonb_array_length(coalesce(v_payload -> 'storage_objects', '[]'::jsonb)),
    'export_mode', v_payload ->> 'mode',
    'exported_at', v_payload ->> 'generated_at'
  );

  update migration.snapshots set applied_at = now(), summary = v_summary where id = p_snapshot;
  return v_summary;
end;
$$;

revoke all on function migration.fetch_old_snapshot(text, text, text) from public, anon, authenticated;
revoke all on function migration.upsert_rows(bigint, regclass, jsonb, boolean) from public, anon, authenticated;
revoke all on function migration.apply_snapshot(bigint, int) from public, anon, authenticated;
