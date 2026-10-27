/**
 * Stock Count Repository
 * Module 12 — Physical Stock Counting & Reconciliation
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Manages physical stock count sessions, freeze snapshots, counted items,
 * and recounts. Multi-tier persistence: Supabase remote tables (`stock_counts`, `stock_count_items`)
 * with fallback to local storage caching.
 */

import { getSupabaseClient } from '../lib/supabase/client';
import { appConfig } from '../config/app.config';
import { localStore } from '../lib/storage/localStorage';
import {
  StockCountSession,
  StockCountItem,
  StockCountFilterParams,
} from '../types/stockCount';
import { defaultFullBusinessSettings } from '../config/business.config';

const STOCK_COUNTS_STORAGE_KEY = 'xforce_stock_counts_v1';

export class StockCountRepository {
  private isRemoteTableAvailable: boolean = true;
  private warnedAboutMissingTable: boolean = false;
  private memorySessions: StockCountSession[] | null = null;

  constructor() {
    this.initCache();
  }

  private initCache(): void {
    const stored = localStore.get<StockCountSession[] | null>(
      STOCK_COUNTS_STORAGE_KEY,
      null
    );
    this.memorySessions = stored || [];
  }

  private saveSessions(sessions: StockCountSession[]): void {
    this.memorySessions = sessions;
    localStore.set(STOCK_COUNTS_STORAGE_KEY, sessions);
  }

  /**
   * Generates a unique, human-readable count reference formatted as STC-YYYY-XXXX
   */
  public generateCountNumber(prefix?: string): string {
    const year = new Date().getFullYear();
    const pfx = prefix || defaultFullBusinessSettings.numbering.defaultStockCountPrefix || 'STC';
    const existing = this.memorySessions || [];
    const count = existing.length + 1;
    return `${pfx}-${year}-${String(count).padStart(4, '0')}`;
  }

  public async getAllSessions(filters?: StockCountFilterParams): Promise<StockCountSession[]> {
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const client = getSupabaseClient();
        let query = client.from('stock_counts').select('*').order('created_at', { ascending: false });

        if (filters?.locationId && filters.locationId !== 'all') {
          query = query.eq('location_id', filters.locationId);
        }
        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }

