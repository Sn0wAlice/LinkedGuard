console.log('[LinkedGuard] 3/11 storage.js');

async function storageGet(key) {
  try {
    return await browserAPI.storage.sync.get(key);
  } catch (_) {
    return await browserAPI.storage.local.get(key);
  }
}

async function storageSet(data) {
  try {
    await browserAPI.storage.sync.set(data);
  } catch (_) {
    await browserAPI.storage.local.set(data);
  }
}

async function getConfig() {
  const result = await storageGet(STORAGE_KEY);
  return result[STORAGE_KEY] || DEFAULT_CONFIG;
}

async function setConfig(patch) {
  const current = await getConfig();
  const updated = deepMerge(current, patch);
  await storageSet({ [STORAGE_KEY]: updated });
  return updated;
}

async function addLogEntry(entry) {
  const config = await getConfig();
  const log = [entry, ...config.log].slice(0, LOG_MAX_SIZE);
  await storageSet({ [STORAGE_KEY]: { ...config, log } });
}

async function incrementStat(action) {
  const config = await getConfig();
  const stats = { ...config.stats, lastAction: new Date().toISOString() };
  if (action === 'archive') stats.totalArchived = (stats.totalArchived || 0) + 1;
  if (action === 'flag') stats.totalFlagged = (stats.totalFlagged || 0) + 1;
  await storageSet({ [STORAGE_KEY]: { ...config, stats } });
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      out[key] = deepMerge(target[key], source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}
