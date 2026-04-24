import { useState, useEffect, useCallback, useRef } from 'react';
import { truncateAddress, NETWORK_PASSPHRASE } from '../utils/stellar';

/**
 * Multi-wallet hook powered by StellarWalletsKit.
 *
 * Supports Freighter, xBull, and Albedo via unified API.
 *
 * Returns:
 *  - publicKey, truncatedAddr, walletName
 *  - isConnected, connecting, error
 *  - connect(), disconnect(), openModal()
 *  - signTransaction() — for contract interactions
 */
export function useWallet() {
  const [publicKey, setPublicKey] = useState(null);
  const [walletName, setWalletName] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [kitReady, setKitReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const kitRef = useRef(null);
  const initCalled = useRef(false);

  // ─── Initialize StellarWalletsKit ────────────────────────────────────────

  useEffect(() => {
    if (initCalled.current) return;
    initCalled.current = true;

    const initKit = async () => {
      try {
        const { StellarWalletsKit } = await import('@creit-tech/stellar-wallets-kit/sdk');
        const { defaultModules } = await import('@creit-tech/stellar-wallets-kit/modules/utils');
        const { SwkAppDarkTheme } = await import('@creit-tech/stellar-wallets-kit/types');

        StellarWalletsKit.init({
          theme: SwkAppDarkTheme,
          modules: defaultModules(),
        });

        kitRef.current = StellarWalletsKit;
        setKitReady(true);

        // Check localStorage for previous connection
        const savedWallet = localStorage.getItem('syncsplit_wallet');
        if (savedWallet) {
          try {
            const { address } = await StellarWalletsKit.getAddress();
            if (address) {
              setPublicKey(address);
              setWalletName(savedWallet);
              setIsConnected(true);
            }
          } catch {
            // Previously connected wallet no longer available
            localStorage.removeItem('syncsplit_wallet');
          }
        }
      } catch (err) {
        console.warn('[useWallet] StellarWalletsKit init failed:', err);
        // Fallback: try direct Freighter
        await initFreighterFallback();
      }
    };

    initKit();
  }, []);

  // ─── Freighter Fallback (if SWK fails to load) ──────────────────────────

  const initFreighterFallback = async () => {
    try {
      const freighterApi = await import('@stellar/freighter-api');
      const connected = await freighterApi.isConnected();

      if (connected) {
        try {
          const { address } = await freighterApi.getAddress();
          if (address) {
            setPublicKey(address);
            setWalletName('Freighter');
            setIsConnected(true);
          }
        } catch {
          // Not authorized
        }
      }
    } catch {
      // Freighter not available either
    }
  };

  // ─── Connect Wallet ─────────────────────────────────────────────────────

  const connect = useCallback(async (preferredWallet) => {
    setConnecting(true);
    setError(null);

    try {
      if (kitRef.current) {
        // Use StellarWalletsKit
        const SWK = kitRef.current;
        const { address } = await SWK.getAddress();

        if (address) {
          setPublicKey(address);
          setIsConnected(true);
          const name = preferredWallet || 'Wallet';
          setWalletName(name);
          localStorage.setItem('syncsplit_wallet', name);
        }
      } else {
        // Fallback to direct Freighter
        const freighterApi = await import('@stellar/freighter-api');
        const connected = await freighterApi.isConnected();

        if (!connected) {
          setError('No wallet detected. Please install Freighter, xBull, or Albedo.');
          return;
        }

        const { address } = await freighterApi.requestAccess();
        if (address) {
          setPublicKey(address);
          setIsConnected(true);
          setWalletName('Freighter');
          localStorage.setItem('syncsplit_wallet', 'Freighter');
        }
      }
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('User declined') || msg.includes('rejected') || msg.includes('cancelled')) {
        setError('Connection request was rejected.');
      } else if (msg.includes('not installed') || msg.includes('not found')) {
        setError('Wallet not found. Please install a Stellar wallet extension.');
      } else {
        setError(msg || 'Failed to connect wallet.');
      }
    } finally {
      setConnecting(false);
    }
  }, []);

  // ─── Disconnect ─────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setWalletName(null);
    setIsConnected(false);
    setError(null);
    localStorage.removeItem('syncsplit_wallet');
  }, []);

  // ─── Open Wallet Selection Modal ────────────────────────────────────────

  const openModal = useCallback(() => {
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  // ─── Sign Transaction (unified API) ──────────────────────────────────────

  const signTransaction = useCallback(async (txXdr, opts = {}) => {
    if (!isConnected) {
      throw new Error('No wallet connected.');
    }

    try {
      if (kitRef.current) {
        const result = await kitRef.current.signTransaction(txXdr, {
          networkPassphrase: opts.networkPassphrase || NETWORK_PASSPHRASE,
          address: opts.address || publicKey,
          ...opts,
        });
        return result;
      } else {
        // Freighter fallback
        const freighterApi = await import('@stellar/freighter-api');
        const result = await freighterApi.signTransaction(txXdr, {
          networkPassphrase: opts.networkPassphrase || NETWORK_PASSPHRASE,
        });
        return result;
      }
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('User declined') || msg.includes('rejected') || msg.includes('cancelled')) {
        throw new Error('Transaction was rejected in your wallet.');
      }
      throw err;
    }
  }, [isConnected, publicKey]);

  // ─── Connect with specific wallet from modal ────────────────────────────

  const connectWithWallet = useCallback(async (walletId) => {
    setConnecting(true);
    setError(null);
    setModalOpen(false);

    try {
      if (kitRef.current) {
        const SWK = kitRef.current;

        // If there's a setWallet method, use it
        if (typeof SWK.setWallet === 'function') {
          SWK.setWallet(walletId);
        }

        const { address } = await SWK.getAddress();
        if (address) {
          setPublicKey(address);
          setIsConnected(true);
          setWalletName(walletId);
          localStorage.setItem('syncsplit_wallet', walletId);
        }
      } else {
        // Fallback — just try Freighter
        await connect('Freighter');
      }
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('not installed') || msg.includes('not found')) {
        setError(`${walletId} is not installed. Please install it from the browser extension store.`);
      } else if (msg.includes('User declined') || msg.includes('rejected')) {
        setError('Connection was rejected.');
      } else {
        setError(msg || `Failed to connect ${walletId}.`);
      }
    } finally {
      setConnecting(false);
    }
  }, [connect]);

  return {
    publicKey,
    truncatedAddr: truncateAddress(publicKey, 6, 4),
    walletName,
    isConnected,
    kitReady,
    connecting,
    error,
    modalOpen,
    connect,
    disconnect,
    openModal,
    closeModal,
    signTransaction,
    connectWithWallet,
  };
}
