import { Result, PaginatedResponse, PaginationParams } from '../types/common';

/**
 * Base Repository Interface (Data Layer)
 *
 * All future entity repositories (CustomerRepository, ProductRepository,
 * OrderRepository, etc.) will implement or extend this abstraction.
 *
 * Enforces separation between database queries (Repository) and
 * business operations (Service).
 */
export interface IBaseRepository<T, ID = string> {
  findById(id: ID): Promise<Result<T | null>>;
  findMany(params?: PaginationParams & Record<string, unknown>): Promise<Result<PaginatedResponse<T>>>;
  create(entity: Partial<T>): Promise<Result<T>>;
  update(id: ID, entity: Partial<T>): Promise<Result<T>>;
  delete(id: ID): Promise<Result<boolean>>;
}
