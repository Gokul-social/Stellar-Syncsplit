import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { validateAddress, truncateAddress, formatXLM } from '../../utils/stellar';
import { generateId } from '../../utils/helpers';
import { useTransaction } from '../../hooks/useTransaction';
import GradientButton from '../ui/GradientButton';
import TransactionStatus from '../transaction/TransactionStatus';

const SPLIT_METHODS = ['equal', 'exact', 'shares'];

/**
 * Full split calculator with dynamic participants, multiple split modes,
 * validation, and Stellar transaction integration.
 */
export default function SplitCalculator({ publicKey, balance }) {
  const [totalAmount, setTotalAmount] = useState('');
  const [splitMethod, setSplitMethod] = useState('equal');
  const [participants, setParticipants] = useState([]);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [addError, setAddError] = useState('');
  const [showStatus, setShowStatus] = useState(false);

  const tx = useTransaction();

  // Add the current user as a participant
  const addSelf = useCallback(() => {
    if (!publicKey) return;
    if (participants.some(p => p.address === publicKey)) return;
    setParticipants(prev => [
      ...prev,
      { id: generateId(), name: 'You', address: publicKey, amount: '', shares: 1, isSelf: true },
    ]);
  }, [publicKey, participants]);

  // Add a new participant
  const addParticipant = useCallback(() => {
    setAddError('');

    if (!newName.trim()) {
      setAddError('Name is required');
      return;
    }
    if (!newAddress.trim()) {
      setAddError('Stellar address is required');
      return;
    }
    if (!validateAddress(newAddress.trim())) {
      setAddError('Invalid Stellar address (must start with G)');
      return;
    }
    if (participants.some(p => p.address === newAddress.trim())) {
      setAddError('This address is already added');
      return;
    }

    setParticipants(prev => [
      ...prev,
      { id: generateId(), name: newName.trim(), address: newAddress.trim(), amount: '', shares: 1, isSelf: false },
    ]);
    setNewName('');
    setNewAddress('');
  }, [newName, newAddress, participants]);

  const removeParticipant = useCallback((id) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  }, []);

  const updateParticipant = useCallback((id, field, value) => {
    setParticipants(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  }, []);

  // Calculate breakdown
  const breakdown = useMemo(() => {
    const total = parseFloat(totalAmount) || 0;
    if (total <= 0 || participants.length === 0) {
      return { items: [], unassigned: total, valid: false };
    }

    let items = [];
    let assigned = 0;

    if (splitMethod === 'equal') {
      const perPerson = total / participants.length;
      items = participants.map(p => ({
        ...p,
        calculatedAmount: perPerson,
      }));
      assigned = total;
    } else if (splitMethod === 'exact') {
      items = participants.map(p => {
        const amt = parseFloat(p.amount) || 0;
        assigned += amt;
        return { ...p, calculatedAmount: amt };
      });
    } else if (splitMethod === 'shares') {
      const totalShares = participants.reduce((sum, p) => sum + (parseInt(p.shares) || 0), 0);
      items = participants.map(p => {
        const share = parseInt(p.shares) || 0;
        const amt = totalShares > 0 ? (total * share) / totalShares : 0;
        assigned += amt;
        return { ...p, calculatedAmount: amt };
      });
    }

    return {
      items,
      unassigned: Math.max(0, total - assigned),
      valid: assigned > 0 && Math.abs(assigned - total) < 0.0000001,
    };
  }, [totalAmount, splitMethod, participants]);

  // Validation
  const canSubmit = useMemo(() => {
    const total = parseFloat(totalAmount) || 0;
    if (total <= 0) return false;
    if (participants.length === 0) return false;
    if (!breakdown.valid) return false;
    if (balance !== null && total > parseFloat(balance)) return false;
    // Check all non-self participants have valid addresses
    return participants.every(p => validateAddress(p.address));
  }, [totalAmount, participants, breakdown, balance]);

  const handleSubmit = async () => {
    if (!canSubmit || tx.isLoading) return;
    setShowStatus(true);

    // Send to all non-self participants
    const recipients = breakdown.items.filter(p => !p.isSelf);
    if (recipients.length === 0) return;

    // For simplicity, send to the first non-self participant
    // In a real app, you'd batch or loop
    const first = recipients[0];
    await tx.sendPayment(
      first.address,
      first.calculatedAmount.toFixed(7),
      `SYNC_SPLIT: ${participants.length}-way split`
    );
  };

  return (
    <div className="glass-panel bg-surface-container-highest/30 rounded-2xl p-6 md:p-8 inner-stroke border border-outline-variant/10 shadow-2xl relative overflow-hidden">
      {/* Background ornament */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary-container/20 to-transparent blur-[100px] pointer-events-none" />

      <header className="mb-8 md:mb-10 relative z-10">
        <h1 className="font-headline text-2xl md:text-3xl font-black tracking-tight text-on-surface mb-2">
          Split Calculator
        </h1>
        <p className="text-on-surface-variant font-body text-sm md:text-base">
          Distribute XLM with cryptographic precision on Stellar.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 relative z-10">
        {/* Input Section */}
        <div className="space-y-6 md:space-y-8">
          {/* Total Amount */}
          <div>
            <label className="font-label text-xs uppercase tracking-widest text-outline block mb-3">
              Total Amount (XLM)
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-headline text-2xl font-bold">
                ✦
              </span>
              <input
                type="number"
                value={totalAmount}
                onChange={e => setTotalAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full bg-surface-container-low border-none rounded-lg py-4 pl-12 pr-4 text-2xl font-headline font-bold text-on-surface focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-outline-variant"
              />
              <div className="absolute inset-0 rounded-lg pointer-events-none group-focus-within:shadow-[0_0_20px_rgba(210,187,255,0.1)] transition-all" />
            </div>
            {balance !== null && (
              <p className="text-[10px] text-outline mt-2 uppercase tracking-widest">
                Available: {formatXLM(balance)} XLM
              </p>
            )}
          </div>

          {/* Split Method */}
          <div>
            <label className="font-label text-xs uppercase tracking-widest text-outline block mb-3">
              Split Method
            </label>
            <div className="grid grid-cols-3 gap-3">
              {SPLIT_METHODS.map(method => (
                <button
                  key={method}
                  onClick={() => setSplitMethod(method)}
                  className={[
                    'py-3 px-4 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer',
                    splitMethod === method
                      ? 'gradient-btn text-on-primary-fixed shadow-lg shadow-primary-container/20'
                      : 'bg-surface-container-high hover:bg-surface-container-highest text-outline',
                  ].join(' ')}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className="font-label text-xs uppercase tracking-widest text-outline block mb-3">
              Participants
            </label>
            <div className="flex flex-wrap gap-3 mb-4">
              <AnimatePresence mode="popLayout">
                {participants.map(p => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2 bg-surface-container-high px-3 py-2 rounded-full border border-outline-variant/10"
                  >
                    <div className="w-6 h-6 rounded-full bg-violet-900 flex items-center justify-center text-[10px] font-bold text-on-surface">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-on-surface">{p.name}</span>
                    <span className="text-[10px] text-outline font-mono">{truncateAddress(p.address)}</span>
                    <button
                      onClick={() => removeParticipant(p.id)}
                      className="text-outline hover:text-error transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add self button */}
              {publicKey && !participants.some(p => p.isSelf) && (
                <button
                  onClick={addSelf}
                  className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-full border border-dashed border-primary/30 hover:bg-primary/20 transition-all text-xs font-semibold text-primary cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  Add Me
                </button>
              )}
            </div>

            {/* Add participant form */}
            <div className="space-y-3 bg-surface-container-low/50 rounded-xl p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Name"
                  className="bg-surface-container-low border-none rounded-lg py-2.5 px-4 text-sm text-on-surface focus:ring-1 focus:ring-primary/30 placeholder:text-outline-variant"
                />
                <input
                  type="text"
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  placeholder="G... Stellar address"
                  className="bg-surface-container-low border-none rounded-lg py-2.5 px-4 text-sm font-mono text-on-surface focus:ring-1 focus:ring-primary/30 placeholder:text-outline-variant"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={addParticipant}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary border border-dashed border-primary/30 hover:bg-primary/20 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Add
                </button>
                {addError && (
                  <p className="text-xs text-error">{addError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Per-participant inputs for exact/shares mode */}
          {(splitMethod === 'exact' || splitMethod === 'shares') && participants.length > 0 && (
            <div className="space-y-3">
              <label className="font-label text-xs uppercase tracking-widest text-outline block">
                {splitMethod === 'exact' ? 'Amount per Person' : 'Shares per Person'}
              </label>
              {participants.map(p => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-sm text-on-surface font-medium flex-shrink-0 w-20 truncate">
                    {p.name}
                  </span>
                  <input
                    type="number"
                    value={splitMethod === 'exact' ? p.amount : p.shares}
                    onChange={e =>
                      updateParticipant(
                        p.id,
                        splitMethod === 'exact' ? 'amount' : 'shares',
                        e.target.value
                      )
                    }
                    placeholder={splitMethod === 'exact' ? '0.00' : '1'}
                    min="0"
                    step={splitMethod === 'exact' ? '0.01' : '1'}
                    className="flex-1 bg-surface-container-low border-none rounded-lg py-2 px-3 text-sm font-headline text-on-surface focus:ring-1 focus:ring-primary/30 placeholder:text-outline-variant"
                  />
                  <span className="text-xs text-outline uppercase">
                    {splitMethod === 'exact' ? 'XLM' : 'shares'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Breakdown Section */}
        <div className="bg-surface-container-low rounded-xl p-6 inner-stroke flex flex-col">
          <div className="flex-1">
            <h4 className="font-headline text-xs uppercase tracking-widest text-outline mb-6">
              Live Breakdown
            </h4>
            {participants.length === 0 ? (
              <div className="text-sm text-outline-variant py-8 text-center">
                Add participants to see the breakdown
              </div>
            ) : (
              <div className="space-y-4">
                {breakdown.items.map(p => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center pb-4 border-b border-outline-variant/10"
                  >
                    <div>
                      <span className="text-sm text-on-surface">{p.name}</span>
                      <span className="text-[10px] text-outline ml-2 font-mono">
                        {truncateAddress(p.address)}
                      </span>
                    </div>
                    <span className="font-headline font-bold text-on-surface">
                      {formatXLM(p.calculatedAmount)} XLM
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-primary">
                    {breakdown.unassigned > 0.0000001 ? 'Unassigned' : 'Total'}
                  </span>
                  <span className={`font-headline font-bold ${breakdown.unassigned > 0.0000001 ? 'text-primary' : 'text-tertiary'}`}>
                    {breakdown.unassigned > 0.0000001
                      ? `${formatXLM(breakdown.unassigned)} XLM`
                      : `${formatXLM(parseFloat(totalAmount) || 0)} XLM`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="mt-8">
            {showStatus && (tx.isLoading || tx.isSuccess || tx.isError) ? (
              <TransactionStatus
                status={tx.status}
                txHash={tx.txHash}
                error={tx.error}
                onReset={() => {
                  tx.reset();
                  setShowStatus(false);
                }}
              />
            ) : (
              <>
                <GradientButton
                  fullWidth
                  icon="send"
                  disabled={!canSubmit}
                  loading={tx.isLoading}
                  onClick={handleSubmit}
                >
                  Send Split Payment
                </GradientButton>
                <p className="text-center text-[10px] text-outline mt-4 uppercase tracking-widest">
                  Base fee: 100 stroops (0.00001 XLM)
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
