import type { Request, Response, NextFunction } from "express";
import { getSupabaseClient } from "../../db/client.js";
import { logger } from "../../utils/logger.js";
import type { ApiKey, ApiTier } from "../../types/index.js";

const TIER_LIMITS: Record<ApiTier, { requestsPerDay: number; maxPageSize: number }> = {
  free: { requestsPerDay: 50, maxPageSize: 10 },
  basic: { requestsPerDay: 500, maxPageSize: 50 },
  pro: { requestsPerDay: 5000, maxPageSize: 100 },
  enterprise: { requestsPerDay: 50000, maxPageSize: 500 },
};

export interface AuthenticatedRequest extends Request {
  apiKey?: ApiKey;
  tierLimits?: { requestsPerDay: number; maxPageSize: number };
}

export async function authenticateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const key = req.headers["x-api-key"] as string | undefined;

  if (!key) {
    res.status(401).json({ error: "Missing API key. Pass it via X-API-Key header." });
    return;
  }

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("api_keys")
      .select("*")
      .eq("key", key)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      res.status(401).json({ error: "Invalid or inactive API key." });
      return;
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      res.status(401).json({ error: "API key has expired." });
      return;
    }

    const tier = data.tier as ApiTier;
    const limits = TIER_LIMITS[tier];

    await client
      .from("api_keys")
      .update({ request_count: data.request_count + 1, last_used_at: new Date().toISOString() })
      .eq("id", data.id);

    req.apiKey = data as unknown as ApiKey;
    req.tierLimits = limits;
    next();
  } catch (err) {
    logger.error("Auth middleware error", { error: String(err) });
    res.status(500).json({ error: "Authentication service unavailable." });
  }
}

export function requireTier(...allowedTiers: ApiTier[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }
    if (!allowedTiers.includes(req.apiKey.tier)) {
      res.status(403).json({
        error: `This endpoint requires one of: ${allowedTiers.join(", ")}. Your tier: ${req.apiKey.tier}`,
      });
      return;
    }
    next();
  };
}
