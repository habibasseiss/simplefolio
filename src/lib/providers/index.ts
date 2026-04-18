/**
 * Data provider registry — public re-exports.
 *
 * Import from "@/lib/providers" to get access to the registry functions
 * and ensure all built-in providers (Yahoo, Tesouro) are registered.
 *
 * Importing this module has the side effect of registering all providers.
 */

export type { DataProvider, ProviderId } from "./types";
export { getAllProviders, getProvider, isKnownProvider, registerProvider } from "./registry";

// Side-effect imports — ensure providers self-register
import "./tesouro.provider";
