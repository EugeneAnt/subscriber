export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	graphql_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			graphql: {
				Args: {
					extensions?: Json;
					operationName?: string;
					query?: string;
					variables?: Json;
				};
				Returns: Json;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			currency_codes: {
				Row: {
					code: string;
				};
				Insert: {
					code: string;
				};
				Update: {
					code?: string;
				};
				Relationships: [];
			};
			tracked_items: {
				Row: {
					amount: number | null;
					billing_anchor_date: string | null;
					billing_cycle: Database['public']['Enums']['billing_cycle'] | null;
					category: string | null;
					created_at: string;
					currency: string | null;
					custom_cycle_days: number | null;
					expiry_date: string | null;
					id: string;
					name: string;
					notes: string | null;
					provider: string | null;
					status: Database['public']['Enums']['tracked_item_status'];
					type: Database['public']['Enums']['tracked_item_type'];
					updated_at: string;
					user_id: string;
				};
				Insert: {
					amount?: number | null;
					billing_anchor_date?: string | null;
					billing_cycle?: Database['public']['Enums']['billing_cycle'] | null;
					category?: string | null;
					created_at?: string;
					currency?: string | null;
					custom_cycle_days?: number | null;
					expiry_date?: string | null;
					id?: string;
					name: string;
					notes?: string | null;
					provider?: string | null;
					status?: Database['public']['Enums']['tracked_item_status'];
					type: Database['public']['Enums']['tracked_item_type'];
					updated_at?: string;
					user_id: string;
				};
				Update: {
					amount?: number | null;
					billing_anchor_date?: string | null;
					billing_cycle?: Database['public']['Enums']['billing_cycle'] | null;
					category?: string | null;
					created_at?: string;
					currency?: string | null;
					custom_cycle_days?: number | null;
					expiry_date?: string | null;
					id?: string;
					name?: string;
					notes?: string | null;
					provider?: string | null;
					status?: Database['public']['Enums']['tracked_item_status'];
					type?: Database['public']['Enums']['tracked_item_type'];
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'tracked_items_currency_fkey';
						columns: ['currency'];
						isOneToOne: false;
						referencedRelation: 'currency_codes';
						referencedColumns: ['code'];
					}
				];
			};
		};
		Views: {
			tracked_item_events_v: {
				Row: {
					amount: number | null;
					category: string | null;
					currency: string | null;
					effective_status: string | null;
					event_date: string | null;
					event_kind: string | null;
					name: string | null;
					provider: string | null;
					tracked_item_id: string | null;
					type: Database['public']['Enums']['tracked_item_type'] | null;
					user_id: string | null;
				};
				Relationships: [];
			};
			tracked_items_burn_v: {
				Row: {
					currency: string | null;
					monthly_burn: number | null;
					user_id: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'tracked_items_currency_fkey';
						columns: ['currency'];
						isOneToOne: false;
						referencedRelation: 'currency_codes';
						referencedColumns: ['code'];
					}
				];
			};
			tracked_items_v: {
				Row: {
					amount: number | null;
					billing_anchor_date: string | null;
					billing_cycle: Database['public']['Enums']['billing_cycle'] | null;
					category: string | null;
					created_at: string | null;
					currency: string | null;
					custom_cycle_days: number | null;
					effective_next_date: string | null;
					effective_status: string | null;
					expiry_date: string | null;
					id: string | null;
					name: string | null;
					notes: string | null;
					provider: string | null;
					status: Database['public']['Enums']['tracked_item_status'] | null;
					type: Database['public']['Enums']['tracked_item_type'] | null;
					updated_at: string | null;
					user_id: string | null;
				};
				Insert: {
					amount?: number | null;
					billing_anchor_date?: string | null;
					billing_cycle?: Database['public']['Enums']['billing_cycle'] | null;
					category?: string | null;
					created_at?: string | null;
					currency?: string | null;
					custom_cycle_days?: number | null;
					effective_next_date?: never;
					effective_status?: never;
					expiry_date?: string | null;
					id?: string | null;
					name?: string | null;
					notes?: string | null;
					provider?: string | null;
					status?: Database['public']['Enums']['tracked_item_status'] | null;
					type?: Database['public']['Enums']['tracked_item_type'] | null;
					updated_at?: string | null;
					user_id?: string | null;
				};
				Update: {
					amount?: number | null;
					billing_anchor_date?: string | null;
					billing_cycle?: Database['public']['Enums']['billing_cycle'] | null;
					category?: string | null;
					created_at?: string | null;
					currency?: string | null;
					custom_cycle_days?: number | null;
					effective_next_date?: never;
					effective_status?: never;
					expiry_date?: string | null;
					id?: string | null;
					name?: string | null;
					notes?: string | null;
					provider?: string | null;
					status?: Database['public']['Enums']['tracked_item_status'] | null;
					type?: Database['public']['Enums']['tracked_item_type'] | null;
					updated_at?: string | null;
					user_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'tracked_items_currency_fkey';
						columns: ['currency'];
						isOneToOne: false;
						referencedRelation: 'currency_codes';
						referencedColumns: ['code'];
					}
				];
			};
		};
		Functions: {
			roll_forward: {
				Args: {
					anchor: string;
					custom_days: number;
					cycle: Database['public']['Enums']['billing_cycle'];
				};
				Returns: string;
			};
			roll_forward_at: {
				Args: {
					anchor: string;
					custom_days: number;
					cycle: Database['public']['Enums']['billing_cycle'];
					today: string;
				};
				Returns: string;
			};
		};
		Enums: {
			billing_cycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom_days';
			tracked_item_status: 'active' | 'paused' | 'cancelled';
			tracked_item_type: 'subscription' | 'expiry' | 'hybrid';
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema['Enums']
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never = never
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema['CompositeTypes']
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never = never
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	graphql_public: {
		Enums: {}
	},
	public: {
		Enums: {
			billing_cycle: ['weekly', 'monthly', 'quarterly', 'yearly', 'custom_days'],
			tracked_item_status: ['active', 'paused', 'cancelled'],
			tracked_item_type: ['subscription', 'expiry', 'hybrid']
		}
	}
} as const;
