import { useState, useEffect, useCallback } from 'react';
import { truncateAddress } from '../utils/stellar';

/**
 * Hook to manage Freighter wallet connection on Stellar Testnet.
 *
 * Returns:
 *  - publicKey: full public key string or null
 *  - truncatedAddr: shortened address for display
 *  - isConnected: boolean
 *  - isFreighterInstalled: boolean
 *  - network: current network string
 *  - connecting: boolean loading state
 *  - error: string or null
 *  - connect(): initiate wallet connection
 *  - disconnect(): clear local state
 */
export function useWallet() {
  const [publicKey, setPublicKey] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState(false);
  const [network, setNetwork] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Detect Freighter on mount
  useEffect(() => {
    const detect = async () => {
      try {
        const freighterApi = await import('@stellar/freighter-api');
        const connected = await freighterApi.isConnected();
        setIsFreighterInstalled(connected);

        if (connected) {
          try {
            const { address } = await freighterApi.getAddress();
            if (address) {
              setPublicKey(address);
              setIsConnected(true);
              const { network: net } = await freighterApi.getNetwork();
              setNetwork(net);
            }
          } catch {
            // Not previously authorized — that's fine
          }
        }
      } catch {
        setIsFreighterInstalled(false);
      }
    };
    detect();
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const freighterApi = await import('@stellar/freighter-api');
      const connected = await freighterApi.isConnected();
      if (!connected) {
        setError('Freighter wallet not detected. Please install the Freighter browser extension.');
        setConnecting(false);
        return;
      }

      const { address } = await freighterApi.requestAccess();
      if (address) {
        setPublicKey(address);
        setIsConnected(true);

        const { network: net } = await freighterApi.getNetwork();
        setNetwork(net);

        if (net && net !== 'TESTNET') {
          setError('Please switch Freighter to Stellar Testnet.');
        }
      }
    } catch (err) {
      setError(err?.message || 'Failed to connect wallet.');
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setIsConnected(false);
    setNetwork(null);
    setError(null);
  }, []);

  return {
    publicKey,
    truncatedAddr: truncateAddress(publicKey, 4, 4),
    isConnected,
    isFreighterInstalled,
    network,
    connecting,
    error,
    connect,
    disconnect,
  };
}
