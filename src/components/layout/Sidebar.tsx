import { NavLink } from 'react-router-dom';
import { LayoutGrid, Clock, MessageCircle, Settings, CalendarPlus, Store } from 'lucide-react';
import { Logo } from '../ui/Logo';

const navItems = [
  { to: '/campaigns', icon: LayoutGrid, label: 'Campaigns' },
  { to: '/last-30-days', icon: Clock, label: 'Last 30 Days' },
  { to: '/whatsapp', icon: MessageCircle, label: 'WhatsApp', badge: 'Live' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  return (
    <aside className="flex flex-col w-64 shrink-0 h-screen bg-sidebar-bg text-sidebar-text sticky top-0 overflow-y-auto border-r border-sidebar-border select-none shadow-xl">
      {/* Brand Header */}
      <div className="px-6 py-5 border-b border-sidebar-border">
        <Logo theme="dark" size="sm" />
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-6 space-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200/70 px-3 mb-2">Navigation</p>
        {navItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-sidebar-active text-sidebar-text-active shadow-sm border-l-4 border-indigo-200'
                  : 'text-sidebar-text/80 hover:bg-sidebar-hover/50 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-indigo-100' : 'text-indigo-200/80'} />
                  <span>{label}</span>
                </div>
                {badge && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Calendar section */}
        <div className="pt-6 mt-4 border-t border-sidebar-border">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200/70 px-3 mb-2">Calendar & Branch</p>
          <NavLink
            to="/settings/calendars"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-sidebar-active text-sidebar-text-active shadow-sm border-l-4 border-indigo-200'
                  : 'text-sidebar-text/80 hover:bg-sidebar-hover/50 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <CalendarPlus size={18} className={isActive ? 'text-indigo-100' : 'text-indigo-200/80'} />
                <span>Store Branches</span>
              </>
            )}
          </NavLink>
        </div>

        <div className="pt-6 mt-4 border-t border-sidebar-border">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200/70 px-3 mb-2">Promotional Stand</p>
          <NavLink
            to="/promotional-stand"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-sidebar-active text-sidebar-text-active shadow-sm border-l-4 border-indigo-200'
                  : 'text-sidebar-text/80 hover:bg-sidebar-hover/50 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Store size={18} className={isActive ? 'text-indigo-100' : 'text-indigo-200/80'} />
                <span>Stand leads</span>
              </>
            )}
          </NavLink>
        </div>
      </nav>

    </aside>
  );
}
