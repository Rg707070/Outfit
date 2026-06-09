-- Catalog (curated item pool) + Look Builder support
-- Feature: build looks from a shared, admin-curated catalog with hybrid
-- (semantic pgvector + lexical FTS/trigram) free-text search, and persist
-- catalog items on the existing outfit canvas (x / y / scale / z-index).
--
-- Notes:
--  * RLS already exists on outfits / outfit_items / wardrobe_items, so this
--    migration does NOT touch their policies.
--  * embedding dimension (384) must match the embedding model used in the
--    `embed` Edge Function (Xenova/multilingual-e5-small -> 384).

-- 0. Extensions (Supabase convention: install into the `extensions` schema)
create extension if not exists vector  with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- IMMUTABLE wrappers so the generated columns are accepted. Both to_tsvector's
-- text overload and array_to_string are only STABLE; pinning behavior here makes
-- them deterministic/immutable for our fixed usage.
create or replace function public.immutable_tsvector(txt text)
returns tsvector language sql immutable parallel safe set search_path = '' as $$
  select to_tsvector('simple', coalesce(txt, ''));
$$;

create or replace function public.immutable_array_join(arr text[], sep text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select coalesce(array_to_string(arr, sep), '');
$$;

-- 1. Catalog items (global, admin-curated; readable by everyone)
create table if not exists public.catalog_items (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  category      text not null,            -- aligns with ClothingCategory (src/lib/utils.ts)
  subcategory   text,
  brand         text,
  color         text,
  gender        text,                     -- 'women' | 'men' | 'unisex' | null
  seasons       text[] not null default '{}',
  tags          text[] not null default '{}',
  price         numeric(10,2),
  currency      text not null default 'ILS',
  image_path    text not null,            -- path inside the 'catalog' storage bucket
  image_url     text not null,            -- derived public URL (our Storage)
  source_name   text,                     -- provenance
  source_url    text,
  external_ref  text,                     -- stable id from source, for idempotent ingest
  embedding     extensions.vector(384),   -- multilingual item/query embedding
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- generated lexical fields:
  search_text   text generated always as (
                  coalesce(name,'')||' '||coalesce(description,'')||' '||coalesce(brand,'')||' '||
                  coalesce(color,'')||' '||coalesce(subcategory,'')||' '||
                  public.immutable_array_join(tags, ' ')
                ) stored,
  fts           tsvector generated always as (
                  public.immutable_tsvector(
                    coalesce(name,'')||' '||coalesce(description,'')||' '||coalesce(brand,'')||' '||
                    coalesce(color,'')||' '||coalesce(subcategory,'')||' '||
                    public.immutable_array_join(tags, ' '))
                ) stored
);

-- idempotent ingest: dedupe per source. A full unique constraint (NULLS
-- DISTINCT) only conflicts when both columns are non-null and equal, and works
-- as an ON CONFLICT target for the ingestion upsert (PostgREST/supabase-js).
alter table public.catalog_items
  drop constraint if exists catalog_items_source_ref_uq;
alter table public.catalog_items
  add constraint catalog_items_source_ref_uq unique (source_name, external_ref);

-- 2. Performance indexes
create index if not exists catalog_items_fts_idx
  on public.catalog_items using gin (fts);
create index if not exists catalog_items_trgm_idx
  on public.catalog_items using gin (search_text extensions.gin_trgm_ops);
create index if not exists catalog_items_embedding_idx
  on public.catalog_items using hnsw (embedding extensions.vector_cosine_ops);
create index if not exists catalog_items_category_idx
  on public.catalog_items (category) where is_active;
create index if not exists catalog_items_active_idx
  on public.catalog_items (is_active) where is_active;

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists catalog_items_touch on public.catalog_items;
create trigger catalog_items_touch before update on public.catalog_items
  for each row execute function public.touch_updated_at();

-- 3. RLS: everyone reads active items; writes only via service_role (bypasses RLS)
alter table public.catalog_items enable row level security;
drop policy if exists catalog_items_read_all on public.catalog_items;
create policy catalog_items_read_all on public.catalog_items
  for select to authenticated, anon using (is_active = true);
-- (no insert/update/delete policy => only service_role can mutate)

-- 4. Extend outfit_items: a look item may reference a wardrobe OR a catalog
--    item, and we now persist its scale alongside position/z-index.
alter table public.outfit_items
  add column if not exists catalog_item_id uuid references public.catalog_items(id) on delete cascade,
  add column if not exists scale numeric(6,3) not null default 1.0;

alter table public.outfit_items
  alter column wardrobe_item_id drop not null;

alter table public.outfit_items
  drop constraint if exists outfit_items_one_source;
alter table public.outfit_items
  add constraint outfit_items_one_source
  check (num_nonnulls(wardrobe_item_id, catalog_item_id) = 1);

create index if not exists outfit_items_catalog_item_idx
  on public.outfit_items (catalog_item_id);

-- 5. Hybrid search RPC (Reciprocal Rank Fusion of semantic + lexical)
create or replace function public.search_catalog_items(
  query_text       text,
  query_embedding  extensions.vector(384) default null,
  match_count      int  default 24,
  category_filter  text default null,
  rrf_k            int  default 50
) returns setof public.catalog_items
language sql stable
security invoker
set search_path = extensions, public, pg_temp
as $$
  with semantic as (
    select id, row_number() over (order by embedding <=> query_embedding) as rank
    from public.catalog_items
    where is_active and query_embedding is not null
      and (category_filter is null or category = category_filter)
    order by embedding <=> query_embedding
    limit match_count * 4
  ),
  lexical as (
    select id, row_number() over (
             order by ts_rank_cd(fts, websearch_to_tsquery('simple', query_text)) desc,
                      similarity(search_text, query_text) desc) as rank
    from public.catalog_items
    where is_active
      and (category_filter is null or category = category_filter)
      and (
        (nullif(trim(query_text), '') is not null and
          (fts @@ websearch_to_tsquery('simple', query_text)
           or search_text ilike '%'||query_text||'%'
           or similarity(search_text, query_text) > 0.1))
      )
    limit match_count * 4
  ),
  fused as (
    select coalesce(s.id, l.id) as id,
           coalesce(1.0/(rrf_k + s.rank), 0) + coalesce(1.0/(rrf_k + l.rank), 0) as score
    from semantic s
    full outer join lexical l on s.id = l.id
  )
  select ci.*
  from public.catalog_items ci
  join fused on fused.id = ci.id
  order by fused.score desc
  limit match_count;
$$;

grant execute on function public.search_catalog_items(text, extensions.vector, int, text, int)
  to authenticated, anon;

-- 6. Storage bucket for clean catalog images.
-- A public bucket serves objects via their public URL without any storage.objects
-- SELECT policy, so we deliberately add none (a broad SELECT policy would also
-- allow listing every file, which the Supabase linter flags). Writes happen only
-- via the service-role ingestion script, which bypasses RLS.
insert into storage.buckets (id, name, public)
values ('catalog', 'catalog', true)
on conflict (id) do nothing;
