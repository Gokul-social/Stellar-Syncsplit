# SYNC_SPLIT — Monitoring & Observability

> **Status:** Active · Updated 31 May 2026  
> **Protocol:** SYNC_SPLIT v1.1 · Stellar Testnet

---

## Overview

SYNC_SPLIT uses a **multi-layer monitoring strategy** combining:

1. **Client-side structured logging** — every transaction, error, and user action is logged in the browser via `logger.js`  
2. **Client-side event indexer** — Soroban contract events are polled and indexed locally via `indexer.js`  
3. **Live Metrics Dashboard** — at `/metrics`, showing real-time KPIs from both data sources  
4. **External blockchain monitoring** — Stellar Expert provides on-chain transaction history for the contract  

---

## 1. Client-Side Logger (`utils/logger.js`)

### What Is Logged

| Log Type | Storage Key | Content |
|:---|:---|:---|
| Transactions | `syncsplit_tx_log` | wallet, txHash, action, details, stellar expert URL |
| Errors | `syncsplit_error_log` | wallet, action, errorType, message |
| User Actions | `syncsplit_action_log` | wallet_connect, wallet_funded, onboarding steps |

### Log Format

```json
{
  "id": "uuid",
  "timestamp": "2026-05-31T15:00:00.000Z",
  "wallet": "GABCD...WXYZ",
  "walletTruncated": "GABCD...WXYZ",
  "txHash": "abc123...",
  "action": "create_split",
  "details": { "splitId": 42, "totalAmountXlm": "15" },
  "stellarExpertUrl": "https://stellar.expert/explorer/testnet/tx/abc123..."
}
```

### Access Logs

Open the browser console on any SYNC_SPLIT page:

```javascript
// View all logs
window.SyncSplitLogger.exportAll()

// Download JSON log file
window.SyncSplitLogger.downloadLogs()

// View just transactions
window.SyncSplitLogger.getTransactions()

// Clear all logs
window.SyncSplitLogger.clearAll()
```

---

## 2. Event Indexer (`utils/indexer.js`)

The indexer polls Soroban RPC every 30 seconds for new contract events and stores them in localStorage at key `syncsplit_event_index`.

### Indexed Event Types

| Event | Contract Trigger | Stored As |
|:---|:---|:---|
| `split_created` | `create_split()` called | `{ eventType, ledger, ts, value }` |
| `participant_added` | `add_participant()` called | `{ eventType, ledger, ts, value }` |
| `payment_marked` | `mark_paid()` called | `{ eventType, ledger, ts, value }` |
| `split_settled` | All participants paid | `{ eventType, ledger, ts, value }` |

### Querying the Index

```javascript
import { getIndexedEvents, getMetricsSummary, getDailyActiveUsers } from './utils/indexer';

getIndexedEvents()       // all events, newest first
getMetricsSummary()      // { totalEvents, splitCreated, paymentMarked, ... }
getDailyActiveUsers()    // unique wallets active today
getWeeklyActivity(7)     // per-day counts for last 7 days
```

---

## 3. Metrics Dashboard (`/metrics`)

Live dashboard accessible at [`/metrics`](https://app-nine-gray-18.vercel.app/metrics) showing:

- **Total Splits** — read from `get_split_count()` via Soroban RPC
- **DAU** — daily active users from transaction log
- **Total Events** — sum of all indexed contract events
- **Error Rate** — ratio of errors to successful transactions
- **Weekly Activity** — bar chart of events per day (last 7 days)
- **Event Type Breakdown** — split_created vs payment_marked vs settled
- **Transaction Log** — most recent 6 user transactions
- **Monitoring Status** — live health check of RPC + Horizon + indexer

Auto-refreshes every **30 seconds**.

---

## 4. External Monitoring — Stellar Expert

The Soroban contract is publicly verifiable and monitorable on Stellar Expert:

| Resource | URL |
|:---|:---|
| **Contract page** | [stellar.expert/explorer/testnet/contract/CCEIBX7...](https://stellar.expert/explorer/testnet/contract/CCEIBX7TF3OY5CWE5GDGZPFNNTIRTLLHDYJ4NQG4YLWYTNURUZ4YGKGF) |
| **Contract events** | View all emitted events in the Events tab |
| **Transaction history** | Full ledger-confirmed TX list on the Transactions tab |
| **Invocation stats** | Number of invocations, gas consumed, etc. |

Stellar Expert provides:
- Real-time transaction confirmations
- Event history with searchable filters
- Account activity for any wallet interacting with the contract
- Contract state inspection

---

## 5. Alert Strategy

Since this is a testnet dApp, production-style alerting (PagerDuty, Datadog, etc.) is not required. However, the following monitoring indicators are tracked:

| Indicator | Threshold | Action |
|:---|:---|:---|
| Error rate > 10% | 3+ consecutive errors | Review error log for RPC or contract issues |
| Event sync failure | >5 min without new poll success | Check Soroban RPC health |
| Balance < 100 XLM | Sponsor account falls below threshold | Re-fund via Friendbot |
| Contract not responding | `get_split_count` fails | Verify contract ID in `.env` |

---

## 6. Monitoring Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  SYNC_SPLIT Browser                     │
│                                                         │
│  User Actions → logger.js → localStorage (tx_log)       │
│  Events Poll → indexer.js → localStorage (event_index)  │
│                      ↓                                  │
│           MetricsPage (/metrics)                        │
│           reads both, renders live dashboard            │
└─────────────────────────────────────────────────────────┘
         ↕ Soroban RPC polls                ↕
┌─────────────────────┐       ┌────────────────────────┐
│  Soroban RPC Server │       │  Stellar Expert (Web)  │
│  getEvents() API    │       │  Contract Monitor      │
└─────────────────────┘       └────────────────────────┘
         ↕
┌─────────────────────────────────────────────────────────┐
│           Stellar Core (Testnet Ledger)                 │
│           SYNC_SPLIT Contract State                     │
└─────────────────────────────────────────────────────────┘
```

---

*SYNC_SPLIT Protocol v1.1 · Monitoring documentation*
