/**
 * HTTP client for the Tesouro Direto pricing API.
 * Base URL is configured via the TESOURO_DIRETO_API_URL environment variable.
 */

export interface TesouroBond {
  id: string;
  /** Human-readable title name, e.g. "Tesouro Selic 2029" */
  type: string;
  /** ISO date string, e.g. "2029-03-01" */
  maturityDate: string;
  /** ISO date string of the quote, e.g. "2025-12-02" */
  baseDate: string;
  /** Purchase yield rate (% a.a.) */
  taxaCompra: number;
  /** Purchase unit price (PU) in BRL */
  puCompra: number;
  /** Base unit price (PU) in BRL */
  puBase: number;
}

export interface TesouroBondDetail extends TesouroBond {
  /** Sale yield rate (% a.a.) */
  taxaVenda?: number;
  /** Sale unit price (PU) in BRL */
  puVenda?: number;
}

export interface TesouroBondQuoteMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  source: string;
  fileDate: string;
}

export interface TesouroBondQuotesResponse {
  meta: TesouroBondQuoteMeta;
  data: TesouroBond[];
}

export interface FetchTesouroBondsParams {
  /** "compra" | "venda" — defaults to "compra" */
  type?: "compra" | "venda";
  /** Filter by bond name (case-insensitive partial match) */
  title?: string;
  /** Filter by specific date (YYYY-MM-DD) */
  date?: string;
  /** Only return records on or after this date (YYYY-MM-DD) */
  fromDate?: string;
  page?: number;
  limit?: number;
  sort?: string;
  /** When true, uses /quotes/history endpoint (all historical dates) */
  history?: boolean;
}

function getBaseUrl(): string {
  const url = process.env.TESOURO_DIRETO_API_URL;
  if (!url) {
    throw new Error(
      "TESOURO_DIRETO_API_URL is not set. Please configure this environment variable.",
    );
  }
  return url.replace(/\/$/, ""); // strip trailing slash
}

/**
 * Fetches a paginated list of bond quotes from the Tesouro Direto API.
 * By default returns compra (purchase) quotes.
 */
export async function fetchTesouroBonds(
  params: FetchTesouroBondsParams = {},
): Promise<TesouroBondQuotesResponse> {
  const baseUrl = getBaseUrl();
  const searchParams = new URLSearchParams();

  if (params.type) searchParams.set("type", params.type);
  if (params.title) searchParams.set("title", params.title);
  if (params.date) searchParams.set("date", params.date);
  if (params.fromDate) searchParams.set("fromDate", params.fromDate);
  if (params.page != null) searchParams.set("page", String(params.page));
  if (params.limit != null) searchParams.set("limit", String(params.limit));
  if (params.sort) searchParams.set("sort", params.sort);

  const endpoint = params.history ? "/quotes/history" : "/quotes";
  const qs = searchParams.toString();
  const url = `${baseUrl}${endpoint}${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    // Use next's cache: 'no-store' to always get fresh prices in server actions
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Tesouro Direto API error: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as TesouroBondQuotesResponse;
}

/**
 * Fetches a single bond quote by its ID from the Tesouro Direto API.
 * Returns null if not found (404).
 */
export async function fetchTesouroBondById(
  id: string,
): Promise<TesouroBondDetail | null> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/quotes/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(
      `Tesouro Direto API error: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as TesouroBondDetail;
}

/**
 * Checks whether the Tesouro Direto API is reachable and returns current status.
 */
export async function fetchTesouroStatus(): Promise<{
  available: boolean;
  isFromToday: boolean;
  status: "current" | "outdated" | "unavailable";
}> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/status`, { cache: "no-store" });

  if (!response.ok) {
    return { available: false, isFromToday: false, status: "unavailable" };
  }

  return response.json();
}
