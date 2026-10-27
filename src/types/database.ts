/**
 * Supabase Database Schema & Typed Entity Definitions
 *
 * XFORCE Construction Management & Customer Platform (X-FORCE BRICKS)
 * Single-Business Architecture (No multi-tenancy, No tenant_id)
 *
 * This file serves as the single source of truth for database models,
 * providing the full `Database` type structure for `@supabase/supabase-js`.
 */

export type Json =

  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ==============================================================================
// 1. DOMAIN ENUMS & CONSTANTS
// ==============================================================================

export type SystemRoleName =
  | 'administrator'
  | 'sales_manager'
  | 'warehouse_staff'
  | 'installation_staff'
  | 'pos_staff';

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';

export type CustomerType = 'individual' | 'contractor' | 'corporate' | 'distributor';
export type CustomerStatus = 'active' | 'inactive' | 'lead' | 'blacklisted';

export type SupplierStatus = 'active' | 'inactive' | 'suspended';

export type StockMovementType =
  | 'opening_balance'
  | 'received'
  | 'issued'
  | 'transfer'
  | 'adjustment'
  | 'wastage'
  | 'return'
  | 'damaged'
  | 'stock_count_reconciliation'
  | 'pos_sale';

export type QuotationStatus =
  | 'draft'
  | 'pending_approval'
  | 'sent'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'converted';

export type OrderStatus =
  | 'draft'
  | 'confirmed'
  | 'processing'
  | 'ready_for_dispatch'
  | 'dispatched'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type OrderPaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'refunded';

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'card_pos'
  | 'ussd'
  | 'other';

export type UnitOfMeasure =
  | 'piece'
  | 'pack'
  | 'box'
  | 'bag'
  | 'sheet'
  | 'meter'
  | 'square_meter'
  | 'pallet'
  | 'set'
  | 'unit';

// ==============================================================================
// 2. SUPABASE DATABASE CONTRACT INTERFACES
// ==============================================================================

