-- Hebrew-aware search normalization.
--
-- Plain FTS/trigram over raw text misses common Hebrew variants: the geresh in
-- "ג׳ינס" vs "גינס", smart quotes, punctuation, and final-letter forms
-- (ך/ם/ן/ף/ץ vs כ/מ/נ/פ/צ). normalize_he() folds all of these so the lexical
-- branch matches what users actually type. We index a normalized copy of the
-- searchable text so matching stays index-backed.

create or replace function public.normalize_he(txt text)
returns text language sql immutable parallel safe set search_path = '' as $$
  -- finals -> base letters; geresh/gershayim/quotes/punctuation -> removed
  select translate(lower(coalesce(txt, '')),
    'ךםןףץ׳״''"’‘”“`-–./(),',
    'כמנפצ');
$$;

alter table public.catalog_items
  add column if not exists search_norm text generated always as (
    public.normalize_he(
      coalesce(name,'')||' '||coalesce(description,'')||' '||coalesce(brand,'')||' '||
      coalesce(color,'')||' '||coalesce(subcategory,'')||' '||public.immutable_array_join(tags,' '))
  ) stored,
  add column if not exists fts_norm tsvector generated always as (
    public.immutable_tsvector(public.normalize_he(
      coalesce(name,'')||' '||coalesce(description,'')||' '||coalesce(brand,'')||' '||
      coalesce(color,'')||' '||coalesce(subcategory,'')||' '||public.immutable_array_join(tags,' ')))
  ) stored;

create index if not exists catalog_items_norm_trgm_idx
  on public.catalog_items using gin (search_norm extensions.gin_trgm_ops);
create index if not exists catalog_items_norm_fts_idx
  on public.catalog_items using gin (fts_norm);

-- Recreate the hybrid RPC so the lexical branch uses the normalized columns and
-- a normalized query. Semantic branch unchanged (still optional / additive).
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
  with norm as (
    select public.normalize_he(query_text) as nq
  ),
  semantic as (
    select id, row_number() over (order by embedding <=> query_embedding) as rank
    from public.catalog_items
    where is_active and query_embedding is not null
      and (category_filter is null or category = category_filter)
    order by embedding <=> query_embedding
    limit match_count * 4
  ),
  lexical as (
    select ci.id, row_number() over (
             order by ts_rank_cd(ci.fts_norm, websearch_to_tsquery('simple', n.nq)) desc,
                      similarity(ci.search_norm, n.nq) desc) as rank
    from public.catalog_items ci, norm n
    where ci.is_active
      and (category_filter is null or ci.category = category_filter)
      and nullif(trim(query_text), '') is not null
      and (
        ci.fts_norm @@ websearch_to_tsquery('simple', n.nq)
        or ci.search_norm ilike '%'||n.nq||'%'
        or similarity(ci.search_norm, n.nq) > 0.1
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
