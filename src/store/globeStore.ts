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
  setSelectedCity: (city: City | null) => void;
  setNews: (items: NewsItem[], live: boolean) => void;
  setNewsLoading: (v: boolean) => void;
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
  setSelectedCity: (city) => set({ selectedCity: city }),
  setNews: (items, live) => set({ news: items, newsLive: live, newsLoading: false }),
  setNewsLoading: (v) => set({ newsLoading: v }),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  toggleNightLights: () => set((s) => ({ showNightLights: !s.showNightLights })),
}));
