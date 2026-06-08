import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import type { WardrobeItem, ClothingCategory } from '@/types/database'

export const WARDROBE_PAGE_SIZE = 24

export interface WardrobeFilters {
  search?: string
  category?: ClothingCategory | 'all'
  limit?: number
}

export function useWardrobeStats() {
  const { user } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['wardrobe-stats', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<{ category: string | null }[]> => {
      const { data, error } = await supabase
        .from('wardrobe_items')
        .select('category')
        .eq('user_id', user!.id)
      if (error) throw error
      return data
    },
  })
}

export function useWardrobe(filters?: WardrobeFilters) {
  const { user } = useAuth()
  const supabase = createClient()
  const limit = filters?.limit ?? WARDROBE_PAGE_SIZE

  return useQuery({
    queryKey: ['wardrobe', user?.id, filters?.search ?? '', filters?.category ?? 'all', limit],
    enabled: !!user,
    queryFn: async (): Promise<{ items: WardrobeItem[]; total: number }> => {
      let q = supabase
        .from('wardrobe_items')
        .select('*', { count: 'exact' })
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .range(0, limit - 1)

      if (filters?.category && filters.category !== 'all') {
        q = q.eq('category', filters.category as ClothingCategory)
      }
      const trimmed = filters?.search?.trim()
      if (trimmed) {
        q = q.or(`name.ilike.%${trimmed}%,brand.ilike.%${trimmed}%`)
      }

      const { data, error, count } = await q
      if (error) throw error
      return { items: data ?? [], total: count ?? 0 }
    },
  })
}

export function useToggleWardrobeFavorite() {
  const supabase = createClient()
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('wardrobe_items')
        .update({ is_favorite: !isFavorite })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wardrobe', user?.id] })
      qc.invalidateQueries({ queryKey: ['wardrobe-stats', user?.id] })
    },
  })
}

export function useDeleteWardrobeItem() {
  const supabase = createClient()
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wardrobe_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wardrobe', user?.id] })
      qc.invalidateQueries({ queryKey: ['wardrobe-stats', user?.id] })
    },
  })
}
