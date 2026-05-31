import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { readContract } from '../utils/contractClient';
import { u64ToScVal } from '../utils/contractClient';
import {
  syncEvents,
  getIndexedEvents,
  getMetricsSummary,
  getWeeklyActivity,
  getEventsByType,
  getDailyActiveUsers,
} from '../utils/indexer';
import { getTransactions, getErrors } from '../utils/logger';
import { CONTRACT_ID, STELLAR_EXPERT_URL } from '../utils/stellar';
import { isFeeSponsorshipEnabled, getSponsorPublicKey } from '../utils/feeBump';

/**
 * MetricsPage — Live analytics dashboard for SYNC_SPLIT.
 *
 * Data sources:
 *  - Soroban RPC: split count, indexed contract events
 *  - localStorage: transaction log (DAU, retention), error log
 *
 * Sections:
 *  1. KPI cards — total splits, DAU, transactions, error rate
 *  2. Weekly activity bar chart (pure SVG)
 *  3. Event type breakdown
 *  4. Recent transaction log
 *  5. Fee Sponsorship (gasless) status
 */
export default function MetricsPage() {
  const [splitCount, setSplitCount]     = useState(null);
  const [summary, setSummary]           = useState(null);
  const [weeklyData, setWeeklyData]     = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [txLogs, setTxLogs]             = useState([]);
  const [errorLogs, setErrorLogs]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [lastSync, setLastSync]         = useState(null);
  const [syncing, setSyncing]           = useState(false);
  const [dau, setDau]                   = useState([]);

  const sponsorEnabled = isFeeSponsorshipEnabled();
  const sponsorKey     = getSponsorPublicKey();

  // ── Fetch all metrics ────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    setSyncing(true);
    try {
      // 1. Sync Soroban events into local index
      await syncEvents();

      // 2. Read split count from contract
      if (CONTRACT_ID) {
        try {
          const count = await readContract('get_split_count');
          setSplitCount(Number(count) || 0);
        } catch {
          setSplitCount(0);
        }
      }

      // 3. Pull from local index
      setSummary(getMetricsSummary());
      setWeeklyData(getWeeklyActivity(7));
      setRecentEvents(getIndexedEvents().slice(0, 10));
      setDau(getDailyActiveUsers());

      // 4. Pull logger data
      const txs = getTransactions ? getTransactions() : [];
      const errs = getErrors ? getErrors() : [];
      setTxLogs(txs.slice().reverse().slice(0, 8));
      setErrorLogs(errs.slice().reverse().slice(0, 5));

      setLastSync(new Date());
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Auto-refresh every 30s
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  // ── Derived stats ────────────────────────────────────────────────────────

  const totalTx   = txLogs.length;
  const errorRate = totalTx > 0
    ? ((errorLogs.length / (totalTx + errorLogs.length)) * 100).toFixed(1)
    : '0.0';
  const maxActivity = Math.max(...weeklyData.map(d => d.count), 1);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const kpiCards = [
    {
      id: 'splits',
      label: 'Total Splits',
      value: splitCount !== null ? splitCount : '—',
      sub: 'on-chain via Soroban',
      icon: 'receipt_long',
      color: 'text-primary',
      bg: 'from-primary/10 to-transparent',
    },
    {
      id: 'dau',
      label: 'DAU (Today)',
      value: loading ? '—' : dau.length,
      sub: 'unique wallets active',
      icon: 'person',
      color: 'text-secondary',
      bg: 'from-secondary/10 to-transparent',
    },
    {
      id: 'transactions',
      label: 'Transactions',
      value: loading ? '—' : (summary?.totalEvents ?? 0),
      sub: 'indexed contract events',
      icon: 'swap_horiz',
      color: 'text-tertiary',
      bg: 'from-tertiary/10 to-transparent',
    },
    {
      id: 'error_rate',
      label: 'Error Rate',
      value: `${errorRate}%`,
      sub: `${errorLogs.length} errors logged`,
      icon: 'bug_report',
      color: errorLogs.length === 0 ? 'text-tertiary' : 'text-yellow-400',
      bg: errorLogs.length === 0 ? 'from-tertiary/10 to-transparent' : 'from-yellow-500/10 to-transparent',
    },
  ];

  const eventTypeRows = summary
    ? [
        { label: 'Splits Created',     count: summary.splitCreated,     icon: 'receipt_long',  color: 'bg-primary' },
        { label: 'Participants Added',  count: summary.participantAdded, icon: 'person_add',    color: 'bg-secondary' },
        { label: 'Payments Marked',     count: summary.paymentMarked,    icon: 'check_circle',  color: 'bg-tertiary' },
        { label: 'Splits Settled',      count: summary.splitsSettled,    icon: 'done_all',      color: 'bg-tertiary' },
      ]
    : [];

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <span className="font-headline text-sm tracking-[0.3em] uppercase text-primary font-bold">
            Live Analytics
          </span>
          <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tighter text-on-surface mt-1">
            Metrics Dashboard
          </h1>
          <p className="text-on-surface-variant mt-2">
            Real-time data from Soroban RPC · Contract{' '}
            <a
              href={`${STELLAR_EXPERT_URL}/contract/${CONTRACT_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-mono text-xs"
            >
              {CONTRACT_ID ? `${CONTRACT_ID.slice(0, 8)}…` : 'N/A'}
            </a>
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Sync status */}
          <div className="text-xs text-outline">
            {lastSync
              ? `Last sync: ${lastSync.toLocaleTimeString()}`
              : 'Syncing…'}
          </div>
          <button
            onClick={refresh}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container rounded-lg border border-outline-variant/20
                       text-sm font-headline font-bold text-on-surface hover:bg-surface-container-high
                       transition-all disabled:opacity-50 cursor-pointer"
          >
            <span className={`material-symbols-outlined text-sm ${syncing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            Refresh
          </button>
        </div>
      </motion.div>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`bg-gradient-to-br ${card.bg} bg-surface-container rounded-xl p-5 inner-stroke`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`material-symbols-outlined ${card.color}`}
                style={{ fontVariationSettings: "'FILL' 1" }}>
                {card.icon}
              </span>
              {loading && (
                <div className="w-12 h-2 bg-surface-container-high rounded-full animate-pulse" />
              )}
            </div>
            <div className={`text-3xl font-black font-headline ${card.color} tabular-nums`}>
              {card.value}
            </div>
            <div className="text-xs text-outline mt-1 font-headline uppercase tracking-wider">
              {card.label}
            </div>
            <div className="text-[10px] text-outline-variant mt-0.5">{card.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Main Grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Activity Chart */}
        <motion.div
          className="lg:col-span-2 bg-surface-container rounded-xl p-6 inner-stroke"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-headline text-lg font-bold text-on-surface">Weekly Activity</h2>
              <p className="text-xs text-outline">Contract events indexed per day</p>
            </div>
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              bar_chart
            </span>
          </div>

          {/* SVG Bar Chart */}
          <div className="flex items-end gap-2 h-40">
            {weeklyData.map((day, i) => {
              const heightPct = maxActivity > 0 ? (day.count / maxActivity) * 100 : 0;
              const isToday = i === weeklyData.length - 1;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md transition-all duration-700 relative group"
                    style={{
                      height: `${Math.max(heightPct, 4)}%`,
                      background: isToday
                        ? 'linear-gradient(to top, #7c3aed, #a78bfa)'
                        : 'linear-gradient(to top, rgba(124,58,237,0.3), rgba(167,139,250,0.3))',
                      minHeight: '6px',
                    }}
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest
                                    text-[10px] font-bold text-on-surface px-2 py-1 rounded
                                    opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {day.count} event{day.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <span className={`text-[9px] font-headline uppercase tracking-wide ${isToday ? 'text-primary font-bold' : 'text-outline'}`}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>

          {weeklyData.every(d => d.count === 0) && (
            <div className="mt-4 text-center text-xs text-outline">
              No events indexed yet — interact with the contract to populate this chart.
            </div>
          )}
        </motion.div>

        {/* Event Type Breakdown */}
        <motion.div
          className="bg-surface-container rounded-xl p-6 inner-stroke"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-headline text-lg font-bold text-on-surface">Event Types</h2>
              <p className="text-xs text-outline">Indexed contract events</p>
            </div>
            <span className="material-symbols-outlined text-secondary">category</span>
          </div>

          <div className="space-y-4">
            {eventTypeRows.map(row => {
              const total = summary?.totalEvents || 1;
              const pct   = total > 0 ? Math.round((row.count / total) * 100) : 0;
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-outline"
                        style={{ fontVariationSettings: "'FILL' 1" }}>
                        {row.icon}
                      </span>
                      <span className="text-xs font-headline text-on-surface-variant">{row.label}</span>
                    </div>
                    <span className="text-xs font-black text-on-surface tabular-nums">{row.count}</span>
                  </div>
                  <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${row.color} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                    />
                  </div>
                </div>
              );
            })}
            {eventTypeRows.length === 0 && (
              <p className="text-xs text-outline text-center py-4">
                Sync events to populate breakdown
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Bottom Grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Transaction Log */}
        <motion.div
          className="bg-surface-container rounded-xl inner-stroke overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="p-6 pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-headline text-lg font-bold text-on-surface">Transaction Log</h2>
              <p className="text-xs text-outline">Recent user actions</p>
            </div>
            <span className="material-symbols-outlined text-tertiary">receipt_long</span>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {txLogs.length === 0 ? (
              <div className="px-6 py-8 text-center text-xs text-outline">
                No transactions logged yet. Connect a wallet and create a split!
              </div>
            ) : (
              txLogs.slice(0, 6).map((tx, i) => (
                <div key={tx.id || i} className="flex items-center gap-3 px-6 py-3 hover:bg-surface-container-high/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-sm text-primary"
                      style={{ fontVariationSettings: "'FILL' 1" }}>
                      {tx.action === 'create_split' ? 'receipt_long' :
                       tx.action === 'add_participant' ? 'person_add' :
                       tx.action === 'mark_paid' ? 'check_circle' :
                       'swap_horiz'}
                    </span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-on-surface truncate font-headline">
                      {tx.action?.replace(/_/g, ' ') || 'Transaction'}
                    </p>
                    <p className="text-[10px] text-outline font-mono truncate">
                      {tx.walletTruncated || tx.wallet?.slice(0, 12) || '—'}
                    </p>
                  </div>
                  {tx.txHash && (
                    <a
                      href={`${STELLAR_EXPERT_URL}/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline font-mono flex-shrink-0"
                    >
                      ↗
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Fee Sponsorship Status + Monitoring */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          {/* Fee Sponsorship Card */}
          <div className={`rounded-xl p-6 inner-stroke ${
            sponsorEnabled
              ? 'bg-gradient-to-br from-tertiary/15 to-surface-container border border-tertiary/20'
              : 'bg-surface-container'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <span className={`material-symbols-outlined text-2xl ${sponsorEnabled ? 'text-tertiary' : 'text-outline'}`}
                style={{ fontVariationSettings: "'FILL' 1" }}>
                payments
              </span>
              <div>
                <h3 className="font-headline font-bold text-on-surface">Fee Sponsorship</h3>
                <p className="text-xs text-outline">Gasless Transactions (Advanced Feature)</p>
              </div>
              <span className={`ml-auto text-[10px] font-black uppercase px-2 py-1 rounded ${
                sponsorEnabled ? 'bg-tertiary/20 text-tertiary' : 'bg-surface-container-high text-outline'
              }`}>
                {sponsorEnabled ? 'Active' : 'Configure'}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
              {sponsorEnabled
                ? `Users pay ZERO XLM fees. Sponsor (${sponsorKey?.slice(0, 8)}…) pays all transaction fees via Stellar Fee Bump Transactions.`
                : 'Set VITE_SPONSOR_SECRET in .env.local to enable gasless transactions for all users.'}
            </p>
            <div className="space-y-2">
              {[
                { label: 'Mechanism', value: 'Stellar Fee Bump TX' },
                { label: 'User Cost', value: sponsorEnabled ? '0 XLM' : 'Standard fee' },
                { label: 'Implementation', value: 'feeBump.js · SEP-0019' },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-[10px]">
                  <span className="text-outline uppercase tracking-widest">{row.label}</span>
                  <span className="font-bold text-on-surface">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Monitoring Status */}
          <div className="bg-surface-container rounded-xl p-6 inner-stroke">
            <h3 className="font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-primary">monitor_heart</span>
              Monitoring
            </h3>
            <div className="space-y-3">
              {[
                {
                  name: 'Soroban RPC',
                  url: 'soroban-testnet.stellar.org',
                  status: 'Online',
                  ok: true,
                },
                {
                  name: 'Horizon API',
                  url: 'horizon-testnet.stellar.org',
                  status: 'Online',
                  ok: true,
                },
                {
                  name: 'Event Indexer',
                  url: `${summary?.totalEvents ?? 0} events cached`,
                  status: 'Active',
                  ok: true,
                },
                {
                  name: 'Smart Contract',
                  url: CONTRACT_ID ? `${CONTRACT_ID.slice(0, 10)}…` : 'Not configured',
                  status: CONTRACT_ID ? 'Deployed' : 'Missing',
                  ok: Boolean(CONTRACT_ID),
                },
              ].map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${item.ok ? 'bg-tertiary animate-pulse' : 'bg-error'}`} />
                    <div>
                      <p className="text-xs font-bold text-on-surface">{item.name}</p>
                      <p className="text-[9px] text-outline font-mono">{item.url}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                    item.ok ? 'bg-tertiary/10 text-tertiary' : 'bg-error/10 text-error'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>

            <a
              href={`${STELLAR_EXPERT_URL}/contract/${CONTRACT_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-2 text-[10px] text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-xs">open_in_new</span>
              View contract on Stellar Expert
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
