import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bell,
  ChevronDown,
  CreditCard,
  Home,
  KeyRound,
  Lock,
  Shield,
  X,
} from 'lucide-react';
import { API_ENDPOINTS, ApiCategory } from '../data/apiCatalog';
import { DEFAULT_CATEGORY_ORDER, PageRoute, UserProfile } from '../types/app';

interface SidebarNavProps {
  brandName: string;
  currentRoute: PageRoute;
  categoryOrder: string[];
  hiddenCategories: string[];
  hiddenEndpointIds: string[];
  deletedEndpointIds: string[];
  privateEndpointIds: string[];
  onNavigate: (route: PageRoute) => void;
  onOpenNotifications: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  unreadCount: number;
  userProfile: UserProfile | null;
}

const CATEGORY_GROUPS: Array<{ id: ApiCategory; label: string }> = [
  { id: 'cuaca', label: 'Data Cuaca' },
  { id: 'kurs', label: 'Konversi Mata Uang' },
  { id: 'integrasi', label: 'Integrasi Pihak Ketiga' },
  { id: 'spotify', label: 'Spotify Music & Audio' },
  { id: 'streaming', label: 'Streaming' },
];

interface SidebarBodyProps {
  brandName: string;
  currentRoute: PageRoute;
  routeKey: string;
  orderedGroups: Array<{ id: ApiCategory; label: string }>;
  hiddenCategories: string[];
  hiddenEndpointIds: string[];
  deletedEndpointIds: string[];
  privateEndpointIds: string[];
  openGroups: Record<string, boolean>;
  onToggleGroup: (id: string) => void;
  onGo: (route: PageRoute) => void;
  onOpenNotifs: () => void;
  onCloseMobile: () => void;
  unreadCount: number;
  userProfile: UserProfile | null;
  isDrawer?: boolean;
}

