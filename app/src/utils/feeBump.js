/**
 * feeBump.js
 *
 * Fee Sponsorship (Gasless Transactions) — Advanced Feature
 *
 * Implements Stellar Fee Bump Transactions so users pay ZERO fees
 * when interacting with the SYNC_SPLIT contract.
 *
 * How it works:
 *   1. User signs the inner Soroban transaction normally via their wallet
 *   2. The sponsor keypair (VITE_SPONSOR_SECRET) wraps it in a fee bump envelope
 *   3. The fee bump is submitted — sponsor pays the fee, user pays nothing
 *
 * References:
 *   - SEP: https://stellar.org/developers/stellar-docs/docs/learn/transactions/fee-bump-transactions
 *   - SDK:  TransactionBuilder.buildFeeBumpTransaction(feeSource, baseFee, innerTx, networkPassphrase)
 */

import * as StellarSdk from '@stellar/stellar-sdk';
import { NETWORK_PASSPHRASE, HORIZON_URL } from './stellar';

const {
  Keypair,
  TransactionBuilder,
  SorobanRpc,
} = StellarSdk;

// ─── Sponsor Config ───────────────────────────────────────────────────────────

/**
 * The sponsor account secret key.
 * On testnet this is embedded in .env.local for demo purposes.
 * In a production system this would live in a backend service.
 */
const SPONSOR_SECRET = import.meta.env.VITE_SPONSOR_SECRET || null;

/** Fee in stroops paid by the sponsor (100 stroops = 0.00001 XLM). */
const SPONSOR_FEE = '200'; // 2x base fee to ensure fast inclusion

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true if fee sponsorship is configured and available.
 */
export function isFeeSponsorshipEnabled() {
  return Boolean(SPONSOR_SECRET);
}

/**
 * Returns the sponsor's public key (for display in UI), or null if not configured.
 */
export function getSponsorPublicKey() {
  if (!SPONSOR_SECRET) return null;
  try {
    return Keypair.fromSecret(SPONSOR_SECRET).publicKey();
  } catch {
    return null;
  }
}

// ─── Core: Wrap Signed XDR in Fee Bump ───────────────────────────────────────

/**
 * Takes a user-signed inner transaction XDR and wraps it in a
 * Stellar Fee Bump Transaction signed by the sponsor.
 *
 * @param {string} signedInnerXdr - The user-signed transaction XDR
 * @returns {Promise<StellarSdk.FeeBumpTransaction>} The fee-bumped transaction
 *
 * @throws {Error} If VITE_SPONSOR_SECRET is not configured
 * @throws {Error} If the inner XDR cannot be parsed
 */
export async function wrapWithFeeBump(signedInnerXdr) {
  if (!SPONSOR_SECRET) {
    throw new Error(
      'Fee sponsorship not configured. Set VITE_SPONSOR_SECRET in .env.local'
    );
  }

  const sponsorKeypair = Keypair.fromSecret(SPONSOR_SECRET);

  // Parse the inner signed transaction
  const innerTx = TransactionBuilder.fromXDR(signedInnerXdr, NETWORK_PASSPHRASE);

  // Build the fee bump transaction
  const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
    sponsorKeypair.publicKey(), // fee source = sponsor
    SPONSOR_FEE,                // base fee in stroops
    innerTx,                    // already-signed inner transaction
    NETWORK_PASSPHRASE
  );

  // Sponsor signs the outer fee bump envelope
  feeBumpTx.sign(sponsorKeypair);

  return feeBumpTx;
}

/**
 * Full flow: wrap a user-signed XDR in a fee bump and submit it.
 *
 * @param {string} signedInnerXdr - The user-signed transaction XDR
 * @param {StellarSdk.SorobanRpc.Server} server - Soroban RPC server instance
 * @returns {Promise<{ txHash: string, feePaid: string, sponsor: string }>}
 */
export async function submitWithFeeBump(signedInnerXdr, server) {
  const feeBumpTx = await wrapWithFeeBump(signedInnerXdr);

  // Submit via Soroban RPC (handles both classic + soroban txs)
  const sendResponse = await server.sendTransaction(feeBumpTx);

  if (sendResponse.status === 'ERROR') {
    throw new Error(
      sendResponse.errorResult?.toString() || 'Fee bump submission failed'
    );
  }

  // Poll for confirmation
  if (sendResponse.status === 'PENDING') {
    let getResponse;
    let attempts = 0;
    const maxAttempts = 30;

    do {
      await new Promise(r => setTimeout(r, 2000));
      getResponse = await server.getTransaction(sendResponse.hash);
      attempts++;
    } while (getResponse.status === 'NOT_FOUND' && attempts < maxAttempts);

    if (getResponse.status === 'SUCCESS') {
      const sponsorKey = getSponsorPublicKey();
      return {
        txHash: sendResponse.hash,
        feePaid: '0',         // from user's perspective
        sponsor: sponsorKey,
        feeBumped: true,
        returnValue: getResponse.returnValue,
      };
    } else if (getResponse.status === 'FAILED') {
      throw new Error('Fee-bumped transaction failed on-chain.');
    } else {
      throw new Error('Fee bump confirmation timed out.');
    }
  }

  return {
    txHash: sendResponse.hash,
    feePaid: '0',
    sponsor: getSponsorPublicKey(),
    feeBumped: true,
    returnValue: null,
  };
}
