# SYNC_SPLIT — Architecture Document

> **Version**: 1.0  
> **Network**: Stellar Testnet  
> **Contract**: `CCEIBX7TF3OY5CWE5GDGZPFNNTIRTLLHDYJ4NQG4YLWYTNURUZ4YGKGF`  
> **Live App**: [app-nine-gray-18.vercel.app](https://app-nine-gray-18.vercel.app)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Component Breakdown](#3-component-breakdown)
4. [Smart Contract Architecture](#4-smart-contract-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Data Flow](#6-data-flow)
7. [Security Model](#7-security-model)
8. [Deployment Topology](#8-deployment-topology)
9. [State Management](#9-state-management)
10. [Error Handling Strategy](#10-error-handling-strategy)

---

## 1. System Overview

SYNC_SPLIT is a **full-stack decentralized application (dApp)** built on the Stellar blockchain. It enables groups to split bills on-chain using Soroban smart contracts — every split, participant, and payment is recorded immutably on-chain.

### Design Principles

| Principle | Implementation |
|---|---|
| **Non-custodial** | Private keys never leave the user's wallet extension |
| **Permissionless** | Any Stellar account can create or join a split |
| **Transparent** | All state is publicly readable on-chain via Soroban RPC |
| **Minimal Trust** | Smart contract enforces all business logic; frontend is display-only |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER'S BROWSER                             │
│                                                                 │
│  ┌──────────────────────────────────────┐  ┌────────────────┐  │
│  │     React Frontend (Vite)            │  │ Wallet Plugin  │  │
│  │  • Glassmorphic UI (Tailwind v4)     │◄►│ (Freighter /   │  │
│  │  • Motion animations                │  │  xBull /       │  │
│  │  • SPA routing (React Router v7)    │  │  Albedo)       │  │
│  └──────────────────┬───────────────────┘  └───────┬────────┘  │
│                     │                              │            │
│  ┌──────────────────▼───────────────────────────────▼────────┐  │
│  │              StellarWalletsKit (Unified API)               │  │
│  │  • Wallet detection & connection                          │  │
│  │  • Transaction signing delegation                        │  │
│  └─────────────────────────────┬─────────────────────────────┘  │
└───────────────────────────────┼─────────────────────────────────┘
                                │ HTTPS/JSON-RPC
        ┌───────────────────────▼──────────────────────────┐
        │              Stellar Testnet Infrastructure       │
        │                                                   │
        │  ┌──────────────────┐   ┌─────────────────────┐  │
        │  │  Soroban RPC     │   │  Horizon REST API   │  │
        │  │  (contract RPC)  │   │  (account/payments) │  │
        │  └────────┬─────────┘   └──────────┬──────────┘  │
        │           │                        │              │
        │  ┌────────▼────────────────────────▼──────────┐  │
        │  │           Stellar Core (Consensus)          │  │
        │  │  ┌──────────────────────────────────────┐  │  │
        │  │  │   Split Bill WASM Contract            │  │  │
        │  │  │   (Soroban / Rust)                   │  │  │
        │  │  └──────────────────────────────────────┘  │  │
        │  └────────────────────────────────────────────┘  │
        └───────────────────────────────────────────────────┘
```

---

## 3. Component Breakdown

### 3.1 Frontend Layer

```
app/src/
├── pages/
│   ├── LandingPage.jsx          # Marketing/onboarding, wallet connect CTA
│   ├── DashboardPage.jsx        # Main split interface + event feed
│   ├── WalletPage.jsx           # Balance, receive QR, send XLM
│   ├── TransactionsPage.jsx     # Transaction history from Horizon
│   └── SettingsPage.jsx         # Privacy settings, network info
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.jsx        # Root layout with sidebar + topnav
│   │   ├── TopNav.jsx           # Wallet status bar, balance chip
│   │   └── SideNav.jsx          # Navigation links, logo
│   ├── split/
│   │   ├── SplitCalculator.jsx  # Create split: equal/exact/proportional
│   │   ├── SplitDetails.jsx     # View on-chain split + mark paid + share
│   │   └── SplitEventFeed.jsx   # Live event stream from contract
│   ├── transaction/
│   │   ├── SendTransaction.jsx  # Build XLM payment, sign, submit
│   │   ├── TransactionStatus.jsx        # Pipeline status indicator
│   │   └── TransactionStatusPanel.jsx  # Slide-in status drawer
│   ├── wallet/
│   │   ├── WalletSelectorModal.jsx  # Multi-wallet connection dialog
│   │   └── WalletWidget.jsx         # Balance display, disconnect
│   └── ui/
│       ├── GradientButton.jsx   # Animated CTA button
│       └── LoadingSkeleton.jsx  # Content loading placeholder
│
├── hooks/
│   ├── useWallet.js             # Wallet connection state machine
│   ├── useContract.js           # Contract read/write operations
│   ├── useEvents.js             # Soroban event polling (6s)
│   ├── useTransaction.js        # XLM payment state machine
│   └── useBalance.js            # Horizon balance fetching
│
└── utils/
    ├── contractClient.js        # Soroban RPC abstraction (build/sim/sign/submit)
    ├── stellar.js               # Network config, StrKey utils, formatters
    ├── helpers.js               # Generic helpers
    └── logger.js                # Structured logging utility
```

### 3.2 Smart Contract Layer

```
contracts/split_bill/src/lib.rs
├── Data Structures
│   ├── Split { id, creator, total_amount, description, settled, participants }
│   └── Participant { address, amount, paid }
│
├── Storage Keys
│   ├── DataKey::Split(u64)      # Persistent: split data by ID
│   └── DataKey::SplitCount      # Persistent: global counter
│
├── Functions (5)
│   ├── create_split()           # Auth: creator
│   ├── add_participant()        # Auth: creator
│   ├── mark_paid()              # Auth: participant
│   ├── get_split()              # Read-only
│   └── get_split_count()        # Read-only
│
└── Events (3)
    ├── SplitCreated { split_id, creator, total_amount }
    ├── ParticipantAdded { split_id, participant, amount }
    └── SplitSettled { split_id }
```

---

## 4. Smart Contract Architecture

### 4.1 State Machine

```
                        create_split()
                              │
                              ▼
                    ┌─────────────────┐
                    │   SPLIT ACTIVE  │
                    │  (settled=false)│
                    └────────┬────────┘
                             │
              add_participant() [creator auth]
                             │
                             ▼
                    ┌─────────────────┐
                    │  PARTICIPANTS   │◄──── mark_paid() [participant auth]
                    │     ADDED       │           │
                    └────────┬────────┘           │
                             │                    │
              All participants paid?              YES
                             │
                             ▼
                    ┌─────────────────┐
                    │    SETTLED      │
                    │ (settled=true)  │
                    └─────────────────┘
```

### 4.2 Authorization Model

| Operation | Required Auth | Enforced By |
|---|---|---|
| `create_split` | Creator's signature | `env.require_auth(&creator)` |
| `add_participant` | Creator's signature | `env.require_auth(&split.creator)` |
| `mark_paid` | Participant's own signature | `env.require_auth(&address)` |
| `get_split` | None (read-only) | Simulation only |
| `get_split_count` | None (read-only) | Simulation only |

### 4.3 Storage Layout

```
Instance Storage:
  └── SplitCount (u64)           # Monotonically increasing

Persistent Storage:
  └── Split(0) → Split { ... }
  └── Split(1) → Split { ... }
  └── Split(N) → Split { ... }   # Each split persists ~1 year (TTL)
```

---

## 5. Frontend Architecture

### 5.1 Hook Dependency Graph

```
useWallet
  └─► StellarWalletsKit
        ├── Freighter Extension
        ├── xBull Extension
        └── Albedo Extension

useContract (depends on useWallet)
  └─► contractClient.js
        ├── getSorobanServer() → Soroban RPC
        └── callContract() → Build → Simulate → Sign → Submit → Poll

useEvents (depends on useContract)
  └─► fetchContractEvents() [polls every 6 seconds]
        └─► Soroban RPC getEvents()

useTransaction (depends on useWallet)
  └─► Horizon API (payment operations)

useBalance (depends on useWallet)
  └─► Horizon API /accounts/{id}
```

### 5.2 Transaction Pipeline (5 Stages)

```
Stage 1: building
  → Load account from Soroban RPC (sequence number)
  → Construct InvokeHostFunctionOp

Stage 2: simulating
  → Soroban RPC simulateTransaction (dry run)
  → Extracts auth entries, fee estimates
  → assembleTransaction() adds simulation data

Stage 3: signing
  → StellarWalletsKit.signTransaction(xdr, { networkPassphrase })
  → Wallet extension shows user the transaction details
  → User approves → returns { signedTxXdr }

Stage 4: submitting
  → Soroban RPC sendTransaction(signedXdr)
  → Returns { hash, status: 'PENDING' }

Stage 5: confirming
  → Poll getTransaction(hash) every 2 seconds
  → Max 30 attempts (60 seconds timeout)
  → SUCCESS → decode returnValue → notify UI
```

---

## 6. Data Flow

### 6.1 Create Split Flow

```
User Input
  ├── Description: "Dinner at XYZ"
  ├── Total Amount: 100 XLM
  └── Participants: [addr1, addr2, addr3]
          │
          ▼
SplitCalculator.jsx
  ├── Validate addresses (StrKey.isValidEd25519PublicKey)
  ├── Calculate per-person amounts (equal/exact/proportional)
  └── Call useContract.createSplit()
          │
          ▼
contractClient.callContract('create_split', [creator, amount, description])
  ├── Stage 1: Build TX
  ├── Stage 2: Simulate → get assembled TX
  ├── Stage 3: Sign via wallet (user sees prompt)
  ├── Stage 4: Submit signed TX
  └── Stage 5: Poll → get split_id (u64)
          │
          ▼
for each participant:
  contractClient.callContract('add_participant', [split_id, addr, amount])
          │
          ▼
useEvents polls → SplitCreated + ParticipantAdded events appear in feed
```

### 6.2 Event Feed Architecture

```
useEvents hook (6-second poll)
  │
  ├── getLatestLedger() → current ledger sequence
  ├── getEvents({ startLedger, contractIds: [CONTRACT_ID] })
  │     ├── topic[0]: event type ("SplitCreated" / "ParticipantAdded" / "SplitSettled")
  │     ├── topic[1+]: relevant addresses / IDs
  │     └── value: encoded event data
  │
  └── Decoded events → SplitEventFeed.jsx (animated list)
```

---

## 7. Security Model

| Threat | Mitigation |
|---|---|
| **Private key exposure** | Keys never touch the app — only wallet extensions sign |
| **Invalid address injection** | `StrKey.isValidEd25519PublicKey()` validates all inputs before TX |
| **Unauthorized mark_paid** | Contract enforces `env.require_auth(&address)` per participant |
| **Unauthorized add_participant** | Contract requires creator auth on every `add_participant` call |
| **Front-running** | Soroban's XDR-encoded transactions are atomic; no partial execution |
| **Double-payment** | Contract checks `participant.paid` before marking; panics if already paid |
| **Reentrancy** | Soroban's host functions are not reentrant by design |
| **XSS** | React's JSX auto-escapes all string rendering |
| **Env var leakage** | Only `VITE_*` non-secret variables are exposed; no private keys in env |

---

## 8. Deployment Topology

```
┌─────────────────────────────────────────────────────┐
│                  Production Deployment               │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │              Vercel Edge Network             │   │
│  │  • CDN: 100+ PoPs globally                  │   │
│  │  • Auto HTTPS (Let's Encrypt)               │   │
│  │  • Build: `vite build` (Node 20)            │   │
│  │  • Output: static HTML/JS/CSS bundle        │   │
│  │  • Env vars: injected at build time         │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Contract (immutable on testnet):                   │
│    CCEIBX7TF3OY5CWE5GDGZPFNNTIRTLLHDYJ4NQG4        │
│    YLWYTNURUZ4YGKGF                                 │
│    • Network: Test SDF Network ; September 2015     │
│    • WASM Hash: 3d689e48b110...373ae6               │
│    • Deploy TX: 5da12c8a...b132                     │
└─────────────────────────────────────────────────────┘
```

### CI/CD Pipeline

```
git push origin main
        │
        ▼
Vercel detects push (GitHub integration)
        │
        ▼
Build: cd app && npm ci && npm run build
        │
        ▼
Output: app/dist/ → deployed to Vercel CDN
        │
        ▼
Live: https://app-nine-gray-18.vercel.app
```

---

## 9. State Management

SYNC_SPLIT uses **React hooks** (no external state library) with a clean separation:

| Hook | Scope | Persistence |
|---|---|---|
| `useWallet` | Global (lifted to App) | Session (reconnect on reload) |
| `useBalance` | Per-page | In-memory, refetches on mount |
| `useContract` | Dashboard-level | In-memory |
| `useEvents` | Dashboard-level | In-memory, real-time polled |
| `useTransaction` | Component-level | Discarded after TX completes |

Data flows **downward** through props; events flow **upward** via callbacks. No Redux, no Zustand — the blockchain is the source of truth.

---

## 10. Error Handling Strategy

All errors are mapped to user-friendly messages via `mapContractError()`:

| Error Pattern | User Message |
|---|---|
| `User declined` / `rejected` | "Transaction was rejected in your wallet." |
| `insufficient` / `underfunded` | "Insufficient XLM. Fund via Friendbot." |
| `not connected` | "No wallet connected." |
| `NetworkError` | "Network error. Check your connection." |
| `Simulation error` | Extracted contract panic message |
| Default | Raw error message (dev fallback) |

Transaction status is exposed via a 5-stage pipeline: `building → simulating → signing → submitting → confirming`, giving users real-time feedback on exactly where their transaction is.

---

*Architecture document for SYNC_SPLIT v1.0 — Built on Stellar · Powered by Soroban*
