import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import type { OutfitHistory, Outfit } from '@/types/database'

type HistoryWithOutfit = OutfitHistory & {
  outfits: { name: string; image_url: string | null } | null
}

export const HISTORY_PAGE_SIZE = 20

export function useHistory(limit?: number) {
  const { user } = useAuth()
  const supabase = createClient()
  const pageSize = limit ?? HISTORY_PAGE_SIZE

  return useQuery({
    queryKey: ['history', user?.id, pageSize],
    enabled: !!user,
    queryFn: async (): Promise<{ entries: HistoryWithOutfit[]; total: number }> => {
      const { data, error, count } = await supabase
        .from('outfit_history')
        .select('*, outfits(name, image_url)', { count: 'exact' })
        .eq('user_id', user!.id)
        .order('worn_date', { ascending: false })
        .range(0, pageSize - 1)
      if (error) throw error
      return { entries: (data as HistoryWithOutfit[]) ?? [], total: count ?? 0 }
    },
  })
}

export function useDeleteHistoryEntry() {
  const supabase = createClient()
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('outfit_history').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['history', user?.id] }),
  })
}

export function useOutfitsForHistory() {
  const { user } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['outfits-list', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Outfit[]> => {
      const { data, error } = await supabase.from('outfits').select('*').eq('user_id', user!.id)
      if (error) throw error
      return data
    },
  })
}
