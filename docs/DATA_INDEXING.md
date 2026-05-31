# SYNC_SPLIT — Data Indexing

> **Status:** Active · Updated 31 May 2026

---

## Overview

SYNC_SPLIT implements a **client-side event indexing system** that:

1. Polls the Soroban RPC for new contract events every 30 seconds
2. Normalizes and stores events in browser `localStorage`
3. Provides query APIs consumed by the `/metrics` dashboard
4. Persists across page reloads (up to 1,000 events)

---

## Implementation

### Module: `app/src/utils/indexer.js`

```
localStorage keys:
  syncsplit_event_index  — Array of normalized contract events (JSON)
  syncsplit_event_cursor — Pagination cursor for incremental polling
```

### Polling Architecture

```
Every 30 seconds (MetricsPage auto-refresh):
  1. Read cursor from localStorage
  2. Call fetchContractEvents(cursor, limit=50)
     → Soroban RPC getEvents({ filters: [{ contractIds: [CONTRACT_ID] }] })
  3. Normalize raw events → { id, ledger, ts, eventType, displayName, icon, color }
  4. Merge with existing index, deduplicate by event ID
  5. Trim to max 1,000 events
  6. Write back to localStorage
  7. Update cursor for next poll
```

### Event Schema

```json
{
  "id": "0000536271099904-0000000000",
  "ledger": 1234567,
  "ts": "2026-05-31T10:00:00.000Z",
  "pagingToken": "0000536271099904-0000000000",
  "eventType": "split_created",
  "displayName": "Split Created",
  "icon": "receipt_long",
  "color": "primary",
  "topic": ["split_created", 42],
  "value": { "total_amount": 150000000, "description": "Group Dinner" }
}
```

---

## Query API

```javascript
import {
  syncEvents,          // Fetch new events from RPC
  getIndexedEvents,    // All events, newest first
  getEventsByType,     // Filter by eventType string
  getDailyActiveUsers, // Unique wallets active today (from tx log)
  getWeeklyActivity,   // Per-day counts for last N days
  getUserActivity,     // All events for a specific wallet
  getMetricsSummary,   // Aggregate KPI object
  clearIndex,          // Reset index and cursor
} from './utils/indexer';

// Example: Get aggregate stats
const stats = getMetricsSummary();
// {
//   totalEvents: 47,
//   splitCreated: 30,
//   participantAdded: 12,
//   paymentMarked: 5,
//   splitsSettled: 2,
//   dau: 3
// }

// Example: Get weekly activity for chart
const activity = getWeeklyActivity(7);
// [
//   { date: '2026-05-25', count: 4, label: 'Sun' },
//   { date: '2026-05-26', count: 7, label: 'Mon' },
//   ...
//   { date: '2026-05-31', count: 12, label: 'Sun' }
// ]
```

---

## External Indexing: Stellar Expert

In addition to client-side indexing, all contract events are publicly indexed and queryable on **Stellar Expert**:

| Resource | URL |
|:---|:---|
| Contract Events | [stellar.expert/explorer/testnet/contract/CCEIBX7...](https://stellar.expert/explorer/testnet/contract/CCEIBX7TF3OY5CWE5GDGZPFNNTIRTLLHDYJ4NQG4YLWYTNURUZ4YGKGF) |
| Event Filter | Contract → Events tab → Filter by `split_created` / `payment_marked` |

---

## Storage Limits and TTL

| Parameter | Value | Rationale |
|:---|:---|:---|
| Max stored events | 1,000 | Prevents localStorage quota exhaustion |
| Max cursor age | No TTL | Cursor persists; re-index by clearing |
| Polling interval | 30 seconds | Balance between freshness and RPC rate limits |
| Deduplication | By event `id` | Soroban event IDs are globally unique |

---

## Future Improvements

For production scale, this client-side indexer would be replaced by:

- **Mercury** or **Subquery** — Stellar-native indexing services
- A backend event listener that stores indexed events in a database
- REST/GraphQL API for querying aggregated metrics
- Push notifications via WebSocket when new events arrive

---

*SYNC_SPLIT Protocol v1.1 · Data Indexing documentation*
