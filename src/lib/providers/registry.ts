import type { DataProvider, ProviderId } from "./types";

const _registry = new Map<ProviderId, DataProvider>();

/** Register a provider. Called once at module-load time from each provider's file. */
export function registerProvider(provider: DataProvider): void {
  _registry.set(provider.id, provider);
}

/** Get a provider by its ID. Returns undefined if no provider is registered for the given ID. */
export function getProvider(id: ProviderId): DataProvider | undefined {
  return _registry.get(id);
}

/** Returns all registered providers. */
export function getAllProviders(): DataProvider[] {
  return Array.from(_registry.values());
}

/**
 * Returns true if there is a registered provider for the given `instrumentProvider` value.
 * Useful for validation when creating transactions.
 */
export function isKnownProvider(id: ProviderId): boolean {
  return _registry.has(id);
}
