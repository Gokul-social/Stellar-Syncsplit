import { useBalance } from '../../hooks/useBalance';
import { formatXLM } from '../../utils/stellar';
import LoadingSkeleton from '../ui/LoadingSkeleton';

/**
 * Compact wallet widget showing XLM balance, for use in sidebar or dashboard.
 */
export default function WalletWidget({ publicKey, isConnected }) {
  const { balance, loading, error } = useBalance(publicKey);

  if (!isConnected) return null;

  return (
    <div className="bg-surface-container rounded-xl p-6 inner-stroke relative overflow-hidden group">
      {/* Decorative glow */}
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary-container/10 rounded-full blur-3xl group-hover:bg-primary-container/20 transition-all duration-500" />

      <p className="font-headline text-xs uppercase tracking-widest text-outline mb-1">XLM Balance</p>

      {loading ? (
        <LoadingSkeleton width="60%" height="2.5rem" rounded="rounded-lg" />
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : (
        <>
          <h2 className="font-headline text-4xl font-bold text-on-surface">
            {formatXLM(balance)}
            <span className="text-lg text-outline ml-2">XLM</span>
          </h2>
          <div className="mt-4 flex items-center gap-2">
            <span className="bg-tertiary/10 text-tertiary text-[10px] font-bold px-2 py-0.5 rounded-full">
              Testnet
            </span>
            <span className="text-outline-variant text-[10px] uppercase font-semibold">
              Stellar Network
            </span>
          </div>
        </>
      )}
    </div>
  );
}
