import { create } from "zustand";

// UI-only state (per docs/development-guide.md: Zustand is for client/UI
// state, never server data). Not persisted yet — that's a one-line addition
// with zustand/middleware `persist` once a real Sidebar consumer needs it.
interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: false,
  toggle: () => set((state) => ({ collapsed: !state.collapsed })),
}));
