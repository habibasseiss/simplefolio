/**
 * BCB PTAX OData API client.
 *
 * All functions return the official **Fechamento** (closing-session) rate for the
 * requested date(s). The API returns an empty value array for weekends and
 * Brazilian holidays — callers receive `null` in those cases.
 *
 * Date format required by the API: 'MM-DD-YYYY' (with literal single quotes in
 * the query string).
 *
 * Base URL: https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata
 */

const BASE = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata";

export interface PtaxRate {
  buy: number;
  sell: number;
}

/** Format a JS Date as 'MM-DD-YYYY' (with the surrounding single quotes the API needs). */
function fmtDate(d: Date): string {
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `'${mm}-${dd}-${yyyy}'`;
}

/** Pick only the Fechamento bulletin from a list of raw API rows. */
function pickFechamento(
  rows: Array<{
    cotacaoCompra: number;
    cotacaoVenda: number;
    tipoBoletim?: string;
  }>,
): PtaxRate | null {
  const closing = rows.find((r) => r.tipoBoletim === "Fechamento");
  if (!closing) return null;
  return { buy: closing.cotacaoCompra, sell: closing.cotacaoVenda };
}

// ---------------------------------------------------------------------------
// USD — dedicated endpoint (CotacaoDolar*)
// ---------------------------------------------------------------------------

/**
 * Fetches the official PTAX closing rate for USD/BRL on a given date.
 * Returns null on weekends or Brazilian holidays.
 */
export async function getPtaxUsdDay(date: Date): Promise<PtaxRate | null> {
  const url =
    `${BASE}/CotacaoDolarDia(dataCotacao=@dataCotacao)` +
    `?@dataCotacao=${fmtDate(date)}&$format=json`;

  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`PTAX USD day fetch failed: ${res.status}`);

  const json = (await res.json()) as {
    value: Array<{
      cotacaoCompra: number;
      cotacaoVenda: number;
      dataHoraCotacao: string;
    }>;
  };

  // The CotacaoDolar endpoint returns at most one row per date (the closing)
  const row = json.value[0];
  if (!row) return null;
  return { buy: row.cotacaoCompra, sell: row.cotacaoVenda };
}

/**
 * Fetches PTAX closing rates for USD/BRL over a date range.
 * Returns a map keyed by ISO date string (YYYY-MM-DD).
 */
export async function getPtaxUsdPeriod(
  from: Date,
  to: Date,
): Promise<Map<string, PtaxRate>> {
  const url =
    `${BASE}/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)` +
    `?@dataInicial=${fmtDate(from)}&@dataFinalCotacao=${fmtDate(to)}&$format=json`;

  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`PTAX USD period fetch failed: ${res.status}`);

  const json = (await res.json()) as {
    value: Array<{
      cotacaoCompra: number;
      cotacaoVenda: number;
      dataHoraCotacao: string;
    }>;
  };

  const map = new Map<string, PtaxRate>();
  for (const row of json.value) {
    // dataHoraCotacao looks like "2024-03-15 13:07:42.923"
    const isoDate = row.dataHoraCotacao.slice(0, 10);
    // Each date has exactly one row in this endpoint (closing)
    map.set(isoDate, { buy: row.cotacaoCompra, sell: row.cotacaoVenda });
  }
  return map;
}

// ---------------------------------------------------------------------------
// Other currencies — generic endpoint (CotacaoMoeda*)
// ---------------------------------------------------------------------------

/**
 * Fetches the official PTAX closing rate for `currency`/BRL on a given date.
 * `currency` must be a BCB currency code (e.g. "EUR", "GBP").
 * Returns null on weekends, holidays, or when the currency has no bulletin.
 */
export async function getPtaxCurrencyDay(
  currency: string,
  date: Date,
): Promise<PtaxRate | null> {
  const url =
    `${BASE}/CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)` +
    `?@moeda='${currency}'&@dataCotacao=${fmtDate(date)}&$format=json`;

  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok)
    throw new Error(
      `PTAX ${currency} day fetch failed: ${res.status}`,
    );

  const json = (await res.json()) as {
    value: Array<{
      cotacaoCompra: number;
      cotacaoVenda: number;
      dataHoraCotacao: string;
      tipoBoletim: string;
    }>;
  };

  return pickFechamento(json.value);
}

/**
 * Fetches PTAX closing rates for `currency`/BRL over a date range.
 * Returns a map keyed by ISO date string (YYYY-MM-DD).
 */
export async function getPtaxCurrencyPeriod(
  currency: string,
  from: Date,
  to: Date,
): Promise<Map<string, PtaxRate>> {
  const url =
    `${BASE}/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)` +
    `?@moeda='${currency}'&@dataInicial=${fmtDate(from)}&@dataFinalCotacao=${fmtDate(to)}&$format=json`;

  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok)
    throw new Error(
      `PTAX ${currency} period fetch failed: ${res.status}`,
    );

  const json = (await res.json()) as {
    value: Array<{
      cotacaoCompra: number;
      cotacaoVenda: number;
      dataHoraCotacao: string;
      tipoBoletim: string;
    }>;
  };

  const map = new Map<string, PtaxRate>();
  for (const row of json.value) {
    if (row.tipoBoletim !== "Fechamento") continue;
    const isoDate = row.dataHoraCotacao.slice(0, 10);
    map.set(isoDate, { buy: row.cotacaoCompra, sell: row.cotacaoVenda });
  }
  return map;
}

// ---------------------------------------------------------------------------
// Unified convenience helpers
// ---------------------------------------------------------------------------

/**
 * Fetches a single PTAX closing rate for any currency vs. BRL.
 * Routes to the correct BCB endpoint automatically.
 */
export async function getPtaxRate(
  currency: string,
  date: Date,
): Promise<PtaxRate | null> {
  if (currency === "USD") return getPtaxUsdDay(date);
  return getPtaxCurrencyDay(currency, date);
}

/**
 * Fetches PTAX closing rates for any currency vs. BRL over a period.
 * Routes to the correct BCB endpoint automatically.
 */
export async function getPtaxRatePeriod(
  currency: string,
  from: Date,
  to: Date,
): Promise<Map<string, PtaxRate>> {
  if (currency === "USD") return getPtaxUsdPeriod(from, to);
  return getPtaxCurrencyPeriod(currency, from, to);
}
