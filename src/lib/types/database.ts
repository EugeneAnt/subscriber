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
			provider_catalog: {
				Row: {
					code: string;
					created_at: string;
					display_name: string;
					supports_balance: boolean;
					supports_cost_sync: boolean;
					supports_thresholds: boolean;
				};
				Insert: {
					code: string;
					created_at?: string;
					display_name: string;
					supports_balance?: boolean;
					supports_cost_sync?: boolean;
					supports_thresholds?: boolean;
				};
				Update: {
					code?: string;
					created_at?: string;
					display_name?: string;
					supports_balance?: boolean;
					supports_cost_sync?: boolean;
					supports_thresholds?: boolean;
				};
				Relationships: [];
			};
			provider_connections: {
				Row: {
					created_at: string;
					credential_name: string | null;
					credential_source: string;
					critical_remaining_amount: number | null;
					currency: string | null;
					display_name: string;
					external_account_id: string | null;
					external_project_ids: string[];
					id: string;
					last_sync_error: string | null;
					last_sync_finished_at: string | null;
					last_sync_started_at: string | null;
					last_sync_status: string | null;
					monthly_budget: number | null;
					provider_code: string;
					provider_config: Json;
					status: string;
					updated_at: string;
					user_id: string;
					warning_remaining_amount: number | null;
				};
				Insert: {
					created_at?: string;
					credential_name?: string | null;
					credential_source?: string;
					critical_remaining_amount?: number | null;
					currency?: string | null;
					display_name: string;
					external_account_id?: string | null;
					external_project_ids?: string[];
					id?: string;
					last_sync_error?: string | null;
					last_sync_finished_at?: string | null;
					last_sync_started_at?: string | null;
					last_sync_status?: string | null;
					monthly_budget?: number | null;
					provider_code: string;
					provider_config?: Json;
					status?: string;
					updated_at?: string;
					user_id: string;
					warning_remaining_amount?: number | null;
				};
				Update: {
					created_at?: string;
					credential_name?: string | null;
					credential_source?: string;
					critical_remaining_amount?: number | null;
					currency?: string | null;
					display_name?: string;
					external_account_id?: string | null;
					external_project_ids?: string[];
					id?: string;
					last_sync_error?: string | null;
					last_sync_finished_at?: string | null;
					last_sync_started_at?: string | null;
					last_sync_status?: string | null;
					monthly_budget?: number | null;
					provider_code?: string;
					provider_config?: Json;
					status?: string;
					updated_at?: string;
					user_id?: string;
					warning_remaining_amount?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: 'provider_connections_currency_fkey';
						columns: ['currency'];
						isOneToOne: false;
						referencedRelation: 'currency_codes';
						referencedColumns: ['code'];
					},
					{
						foreignKeyName: 'provider_connections_provider_code_fkey';
						columns: ['provider_code'];
						isOneToOne: false;
						referencedRelation: 'provider_catalog';
						referencedColumns: ['code'];
					}
				];
			};
			provider_cost_snapshot_lines: {
				Row: {
					amount: number;
					created_at: string;
					currency: string;
					external_api_key_id: string | null;
					external_project_id: string | null;
					id: string;
					line_item: string | null;
					line_kind: string;
					quantity: number | null;
					raw_line: Json;
					snapshot_id: string;
					user_id: string;
				};
				Insert: {
					amount: number;
					created_at?: string;
					currency: string;
					external_api_key_id?: string | null;
					external_project_id?: string | null;
					id?: string;
					line_item?: string | null;
					line_kind?: string;
					quantity?: number | null;
					raw_line?: Json;
					snapshot_id: string;
					user_id: string;
				};
				Update: {
					amount?: number;
					created_at?: string;
					currency?: string;
					external_api_key_id?: string | null;
					external_project_id?: string | null;
					id?: string;
					line_item?: string | null;
					line_kind?: string;
					quantity?: number | null;
					raw_line?: Json;
					snapshot_id?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'provider_cost_snapshot_lines_currency_fkey';
						columns: ['currency'];
						isOneToOne: false;
						referencedRelation: 'currency_codes';
						referencedColumns: ['code'];
					},
					{
						foreignKeyName: 'provider_cost_snapshot_lines_snapshot_id_fkey';
						columns: ['snapshot_id'];
						isOneToOne: false;
						referencedRelation: 'provider_connections_v';
						referencedColumns: ['latest_snapshot_id'];
					},
					{
						foreignKeyName: 'provider_cost_snapshot_lines_snapshot_id_fkey';
						columns: ['snapshot_id'];
						isOneToOne: false;
						referencedRelation: 'provider_cost_snapshots';
						referencedColumns: ['id'];
					}
				];
			};
			provider_cost_snapshots: {
				Row: {
					created_at: string;
					currency: string;
					fetched_at: string;
					id: string;
					period_end_exclusive: string;
					period_kind: string;
					period_start: string;
					provider_connection_id: string;
					provider_observed_at: string | null;
					raw_summary: Json;
					total_amount: number;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					currency: string;
					fetched_at?: string;
					id?: string;
					period_end_exclusive: string;
					period_kind?: string;
					period_start: string;
					provider_connection_id: string;
					provider_observed_at?: string | null;
					raw_summary?: Json;
					total_amount: number;
					user_id: string;
				};
				Update: {
					created_at?: string;
					currency?: string;
					fetched_at?: string;
					id?: string;
					period_end_exclusive?: string;
					period_kind?: string;
					period_start?: string;
					provider_connection_id?: string;
					provider_observed_at?: string | null;
					raw_summary?: Json;
					total_amount?: number;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'provider_cost_snapshots_currency_fkey';
						columns: ['currency'];
						isOneToOne: false;
						referencedRelation: 'currency_codes';
						referencedColumns: ['code'];
					},
					{
						foreignKeyName: 'provider_cost_snapshots_provider_connection_id_fkey';
						columns: ['provider_connection_id'];
						isOneToOne: false;
						referencedRelation: 'provider_connections';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'provider_cost_snapshots_provider_connection_id_fkey';
						columns: ['provider_connection_id'];
						isOneToOne: false;
						referencedRelation: 'provider_connections_v';
						referencedColumns: ['id'];
					}
				];
			};
			reminder_states: {
				Row: {
					created_at: string;
					dismissed_at: string | null;
					event_date: string;
					event_kind: string;
					id: string;
					lead_days: number;
					read_at: string | null;
					snoozed_until: string | null;
					tracked_item_id: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					dismissed_at?: string | null;
					event_date: string;
					event_kind: string;
					id?: string;
					lead_days: number;
					read_at?: string | null;
					snoozed_until?: string | null;
					tracked_item_id: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					dismissed_at?: string | null;
					event_date?: string;
					event_kind?: string;
					id?: string;
					lead_days?: number;
					read_at?: string | null;
					snoozed_until?: string | null;
					tracked_item_id?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'reminder_states_tracked_item_id_fkey';
						columns: ['tracked_item_id'];
						isOneToOne: false;
						referencedRelation: 'tracked_items';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'reminder_states_tracked_item_id_fkey';
						columns: ['tracked_item_id'];
						isOneToOne: false;
						referencedRelation: 'tracked_items_v';
						referencedColumns: ['id'];
					}
				];
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
			provider_connections_v: {
				Row: {
					budget_status: string | null;
					created_at: string | null;
					credential_name: string | null;
					credential_source: string | null;
					critical_remaining_amount: number | null;
					currency: string | null;
					current_period_currency: string | null;
					current_period_spend: number | null;
					display_name: string | null;
					external_account_id: string | null;
					external_project_ids: string[] | null;
					id: string | null;
					last_sync_error: string | null;
					last_sync_finished_at: string | null;
					last_sync_started_at: string | null;
					last_sync_status: string | null;
					latest_fetched_at: string | null;
					latest_snapshot_id: string | null;
					monthly_budget: number | null;
					period_end_exclusive: string | null;
					period_start: string | null;
					provider_code: string | null;
					provider_config: Json | null;
					remaining_budget: number | null;
					status: string | null;
					updated_at: string | null;
					user_id: string | null;
					warning_remaining_amount: number | null;
				};
				Relationships: [
					{
						foreignKeyName: 'provider_connections_currency_fkey';
						columns: ['currency'];
						isOneToOne: false;
						referencedRelation: 'currency_codes';
						referencedColumns: ['code'];
					},
					{
						foreignKeyName: 'provider_connections_provider_code_fkey';
						columns: ['provider_code'];
						isOneToOne: false;
						referencedRelation: 'provider_catalog';
						referencedColumns: ['code'];
					},
					{
						foreignKeyName: 'provider_cost_snapshots_currency_fkey';
						columns: ['current_period_currency'];
						isOneToOne: false;
						referencedRelation: 'currency_codes';
						referencedColumns: ['code'];
					}
				];
			};
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
			tracked_item_reminders_v: {
				Row: {
					amount: number | null;
					category: string | null;
					currency: string | null;
					dismissed_at: string | null;
					effective_status: string | null;
					event_date: string | null;
					event_kind: string | null;
					is_unread: boolean | null;
					is_visible: boolean | null;
					lead_days: number | null;
					name: string | null;
					provider: string | null;
					read_at: string | null;
					reminder_due_date: string | null;
					snoozed_until: string | null;
					state_id: string | null;
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