        const { data, error } = await query;
        if (error) {
          if (error.code === 'PGRST205' || error.code === '42P01') {
            if (!this.warnedAboutMissingTable) {
              console.info('[StockCountRepository] Remote stock_counts table not found, utilizing local offline store.');
              this.warnedAboutMissingTable = true;
            }
            this.isRemoteTableAvailable = false;
          }
        } else if (data) {
          // Hydrate with local/remote items
          const sessions: StockCountSession[] = [];
          for (const row of data) {
            const memoryMatch = (this.memorySessions || []).find((s) => s.id === row.id);
            sessions.push({
              id: row.id,
              countNumber: row.count_number,
              locationId: row.location_id,
              locationName: row.location_name,
              locationCode: row.location_code,
              countDate: row.count_date,
              scope: row.scope as any,
              categoryId: row.category_id,
              categoryName: row.category_name,
              status: row.status as any,
              isBlindCount: row.is_blind_count,
              significantVarianceThreshold: row.significant_variance_threshold as any,
              notes: row.notes,
              reviewNotes: row.review_notes,
              initiatedBy: row.initiated_by,
              initiatedByName: row.initiated_by_name,
              assignedCounters: (row.assigned_counters as any) || [],
              startedAt: row.started_at,
              completedAt: row.completed_at,
              approvedBy: row.approved_by,
              approvedByName: row.approved_by_name,
              approvedAt: row.approved_at,
              reconciledBy: row.reconciled_by,
              reconciledByName: row.reconciled_by_name,
              reconciledAt: row.reconciled_at,
              items: memoryMatch?.items || [],
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            });
          }
          this.saveSessions(sessions);
          return this.applyFilters(sessions, filters);
        }
      } catch (err) {
        console.warn('[StockCountRepository] Remote query error, falling back to local storage:', err);
      }
    }

    return this.applyFilters(this.memorySessions || [], filters);
  }

  private applyFilters(sessions: StockCountSession[], filters?: StockCountFilterParams): StockCountSession[] {
    let result = [...sessions];

    if (filters?.locationId && filters.locationId !== 'all') {
      result = result.filter((s) => s.locationId === filters.locationId);
    }

    if (filters?.status && filters.status !== 'all') {
      result = result.filter((s) => s.status === filters.status);
    }

    if (filters?.startDate) {
      result = result.filter((s) => s.countDate >= filters.startDate!);
    }

    if (filters?.endDate) {
      result = result.filter((s) => s.countDate <= filters.endDate!);
    }

    if (filters?.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.countNumber.toLowerCase().includes(q) ||
          s.locationName.toLowerCase().includes(q) ||
          s.initiatedByName.toLowerCase().includes(q) ||
          (s.notes && s.notes.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getSessionById(id: string): Promise<StockCountSession | null> {
    const memoryMatch = (this.memorySessions || []).find((s) => s.id === id);
    if (memoryMatch) {
      return memoryMatch;
    }

    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const client = getSupabaseClient();
        const { data: sessionRow, error: sessionErr } = await client
          .from('stock_counts')
          .select('*')
          .eq('id', id)
          .single();

        if (!sessionErr && sessionRow) {
          const { data: itemRows } = await client
            .from('stock_count_items')
            .select('*')
            .eq('stock_count_id', id);

          const items: StockCountItem[] = (itemRows || []).map((ir: any) => ({
            id: ir.id,
            stockCountId: ir.stock_count_id,
            productId: ir.product_id,
            variantId: ir.variant_id,
            productName: ir.product_name,
            variantName: ir.variant_name,
            sku: ir.sku,
            unit: ir.unit,
            locationId: ir.location_id,
            systemQuantitySnapshot: Number(ir.system_quantity_snapshot),
            systemQuantityAtSubmission: ir.system_quantity_at_submission !== null ? Number(ir.system_quantity_at_submission) : null,
            hasMovementDuringCount: Boolean(ir.has_movement_during_count),
            countedQuantity: ir.counted_quantity !== null ? Number(ir.counted_quantity) : null,
            variance: ir.variance !== null ? Number(ir.variance) : null,
            varianceStatus: ir.variance_status as any,
            counterId: ir.counter_id,
            counterName: ir.counter_name,
            countedAt: ir.counted_at,
            recounts: (ir.recounts as any) || [],
            isRecounted: Boolean(ir.is_recounted),
            approvedQuantity: ir.approved_quantity !== null ? Number(ir.approved_quantity) : null,
            reconciledQuantity: ir.reconciled_quantity !== null ? Number(ir.reconciled_quantity) : null,
            notes: ir.notes,
            reviewerNotes: ir.reviewer_notes,
            createdAt: ir.created_at,
            updatedAt: ir.updated_at,
          }));

          const session: StockCountSession = {
            id: sessionRow.id,
            countNumber: sessionRow.count_number,
            locationId: sessionRow.location_id,
            locationName: sessionRow.location_name,
            locationCode: sessionRow.location_code,
            countDate: sessionRow.count_date,
            scope: sessionRow.scope as any,
            categoryId: sessionRow.category_id,
            categoryName: sessionRow.category_name,
            status: sessionRow.status as any,
            isBlindCount: sessionRow.is_blind_count,
            significantVarianceThreshold: sessionRow.significant_variance_threshold as any,
            notes: sessionRow.notes,
            reviewNotes: sessionRow.review_notes,
            initiatedBy: sessionRow.initiated_by,
            initiatedByName: sessionRow.initiated_by_name,
            assignedCounters: (sessionRow.assigned_counters as any) || [],
            startedAt: sessionRow.started_at,
            completedAt: sessionRow.completed_at,
            approvedBy: sessionRow.approved_by,
            approvedByName: sessionRow.approved_by_name,
            approvedAt: sessionRow.approved_at,
            reconciledBy: sessionRow.reconciled_by,
            reconciledByName: sessionRow.reconciled_by_name,
            reconciledAt: sessionRow.reconciled_at,
            items,
            createdAt: sessionRow.created_at,
            updatedAt: sessionRow.updated_at,
          };

          const all = [...(this.memorySessions || [])];
          all.push(session);
          this.saveSessions(all);
          return session;
        }
      } catch (err) {
        console.warn('[StockCountRepository] Error fetching session by id:', err);
      }
    }

    return null;
  }

  public async saveSession(session: StockCountSession): Promise<StockCountSession> {
    const existing = [...(this.memorySessions || [])];
    const index = existing.findIndex((s) => s.id === session.id);

    if (index >= 0) {
      existing[index] = session;
    } else {
      existing.unshift(session);
    }

    this.saveSessions(existing);

    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const client = getSupabaseClient();
        await client.from('stock_counts').upsert({
          id: session.id,
          count_number: session.countNumber,
          location_id: session.locationId,
          location_name: session.locationName,
          location_code: session.locationCode,
          count_date: session.countDate,
          status: session.status,
          scope: session.scope,
          category_id: session.categoryId,
          category_name: session.categoryName,
          is_blind_count: session.isBlindCount,
          significant_variance_threshold: session.significantVarianceThreshold as any,
          notes: session.notes,
          review_notes: session.reviewNotes,
          initiated_by: session.initiatedBy,
          initiated_by_name: session.initiatedByName,
          assigned_counters: session.assignedCounters as any,
          started_at: session.startedAt,
          completed_at: session.completedAt,
          approved_by: session.approvedBy,
          approved_by_name: session.approvedByName,
          approved_at: session.approvedAt,
          reconciled_by: session.reconciledBy,
          reconciled_by_name: session.reconciledByName,
          reconciled_at: session.reconciledAt,
          created_at: session.createdAt,
          updated_at: session.updatedAt,
        } as any);

        if (session.items && session.items.length > 0) {
          const itemPayloads = session.items.map((it) => ({
            id: it.id,
            stock_count_id: session.id,
            product_id: it.productId,
            variant_id: it.variantId,
            product_name: it.productName,
            variant_name: it.variantName,
            sku: it.sku,
            unit: it.unit,
            location_id: it.locationId,
            system_quantity_snapshot: it.systemQuantitySnapshot,
            system_quantity_at_submission: it.systemQuantityAtSubmission,
            has_movement_during_count: it.hasMovementDuringCount,
            counted_quantity: it.countedQuantity,
            variance: it.variance,
            variance_status: it.varianceStatus,
            counter_id: it.counterId,
            counter_name: it.counterName,
            counted_at: it.countedAt,
            recounts: it.recounts as any,
            is_recounted: it.isRecounted,
            approved_quantity: it.approvedQuantity,
            reconciled_quantity: it.reconciledQuantity,
            notes: it.notes,
            reviewer_notes: it.reviewerNotes,
            created_at: it.createdAt,
            updated_at: it.updatedAt,
          }));

          await client.from('stock_count_items').upsert(itemPayloads as any);
        }
      } catch (err) {
        console.warn('[StockCountRepository] Remote upsert failed, offline copy saved:', err);
      }
    }

    return session;
  }

  public async deleteSession(id: string): Promise<boolean> {
    const existing = [...(this.memorySessions || [])];
    const session = existing.find((s) => s.id === id);

    if (!session) return false;

    // Only allow deletion for draft sessions
    if (session.status !== 'draft') {
      throw new Error(`Cannot delete stock count session in '${session.status}' status. Only draft sessions may be deleted.`);
    }

    const filtered = existing.filter((s) => s.id !== id);
    this.saveSessions(filtered);

    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const client = getSupabaseClient();
        await client.from('stock_count_items').delete().eq('stock_count_id', id);
        await client.from('stock_counts').delete().eq('id', id);
      } catch (err) {
        console.warn('[StockCountRepository] Remote delete failed:', err);
      }
    }

    return true;
  }
}

export const stockCountRepository = new StockCountRepository();
