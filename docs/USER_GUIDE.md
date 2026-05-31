# SYNC_SPLIT — User Guide

> **Live App:** [app-nine-gray-18.vercel.app](https://app-nine-gray-18.vercel.app)  
> **Network:** Stellar Testnet (no real funds required)  
> **Version:** 1.1

---

## Table of Contents

1. [What is SYNC_SPLIT?](#1-what-is-sync_split)
2. [Getting Started](#2-getting-started)
3. [Connecting Your Wallet](#3-connecting-your-wallet)
4. [Creating a Split Bill](#4-creating-a-split-bill)
5. [Adding Participants](#5-adding-participants)
6. [Marking Payments](#6-marking-payments)
7. [Sharing a Split via Invite Link](#7-sharing-a-split-via-invite-link)
8. [Sending XLM Directly](#8-sending-xlm-directly)
9. [Viewing the Event Feed](#9-viewing-the-event-feed)
10. [Gasless Transactions (Fee Sponsorship)](#10-gasless-transactions-fee-sponsorship)
11. [FAQ & Troubleshooting](#11-faq--troubleshooting)

---

## 1. What is SYNC_SPLIT?

SYNC_SPLIT is an **on-chain bill-splitting protocol** built on Stellar's Soroban smart contracts. When you create a split, the participants and amounts are stored directly on the Stellar blockchain — no database, no server, no trust required.

**Key properties:**
- ✅ Fully on-chain via Soroban smart contract
- ✅ Works with Freighter, xBull, and Albedo wallets
- ✅ Real-time payment tracking via blockchain events
- ✅ Auto-settles when all participants mark as paid
- ✅ Publicly verifiable on [Stellar Expert](https://stellar.expert)
- ✅ Gasless transactions via fee sponsorship (testnet)

---

## 2. Getting Started

### What You Need

1. **A browser wallet** — [Freighter](https://www.freighter.app/) is recommended (Chrome/Firefox extension)
2. **Testnet XLM** — Free from Friendbot (no real money needed)

### Step-by-Step Setup

**Step 1: Install Freighter**

Go to [freighter.app](https://www.freighter.app/) and install the browser extension.

> If you already have Freighter, skip to Step 2.

**Step 2: Switch to Testnet**

Open Freighter → Settings → Network → Select **Testnet**.

> ⚠️ Do NOT use Mainnet. SYNC_SPLIT runs on Testnet only.

**Step 3: Get Free Testnet XLM**

Visit [Friendbot](https://laboratory.stellar.org/#account-creator?network=test), paste your wallet address, and click "Get test network lumens". Your wallet will receive 10,000 XLM (testnet, no real value).

**Step 4: Open SYNC_SPLIT**

Go to [app-nine-gray-18.vercel.app](https://app-nine-gray-18.vercel.app) and click **Launch App**.

---

## 3. Connecting Your Wallet

1. Click **"Connect Wallet"** on the landing page or in the sidebar
2. A wallet selector modal will appear with supported options:
   - 🟣 **Freighter** (recommended)
   - 🔵 **xBull**
   - 🟡 **Albedo**
3. Click your wallet provider
4. Approve the connection in the wallet extension popup
5. Your wallet address and XLM balance will appear in the dashboard

> **Note:** Your private key never leaves your wallet extension. SYNC_SPLIT only reads your public address.

---

## 4. Creating a Split Bill

1. Navigate to **Home (Dashboard)** from the sidebar
2. In the **Split Calculator** panel, fill in:
   - **Description** — e.g. "Group Dinner at Nobu"
   - **Total Amount** — total bill in XLM
   - **Participants** — add each person's Stellar address and their share
   - **Split Mode** — choose Equal, Exact, or Proportional
3. Click **"Create Split On-Chain"**
4. Your wallet extension will show a signing prompt — review and **Approve**
5. The transaction is submitted, confirmed on the Stellar ledger (~5 seconds)
6. A Split ID is returned — this is your on-chain split identifier

> **Equal mode:** divides the total evenly among all participants  
> **Exact mode:** you manually enter each person's amount  
> **Proportional mode:** enter ratios (e.g. 2:1:1) and amounts are calculated automatically

---

## 5. Adding Participants

After creating a split, you can add participants from the **Split Details** panel:

1. In the sidebar, click on your active Split ID to open **Split Details**
2. Click **"Add Participant"**
3. Enter the participant's Stellar address and their owed amount
4. Sign and submit — participant is added on-chain

---

## 6. Marking Payments

Participants mark themselves as paid when they settle their share:

1. Open the **Split Details** panel
2. Find your address in the participants list
3. Click **"Mark Paid"** next to your address
4. Sign the transaction in your wallet
5. Your status updates to ✅ Paid on-chain

When **all** participants have marked paid, the contract automatically emits a `split_settled` event and the split is complete.

---

## 7. Sharing a Split via Invite Link

To invite others to join your split:

1. Open **Split Details** for your split
2. Click the **📋 Copy Invite Link** button
3. A deep link is copied: `https://app-nine-gray-18.vercel.app/dashboard?split=<ID>`
4. Share this link with your group
5. When they open it, the split details auto-load in their dashboard

---

## 8. Sending XLM Directly

SYNC_SPLIT also supports direct XLM transfers:

1. Navigate to **Transfers** from the sidebar
2. Enter the recipient's Stellar address
3. Enter the amount in XLM
4. Add an optional memo
5. Click **Send** and approve in your wallet

---

## 9. Viewing the Event Feed

The **Event Feed** (sidebar on Dashboard) shows real-time contract events:

| Event | Meaning |
|:---|:---|
| 🟣 Split Created | A new split bill was registered on-chain |
| 🔵 Participant Added | A wallet was added to a split |
| 🟢 Payment Marked | A participant settled their share |
| 🟢 Split Settled | All participants have paid — split complete |

Events are fetched via Soroban RPC polling every 6 seconds. You can watch payments confirm in real time!

---

## 10. Gasless Transactions (Fee Sponsorship)

SYNC_SPLIT implements **Stellar Fee Bump Transactions** as an advanced feature. When enabled:

- You pay **0 XLM** in transaction fees
- A sponsor account pays the fee on your behalf via the Fee Bump mechanism
- Your inner transaction is still signed by your own wallet — you remain in full control

**How it works technically:**
1. Your wallet signs the inner Soroban transaction
2. The SYNC_SPLIT fee sponsor wraps it in a Fee Bump Transaction envelope
3. The sponsor pays the small network fee (~0.00001 XLM)
4. The bundled transaction is submitted to the network

> On testnet, fee sponsorship is active by default. This demonstrates how SYNC_SPLIT can offer a frictionless, zero-cost user experience.

---

## 11. FAQ & Troubleshooting

### "My wallet won't connect"
- Make sure Freighter is set to **Testnet** (not Mainnet)
- Try refreshing the page and reconnecting
- Ensure the Freighter extension is enabled and up to date

### "My transaction is pending for a long time"
- Stellar testnet can be slow at peak times
- The app polls for confirmation every 2 seconds (up to 60 seconds)
- If it times out, check [Stellar Expert](https://stellar.expert/explorer/testnet) with your wallet address

### "Simulation error"
- This usually means the contract detected an invalid state (e.g., adding a duplicate participant)
- Read the error message — it maps to the contract's panic message

### "I don't have testnet XLM"
- Visit [Friendbot](https://laboratory.stellar.org/#account-creator?network=test) and paste your address
- Click "Get test network lumens" — you'll receive 10,000 XLM instantly

### "The split count hasn't updated"
- The metrics dashboard auto-refreshes every 30 seconds
- Click "Refresh" manually on the `/metrics` page to force an update

---

## Support

- **GitHub:** [github.com/Gokul-social/Stellar-Syncsplit](https://github.com/Gokul-social/Stellar-Syncsplit)
- **Contract:** [Stellar Expert ↗](https://stellar.expert/explorer/testnet/contract/CCEIBX7TF3OY5CWE5GDGZPFNNTIRTLLHDYJ4NQG4YLWYTNURUZ4YGKGF)

---

*SYNC_SPLIT Protocol v1.1 · User Guide*
