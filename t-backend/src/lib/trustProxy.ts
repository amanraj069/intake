/**
 * Reads TRUST_PROXY as the number of reverse proxies in front of the server.
 * Behind a proxy, every request appears to come from the proxy's IP unless
 * Express is told to read X-Forwarded-For, which would make all users share
 * one rate limit. Trusting it blindly would instead let clients spoof their IP,
 * so the hop count must be set explicitly and defaults to 0 (no proxy).
 */
export function trustedProxyHops(): number {
  const rawValue = process.env.TRUST_PROXY?.trim();
  if (!rawValue) return 0;

  const hops = Number(rawValue);
  if (!Number.isInteger(hops) || hops < 0) {
    throw new Error(`TRUST_PROXY must be a non-negative whole number, received "${rawValue}"`);
  }
  return hops;
}
