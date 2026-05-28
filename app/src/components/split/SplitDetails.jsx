import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { truncateAddress, formatXLM, STELLAR_EXPERT_URL } from '../../utils/stellar';
import GradientButton from '../ui/GradientButton';
import LoadingSkeleton from '../ui/LoadingSkeleton';

/**
 * Read-only view of an on-chain split.
 * Fetches split data from contract and displays participants with paid/unpaid status.
 * Auto-refreshes when events are received.
 */
export default function SplitDetails({ splitId, contract, publicKey, eventRefreshKey }) {
  const [split, setSplit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(null);
  const [copied, setCopied] = useState(false);

  // ── User Feedback Iteration v1.1: Share Link ─────────────────────────────
  // Based on beta tester feedback: "Would love a share link for each split group."
  // Copies a deep-link URL so the creator can paste it to participants easily.
  const handleCopyShareLink = useCallback(() => {
    const url = `${window.location.origin}/dashboard?split=${splitId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for environments without clipboard API
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [splitId]);

  // Fetch split data
  useEffect(() => {
    if (!splitId || !contract) return;

    const load = async () => {
      setLoading(true);
      const data = await contract.fetchSplit(splitId);
      setSplit(data);
      setLoading(false);
    };

    load();
  }, [splitId, contract, eventRefreshKey]);

  if (!splitId) {
    return (
      <div className="bg-surface-container-low rounded-xl p-6 inner-stroke text-center">
        <span className="material-symbols-outlined text-4xl text-outline mb-3 block">receipt_long</span>
        <p className="text-sm text-outline-variant">
          No split selected. Create a split to see details here.
        </p>
      </div>
    );
  }

  if (loading && !split) {
    return (
      <div className="bg-surface-container-low rounded-xl p-6 inner-stroke space-y-4">
        <LoadingSkeleton width="40%" height="1.5rem" />
        <LoadingSkeleton width="100%" height="3rem" />
        <LoadingSkeleton width="100%" height="3rem" />
        <LoadingSkeleton width="100%" height="3rem" />
      </div>
    );
  }

  if (!split) {
    return (
      <div className="bg-surface-container-low rounded-xl p-6 inner-stroke text-center">
        <span className="material-symbols-outlined text-4xl text-error mb-3 block">error</span>
        <p className="text-sm text-error">Split #{splitId} not found on-chain.</p>
      </div>
    );
  }

  const paidCount = split.participants.filter(p => p.paid).length;
  const totalCount = split.participants.length;
  const progressPercent = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;

  const handleMarkPaid = async (participantAddress) => {
    if (!contract || markingPaid) return;
    setMarkingPaid(participantAddress);
    await contract.markPaid(splitId, participantAddress);
    // Refresh after marking
    const data = await contract.fetchSplit(splitId);
    setSplit(data);
    setMarkingPaid(null);
  };

  return (
    <motion.div
      className="bg-surface-container-low rounded-xl p-6 inner-stroke relative overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-headline font-black uppercase tracking-widest text-primary">
              Split #{split.id}
            </span>
            {split.settled ? (
              <span className="text-[9px] bg-tertiary/10 text-tertiary px-2 py-0.5 rounded-full font-bold uppercase">
                Settled
              </span>
            ) : (
              <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">
                Active
              </span>
            )}
          </div>
          <h3 className="font-headline text-lg font-bold text-on-surface">{split.description}</h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-headline font-bold text-on-surface">
            {formatXLM(split.totalAmount)}
          </p>
          <p className="text-xs text-outline uppercase">XLM Total</p>
        </div>
      </div>

      {/* ── v1.1 Iteration: Share Link ─────────────────────────────────── */}
      <motion.button
        id={`share-split-${split.id}`}
        onClick={handleCopyShareLink}
        className="w-full mb-5 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-all text-sm text-primary font-semibold cursor-pointer"
        whileTap={{ scale: 0.97 }}
        title="Copy invite link to share with participants"
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.span
              key="copied"
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
            >
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Link Copied!
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
            >
              <span className="material-symbols-outlined text-sm">share</span>
              Copy Invite Link — Share Split #{split.id}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-[10px] font-headline uppercase tracking-widest text-outline mb-2">
          <span>Payment Progress</span>
          <span>{paidCount}/{totalCount} Paid</span>
        </div>
        <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-tertiary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Participants */}
      <div className="space-y-3">
        {split.participants.map((p, i) => {
          const isMe = p.address === publicKey;
          const canMarkPaid = isMe && !p.paid;

          return (
            <motion.div
              key={p.address}
              className={[
                'flex items-center gap-4 p-4 rounded-xl border transition-all',
                p.paid
                  ? 'bg-tertiary/5 border-tertiary/20'
                  : 'bg-surface-container-high/30 border-outline-variant/10',
              ].join(' ')}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              {/* Avatar */}
              <div className={[
                'w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold',
                p.paid ? 'bg-tertiary/20 text-tertiary' : 'bg-violet-900 text-on-surface',
              ].join(' ')}>
                {p.paid ? (
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                ) : (
                  (isMe ? 'YOU' : `P${i + 1}`)
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface flex items-center gap-2">
                  {isMe ? 'You' : truncateAddress(p.address, 6, 4)}
                  {isMe && (
                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">
                      Me
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-outline font-mono truncate">
                  {p.address}
                </p>
              </div>

              {/* Amount + Action */}
              <div className="text-right flex items-center gap-3">
                <div>
                  <p className="font-headline font-bold text-on-surface">
                    {formatXLM(p.amount)} XLM
                  </p>
                  <p className={`text-[10px] font-bold uppercase ${p.paid ? 'text-tertiary' : 'text-outline'}`}>
                    {p.paid ? 'Paid' : 'Pending'}
                  </p>
                </div>
                {canMarkPaid && (
                  <GradientButton
                    className="px-3 py-2 text-[10px]"
                    onClick={() => handleMarkPaid(p.address)}
                    loading={markingPaid === p.address}
                    disabled={markingPaid !== null}
                  >
                    Pay
                  </GradientButton>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Creator Info */}
      <div className="mt-6 pt-4 border-t border-outline-variant/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-outline text-sm">person</span>
          <span className="text-[10px] text-outline uppercase tracking-widest">
            Created by {truncateAddress(split.creator, 6, 4)}
          </span>
        </div>
        <a
          href={`${STELLAR_EXPERT_URL}/account/${split.creator}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-primary/60 hover:text-primary flex items-center gap-1 transition-colors"
        >
          <span className="material-symbols-outlined text-xs">open_in_new</span>
          Explorer
        </a>
      </div>
    </motion.div>
  );
}
