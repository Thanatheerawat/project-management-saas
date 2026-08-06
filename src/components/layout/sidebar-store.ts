import { create } from "zustand";

// UI-only state (per docs/development-guide.md: Zustand is for client/UI
// state, never server data). Not persisted yet — that's a one-line addition
// with zustand/middleware `persist` once a real Sidebar consumer needs it.
//
// `mobileOpen` is deliberately separate from `collapsed`: collapsed is the
// desktop icon-only-narrow affordance, while mobileOpen drives the
// Sheet-based drawer that only exists below the `md` breakpoint. They
// can't be merged into one boolean — a desktop user's collapsed state
// shouldn't change just because a phone-width viewport opened/closed its
// drawer, and vice versa.
interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: false,
  toggle: () => set((state) => ({ collapsed: !state.collapsed })),
  mobileOpen: false,
  setMobileOpen: (open) => set({ mobileOpen: open }),
}));
