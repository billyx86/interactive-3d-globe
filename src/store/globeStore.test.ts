import { beforeEach, describe, expect, it } from "vitest";
import { useGlobeStore } from "./globeStore";
import type { City } from "../data/cities";
import type { NewsItem } from "../data/news";

const CITY: City = {
  id: "test",
  name: "Testville",
  country: "Testland",
  lat: 10,
  lon: 20,
  population: "1M",
  timezone: "UTC",
  description: "A test city.",
  keywords: ["test"],
};

const NEWS: NewsItem = {
  id: "n1",
  title: "Test headline",
  summary: "Test summary",
  source: "Test Source",
  url: "https://example.com",
  publishedAt: new Date().toISOString(),
};

describe("globeStore", () => {
  beforeEach(() => {
    useGlobeStore.setState({
      selectedCity: null,
      news: [],
      newsLive: false,
      newsLoading: true,
      autoRotate: true,
      showNightLights: true,
    });
  });

  it("selects and clears a city", () => {
    const s = useGlobeStore.getState();
    s.setSelectedCity(CITY);
    expect(useGlobeStore.getState().selectedCity?.id).toBe("test");
    s.setSelectedCity(null);
    expect(useGlobeStore.getState().selectedCity).toBeNull();
  });

  it("setNews stores items, marks live and stops loading", () => {
    useGlobeStore.getState().setNews([NEWS], true);
    const st = useGlobeStore.getState();
    expect(st.news).toEqual([NEWS]);
    expect(st.newsLive).toBe(true);
    expect(st.newsLoading).toBe(false);
  });

  it("toggles autoRotate and nightLights independently", () => {
    const s = useGlobeStore.getState();
    s.toggleAutoRotate();
    s.toggleNightLights();
    const st = useGlobeStore.getState();
    expect(st.autoRotate).toBe(false);
    expect(st.showNightLights).toBe(false);
    st.toggleAutoRotate();
    expect(useGlobeStore.getState().autoRotate).toBe(true);
    expect(useGlobeStore.getState().showNightLights).toBe(false);
  });

  it("setNewsLoading updates the loading flag", () => {
    useGlobeStore.getState().setNewsLoading(false);
    expect(useGlobeStore.getState().newsLoading).toBe(false);
  });
});
