import { setTimeout as delay } from "node:timers/promises";

export interface BigArenaCredentials {
  apiToken: string;
  domain?: string | null;
}

export type BigArenaQuery = Record<string, string | number | boolean | undefined | null>;

export interface BigArenaPagination {
  page?: number;
  per_page?: number;
  total?: number;
  total_pages?: number;
  next_page?: number | null;
  prev_page?: number | null;
  [key: string]: unknown;
}

export interface BigArenaListResponse<T> {
  data: T[];
  meta?: BigArenaPagination;
  raw: unknown;
}

export type BigArenaOrder = Record<string, any>;
export type BigArenaOrderReturn = Record<string, any>;
export type BigArenaProduct = Record<string, any>;
export type BigArenaVariant = Record<string, any>;
export type BigArenaShipment = Record<string, any>;
export type BigArenaWarehouse = Record<string, any>;
export type BigArenaCourier = Record<string, any>;
export type BigArenaCourierNomenclature = Record<string, any>;

export interface BigArenaUpdateOrderPayload {
  status?: string;
  tracking_code?: string;
  tracking_url?: string;
  courier_code?: string;
  courier_service?: string;
  delivered_at?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

interface RequestOptions {
  query?: BigArenaQuery;
  body?: unknown;
  signal?: AbortSignal;
}

export class BigArenaService {
  private readonly baseUrl: string;
  private readonly maxRetries = 3;
  private readonly backoffInitialMs = 500;

  constructor(private readonly credentials: BigArenaCredentials) {
    if (!credentials.apiToken || credentials.apiToken.trim().length === 0) {
      throw new Error("Big Arena API token é obrigatório");
    }
    this.baseUrl = this.buildBaseUrl(credentials.domain);
  }

