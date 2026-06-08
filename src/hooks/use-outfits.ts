import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import type { Outfit } from '@/types/database'

export function useOutfits() {
  const { user } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['outfits', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Outfit[]> => {
      const { data, error } = await supabase
        .from('outfits')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useToggleOutfitFavorite() {
  const supabase = createClient()
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('outfits')
        .update({ is_favorite: !isFavorite })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outfits', user?.id] }),
  })
}

export function useDeleteOutfit() {
  const supabase = createClient()
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('outfits').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outfits', user?.id] }),
  })
}
