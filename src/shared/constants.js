// Browser API compatibility shim (Firefox uses browser.*, Chrome uses chrome.*)
console.log('[LinkedGuard] 1/11 constants.js');
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const STORAGE_KEY = 'linkedguard_config';
const LOG_MAX_SIZE = 50;
const ARCHIVE_RATE_LIMIT = 5; // max archives per minute
const OBSERVER_DEBOUNCE_MS = 16;
const WAIT_FOR_ELEMENT_TIMEOUT = 1500;

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
