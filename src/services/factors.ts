// web/src/services/factors.ts
import { api } from './http';

/** 单条因子结构（与后端 Prisma 模型一致） */
export type Factor = {
  id: string;
  category: string;
  subCategory: string;
  factorValue: number;
  unit: string;
  source?: string | null;
  year: number;
  region?: string | null;
  scope?: string | null;
  notes?: string | null;
  createdAt: string; // ISO format
  updatedAt: string; // ISO format
  emissions?: any[]; // 若后端带了关联
};

/** 分页返回结构（后端标准） */
export type Paged<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

/** 列表查询参数 */
export type FactorQuery = {
  q?: string;
  year?: number;
  page?: number;
  pageSize?: number;
  sortBy?: keyof Factor | 'updatedAt' | 'createdAt' | 'year';
  sortOrder?: 'asc' | 'desc';
};

/** 创建/更新输入结构（后端 DTO 的前端对应） */
export type FactorInput = {
  category: string;
  subCategory?: string;
  factorValue: number;
  unit: string;
  source?: string;
  year: number;
  region?: string;
  scope?: string;
  notes?: string;
};

/* ---------------- 工具函数 ---------------- */

function toNum(n: any, fallback?: number) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function buildParams(q: FactorQuery = {}) {
  const params: Record<string, any> = {};
  if (q.q) params.q = q.q;
  if (Number.isFinite(q.year as number)) params.year = q.year;
  if (Number.isFinite(q.page as number)) params.page = q.page;
  if (Number.isFinite(q.pageSize as number)) params.pageSize = q.pageSize;
  if (q.sortBy) params.sortBy = q.sortBy;
  if (q.sortOrder) params.sortOrder = q.sortOrder;
  return params;
}

function assertCreatePayload(p: FactorInput) {
  if (!p) throw new Error('Payload is required');
  if (!p.category || !p.category.trim()) throw new Error('category is required');
  if (!p.unit || !p.unit.trim()) throw new Error('unit is required');
  if (!Number.isFinite(p.factorValue) || p.factorValue! <= 0) throw new Error('factorValue must be > 0');
  const y = toNum(p.year);
  if (!Number.isFinite(y) || y! < 1900 || y! > 2100) throw new Error('year is invalid');
}

function pickUpdatable(p: Partial<FactorInput>) {
  const out: Record<string, any> = {};
  if (p.category !== undefined) out.category = p.category;
  if (p.subCategory !== undefined) out.subCategory = p.subCategory;
  if (p.factorValue !== undefined) out.factorValue = Number(p.factorValue);
  if (p.unit !== undefined) out.unit = p.unit;
  if (p.source !== undefined) out.source = p.source;
  if (p.year !== undefined) out.year = Number(p.year);
  if (p.region !== undefined) out.region = p.region;
  if (p.scope !== undefined) out.scope = p.scope;
  if (p.notes !== undefined) out.notes = p.notes;
  return out;
}

function extractError(e: any, fallback = 'Request failed') {
  return e?.response?.data?.message || e?.message || fallback;
}

/* ---------------- API 函数 ---------------- */

/**
 * 列表（支持分页或数组返回）
 * - 后端若返回 `{items,total,page,pageSize}`，则按分页处理
 * - 若后端直接返回 `Factor[]`，也能被页面 normalize 正常渲染
 */
export async function listFactors(
  query?: FactorQuery
): Promise<Paged<Factor> | Factor[]> {
  try {
    const params = buildParams({
      page: query?.page ?? 1,
      pageSize: query?.pageSize ?? 20,
      sortBy: query?.sortBy ?? 'updatedAt',
      sortOrder: query?.sortOrder ?? 'desc',
      q: query?.q,
      year: query?.year,
    });

    const { data } = await api.get<Paged<Factor> | Factor[]>('/factors', { params });

    // 兜底：如果后端误把 page/pageSize 当字符串返回，这里矫正一下
    if (!Array.isArray(data)) {
      const fixed: Paged<Factor> = {
        items: Array.isArray(data.items) ? data.items : [],
        total: toNum((data as any).total, 0)!,
        page: toNum((data as any).page, 1)!,
        pageSize: toNum((data as any).pageSize, 20)!,
      };
      return fixed;
    }

    // 如果是数组，直接返回，页面会 normalize
    return data;
  } catch (e: any) {
    throw new Error(extractError(e, 'Failed to load factors'));
  }
}

/** 创建 */
export async function createFactor(payload: FactorInput): Promise<Factor> {
  try {
    assertCreatePayload(payload);
    const body = {
      ...payload,
      factorValue: Number(payload.factorValue),
      year: Number(payload.year),
    };
    const { data } = await api.post<Factor>('/factors', body);
    return data;
  } catch (e: any) {
    throw new Error(extractError(e, 'Failed to create factor'));
  }
}

/** 更新 */
export async function updateFactor(id: string, patch: Partial<FactorInput>): Promise<Factor> {
  try {
    if (!id) throw new Error('id is required');
    const body = pickUpdatable(patch);
    if ('factorValue' in body && !Number.isFinite(body.factorValue)) {
      throw new Error('factorValue must be a number');
    }
    if ('year' in body) {
      const y = Number(body.year);
      if (!Number.isFinite(y) || y < 1900 || y > 2100) throw new Error('year is invalid');
      body.year = y;
    }
    const { data } = await api.put<Factor>(`/factors/${id}`, body);
    return data;
  } catch (e: any) {
    throw new Error(extractError(e, 'Failed to update factor'));
  }
}

/** 删除 */
export async function removeFactor(id: string): Promise<{ ok: true } | Factor> {
  try {
    if (!id) throw new Error('id is required');
    const { data } = await api.delete<{ ok: true } | Factor>(`/factors/${id}`);
    return data;
  } catch (e: any) {
    throw new Error(extractError(e, 'Failed to delete factor'));
  }
}
