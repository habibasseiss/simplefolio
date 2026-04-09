/**
 * Tesouro Direto library — public re-exports.
 * Import from "@/lib/tesouro" rather than directly from the client module.
 */

export {
  fetchTesouroBondById,
  fetchTesouroBonds,
  fetchTesouroStatus,
} from "./client";

export type {
  FetchTesouroBondsParams,
  TesouroBond,
  TesouroBondDetail,
  TesouroBondQuoteMeta,
  TesouroBondQuotesResponse,
} from "./client";
