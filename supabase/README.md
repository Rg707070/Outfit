# Supabase backend

Live project: **outfit** (`lmisvfbjwodkkawwgvwc`), Postgres 17, region `ap-southeast-1`.

## Security / RLS

Row Level Security is **already enabled on every public table** (verified via the
security advisor — no RLS findings). Per-user isolation is enforced in the
database, not just client-side. The one outstanding advisory is unrelated:
"Leaked Password Protection Disabled" — enable it in Auth settings if desired
(<https://supabase.com/docs/guides/auth/password-security>).

> A hand-written `enable_rls.sql` migration was prepared during this work but
> **not applied** — RLS was already in place, so it would only have conflicted
> with the existing policies.

## Notable existing tables (ahead of the committed app)

- **`catalog_items`** (12 rows) — curated catalog with `image_url` + `source_url`
  (reference-only, so no image hosting / rights concerns), `price`/`currency`
  (ILS), a `vector` `embedding` column, and Hebrew-normalized full-text search
  (`fts_norm`, `search_norm`). Backend for catalog discovery is in place; the
  **frontend Explore UI is the remaining v2 work**.
- **`outfit_items.catalog_item_id` + `scale`** — mixing catalog items into a look
  is already supported at the schema level; the canvas builder just needs to
  surface catalog items.

The committed `src/types/database.ts` lags the live schema in places
(`catalog_items`, `outfit_items.catalog_item_id`/`scale`, `wardrobe_items.location`).
Regenerate with `supabase gen types typescript` when picking up catalog work.

## Edge Functions

### `auto-tag`

Claude-vision auto-tagging for wardrobe uploads. Suggests name/category/
colour/material/tags from the user's own photo; the client pre-fills the
Add-Item form (every field stays editable).

Deploy and configure the secret (the key lives only server-side):

```bash
supabase functions deploy auto-tag --project-ref lmisvfbjwodkkawwgvwc
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref lmisvfbjwodkkawwgvwc
```

Until the function is deployed and the secret is set, the client invoke fails
silently and users fill the form manually — no breakage.
