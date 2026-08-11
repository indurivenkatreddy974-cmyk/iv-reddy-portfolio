export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      blockchain_records: {
        Row: {
          block_number: number | null;
          chain_id: number;
          contract_address: string | null;
          created_at: string;
          error_message: string | null;
          fallback_url: string | null;
          file_name: string | null;
          id: string;
          ipfs_cid: string | null;
          ipfs_url: string | null;
          last_check_result: string | null;
          last_checked_at: string | null;
          metadata: Json;
          mime: string | null;
          network: string;
          proof_hash: string | null;
          registered_at: string | null;
          retry_count: number;
          sha256: string;
          size_bytes: number | null;
          status: Database["public"]["Enums"]["verification_status"];
          subject_ref: string | null;
          subject_type: Database["public"]["Enums"]["verification_subject"];
          title: string;
          tx_hash: string | null;
          updated_at: string;
          wallet_address: string | null;
        };
        Insert: {
          block_number?: number | null;
          chain_id?: number;
          contract_address?: string | null;
          created_at?: string;
          error_message?: string | null;
          fallback_url?: string | null;
          file_name?: string | null;
          id?: string;
          ipfs_cid?: string | null;
          ipfs_url?: string | null;
          last_check_result?: string | null;
          last_checked_at?: string | null;
          metadata?: Json;
          mime?: string | null;
          network?: string;
          proof_hash?: string | null;
          registered_at?: string | null;
          retry_count?: number;
          sha256: string;
          size_bytes?: number | null;
          status?: Database["public"]["Enums"]["verification_status"];
          subject_ref?: string | null;
          subject_type: Database["public"]["Enums"]["verification_subject"];
          title: string;
          tx_hash?: string | null;
          updated_at?: string;
          wallet_address?: string | null;
        };
        Update: {
          block_number?: number | null;
          chain_id?: number;
          contract_address?: string | null;
          created_at?: string;
          error_message?: string | null;
          fallback_url?: string | null;
          file_name?: string | null;
          id?: string;
          ipfs_cid?: string | null;
          ipfs_url?: string | null;
          last_check_result?: string | null;
          last_checked_at?: string | null;
          metadata?: Json;
          mime?: string | null;
          network?: string;
          proof_hash?: string | null;
          registered_at?: string | null;
          retry_count?: number;
          sha256?: string;
          size_bytes?: number | null;
          status?: Database["public"]["Enums"]["verification_status"];
          subject_ref?: string | null;
          subject_type?: Database["public"]["Enums"]["verification_subject"];
          title?: string;
          tx_hash?: string | null;
          updated_at?: string;
          wallet_address?: string | null;
        };
        Relationships: [];
      };
      blockchain_settings: {
        Row: {
          chain_id: number;
          enabled: boolean;
          explorer_base: string;
          id: number;
          ipfs_gateway: string;
          network: string;
          nft_contract: string | null;
          updated_at: string;
          verification_contract: string | null;
          wallet_address: string | null;
        };
        Insert: {
          chain_id?: number;
          enabled?: boolean;
          explorer_base?: string;
          id?: number;
          ipfs_gateway?: string;
          network?: string;
          nft_contract?: string | null;
          updated_at?: string;
          verification_contract?: string | null;
          wallet_address?: string | null;
        };
        Update: {
          chain_id?: number;
          enabled?: boolean;
          explorer_base?: string;
          id?: number;
          ipfs_gateway?: string;
          network?: string;
          nft_contract?: string | null;
          updated_at?: string;
          verification_contract?: string | null;
          wallet_address?: string | null;
        };
        Relationships: [];
      };
      media_assets: {
        Row: {
          created_at: string;
          duration_seconds: number | null;
          height: number | null;
          id: string;
          kind: Database["public"]["Enums"]["media_kind"];
          mime: string | null;
          name: string;
          original_url: string;
          poster_url: string | null;
          size_bytes: number | null;
          storage_path: string;
          webp_url: string | null;
          width: number | null;
        };
        Insert: {
          created_at?: string;
          duration_seconds?: number | null;
          height?: number | null;
          id?: string;
          kind: Database["public"]["Enums"]["media_kind"];
          mime?: string | null;
          name: string;
          original_url: string;
          poster_url?: string | null;
          size_bytes?: number | null;
          storage_path: string;
          webp_url?: string | null;
          width?: number | null;
        };
        Update: {
          created_at?: string;
          duration_seconds?: number | null;
          height?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["media_kind"];
          mime?: string | null;
          name?: string;
          original_url?: string;
          poster_url?: string | null;
          size_bytes?: number | null;
          storage_path?: string;
          webp_url?: string | null;
          width?: number | null;
        };
        Relationships: [];
      };
      nft_tokens: {
        Row: {
          artwork_url: string | null;
          chain_id: number;
          contract_address: string | null;
          created_at: string;
          description: string | null;
          error_message: string | null;
          featured: boolean;
          id: string;
          metadata_cid: string | null;
          mint_tx_hash: string | null;
          minted_at: string | null;
          network: string;
          owner_wallet: string | null;
          project_name: string;
          project_ref: string | null;
          sort_order: number;
          status: Database["public"]["Enums"]["verification_status"];
          token_id: string | null;
          updated_at: string;
        };
        Insert: {
          artwork_url?: string | null;
          chain_id?: number;
          contract_address?: string | null;
          created_at?: string;
          description?: string | null;
          error_message?: string | null;
          featured?: boolean;
          id?: string;
          metadata_cid?: string | null;
          mint_tx_hash?: string | null;
          minted_at?: string | null;
          network?: string;
          owner_wallet?: string | null;
          project_name: string;
          project_ref?: string | null;
          sort_order?: number;
          status?: Database["public"]["Enums"]["verification_status"];
          token_id?: string | null;
          updated_at?: string;
        };
        Update: {
          artwork_url?: string | null;
          chain_id?: number;
          contract_address?: string | null;
          created_at?: string;
          description?: string | null;
          error_message?: string | null;
          featured?: boolean;
          id?: string;
          metadata_cid?: string | null;
          mint_tx_hash?: string | null;
          minted_at?: string | null;
          network?: string;
          owner_wallet?: string | null;
          project_name?: string;
          project_ref?: string | null;
          sort_order?: number;
          status?: Database["public"]["Enums"]["verification_status"];
          token_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      showcase_items: {
        Row: {
          created_at: string;
          description: string | null;
          featured: boolean;
          github_url: string | null;
          id: string;
          issue_date: string | null;
          issuer: string | null;
          kind: Database["public"]["Enums"]["showcase_kind"];
          live_url: string | null;
          media_url: string | null;
          poster_url: string | null;
          sort_order: number;
          tech: string[];
          thumbnail_url: string | null;
          title: string;
          updated_at: string;
          verify_url: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          github_url?: string | null;
          id?: string;
          issue_date?: string | null;
          issuer?: string | null;
          kind: Database["public"]["Enums"]["showcase_kind"];
          live_url?: string | null;
          media_url?: string | null;
          poster_url?: string | null;
          sort_order?: number;
          tech?: string[];
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string;
          verify_url?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          github_url?: string | null;
          id?: string;
          issue_date?: string | null;
          issuer?: string | null;
          kind?: Database["public"]["Enums"]["showcase_kind"];
          live_url?: string | null;
          media_url?: string | null;
          poster_url?: string | null;
          sort_order?: number;
          tech?: string[];
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string;
          verify_url?: string | null;
        };
        Relationships: [];
      };
      showcase_settings: {
        Row: {
          featured_certs_first: boolean;
          featured_projects_first: boolean;
          id: number;
          layout: Database["public"]["Enums"]["showcase_layout"];
          updated_at: string;
        };
        Insert: {
          featured_certs_first?: boolean;
          featured_projects_first?: boolean;
          id?: number;
          layout?: Database["public"]["Enums"]["showcase_layout"];
          updated_at?: string;
        };
        Update: {
          featured_certs_first?: boolean;
          featured_projects_first?: boolean;
          id?: number;
          layout?: Database["public"]["Enums"]["showcase_layout"];
          updated_at?: string;
        };
        Relationships: [];
      };
      site_content: {
        Row: {
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value?: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_exists: { Args: never; Returns: boolean };
      claim_first_admin: { Args: never; Returns: boolean };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "user";
      media_kind: "image" | "video" | "pdf" | "other";
      showcase_kind: "project" | "certification" | "achievement" | "video";
      showcase_layout: "grid" | "carousel" | "masonry" | "featured";
      verification_status: "pending" | "confirmed" | "failed";
      verification_subject:
        | "resume"
        | "certificate"
        | "offer_letter"
        | "completion_certificate"
        | "project"
        | "research_paper"
        | "asset";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      media_kind: ["image", "video", "pdf", "other"],
      showcase_kind: ["project", "certification", "achievement", "video"],
      showcase_layout: ["grid", "carousel", "masonry", "featured"],
      verification_status: ["pending", "confirmed", "failed"],
      verification_subject: [
        "resume",
        "certificate",
        "offer_letter",
        "completion_certificate",
        "project",
        "research_paper",
        "asset",
      ],
    },
  },
} as const;
