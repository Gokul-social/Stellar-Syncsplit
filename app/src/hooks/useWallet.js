import { useState, useEffect, useCallback, useRef } from 'react';
import { truncateAddress, NETWORK_PASSPHRASE } from '../utils/stellar';

/**
 * Multi-wallet hook powered by StellarWalletsKit.
 *
 * Supports Freighter, xBull, and Albedo via unified API.
 * Uses productId values: 'freighter', 'xbull', 'albedo'
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

        const modules = defaultModules();

        StellarWalletsKit.init({
          modules,
          network: NETWORK_PASSPHRASE,
        });

        kitRef.current = StellarWalletsKit;
        setKitReady(true);

        // Check localStorage for previous connection
        const savedWallet = localStorage.getItem('syncsplit_wallet');
        if (savedWallet) {
          try {
            StellarWalletsKit.setWallet(savedWallet);
            const { address } = await StellarWalletsKit.getAddress({ skipRequestAccess: true });
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
            setWalletName('freighter');
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

  // ─── Connect with specific wallet from modal ────────────────────────────

  const connectWithWallet = useCallback(async (walletId) => {
    setConnecting(true);
    setError(null);
    setModalOpen(false);

    try {
      if (kitRef.current) {
        const SWK = kitRef.current;

        // Set the active wallet module by productId
        SWK.setWallet(walletId);

        // Request address from the selected wallet
        const { address } = await SWK.getAddress();
        if (address) {
          setPublicKey(address);
          setIsConnected(true);
          setWalletName(walletId);
          localStorage.setItem('syncsplit_wallet', walletId);
        }
      } else {
        // Fallback — try direct Freighter API
        const freighterApi = await import('@stellar/freighter-api');
        const connected = await freighterApi.isConnected();

        if (!connected || !connected.isConnected) {
          setError('Freighter wallet not detected. Please install it.');
          return;
        }

        const { address } = await freighterApi.requestAccess();
        if (address) {
          setPublicKey(address);
          setIsConnected(true);
          setWalletName('freighter');
          localStorage.setItem('syncsplit_wallet', 'freighter');
        }
      }
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.includes('not connected') || msg.includes('not installed') || msg.includes('not available')) {
        setError(`${walletId} is not installed or not connected. Please install it and try again.`);
      } else if (msg.includes('User declined') || msg.includes('rejected') || msg.includes('cancelled')) {
        setError('Connection request was rejected.');
      } else {
        setError(msg || `Failed to connect ${walletId}.`);
      }
    } finally {
      setConnecting(false);
    }
  }, []);

  // ─── Simple connect (picks first available or opens modal) ─────────────

  const connect = useCallback(async () => {
    setModalOpen(true);
  }, []);

  // ─── Disconnect ─────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setWalletName(null);
    setIsConnected(false);
    setError(null);
    localStorage.removeItem('syncsplit_wallet');
  }, []);

  // ─── Modal Controls ────────────────────────────────────────────────────

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
