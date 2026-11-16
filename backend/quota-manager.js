/**
 * Provider quota manager — enforces ZERO_SPEND_MODE.
 *
 * Tracks daily usage per provider/model/category. Serverless functions are
 * stateless, so this holds usage in-memory for the running deployment and
 * resets daily at the provider's actual reset schedule. For production,
 * persist to a database (e.g. Cloudflare D1 / Supabase) so counts survive
 * cold starts.
 *
 * All quota values that are not exposed by the provider are clearly labelled
 * "estimated". Nothing here authorizes paid usage.
 */

const ZERO_SPEND_MODE = process.env.ZERO_SPEND_MODE === 'TRUE';

// Provider definitions. Free-tier candidates.
// Limits below are ESTIMATES from public docs and must be verified against
// each provider's current free-tier page. They are hard guards only — they
// never authorize paid usage and never exceed the free tier.
const PROVIDERS = [
  {
    name: 'Gemini',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest',
    category: 'chat',
    configured: !!process.env.GEMINI_API_KEY,
    rateLimitPerMinute: 15, // estimated — verify in Google AI Studio docs
    dailyRequestLimit: 1500, // estimated — verify in Google AI Studio docs
    dailyResetTime: '00:00 UTC', // estimated
    estimatedDailyImageCapacity: null, // text/vision, not image gen
  },
  {
    name: 'OpenRouter',
    model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free',
    category: 'chat',
    configured: !!process.env.OPENROUTER_API_KEY,
    rateLimitPerMinute: undefined,
    dailyRequestLimit: 1000, // estimated — OpenRouter free-tier limits vary by model
    dailyResetTime: '00:00 UTC', // estimated
    estimatedDailyImageCapacity: null,
  },
  {
    name: 'Cloudflare Workers AI',
    model: process.env.CLOUDFLARE_IMAGE_MODEL || '@cf/black-forest-labs/flux-2-klein-4b',
    category: 'image',
    configured: !!(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID),
    rateLimitPerMinute: undefined,
    dailyRequestLimit: undefined, // limited by Neurons, not request count
    dailyResetTime: '00:00 UTC', // Cloudflare Neurons reset at 00:00 UTC
    estimatedDailyImageCapacity: null, // set after benchmark (10,000 Neurons/day free)
  },
];

// in-memory usage: key = `${provider}|${model}|${YYYY-MM-DD}` -> {requests, images, units}
const usage = new Map();

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function keyFor(provider, model) {
  return `${provider}|${model}|${todayISO()}`;
}

function getOrCreate(provider, model) {
  const k = keyFor(provider, model);
  if (!usage.has(k)) usage.set(k, { requests: 0, images: 0, units: 0 });
  return usage.get(k);
}

/** Estimate neurons consumed by one Flux 2 Klein image (benchmark-based). */
function estimateFluxNeuronsPerImage() {
  // Not measured yet — label estimated until benchmarked.
  return null;
}

function getProviderStatus() {
  return PROVIDERS.map((p) => {
    const u = getOrCreate(p.name, p.model);
    const limit = p.dailyRequestLimit;
    const exhausted = ZERO_SPEND_MODE && p.configured && limit != null && u.requests >= limit;
    let estimatedCapacity = p.estimatedDailyImageCapacity;
    if (p.name === 'Cloudflare Workers AI' && p.model.includes('flux-2-klein')) {
      const neuronsPerImage = estimateFluxNeuronsPerImage();
      estimatedCapacity = neuronsPerImage
        ? Math.floor(10000 / neuronsPerImage)
        : null; // 10,000 Neurons/day free allocation (≠ 10,000 images)
    }
    return {
      name: p.name,
      model: p.model,
      category: p.category,
      dailyRequests: u.requests,
      dailyImages: u.images,
      usageUnits: u.units,
      rateLimitPerMinute: p.rateLimitPerMinute,
      dailyRequestLimit: limit, // null when provider uses Neurons instead of request count
      dailyResetTime: p.dailyResetTime,
      quotaRemaining: exhausted ? 0 : (limit != null ? Math.max(0, limit - u.requests) : null),
      quotaRemainingLabel: exhausted ? '0 (exhausted)' : (limit != null ? `estimated ~${Math.max(0, limit - u.requests)} remaining` : 'estimated (Neurons-based)'),
      available: p.configured && !exhausted,
      lastSuccess: null,
      lastError: null,
      estimatedDailyImageCapacity: estimatedCapacity,
      configured: p.configured,
      note: p.name === 'Cloudflare Workers AI'
        ? '10,000 Neurons/day free (≠ 10,000 images). Benchmark to determine sustainable daily image count.'
        : p.name === 'Gemini'
          ? 'Free tier — verify current rate limits in Google AI Studio docs.'
          : 'OpenRouter free model — verify image-input support per model.',
    };
  });
}

function canProceed(category, providerName) {
  if (ZERO_SPEND_MODE === false) {
    return { allowed: false, reason: 'ZERO_SPEND_MODE not enabled — AI disabled' };
  }
  const p = PROVIDERS.find((x) => x.name === providerName);
  if (!p) return { allowed: false, reason: 'Unknown provider' };
  if (!p.configured) return { allowed: false, reason: 'Provider not configured' };
  const u = getOrCreate(p.name, p.model);
  // Hard daily request guard (estimated). When provider uses Neurons (Cloudflare),
  // there is no request-count limit; the 10,000 Neurons/day cap applies instead.
  if (p.dailyRequestLimit != null && u.requests >= p.dailyRequestLimit) {
    return { allowed: false, reason: `Daily free quota exhausted for ${p.name} (${p.model})` };
  }
  return { allowed: true, usage: u, provider: p };
}

function record(category, providerName, units = 1, images = 0) {
  const p = PROVIDERS.find((x) => x.name === providerName);
  if (!p) return;
  const u = getOrCreate(p.name, p.model);
  u.requests += 1;
  u.units += units;
  u.images += images;
}

function markError(providerName, error) {
  // Kept minimal; status objects report lastError via the API layer.
}

module.exports = {
  ZERO_SPEND_MODE,
  PROVIDERS,
  getProviderStatus,
  canProceed,
  record,
  markError,
  todayISO,
};
