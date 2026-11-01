import { create } from "zustand";
import type { City } from "../data/cities";
import type { NewsItem } from "../data/news";

type GlobeState = {
  selectedCity: City | null;
  news: NewsItem[];
  newsLive: boolean;
  newsLoading: boolean;
  autoRotate: boolean;
  showNightLights: boolean;
  /** OS-level prefers-reduced-motion — freezes spin, pulses and twinkle. */
  reducedMotion: boolean;
  setSelectedCity: (city: City | null) => void;
  /** When the current news items were fetched (epoch ms); null = never. */
  newsLoadedAt: number | null;
  setNews: (items: NewsItem[], live: boolean) => void;
  setNewsLoading: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  toggleAutoRotate: () => void;
  toggleNightLights: () => void;
};

export const useGlobeStore = create<GlobeState>((set) => ({
  selectedCity: null,
  news: [],
  newsLive: false,
  newsLoading: true,
  autoRotate: true,
  showNightLights: true,
  reducedMotion: false,
  newsLoadedAt: null,
  setSelectedCity: (city) => set({ selectedCity: city }),
  setNews: (items, live) =>
    set({ news: items, newsLive: live, newsLoading: false, newsLoadedAt: Date.now() }),
  setNewsLoading: (v) => set({ newsLoading: v }),
  setReducedMotion: (v) => set({ reducedMotion: v }),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  toggleNightLights: () => set((s) => ({ showNightLights: !s.showNightLights })),
}));