export type Database = {
  public: {
    Tables: {
      roles: {
        Row: DbRole;
        Insert: Omit<DbRole, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbRole, 'id'>>;
        Relationships: [];
      };
      permissions: {
        Row: DbPermission;
        Insert: Omit<DbPermission, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<DbPermission, 'id'>>;
        Relationships: [];
      };
      role_permissions: {
        Row: DbRolePermission;
        Insert: DbRolePermission;
        Update: Partial<DbRolePermission>;
        Relationships: [];
      };
      profiles: {
        Row: DbProfile;
        Insert: Omit<DbProfile, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbProfile, 'id'>>;
        Relationships: [];
      };
      business_settings: {
        Row: DbBusinessSettings;
        Insert: Partial<DbBusinessSettings> & { id?: string };
        Update: Partial<DbBusinessSettings>;
        Relationships: [];
      };
      categories: {
        Row: DbCategory;
        Insert: Omit<DbCategory, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbCategory, 'id'>>;
        Relationships: [];
      };
      products: {
        Row: DbProduct;
        Insert: Omit<DbProduct, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbProduct, 'id'>>;
        Relationships: [];
      };
      product_variants: {
        Row: DbProductVariant;
        Insert: Omit<DbProductVariant, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbProductVariant, 'id'>>;
        Relationships: [];
      };
      stock_locations: {
        Row: DbStockLocation;
        Insert: Omit<DbStockLocation, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbStockLocation, 'id'>>;
        Relationships: [];
      };
      inventory_balances: {
        Row: DbInventoryBalance;
        Insert: Omit<DbInventoryBalance, 'id' | 'updated_at'> & {
          id?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbInventoryBalance, 'id'>>;
        Relationships: [];
      };
      stock_movements: {
        Row: DbStockMovement;
        Insert: Omit<DbStockMovement, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<DbStockMovement, 'id'>>;
        Relationships: [];
      };
      stock_counts: {
        Row: DbStockCount;
        Insert: Omit<DbStockCount, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbStockCount, 'id'>>;
        Relationships: [];
      };
      stock_count_items: {
        Row: DbStockCountItem;
        Insert: Omit<DbStockCountItem, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbStockCountItem, 'id'>>;
        Relationships: [];
      };
      customers: {
        Row: DbCustomer;
        Insert: Omit<DbCustomer, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbCustomer, 'id'>>;
        Relationships: [];
      };
      suppliers: {
        Row: DbSupplier;
        Insert: Omit<DbSupplier, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbSupplier, 'id'>>;
        Relationships: [];
      };
      quotations: {
        Row: DbQuotation;
        Insert: Omit<DbQuotation, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbQuotation, 'id'>>;
        Relationships: [];
      };
      quotation_items: {
        Row: DbQuotationItem;
        Insert: Omit<DbQuotationItem, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<DbQuotationItem, 'id'>>;
        Relationships: [];
      };
      orders: {
        Row: DbOrder;
        Insert: Omit<DbOrder, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbOrder, 'id'>>;
        Relationships: [];
      };
      order_items: {
        Row: DbOrderItem;
        Insert: Omit<DbOrderItem, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<DbOrderItem, 'id'>>;
        Relationships: [];
      };
      payments: {
        Row: DbPayment;
        Insert: Omit<DbPayment, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<DbPayment, 'id'>>;
        Relationships: [];
      };
      media: {
        Row: DbMedia;
        Insert: Omit<DbMedia, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<DbMedia, 'id'>>;
        Relationships: [];
      };
      audit_logs: {
        Row: DbAuditLog;
        Insert: {
          id?: string;
          user_id?: string | null;
          actor_user_id?: string | null;
          user_email?: string | null;
          actor_user_email?: string | null;
          actor_user_name?: string | null;
          user_role?: string | null;
          actor_user_role?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          entity_reference?: string | null;
          old_value?: Json | null;
          previous_values?: Json | null;
          new_value?: Json | null;
          new_values?: Json | null;
          reason?: string | null;
          metadata?: Json | null;
          source?: string;
          status?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          timestamp?: string;
          created_at?: string;
        };
        Update: Partial<Omit<DbAuditLog, 'id'>>;
        Relationships: [];
      };
      offline_sync_log: {
        Row: DbOfflineSyncRecord;
        Insert: Omit<DbOfflineSyncRecord, 'id' | 'server_timestamp'> & {
          id?: string;
          server_timestamp?: string;
        };
        Update: Partial<Omit<DbOfflineSyncRecord, 'id'>>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_staff: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      generate_business_number: {
        Args: {
          prefix: string;
          target_table: string;
          target_column: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// ==============================================================================
// 3. INDIVIDUAL ENTITY MODELS (ROWS)
// ==============================================================================

export type DbRole = {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

export type DbPermission = {
  id: string;
  code: string;
  module: string;
  description: string | null;
  created_at: string;
};

export type DbRolePermission = {
  role_id: string;
  permission_id: string;
};

export type DbProfile = {
  id: string; // References auth.users(id)
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role_id: string;
  status: UserStatus;
  password_setup_required: boolean;
  created_at: string;
  updated_at: string;
};

export type DbBusinessSettings = {
  id: string; // 'current_business'
  company_name: string;
  public_brand_name: string;
  slogan: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  tin_number: string | null;
  currency_code: string;
  currency_symbol: string;
  country_code: string;
  contact_email: string | null;
  contact_phone: string | null;
  whatsapp_number: string | null;
  website_url: string | null;
  address: Json | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  social_links: Json | null;
  operating_hours: Json | null;
  hero_text: string | null;
  hero_images: Json | null;
  default_order_prefix: string;
  default_quotation_prefix: string;
  default_customer_prefix: string;
  features: Json | null;
  updated_at: string;
  created_at: string;
};

export type DbCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DbProduct = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  sku: string;
  short_description?: string | null;
  description: string | null;
  unit: string;
  cost_price: number | null;
  selling_price: number;
  price_on_request?: boolean;
  minimum_stock: number;
  reorder_level: number;
  requires_installation: boolean;
  is_active: boolean;
  is_published: boolean;
  is_featured?: boolean;
  images?: Json | string[] | null;
  attributes?: Json | Record<string, string> | null;
  sort_order?: number;
  created_at: string;
  updated_at: string;
};

export type DbProductVariant = {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  color: string | null;
  size: string | null;
  finish: string | null;
  description: string | null;
  image_url: string | null;
  price_override: number | null;
  is_active: boolean;
  sort_order?: number;
  attributes?: Json | Record<string, string> | null;
  created_at: string;
  updated_at: string;
};

export type DbStockLocation = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type DbInventoryBalance = {
  id: string;
  product_id: string;
  variant_id: string | null;
  location_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  updated_at: string;
};

export type DbStockMovement = {
  id: string;
  movement_number: string | null;
  movement_type: StockMovementType;
  product_id: string;
  variant_id: string | null;
  source_location_id: string | null;
  destination_location_id: string | null;
  quantity: number;
  unit_cost: number | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type DbStockCount = {
  id: string;
  count_number: string;
  location_id: string;
  location_name: string;
  location_code: string;
  count_date: string;
  status: string;
  scope: string;
  category_id: string | null;
  category_name: string | null;
  is_blind_count: boolean;
  significant_variance_threshold: Json | null;
  notes: string | null;
  review_notes: string | null;
  initiated_by: string;
  initiated_by_name: string;
  assigned_counters: Json | null;
  started_at: string | null;
  completed_at: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  reconciled_by: string | null;
  reconciled_by_name: string | null;
  reconciled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbStockCountItem = {
  id: string;
  stock_count_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku: string;
  unit: string;
  location_id: string;
  system_quantity_snapshot: number;
  system_quantity_at_submission: number | null;
  counted_quantity: number | null;
  variance: number | null;
  variance_status: string;
  counter_id: string | null;
  counter_name: string | null;
  counted_at: string | null;
  recounts: Json | null;
  is_recounted: boolean;
  approved_quantity: number | null;
  reconciled_quantity: number | null;
  notes: string | null;
  reviewer_notes: string | null;
  has_movement_during_count: boolean;
  created_at: string;
  updated_at: string;
};

export type DbCustomer = {
  id: string;
  customer_number: string;
  user_id: string | null;
  full_name: string;
  company_name: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  customer_type: CustomerType;
  status: CustomerStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DbSupplier = {
  id: string;
  supplier_number: string;
  name: string;
  contact_person: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  bank_details: Json | null;
  tax_id: string | null;
  notes: string | null;
  status: SupplierStatus;
  created_at: string;
  updated_at: string;
};

export type DbQuotation = {
  id: string;
  quotation_number: string;
  customer_id: string;
  status: QuotationStatus;
  quotation_date: string;
  valid_until: string;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  installation_fee: number;
  tax_amount: number;
  total_amount: number;
  deposit_required: number;
  balance_due: number;
  notes: string | null;
  terms_and_conditions: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DbQuotationItem = {
  id: string;
  quotation_id: string;
  product_id: string | null;
  variant_id: string | null;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  line_total: number;
  sort_order: number;
  created_at: string;
};

export type DbOrder = {
  id: string;
  order_number: string;
  quotation_id: string | null;
  customer_id: string;
  status: OrderStatus;
  payment_status: OrderPaymentStatus;
  order_date: string;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  installation_fee: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  delivery_address: string | null;
  delivery_state: string | null;
  delivery_city: string | null;
  delivery_notes: string | null;
  requires_installation: boolean;
  internal_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DbOrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  unit_cost: number | null;
  discount_amount: number;
  line_total: number;
  sort_order: number;
  created_at: string;
};

export type DbPayment = {
  id: string;
  payment_number: string;
  order_id: string | null;
  quotation_id: string | null;
  customer_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  reference_number: string | null;
  payment_date: string;
  receipt_url: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
};

export type DbMedia = {
  id: string;
  storage_provider: string;
  storage_bucket: string;
  storage_path: string;
  public_url: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  alt_text: string | null;
  caption: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
};

export type DbAuditLog = {
  id: string;
  user_id: string | null;
  actor_user_id?: string | null;
  user_email: string | null;
  actor_user_email?: string | null;
  actor_user_name?: string | null;
  user_role: string | null;
  actor_user_role?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_reference?: string | null;
  old_value: Json | null;
  previous_values?: Json | null;
  new_value: Json | null;
  new_values?: Json | null;
  reason: string | null;
  metadata?: Json | null;
  source?: string;
  status?: string;
  ip_address: string | null;
  user_agent?: string | null;
  timestamp?: string;
  created_at: string;
};

export type DbOfflineSyncRecord = {
  id: string;
  client_mutation_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  client_timestamp: string;
  server_timestamp: string;
  status: 'applied' | 'conflict_resolved' | 'rejected';
  details: Json | null;
  user_id: string | null;
};
