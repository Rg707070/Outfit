export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      calendar_outfits: {
        Row: {
          created_at: string | null
          date: string
          id: string
          notes: string | null
          outfit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          outfit_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          outfit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_outfits_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_outfits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outfit_history: {
        Row: {
          category_label: string | null
          created_at: string | null
          id: string
          notes: string | null
          outfit_id: string | null
          user_id: string
          worn_date: string
        }
        Insert: {
          category_label?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          outfit_id?: string | null
          user_id: string
          worn_date: string
        }
        Update: {
          category_label?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          outfit_id?: string | null
          user_id?: string
          worn_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_history_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfit_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outfit_items: {
        Row: {
          id: string
          outfit_id: string
          position_x: number | null
          position_y: number | null
          wardrobe_item_id: string | null
          catalog_item_id: string | null
          scale: number
          z_index: number | null
        }
        Insert: {
          id?: string
          outfit_id: string
          position_x?: number | null
          position_y?: number | null
          wardrobe_item_id?: string | null
          catalog_item_id?: string | null
          scale?: number
          z_index?: number | null
        }
        Update: {
          id?: string
          outfit_id?: string
          position_x?: number | null
          position_y?: number | null
          wardrobe_item_id?: string | null
          catalog_item_id?: string | null
          scale?: number
          z_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "outfit_items_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfit_items_wardrobe_item_id_fkey"
            columns: ["wardrobe_item_id"]
            isOneToOne: false
            referencedRelation: "wardrobe_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfit_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_items: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string
          subcategory: string | null
          brand: string | null
          color: string | null
          gender: string | null
          seasons: string[]
          tags: string[]
          price: number | null
          currency: string
          image_path: string
          image_url: string
          source_name: string | null
          source_url: string | null
          external_ref: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category: string
          subcategory?: string | null
          brand?: string | null
          color?: string | null
          gender?: string | null
          seasons?: string[]
          tags?: string[]
          price?: number | null
          currency?: string
          image_path: string
          image_url: string
          source_name?: string | null
          source_url?: string | null
          external_ref?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string
          subcategory?: string | null
          brand?: string | null
          color?: string | null
          gender?: string | null
          seasons?: string[]
          tags?: string[]
          price?: number | null
          currency?: string
          image_path?: string
          image_url?: string
          source_name?: string | null
          source_url?: string | null
          external_ref?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      outfit_shares: {
        Row: {
          created_at: string | null
          id: string
          outfit_id: string
          share_token: string
          shared_by: string
          shared_with_email: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          outfit_id: string
          share_token: string
          shared_by: string
          shared_with_email?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          outfit_id?: string
          share_token?: string
          shared_by?: string
          shared_with_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outfit_shares_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfit_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outfits: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_favorite: boolean | null
          is_public: boolean | null
          name: string
          occasion: string | null
          season: string | null
          share_token: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          is_public?: boolean | null
          name: string
          occasion?: string | null
          season?: string | null
          share_token?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          is_public?: boolean | null
          name?: string
          occasion?: string | null
          season?: string | null
          share_token?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_public: boolean | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          is_public?: boolean | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_public?: boolean | null
          username?: string | null
        }
        Relationships: []
      }
      shopping_list: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string | null
          id: string
          image_url: string | null
          is_purchased: boolean | null
          is_wishlist: boolean | null
          name: string
          notes: string | null
          price: number | null
          url: string | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_purchased?: boolean | null
          is_wishlist?: boolean | null
          name: string
          notes?: string | null
          price?: number | null
          url?: string | null
          user_id: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_purchased?: boolean | null
          is_wishlist?: boolean | null
          name?: string
          notes?: string | null
          price?: number | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wardrobe_items: {
        Row: {
          brand: string | null
          category: string
          color: string | null
          created_at: string | null
          id: string
          image_url: string | null
          is_favorite: boolean | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          seasons: string[] | null
          tags: string[] | null
          location: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          category: string
          color?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          seasons?: string[] | null
          tags?: string[] | null
          location?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand?: string | null
          category?: string
          color?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          seasons?: string[] | null
          tags?: string[] | null
          location?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wardrobe_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"]

// Convenience row types
export type Profile = Tables<"profiles">
export type WardrobeItem = Tables<"wardrobe_items">
export type Outfit = Tables<"outfits">
export type OutfitItem = Tables<"outfit_items">
export type CalendarOutfit = Tables<"calendar_outfits">
export type ShoppingItem = Tables<"shopping_list">
export type OutfitHistory = Tables<"outfit_history">
export type OutfitShare = Tables<"outfit_shares">
export type CatalogItem = Tables<"catalog_items">

// App-level types
export type ClothingCategory =
  | 'tops' | 'bottoms' | 'dresses' | 'outerwear'
  | 'shoes' | 'accessories' | 'bags' | 'underwear' | 'activewear' | 'other'

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'all'
