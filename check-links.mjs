import fs from "node:fs/promises";

const INPUT = "data.json";
const CONCURRENCY = 8;
const TIMEOUT_MS = 12000;
const MAX_FAILS = 3;
const RETRYABLE_STATUS = new Set([0, 403, 405, 408, 425, 429, 500, 501, 502, 503, 504]);
const SOFT_RETRY_STATUS = new Set([0, 408, 425, 429, 500, 502, 503, 504]);

const raw = await fs.readFile(INPUT, "utf8");
const data = JSON.parse(raw);

function flatten(data) {
  return data.flatMap(section => section.items.map(item => ({ section, item })));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { controller, clear: () => clearTimeout(id) };
}

async function doFetch(url, method) {
  const t = withTimeout(TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: t.controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 FMHY-TV-Checker",
        "accept": "*/*"
      }
    });

    return {
      ok: res.ok,
      status: res.status,
      finalUrl: res.url || url,
      method,
      error: ""
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      method,
      error: err?.name === "AbortError" ? "timeout" : String(err?.message || err)
    };
  } finally {
    t.clear();
  }
}

async function probe(url) {
  const started = Date.now();

  let result = await doFetch(url, "HEAD");

  if (!result.ok && RETRYABLE_STATUS.has(result.status)) {
    result = await doFetch(url, "GET");
  }

  if (!result.ok && SOFT_RETRY_STATUS.has(result.status)) {
    await sleep(1500);
    const retryMethod = result.method === "HEAD" ? "GET" : result.method;
    const retry = await doFetch(url, retryMethod);
    retry.retried = true;
    result = retry;
  }

  return {
    ...result,
    durationMs: Date.now() - started
  };
}

async function runPool(entries, limit, worker) {
  const out = [];
  let i = 0;

  async function next() {
    while (i < entries.length) {
      const idx = i++;
      out[idx] = await worker(entries[idx], idx);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, entries.length) }, next));
  return out;
}

function updateHealth(item, result) {
  const prev = item.health || {};
  const now = new Date().toISOString();

  const health = {
    ok: result.ok,
    status: result.status,
    method: result.method,
    finalUrl: result.finalUrl,
    checkedAt: now,
    durationMs: result.durationMs,
    error: result.error || "",
    retried: !!result.retried,
    consecutiveFails: prev.consecutiveFails || 0,
    totalFails: prev.totalFails || 0,
    totalPasses: prev.totalPasses || 0,
    state: prev.state || "active",
    disabledAt: prev.disabledAt || "",
    reenabledAt: prev.reenabledAt || "",
    failReason: prev.failReason || ""
  };

  if (result.ok) {
    health.totalPasses += 1;
    health.consecutiveFails = 0;
    health.state = "active";
    health.failReason = "";
    if (prev.state === "disabled") {
      health.reenabledAt = now;
    }
  } else {
    health.totalFails += 1;
    health.consecutiveFails += 1;
    health.failReason = result.error || `HTTP ${result.status || 0}`;

    if (health.consecutiveFails >= MAX_FAILS) {
      health.state = "disabled";
      if (!prev.disabledAt) {
        health.disabledAt = now;
      }
    }
  }

  item.health = health;
}

const entries = flatten(data);

await runPool(entries, CONCURRENCY, async ({ item }) => {
  const result = await probe(item.url);
  updateHealth(item, result);
});

await fs.writeFile(INPUT, JSON.stringify(data, null, 2));

const totals = entries.reduce(
  (acc, { item }) => {
    const h = item.health || {};
    if (h.state === "disabled") acc.disabled++;
    else acc.active++;
    if (h.ok) acc.ok++;
    else acc.bad++;
    return acc;
  },
  { active: 0, disabled: 0, ok: 0, bad: 0 }
);

console.log(`Checked ${entries.length} links`);
console.log(`Active: ${totals.active}`);
console.log(`Disabled: ${totals.disabled}`);
console.log(`OK: ${totals.ok}`);
console.log(`Problematic: ${totals.bad}`);
