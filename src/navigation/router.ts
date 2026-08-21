import { create } from 'zustand';

export type Route = 'boot' | 'onboarding' | 'ignition' | 'dash' | 'settings';

interface RouterState {
  route: Route;
  /** Screens visited, so Settings can return wherever it was opened from. */
  history: Route[];
  navigate: (route: Route) => void;
  back: () => void;
  reset: (route: Route) => void;
}

export const useRouter = create<RouterState>()((set, get) => ({
  route: 'boot',
  history: [],
  navigate: (route) => {
    if (route === get().route) return;
    set({ route, history: [...get().history, get().route].slice(-8) });
  },
  back: () => {
    const history = [...get().history];
    const previous = history.pop();
    set({ route: previous ?? 'dash', history });
  },
  reset: (route) => set({ route, history: [] }),
}));

/** Imperative helpers so components do not need the hook just to navigate. */
export const navigate = (route: Route) => useRouter.getState().navigate(route);
export const goBack = () => useRouter.getState().back();
export const resetTo = (route: Route) => useRouter.getState().reset(route);
