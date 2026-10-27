/**
 * Data Management Utility
 * XFORCE Construction Ltd
 *
 * Provides functions to safely purge pre-seeded mock records from local storage
 * and reset administrative tables for clean live testing with new records.
 */

import { localStore } from '../lib/storage/localStorage';

export const ADMIN_DATA_STORAGE_KEYS = [
  'xforce_orders_cache_v1',
  'xforce_order_items_cache_v1',
  'xforce_order_history_cache_v1',
  'xforce_business_expenses_v1',
  'xforce_inventory_balances_v1',
  'xforce_stock_movements_v1',
  'xforce_fulfilments_cache_v1',
  'xforce_warehouse_tasks_cache_v1',
  'xforce_service_jobs_cache_v1',
  'xforce_suppliers_v1',
  'xforce_service_providers_v1',
  'xforce_gallery_designs_v7',
  'xforce_gallery_projects_v7',
  'xforce_gallery_media_v7',
  'xforce_conversations_v1',
  'xforce_internal_messages_v1',
  'xforce_ai_conversations',
  'xforce_ai_messages',
  'xforce_notifications_v1',
  'xforce_catalogue_products_v6',
  'xforce_catalogue_variants_v6',
  'xforce_customers_cache_v1',
  'xforce_quotations_cache_v1',
  'xforce_requests_cache_v1',
  'xforce_pos_sales_v1',
  'xforce_payments_cache_v1',
  'xforce_stock_counts_v1',
];

/**
 * Purges all pre-existing mockup records across administrative modules
 * while preserving active auth sessions, staff administrator profiles, and system settings.
 */
export function clearAllAdminMockRecords(): { success: boolean; clearedCount: number } {
  if (typeof window === 'undefined') {
    return { success: false, clearedCount: 0 };
  }

  let clearedCount = 0;

  ADMIN_DATA_STORAGE_KEYS.forEach((key) => {
    try {
      window.localStorage.removeItem(key);
      clearedCount++;
    } catch (err) {
      console.warn(`[DataManagement] Failed to clear ${key}:`, err);
    }
  });

  // Re-initialize staff to only the default Administrator account
  const defaultAdmin = [
    {
      id: '4a56de99-4eb2-4ae2-9e94-b7dceb45976f',
      staffNumber: 'STF-2026-0001',
      fullName: 'Engr. David Adeleke',
      email: 'admin@xforce.com',
      phone: '+234 802 111 2233',
      roleId: 'a0000000-0000-0000-0000-000000000001',
      roleName: 'administrator',
      roleDisplayName: 'Administrator',
      jobTitle: 'Lead Production & Operations Director',
      department: 'management',
      accountStatus: 'active',
      employmentStatus: 'full_time',
      dateOfJoining: '2023-01-15',
      emergencyContactName: 'Folake Adeleke',
      emergencyContactPhone: '+234 803 999 1122',
      notes: 'Primary executive administrator for factory operations and engineering approvals.',
      passwordSetupRequired: false,
      avatarUrl: null,
      createdAt: '2023-01-15T08:00:00.000Z',
      updatedAt: new Date().toISOString(),
    },
  ];
  localStore.set('xforce_staff_members_v1', defaultAdmin);

  // Set the migration version flag so auto-clean only runs once unless manually triggered
  try {
    window.localStorage.setItem('xforce_mock_data_cleared_v10', 'true');
  } catch {
    // safe
  }

  return { success: true, clearedCount };
}

/**
 * Automatically runs once on app boot to ensure any existing browser localStorage
 * that retained old pre-seeded mockup data is cleared for the user's new record testing.
 */
export function ensureMockDataCleared(): void {
  if (typeof window === 'undefined') return;

  try {
    const hasCleared = window.localStorage.getItem('xforce_mock_data_cleared_v10');
    if (!hasCleared) {
      clearAllAdminMockRecords();
      console.log('[DataManagement] Automatically purged old mockup pre-records for clean system testing.');
    }
  } catch (err) {
    console.warn('[DataManagement] Auto-purge check failed:', err);
  }
}
