import { useOutletContext } from 'react-router-dom';
import { motion } from 'motion/react';

/**
 * Settings page — Privacy & Security Armor.
 */
export default function SettingsPage() {
  const wallet = useOutletContext();

  return (
    <div className="kinetic-gradient min-h-[80vh]">
      {/* Header */}
      <section className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="font-headline text-sm tracking-[0.3em] uppercase text-primary font-bold">
              Security Infrastructure
            </span>
            <h1 className="font-headline text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter text-on-surface">
              Privacy Armor
            </h1>
            <p className="font-body text-on-surface-variant max-w-xl text-base md:text-lg mt-4">
              Manage your cryptographic identity and wallet security on the Stellar network.
            </p>
          </motion.div>

          <motion.div
            className="bg-surface-container-high/30 glass-panel p-6 rounded-xl border border-outline-variant/10"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <span
                className="material-symbols-outlined text-tertiary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              <span className="font-headline font-bold text-on-surface">
                Shield Status: {wallet.isConnected ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
                style={{ width: wallet.isConnected ? '94%' : '20%' }}
              />
            </div>
            <p className="text-xs text-outline mt-2 text-right">
              {wallet.isConnected ? '94%' : '20%'} Protection Coverage
            </p>
          </motion.div>
        </div>
      </section>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Security Core */}
        <motion.div
          className="md:col-span-8 bg-surface-container-low/40 glass-panel rounded-xl p-6 md:p-8 flex flex-col justify-between group overflow-hidden relative"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px] group-hover:bg-primary/20 transition-all duration-700" />
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="h-12 w-12 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary border border-outline-variant/20">
                <span className="material-symbols-outlined">security</span>
              </div>
              <span className="text-xs font-headline font-bold text-on-surface-variant border border-outline-variant/30 px-3 py-1 rounded-full uppercase tracking-widest">
                Active Protocol
              </span>
            </div>
            <h2 className="font-headline text-2xl md:text-3xl font-bold text-on-surface mb-4">
              Freighter Wallet Security
            </h2>
            <p className="text-on-surface-variant mb-8 max-w-md">
              Your transactions are signed locally by the Freighter browser extension. Private keys never leave your device.
            </p>
          </div>
          <div className="flex items-center justify-between pt-6 border-t border-outline-variant/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-6 bg-primary-container rounded-full relative p-1 flex items-center transition-all duration-300">
                <div className="w-4 h-4 bg-on-primary-container rounded-full translate-x-6" />
                <div className="absolute inset-0 bg-primary/20 blur-md rounded-full" />
              </div>
              <span className="font-headline text-sm font-semibold uppercase tracking-tighter">
                Secure Signing Enabled
              </span>
            </div>
          </div>
        </motion.div>

        {/* Privacy Snapshot */}
        <motion.div
          className="md:col-span-4 bg-gradient-to-br from-surface-container-high/40 to-surface-container-low/40 glass-panel rounded-xl p-6 md:p-8 flex flex-col justify-between"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div>
            <span className="material-symbols-outlined text-secondary mb-4 text-3xl">visibility_off</span>
            <h3 className="font-headline text-xl font-bold text-on-surface mb-2">Testnet Mode</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              All transactions are on Stellar Testnet. No real funds are at risk. Perfect for testing split payments.
            </p>
          </div>
          <div className="mt-12 space-y-4">
            <div className="flex items-center justify-between text-xs font-headline font-bold tracking-widest text-outline">
              <span>NETWORK</span>
              <span className="text-primary">TESTNET</span>
            </div>
          </div>
        </motion.div>

        {/* Network Settings */}
        <motion.div
          className="md:col-span-4 bg-surface-container-lowest/50 border border-outline-variant/10 rounded-xl p-6 md:p-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="font-headline text-lg font-bold text-on-surface mb-6">
            Wallet Configuration
          </h3>
          <ul className="space-y-6">
            {[
              { label: 'Auto-connect on refresh', enabled: true },
              { label: 'Show testnet badge', enabled: true },
              { label: 'Transaction memos', enabled: false },
            ].map(setting => (
              <li key={setting.label} className="flex items-center justify-between">
                <span className="text-sm text-on-surface-variant font-medium">{setting.label}</span>
                <div
                  className={[
                    'w-10 h-5 rounded-full p-1 flex items-center transition-all duration-300',
                    setting.enabled
                      ? 'bg-primary justify-end shadow-[0_0_10px_rgba(210,187,255,0.4)]'
                      : 'bg-surface-container-highest',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'w-3 h-3 rounded-full',
                      setting.enabled ? 'bg-on-primary' : 'bg-outline',
                    ].join(' ')}
                  />
                </div>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Sessions */}
        <motion.div
          className="md:col-span-8 bg-surface-container-high/20 glass-panel rounded-xl overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="p-6 md:p-8 pb-4">
            <h3 className="font-headline text-lg font-bold text-on-surface">
              Active Connections
            </h3>
          </div>
          <div className="space-y-1">
            {[
              { icon: 'desktop_windows', name: 'Browser Extension (Freighter)', detail: 'Chrome • Current session', status: 'Connected', statusColor: 'text-tertiary bg-tertiary/10' },
              { icon: 'cloud_sync', name: 'Horizon API', detail: 'horizon-testnet.stellar.org', status: 'Active', statusColor: 'text-tertiary bg-tertiary/10' },
            ].map((session, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-6 md:px-8 py-4 hover:bg-surface-container-highest/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-outline">{session.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-on-surface">{session.name}</p>
                    <p className="text-[10px] uppercase font-headline tracking-widest text-outline">
                      {session.detail}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${session.statusColor}`}>
                  {session.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
