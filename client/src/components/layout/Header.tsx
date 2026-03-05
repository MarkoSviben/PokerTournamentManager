import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
  const { admin, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/blind-structures', label: 'Blinds' },
    { path: '/players', label: 'Players' },
    { path: '/tournaments/new', label: 'New Tournament' },
    ...(admin?.id === 1 ? [{ path: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <header className="bg-[var(--casino-green)] border-b border-[var(--casino-gold)]/30 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-[var(--casino-gold)] font-bold text-xl tracking-wider">
            PTM
          </Link>
          <nav className="hidden md:flex gap-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  location.pathname === item.path
                    ? 'bg-[var(--casino-gold)]/20 text-[var(--casino-gold)]'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{admin?.displayName}</span>
          <button
            onClick={logout}
            className="text-sm text-gray-400 hover:text-[var(--casino-red)] transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
      {/* Mobile nav */}
      <nav className="md:hidden flex gap-1 mt-2 overflow-x-auto pb-1">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`px-3 py-1.5 rounded text-sm whitespace-nowrap transition-colors ${
              location.pathname === item.path
                ? 'bg-[var(--casino-gold)]/20 text-[var(--casino-gold)]'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
