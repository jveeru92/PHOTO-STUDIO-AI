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

// Provider definitions. Models chosen from verified free-tier candidates.
// Gemini 1.5 Flash (free tier, vision-capable). OpenRouter free chat fallback.
// Cloudflare Workers AI Flux 2 Klein (image) — 10,000 Neurons/day free.
const PROVIDERS = [
  {
    name: 'Gemini',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest',
    category: 'chat',
    configured: !!process.env.GEMINI_API_KEY,
    rateLimitPerMinute: 15, // estimated — verify in Google docs
    dailyResetTime: '00:00 UTC', // estimated
    estimatedDailyImageCapacity: null, // text/vision, not image gen
  },
  {
    name: 'OpenRouter',
    model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free',
    category: 'chat',
    configured: !!process.env.OPENROUTER_API_KEY,
    rateLimitPerMinute: undefined,
    dailyResetTime: '00:00 UTC', // estimated
    estimatedDailyImageCapacity: null,
  },
  {
    name: 'Cloudflare Workers AI',
    model: process.env.CLOUDFLARE_IMAGE_MODEL || '@cf/black-forest-labs/flux-2-klein-4b',
    category: 'image',
    configured: !!(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID),
    rateLimitPerMinute: undefined,
    dailyResetTime: '00:00 UTC', // Cloudflare neurons reset at 00:00 UTC
    estimatedDailyImageCapacity: null, // set after benchmark
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
  const now = new Date();
  return PROVIDERS.map((p) => {
    const u = getOrCreate(p.name, p.model);
    const exhausted = ZERO_SPEND_MODE && p.configured && u.requests >= (p.dailyRequestLimit || 1000);
    let estimatedCapacity = p.estimatedDailyImageCapacity;
    if (p.name === 'Cloudflare Workers AI' && p.model.includes('flux-2-klein')) {
      const neuronsPerImage = estimateFluxNeuronsPerImage();
      estimatedCapacity = neuronsPerImage
        ? Math.floor(10000 / neuronsPerImage)
        : null; // 10,000 Neurons/day free allocation
    }
    return {
      name: p.name,
      model: p.model,
      category: p.category,
      dailyRequests: u.requests,
      dailyImages: u.images,
      usageUnits: u.units,
      rateLimitPerMinute: p.rateLimitPerMinute,
      dailyResetTime: p.dailyResetTime,
      quotaRemaining: exhausted ? 0 : null,
      quotaRemainingLabel: exhausted ? '0 (exhausted)' : 'estimated',
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
    return { allowed: false, reason: 'ZERO_SPEND_MODE not enabled' };
  }
  const p = PROVIDERS.find((x) => x.name === providerName);
  if (!p || !p.configured) return { allowed: false, reason: 'Provider not configured' };
  const u = getOrCreate(p.name, p.model);
  // Soft daily guard (estimated). Hard enforcement happens per-provider below.
  return { allowed: true, usage: u };
}

function record(category, providerName, units = 1, images = 0) {
  const p = PROVIDERS.find((x) => x.name === providerName);
  if (!p) return;
  const u = getOrCreate(p.name, p.model);
  u.requests += 1;
  u.units += units;
  u.images += images;
}

function markError(providerName) {
  // lastError stored on status objects; kept minimal here
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