  /**
   * Testa conexão básica obtendo a lista de warehouses do cliente.
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.listWarehouses({ per_page: 1 });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao conectar com a Big Arena",
      };
    }
  }

  async listOrders(query?: BigArenaQuery): Promise<BigArenaListResponse<BigArenaOrder>> {
    const payload = await this.request<any>("GET", "/orders", { query });
    return this.normalizeListPayload<BigArenaOrder>(payload);
  }

  async getOrder(orderId: string): Promise<BigArenaOrder> {
    if (!orderId?.trim()) {
      throw new Error("orderId é obrigatório");
    }
    return await this.request<BigArenaOrder>("GET", `/orders/${encodeURIComponent(orderId)}`);
  }

  async updateOrder(orderId: string, payload: BigArenaUpdateOrderPayload): Promise<BigArenaOrder> {
    if (!orderId?.trim()) {
      throw new Error("orderId é obrigatório");
    }
    if (!payload || Object.keys(payload).length === 0) {
      throw new Error("payload de atualização não pode ser vazio");
    }
    return await this.request<BigArenaOrder>("PATCH", `/orders/${encodeURIComponent(orderId)}`, { body: payload });
  }

  async listOrderReturns(query?: BigArenaQuery): Promise<BigArenaListResponse<BigArenaOrderReturn>> {
    const payload = await this.request<any>("GET", "/order-returns", { query });
    return this.normalizeListPayload<BigArenaOrderReturn>(payload);
  }

  async listProducts(query?: BigArenaQuery): Promise<BigArenaListResponse<BigArenaProduct>> {
    const payload = await this.request<any>("GET", "/products", { query });
    return this.normalizeListPayload<BigArenaProduct>(payload);
  }

  async listVariants(query?: BigArenaQuery): Promise<BigArenaListResponse<BigArenaVariant>> {
    const payload = await this.request<any>("GET", "/variants", { query });
    return this.normalizeListPayload<BigArenaVariant>(payload);
  }

  async listShipments(query?: BigArenaQuery): Promise<BigArenaListResponse<BigArenaShipment>> {
    const payload = await this.request<any>("GET", "/warehouse-shipments", { query });
    return this.normalizeListPayload<BigArenaShipment>(payload);
  }

  async listWarehouses(query?: BigArenaQuery): Promise<BigArenaListResponse<BigArenaWarehouse>> {
    const payload = await this.request<any>("GET", "/warehouses", { query });
    return this.normalizeListPayload<BigArenaWarehouse>(payload);
  }

  async listCouriers(query?: BigArenaQuery): Promise<BigArenaListResponse<BigArenaCourier>> {
    const payload = await this.request<any>("GET", "/couriers", { query });
    return this.normalizeListPayload<BigArenaCourier>(payload);
  }

  async listCourierNomenclatures(query?: BigArenaQuery): Promise<BigArenaListResponse<BigArenaCourierNomenclature>> {
    const payload = await this.request<any>("GET", "/courier-nomenclatures", { query });
    return this.normalizeListPayload<BigArenaCourierNomenclature>(payload);
  }

  private buildBaseUrl(domain?: string | null): string {
    // Sempre usar o domínio padrão da Big Arena, ignorando qualquer domínio customizado
    return "https://my.bigarena.net/api/v1";
  }

  private buildUrl(path: string, query?: BigArenaQuery): string {
    const normalizedPath = path.startsWith("http")
      ? path
      : `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

    const url = new URL(normalizedPath);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        const stringValue =
          value instanceof Date ? value.toISOString() : typeof value === "boolean" ? String(Number(value)) : String(value);
        if (stringValue.trim().length === 0) continue;
        url.searchParams.set(key, stringValue);
      }
    }
    return url.toString();
  }

  private async request<T>(method: string, path: string, options: RequestOptions = {}, attempt = 0): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${this.credentials.apiToken.trim()}`,
    };

    const init: RequestInit = {
      method,
      headers,
      signal: options.signal ?? AbortSignal.timeout(60_000),
    };

    if (options.body !== undefined && options.body !== null) {
      headers["Content-Type"] = "application/json";
      init.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    const response = await fetch(url, init);

    if (response.status === 429 && attempt < this.maxRetries) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : NaN;
      const backoff =
        Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? retryAfterSeconds * 1000
          : this.backoffInitialMs * Math.pow(2, attempt);
      console.warn(`⚠️  Big Arena rate limit atingido. Tentando novamente em ${backoff}ms (tentativa ${attempt + 1})`);
      await delay(backoff);
      return this.request<T>(method, path, options, attempt + 1);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Big Arena API error [${response.status}] ${errorText || response.statusText || "Unknown error"} (${method} ${url})`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      return text as unknown as T;
    }

    return (await response.json()) as T;
  }

  private normalizeListPayload<T>(payload: any): BigArenaListResponse<T> {
    if (Array.isArray(payload)) {
      return { data: payload as T[], raw: payload };
    }

    if (payload?.data && Array.isArray(payload.data)) {
      return { data: payload.data as T[], meta: this.extractPagination(payload.meta), raw: payload };
    }

    if (payload?.results && Array.isArray(payload.results)) {
      return { data: payload.results as T[], meta: this.extractPagination(payload.meta || payload.pagination), raw: payload };
    }

    if (payload?.items && Array.isArray(payload.items)) {
      return { data: payload.items as T[], meta: this.extractPagination(payload.meta || payload.pagination), raw: payload };
    }

    if (payload?.data && typeof payload.data === "object") {
      return { data: [payload.data as T], raw: payload };
    }

    return { data: [], raw: payload };
  }

  private extractPagination(meta: any): BigArenaPagination | undefined {
    if (!meta || typeof meta !== "object") return undefined;

    const pagination: BigArenaPagination = {};
    if (typeof meta.page === "number") pagination.page = meta.page;
    if (typeof meta.per_page === "number") pagination.per_page = meta.per_page;
    if (typeof meta.total === "number") pagination.total = meta.total;
    if (typeof meta.total_pages === "number") pagination.total_pages = meta.total_pages;
    if (typeof meta.next_page === "number" || meta.next_page === null) pagination.next_page = meta.next_page;
    if (typeof meta.prev_page === "number" || meta.prev_page === null) pagination.prev_page = meta.prev_page;

    return pagination;
  }
}

