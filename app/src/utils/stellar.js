import { StrKey } from '@stellar/stellar-sdk';

export const HORIZON_URL = 'https://horizon-testnet.stellar.org';
export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
export const STELLAR_EXPERT_URL = 'https://stellar.expert/explorer/testnet';

/**
 * Validate a Stellar public key (G... address)
 */
export function validateAddress(address) {
  if (!address || typeof address !== 'string') return false;
  return StrKey.isValidEd25519PublicKey(address);
}

/**
 * Truncate a Stellar address for display
 */
export function truncateAddress(address, startChars = 4, endChars = 4) {
  if (!address) return '';
  if (address.length <= startChars + endChars + 3) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format XLM amount for display
 */
export function formatXLM(amount) {
  if (amount === null || amount === undefined) return '0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  }).format(num);
}

/**
 * Get the Stellar Expert transaction URL
 */
export function getTxExplorerUrl(txHash) {
  return `${STELLAR_EXPERT_URL}/tx/${txHash}`;
}

/**
 * Get the Stellar Expert account URL
 */
export function getAccountExplorerUrl(publicKey) {
  return `${STELLAR_EXPERT_URL}/account/${publicKey}`;
}
