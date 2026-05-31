/**
 * indexer.js
 *
 * Client-side event indexer for SYNC_SPLIT.
 * Polls the Soroban RPC for contract events and stores them
 * locally in localStorage, keyed by ledger sequence.
 *
 * Provides queryable APIs used by the MetricsPage:
 *   - getIndexedEvents()        — all indexed events
 *   - getEventsByType(type)     — filtered by event type
 *   - getDailyActiveUsers()     — unique wallets that transacted today
 *   - getWeeklyActivity()       — per-day event counts for the last 7 days
 *   - getUserActivity(wallet)   — all events for a specific wallet
 */

import { fetchContractEvents } from './contractClient';

const INDEX_KEY      = 'syncsplit_event_index';
const CURSOR_KEY     = 'syncsplit_event_cursor';
const MAX_EVENTS     = 1000; // max events stored locally

// ─── Internal Storage ─────────────────────────────────────────────────────────

function readIndex() {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeIndex(events) {
  try {
    // Deduplicate by event ID before writing
    const unique = Array.from(
      new Map(events.map(e => [e.id, e])).values()
    );
    // Cap at MAX_EVENTS (keep newest)
    const trimmed = unique.slice(-MAX_EVENTS);
    localStorage.setItem(INDEX_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return events;
  }
}

function readCursor() {
  try {
    return localStorage.getItem(CURSOR_KEY) || null;
  } catch {
    return null;
  }
}

function writeCursor(cursor) {
  try {
    if (cursor) localStorage.setItem(CURSOR_KEY, cursor);
  } catch {
    // ignore
  }
}

// ─── Internal: Normalize Event ───────────────────────────────────────────────

function normalizeEvent(raw) {
  const topic = raw.topic || [];
  // topic[0] is typically the event type string from the contract
  const eventType = typeof topic[0] === 'string' ? topic[0] : 'unknown';

  // Map contract event types to human-readable labels
  const typeMap = {
    split_created:       { label: 'Split Created',        icon: 'receipt_long',    color: 'primary' },
    participant_added:   { label: 'Participant Added',     icon: 'person_add',      color: 'secondary' },
    payment_marked:      { label: 'Payment Marked',        icon: 'check_circle',    color: 'tertiary' },
    split_settled:       { label: 'Split Settled',         icon: 'done_all',        color: 'tertiary' },
    unknown:             { label: 'Contract Event',        icon: 'bolt',            color: 'primary' },
  };

  const meta = typeMap[eventType] || typeMap.unknown;

  return {
    id:           raw.id,
    ledger:       raw.ledger,
    ts:           raw.timestamp || new Date().toISOString(),
    pagingToken:  raw.pagingToken,
    eventType,
    displayName:  meta.label,
    icon:         meta.icon,
    color:        meta.color,
    topic,
    value:        raw.value,
  };
}

// ─── Core: Sync New Events ────────────────────────────────────────────────────

/**
 * Fetch new events from Soroban RPC and merge them into the local index.
 * Safe to call repeatedly — uses cursor pagination to avoid re-fetching.
 *
 * @returns {Promise<number>} Count of new events added
 */
export async function syncEvents() {
  try {
    const cursor    = readCursor();
    const existing  = readIndex();

    const { events: raw, cursor: newCursor } = await fetchContractEvents(cursor, 50);

    if (raw.length === 0) return 0;

    const normalized = raw.map(normalizeEvent);
    const merged     = writeIndex([...existing, ...normalized]);

    writeCursor(newCursor);
    return normalized.length;
  } catch (err) {
    console.warn('[indexer] syncEvents failed:', err.message);
    return 0;
  }
}

// ─── Query API ────────────────────────────────────────────────────────────────

/**
 * Returns all indexed events (newest first).
 */
export function getIndexedEvents() {
  return readIndex().slice().reverse();
}

/**
 * Returns events filtered by type.
 * @param {string} type — e.g. 'split_created', 'payment_marked'
 */
export function getEventsByType(type) {
  return readIndex().filter(e => e.eventType === type);
}

/**
 * Returns today's active wallets (based on transaction logs in localStorage).
 * Since Soroban events don't include wallet addresses directly,
 * we derive DAU from the logger's transaction log.
 *
 * @returns {string[]} Array of unique wallet prefixes
 */
export function getDailyActiveUsers() {
  try {
    const txLog = JSON.parse(localStorage.getItem('syncsplit_tx_log') || '[]');
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const todayTxs = txLog.filter(e =>
      e.timestamp && e.timestamp.startsWith(today)
    );
    const unique = [...new Set(todayTxs.map(e => e.wallet))].filter(Boolean);
    return unique;
  } catch {
    return [];
  }
}

/**
 * Returns per-day event counts for the last N days.
 * Used for the activity bar chart.
 *
 * @param {number} days — number of days to include (default: 7)
 * @returns {Array<{ date: string, count: number, label: string }>}
 */
export function getWeeklyActivity(days = 7) {
  const events = readIndex();
  const result = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label   = d.toLocaleDateString('en-US', { weekday: 'short' });

    const count = events.filter(e => e.ts && e.ts.startsWith(dateStr)).length;
    result.push({ date: dateStr, count, label });
  }

  return result;
}

/**
 * Returns all transaction logs for a specific wallet.
 * @param {string} wallet — full public key
 * @returns {Array<object>}
 */
export function getUserActivity(wallet) {
  try {
    const txLog = JSON.parse(localStorage.getItem('syncsplit_tx_log') || '[]');
    return txLog.filter(e => e.wallet === wallet || e.wallet?.startsWith(wallet.slice(0, 6)));
  } catch {
    return [];
  }
}

/**
 * Returns aggregate stats for the metrics dashboard.
 * @returns {object} { totalEvents, splitCreated, paymentMarked, splitsSettled, dau }
 */
export function getMetricsSummary() {
  const events = readIndex();
  return {
    totalEvents:    events.length,
    splitCreated:   events.filter(e => e.eventType === 'split_created').length,
    participantAdded: events.filter(e => e.eventType === 'participant_added').length,
    paymentMarked:  events.filter(e => e.eventType === 'payment_marked').length,
    splitsSettled:  events.filter(e => e.eventType === 'split_settled').length,
    dau:            getDailyActiveUsers().length,
  };
}

/**
 * Clear all indexed events and cursor (useful for re-indexing from scratch).
 */
export function clearIndex() {
  try {
    localStorage.removeItem(INDEX_KEY);
    localStorage.removeItem(CURSOR_KEY);
  } catch {
    // ignore
  }
}
