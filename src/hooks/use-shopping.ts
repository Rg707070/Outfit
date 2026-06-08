import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import type { ShoppingItem } from '@/types/database'

export const SHOPPING_PAGE_SIZE = 20

export function useShopping(limit?: number) {
  const { user } = useAuth()
  const supabase = createClient()
  const pageSize = limit ?? SHOPPING_PAGE_SIZE

  return useQuery({
    queryKey: ['shopping', user?.id, pageSize],
    enabled: !!user,
    queryFn: async (): Promise<{ items: ShoppingItem[]; total: number }> => {
      const { data, error, count } = await supabase
        .from('shopping_list')
        .select('*', { count: 'exact' })
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .range(0, pageSize - 1)
      if (error) throw error
      return { items: data ?? [], total: count ?? 0 }
    },
  })
}

export function useTogglePurchased() {
  const supabase = createClient()
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, isPurchased }: { id: string; isPurchased: boolean }) => {
      const { error } = await supabase
        .from('shopping_list')
        .update({ is_purchased: !isPurchased })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping', user?.id] }),
  })
}

export function useDeleteShoppingItem() {
  const supabase = createClient()
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shopping_list').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping', user?.id] }),
  })
}
