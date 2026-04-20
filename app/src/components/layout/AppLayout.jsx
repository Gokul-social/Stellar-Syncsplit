import { Outlet } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import TopNav from './TopNav';
import SideNav from './SideNav';
import { useWallet } from '../../hooks/useWallet';

/**
 * App layout shell: TopNav + SideNav + content area.
 * Fixes the sidebar overlap with proper `md:pl-64 pt-24` spacing.
 * Includes mobile bottom navigation bar.
 */
export default function AppLayout() {
  const wallet = useWallet();

  const handleWalletClick = () => {
    if (wallet.isConnected) {
      wallet.disconnect();
    } else {
      wallet.connect();
    }
  };

  const mobileNavItems = [
    { to: '/dashboard', icon: 'grid_view', label: 'Home' },
    { to: '/wallet', icon: 'account_balance', label: 'Assets' },
    { to: '/transactions', icon: 'swap_horiz', label: 'Swap' },
    { to: '/settings', icon: 'settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-surface">
      <TopNav
        onWalletClick={handleWalletClick}
        isConnected={wallet.isConnected}
        truncatedAddr={wallet.truncatedAddr}
      />
      <SideNav
        isConnected={wallet.isConnected}
        truncatedAddr={wallet.truncatedAddr}
        onConnect={wallet.connect}
        connecting={wallet.connecting}
      />

      {/* Main Content — offset for sidebar + topnav */}
      <main className="md:pl-64 pt-24 pb-24 md:pb-12 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <Outlet context={wallet} />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface/90 backdrop-blur-xl z-50 flex justify-around items-center py-3 px-2 border-t border-outline-variant/10">
        {mobileNavItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex flex-col items-center gap-1 transition-colors',
                isActive ? 'text-violet-400' : 'text-outline',
              ].join(' ')
            }
          >
            <span className="material-symbols-outlined">{icon}</span>
            <span className="text-[10px] font-headline uppercase font-bold tracking-tight">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Wallet Error Toast */}
      {wallet.error && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-error-container/90 backdrop-blur-xl text-on-error-container px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 max-w-md">
          <span className="material-symbols-outlined text-error">warning</span>
          <p className="text-sm font-body">{wallet.error}</p>
          <button
            onClick={() => wallet.connect()}
            className="text-xs font-headline font-bold uppercase text-error hover:underline cursor-pointer whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
