import { useState, useCallback } from 'react';
import {
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Memo,
} from '@stellar/stellar-sdk';
import { HORIZON_URL } from '../utils/stellar';

/**
 * Transaction states: idle → building → signing → submitting → success | error
 */
const STATUS = {
  IDLE: 'idle',
  BUILDING: 'building',
  SIGNING: 'signing',
  SUBMITTING: 'submitting',
  SUCCESS: 'success',
  ERROR: 'error',
};

/**
 * Hook to build, sign, and submit Stellar transactions via Freighter.
 *
 * Returns: { sendPayment, status, txHash, error, reset }
 */
export function useTransaction() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  const reset = useCallback(() => {
    setStatus(STATUS.IDLE);
    setTxHash(null);
    setError(null);
  }, []);

  /**
   * Send XLM from the connected Freighter wallet.
   *
   * @param {string} destination — recipient Stellar address
   * @param {string} amount — XLM amount as string
   * @param {string} [memo] — optional memo text
   */
  const sendPayment = useCallback(async (destination, amount, memo) => {
    setStatus(STATUS.BUILDING);
    setTxHash(null);
    setError(null);

    try {
      // 1. Get sender's public key from Freighter
      const freighterApi = await import('@stellar/freighter-api');
      const { address: senderKey } = await freighterApi.getAddress();

      if (!senderKey) {
        throw new Error('No wallet connected. Please connect Freighter first.');
      }

      // 2. Load sender account from Horizon
      const accountResponse = await fetch(`${HORIZON_URL}/accounts/${senderKey}`);
      if (!accountResponse.ok) {
        throw new Error('Failed to load sender account. Is it funded?');
      }
      const accountData = await accountResponse.json();

      // 3. Build the transaction
      const account = {
        accountId: () => senderKey,
        sequenceNumber: () => accountData.sequence,
        incrementSequenceNumber: () => {
          accountData.sequence = (BigInt(accountData.sequence) + 1n).toString();
        },
      };

      const builder = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      });

      builder.addOperation(
        Operation.payment({
          destination,
          asset: Asset.native(),
          amount: String(amount),
        })
      );

      if (memo) {
        builder.addMemo(Memo.text(memo));
      }

      builder.setTimeout(180);
      const transaction = builder.build();

      // 4. Sign via Freighter
      setStatus(STATUS.SIGNING);
      const { signedTxXdr } = await freighterApi.signTransaction(
        transaction.toXDR(),
        { networkPassphrase: Networks.TESTNET }
      );

      // 5. Submit to Horizon
      setStatus(STATUS.SUBMITTING);
      const submitResponse = await fetch(`${HORIZON_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `tx=${encodeURIComponent(signedTxXdr)}`,
      });

      const submitData = await submitResponse.json();

      if (!submitResponse.ok) {
        const extras = submitData?.extras?.result_codes;
        const detail = extras?.operations
          ? extras.operations.join(', ')
          : submitData.detail || 'Transaction failed';
        throw new Error(detail);
      }

      setTxHash(submitData.hash);
      setStatus(STATUS.SUCCESS);
    } catch (err) {
      setError(err.message || 'Transaction failed');
      setStatus(STATUS.ERROR);
    }
  }, []);

  return {
    sendPayment,
    status,
    txHash,
    error,
    reset,
    isIdle: status === STATUS.IDLE,
    isBuilding: status === STATUS.BUILDING,
    isSigning: status === STATUS.SIGNING,
    isSubmitting: status === STATUS.SUBMITTING,
    isSuccess: status === STATUS.SUCCESS,
    isError: status === STATUS.ERROR,
    isLoading: [STATUS.BUILDING, STATUS.SIGNING, STATUS.SUBMITTING].includes(status),
  };
}
