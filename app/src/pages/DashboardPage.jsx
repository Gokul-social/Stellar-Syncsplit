import { useOutletContext } from 'react-router-dom';
import { motion } from 'motion/react';
import { useBalance } from '../hooks/useBalance';
import WalletWidget from '../components/wallet/WalletWidget';
import SplitCalculator from '../components/split/SplitCalculator';

/**
 * Dashboard page — main hub with balance card, recent splits, and split calculator.
 */
export default function DashboardPage() {
  const wallet = useOutletContext();
  const { balance } = useBalance(wallet.publicKey);

  const recentSplits = [
    { id: 1, icon: 'restaurant', name: 'Moonlight Dinner', detail: 'Shared with 3 others', amount: '-142.00', status: 'Settled', statusColor: 'text-tertiary' },
    { id: 2, icon: 'flight', name: 'Tokyo Retreat', detail: 'Shared with Alex', amount: '850.00', status: 'Pending', statusColor: 'text-primary' },
    { id: 3, icon: 'local_cafe', name: 'Coffee Run', detail: 'Shared with 2 others', amount: '-24.50', status: 'Settled', statusColor: 'text-tertiary' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Area */}
        <aside className="w-full lg:w-80 flex flex-col gap-6">
          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <WalletWidget publicKey={wallet.publicKey} isConnected={wallet.isConnected} />
          </motion.div>

          {/* Not connected state */}
          {!wallet.isConnected && (
            <motion.div
              className="bg-surface-container rounded-xl p-6 inner-stroke text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="material-symbols-outlined text-4xl text-outline mb-3 block">account_balance_wallet</span>
              <p className="text-sm text-on-surface-variant mb-4">Connect your Freighter wallet to get started</p>
              <button
                onClick={wallet.connect}
                disabled={wallet.connecting}
                className="w-full py-3 gradient-btn text-on-primary-fixed font-headline font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                {wallet.connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </motion.div>
          )}

          {/* Recent Splits */}
          <motion.div
            className="bg-surface-container-low rounded-xl p-6 inner-stroke"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="font-headline text-sm uppercase tracking-widest text-on-surface mb-6">
              Recent Splits
            </h3>
            <div className="space-y-6">
              {recentSplits.map(split => (
                <div key={split.id} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">{split.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-on-surface">{split.name}</p>
                    <p className="text-xs text-outline">{split.detail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-on-surface">{split.amount} XLM</p>
                    <p className={`text-[10px] ${split.statusColor}`}>{split.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </aside>

        {/* Primary Canvas: Split Calculator */}
        <motion.section
          className="flex-1"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <SplitCalculator publicKey={wallet.publicKey} balance={balance} />
        </motion.section>
      </div>

      {/* Bento Features Below */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          className="col-span-1 md:col-span-2 bg-surface-container rounded-xl p-6 inner-stroke relative group"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-headline text-lg font-bold text-on-surface">Activity Stream</h3>
              <p className="text-sm text-outline">Real-time settlement tracking</p>
            </div>
            <span className="material-symbols-outlined text-tertiary">monetization_on</span>
          </div>
          <div className="mt-8 flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {[
              { amount: '45.00', color: 'bg-tertiary' },
              { amount: '120.50', color: 'bg-primary' },
              { amount: '89.00', color: 'bg-secondary' },
              { amount: '210.00', color: 'bg-tertiary' },
            ].map((item, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-32 h-20 rounded-lg bg-surface-container-high p-3 flex flex-col justify-between border border-outline-variant/10"
              >
                <div className={`h-1 w-8 ${item.color} rounded-full`} />
                <span className="text-xs font-bold text-on-surface">{item.amount} XLM</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-surface-container to-surface-container-highest rounded-xl p-6 inner-stroke flex flex-col justify-between"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <span
            className="material-symbols-outlined text-3xl text-primary-fixed-dim"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            bolt
          </span>
          <div>
            <h4 className="font-headline font-bold text-on-surface">Auto-Split</h4>
            <p className="text-xs text-outline mt-2 leading-relaxed">
              Enable smart-detection for recurring group expenses on Stellar.
            </p>
            <button className="mt-4 text-[10px] font-black uppercase text-primary tracking-widest hover:underline cursor-pointer">
              Learn More
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
