-- Performance hardening for the Outfit database.
--
-- Resolves the Supabase advisor findings WITHOUT changing access semantics:
--   1. auth_rls_initplan        -> wrap auth.uid() in (select auth.uid()) so it
--                                  is evaluated once per query instead of per row
--   2. multiple_permissive      -> split the FOR ALL owner policies on the four
--                                  dual-policy tables into per-action policies so
--                                  SELECT is no longer evaluated by two policies
--   3. unindexed_foreign_keys   -> add covering indexes for foreign keys
--
-- This migration was generated during an audit but intentionally NOT auto-applied
-- to the live project. Review and apply with `supabase db push` (or the SQL editor).

-- ── Single-owner tables: recreate FOR ALL with (select auth.uid()) ──────────
drop policy if exists "wardrobe_own" on public.wardrobe_items;
create policy "wardrobe_own" on public.wardrobe_items
  for all to public
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "calendar_own" on public.calendar_outfits;
create policy "calendar_own" on public.calendar_outfits
  for all to public
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "shopping_own" on public.shopping_list;
create policy "shopping_own" on public.shopping_list
  for all to public
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "history_own" on public.outfit_history;
create policy "history_own" on public.outfit_history
  for all to public
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── profiles: own (write) + public read, merged SELECT ──────────────────────
drop policy if exists "profiles_own" on public.profiles;
drop policy if exists "profiles_public_read" on public.profiles;
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to public
  using (id = (select auth.uid()) or is_public = true);
create policy "profiles_insert" on public.profiles
  for insert to public
  with check (id = (select auth.uid()));
create policy "profiles_update" on public.profiles
  for update to public
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
create policy "profiles_delete" on public.profiles
  for delete to public
  using (id = (select auth.uid()));

-- ── outfits: own (write) + public read, merged SELECT ───────────────────────
drop policy if exists "outfits_own" on public.outfits;
drop policy if exists "outfits_public_read" on public.outfits;
drop policy if exists "outfits_select" on public.outfits;
drop policy if exists "outfits_insert" on public.outfits;
drop policy if exists "outfits_update" on public.outfits;
drop policy if exists "outfits_delete" on public.outfits;
create policy "outfits_select" on public.outfits
  for select to public
  using (user_id = (select auth.uid()) or is_public = true);
create policy "outfits_insert" on public.outfits
  for insert to public
  with check (user_id = (select auth.uid()));
create policy "outfits_update" on public.outfits
  for update to public
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "outfits_delete" on public.outfits
  for delete to public
  using (user_id = (select auth.uid()));

-- ── outfit_items: own (write) + public read, merged SELECT ──────────────────
drop policy if exists "outfit_items_own" on public.outfit_items;
drop policy if exists "outfit_items_public_read" on public.outfit_items;
drop policy if exists "outfit_items_select" on public.outfit_items;
drop policy if exists "outfit_items_insert" on public.outfit_items;
drop policy if exists "outfit_items_update" on public.outfit_items;
drop policy if exists "outfit_items_delete" on public.outfit_items;
create policy "outfit_items_select" on public.outfit_items
  for select to public
  using (
    outfit_id in (select id from public.outfits where user_id = (select auth.uid()))
    or outfit_id in (select id from public.outfits where is_public = true)
  );
create policy "outfit_items_insert" on public.outfit_items
  for insert to public
  with check (outfit_id in (select id from public.outfits where user_id = (select auth.uid())));
create policy "outfit_items_update" on public.outfit_items
  for update to public
  using (outfit_id in (select id from public.outfits where user_id = (select auth.uid())))
  with check (outfit_id in (select id from public.outfits where user_id = (select auth.uid())));
create policy "outfit_items_delete" on public.outfit_items
  for delete to public
  using (outfit_id in (select id from public.outfits where user_id = (select auth.uid())));

-- ── outfit_shares: own (write) + token read (public SELECT) ─────────────────
drop policy if exists "shares_own" on public.outfit_shares;
drop policy if exists "shares_token_read" on public.outfit_shares;
drop policy if exists "shares_select" on public.outfit_shares;
drop policy if exists "shares_insert" on public.outfit_shares;
drop policy if exists "shares_update" on public.outfit_shares;
drop policy if exists "shares_delete" on public.outfit_shares;
create policy "shares_select" on public.outfit_shares
  for select to public
  using (true);
create policy "shares_insert" on public.outfit_shares
  for insert to public
  with check (shared_by = (select auth.uid()));
create policy "shares_update" on public.outfit_shares
  for update to public
  using (shared_by = (select auth.uid()))
  with check (shared_by = (select auth.uid()));
create policy "shares_delete" on public.outfit_shares
  for delete to public
  using (shared_by = (select auth.uid()));

-- ── Covering indexes for foreign keys ───────────────────────────────────────
create index if not exists idx_calendar_outfits_outfit_id    on public.calendar_outfits (outfit_id);
create index if not exists idx_outfit_history_outfit_id      on public.outfit_history (outfit_id);
create index if not exists idx_outfit_items_wardrobe_item_id on public.outfit_items (wardrobe_item_id);
create index if not exists idx_outfit_shares_outfit_id       on public.outfit_shares (outfit_id);
create index if not exists idx_outfit_shares_shared_by       on public.outfit_shares (shared_by);
create index if not exists idx_shopping_list_user_id         on public.shopping_list (user_id);