function SidebarBody({
  brandName,
  currentRoute,
  routeKey,
  orderedGroups,
  hiddenCategories,
  hiddenEndpointIds,
  deletedEndpointIds,
  privateEndpointIds,
  openGroups,
  onToggleGroup,
  onGo,
  onOpenNotifs,
  onCloseMobile,
  unreadCount,
  userProfile,
  isDrawer = false,
}: SidebarBodyProps) {
  const navRef = useRef<HTMLElement | null>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);
  const lastScrolledRouteKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const isInitialMount = lastScrolledRouteKeyRef.current === null;
    lastScrolledRouteKeyRef.current = routeKey;

    const scrollToActive = (forceCenter: boolean, behavior: ScrollBehavior) => {
      const navEl = navRef.current;
      const activeEl = activeItemRef.current;
      if (!navEl || !activeEl) return;

      const navRect = navEl.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      if (navRect.height === 0 || elRect.height === 0) return;

      const elTopInNav = elRect.top - navRect.top;
      const elBottomInNav = elRect.bottom - navRect.top;
      const comfortMargin = 40;
      const outOfView =
        elTopInNav < comfortMargin || elBottomInNav > navRect.height - comfortMargin;

      if (forceCenter || outOfView) {
        const targetTop = Math.max(
          0,
          navEl.scrollTop + elTopInNav - navRect.height / 2 + elRect.height / 2
        );
        navEl.scrollTo({
          top: targetTop,
          behavior,
        });
      }
    };

    const rafId = window.requestAnimationFrame(() => {
      // Saat drawer dibuka ulang atau pertama kali mount, langsung posisikan ke item aktif
      scrollToActive(isInitialMount || isDrawer, isInitialMount ? 'auto' : 'smooth');
    });

    // Re-check setelah animasi expand accordion (200ms) selesai bila grup baru dibuka otomatis
    const timerId = window.setTimeout(() => {
      scrollToActive(false, isInitialMount ? 'auto' : 'smooth');
    }, 240);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
    };
  }, [routeKey, isDrawer]);

  return (
    <div className="flex h-full flex-col bg-white text-slate-700 dark:bg-[#0A0A0A] dark:text-slate-300">
      {/* Mobile Sidebar Header */}
      <div className="flex h-14 items-center justify-between border-b border-slate-200/70 px-4 dark:border-white/[0.08] lg:hidden">
        <span className="font-display text-sm font-semibold text-slate-900 dark:text-white">
          {brandName}
        </span>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Tutup sidebar"
          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06] cursor-pointer"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Scrollable Navigation Tree */}
      <nav
        ref={navRef}
        aria-label="Menu dokumentasi"
        className="flex-1 overflow-y-auto overscroll-contain px-3 py-5 space-y-5"
      >
        {/* Top Pages Section */}
        <div className="space-y-0.5">
          <button
            ref={currentRoute.page === 'welcome' ? activeItemRef : undefined}
            type="button"
            onClick={() => onGo({ page: 'welcome' })}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150 cursor-pointer ${
              currentRoute.page === 'welcome'
                ? 'bg-sky-500/12 text-sky-700 font-semibold dark:bg-sky-500/15 dark:text-sky-300'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200'
            }`}
          >
            <Home className="h-4 w-4 shrink-0" />
            <span>Welcome</span>
          </button>

          <button
            ref={currentRoute.page === 'keys' ? activeItemRef : undefined}
            type="button"
            onClick={() => onGo({ page: 'keys' })}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150 cursor-pointer ${
              currentRoute.page === 'keys'
                ? 'bg-sky-500/12 text-sky-700 font-semibold dark:bg-sky-500/15 dark:text-sky-300'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200'
            }`}
          >
            <KeyRound className="h-4 w-4 shrink-0" />
            <span>Kunci API &amp; Kuota</span>
          </button>

          <button
            ref={currentRoute.page === 'pricing' ? activeItemRef : undefined}
            type="button"
            onClick={() => onGo({ page: 'pricing' })}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150 cursor-pointer ${
              currentRoute.page === 'pricing'
                ? 'bg-sky-500/12 text-sky-700 font-semibold dark:bg-sky-500/15 dark:text-sky-300'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200'
            }`}
          >
            <CreditCard className="h-4 w-4 shrink-0" />
            <span>Paket &amp; Upgrade</span>
          </button>

          <button
            type="button"
            onClick={onOpenNotifs}
            className="flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200 cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Bell className="h-4 w-4 shrink-0" />
              <span>Notifikasi</span>
            </span>
            {unreadCount > 0 && (
              <span className="font-mono text-[11px] font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>

          {userProfile?.role === 'admin' && (
            <button
              ref={currentRoute.page === 'admin' ? activeItemRef : undefined}
              type="button"
              onClick={() => onGo({ page: 'admin' })}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150 cursor-pointer ${
                currentRoute.page === 'admin'
                  ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                  : 'text-amber-700 hover:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/10'
              }`}
            >
              <Shield className="h-4 w-4 shrink-0" />
              <span>Dashboard Admin</span>
            </button>
          )}
        </div>

        {/* Hierarchical API Endpoint Tree ordered dynamically */}
        <div className="border-t border-slate-200/70 pt-4 dark:border-white/[0.08] space-y-2.5">
          <div className="px-3 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Referensi Endpoint
          </div>

          {orderedGroups.map((group) => {
            if (hiddenCategories.includes(group.id)) return null;
            const endpoints = API_ENDPOINTS.filter(
              (ep) =>
                ep.category === group.id &&
                !hiddenEndpointIds.includes(ep.id) &&
                !deletedEndpointIds.includes(ep.id)
            );
            if (endpoints.length === 0) return null;
            const isOpen = openGroups[group.id] ?? true;
            return (
              <div key={group.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => onToggleGroup(group.id)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-800 transition-colors duration-150 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/[0.04] cursor-pointer"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ease-out-expo ${
                      isOpen ? 'rotate-0 text-slate-500 dark:text-slate-400' : '-rotate-90 text-slate-400'
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="ml-3.5 border-l border-slate-200/70 pl-2.5 dark:border-white/[0.08] space-y-1 py-0.5">
                        {(() => {
                          const directEndpoints = endpoints.filter((ep) => !ep.subGroup);
                          const subGroupNames: string[] = [];
                          const subGroupMap = new Map<string, typeof endpoints>();
                          for (const ep of endpoints) {
                            if (!ep.subGroup) continue;
                            if (!subGroupMap.has(ep.subGroup)) {
                              subGroupNames.push(ep.subGroup);
                              subGroupMap.set(ep.subGroup, []);
                            }
                            subGroupMap.get(ep.subGroup)!.push(ep);
                          }

                          const renderEndpointBtn = (ep: (typeof endpoints)[number]) => {
                            const active =
                              currentRoute.page === 'docs' && currentRoute.endpointId === ep.id;
                            return (
                              <button
                                key={ep.id}
                                ref={active ? activeItemRef : undefined}
                                type="button"
                                onClick={() => onGo({ page: 'docs', endpointId: ep.id })}
                                className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors duration-150 cursor-pointer ${
                                  active
                                    ? 'bg-sky-500/12 font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.03] dark:hover:text-slate-200'
                                }`}
                              >
                                <span className="flex items-center gap-1.5 min-w-0">
                                  {privateEndpointIds.includes(ep.id) && (
                                    <Lock
                                      className="h-3 w-3 shrink-0 text-amber-500 dark:text-amber-400"
                                      aria-label="Endpoint Private"
                                    />
                                  )}
                                  <span className="truncate">{ep.title}</span>
                                </span>
                                <span
                                  className={`shrink-0 font-mono text-[10px] font-semibold ${
                                    ep.method === 'GET'
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-sky-600 dark:text-sky-400'
                                  }`}
                                >
                                  {ep.method}
                                </span>
                              </button>
                            );
                          };

                          return (
                            <>
                              {directEndpoints.map(renderEndpointBtn)}
                              {subGroupNames.map((subName) => {
                                const subKey = `${group.id}:${subName}`;
                                const isSubOpen = openGroups[subKey] ?? true;
                                const subEndpoints = subGroupMap.get(subName) ?? [];
                                return (
                                  <div key={subKey} className="space-y-0.5 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => onToggleGroup(subKey)}
                                      className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/[0.04] cursor-pointer"
                                    >
                                      <span className="truncate">{subName}</span>
                                      <ChevronDown
                                        className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out-expo ${
                                          isSubOpen
                                            ? 'rotate-0 text-slate-500 dark:text-slate-400'
                                            : '-rotate-90 text-slate-400'
                                        }`}
                                      />
                                    </button>

                                    <AnimatePresence initial={false}>
                                      {isSubOpen && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: 'auto' }}
                                          exit={{ opacity: 0, height: 0 }}
                                          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                          className="overflow-hidden"
                                        >
                                          <div className="ml-3 border-l border-slate-200/70 pl-2.5 dark:border-white/[0.08] space-y-0.5 py-0.5">
                                            {subEndpoints.map(renderEndpointBtn)}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })}
                            </>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Bottom Credit Status Footer */}
      <div className="border-t border-slate-200/70 px-4 py-3.5 dark:border-white/[0.08] text-xs">
        {userProfile ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Role</span>
              <span className="font-mono font-medium uppercase text-slate-900 dark:text-slate-200">
                {userProfile.role}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Kredit</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-200 tabular-nums">
                {userProfile.role === 'admin' || userProfile.dailyLimit === -1
                  ? 'Unlimited'
                  : `${userProfile.creditsUsedToday} / ${userProfile.dailyLimit}`}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            Masuk Google untuk 10 kredit gratis/hari.
          </p>
        )}
      </div>
    </div>
  );
}

export function SidebarNav({
  brandName,
  currentRoute,
  categoryOrder,
  hiddenCategories,
  hiddenEndpointIds,
  deletedEndpointIds,
  privateEndpointIds,
  onNavigate,
  onOpenNotifications,
  mobileOpen,
  onCloseMobile,
  unreadCount,
  userProfile,
}: SidebarNavProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    cuaca: true,
    kurs: true,
    integrasi: true,
    spotify: true,
    streaming: true,
    'streaming:PineDrama': true,
    'streaming:DramaBox': true,
  });

  const routeKey =
    currentRoute.page === 'docs' ? `docs:${currentRoute.endpointId}` : currentRoute.page;

  // Pastikan kategori & sub-grup dari halaman dokumentasi aktif selalu terbuka
  useEffect(() => {
    if (currentRoute.page !== 'docs') return;
    const ep = API_ENDPOINTS.find((item) => item.id === currentRoute.endpointId);
    if (!ep) return;
    setOpenGroups((prev) => {
      const catKey = ep.category;
      const subKey = ep.subGroup ? `${ep.category}:${ep.subGroup}` : null;
      const needsCat = !prev[catKey];
      const needsSub = Boolean(subKey && !prev[subKey]);
      if (!needsCat && !needsSub) return prev;
      return {
        ...prev,
        [catKey]: true,
        ...(subKey ? { [subKey]: true } : {}),
      };
    });
  }, [currentRoute]);

  const orderedGroups = useMemo(() => {
    const order =
      Array.isArray(categoryOrder) && categoryOrder.length > 0
        ? categoryOrder
        : DEFAULT_CATEGORY_ORDER;
    return [...CATEGORY_GROUPS].sort((a, b) => {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      const rankA = ia === -1 ? 999 : ia;
      const rankB = ib === -1 ? 999 : ib;
      return rankA - rankB;
    });
  }, [categoryOrder]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGo = (route: PageRoute) => {
    onNavigate(route);
    onCloseMobile();
  };

  const handleOpenNotifs = () => {
    onCloseMobile();
    onOpenNotifications();
  };

  const sharedBodyProps: Omit<SidebarBodyProps, 'isDrawer'> = {
    brandName,
    currentRoute,
    routeKey,
    orderedGroups,
    hiddenCategories,
    hiddenEndpointIds,
    deletedEndpointIds,
    privateEndpointIds,
    openGroups,
    onToggleGroup: toggleGroup,
    onGo: handleGo,
    onOpenNotifs: handleOpenNotifs,
    onCloseMobile,
    unreadCount,
    userProfile,
  };

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200/70 dark:border-white/[0.08]">
        <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
          <SidebarBody {...sharedBodyProps} />
        </div>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden overscroll-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 bg-black/65 touch-none"
              onClick={onCloseMobile}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-72 max-w-[85vw] h-full border-r border-slate-200/70 dark:border-white/[0.08] shadow-2xl"
            >
              <SidebarBody {...sharedBodyProps} isDrawer />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
