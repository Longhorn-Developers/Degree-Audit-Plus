// For handling saved preferences like dark mode between sessions.

import LoadingPage from "@/features/audit/components/loading-page";
import {
  DEFAULT_PREFERENCES,
  initPreferences,
  lastAuditIdItem,
  luminosityItem,
  showSidebarItem,
  viewModeItem,
  type PreferredLuminosity,
  type ViewMode,
} from "@/lib/storage/preferences-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface PreferencesContextValue {
  luminosity: PreferredLuminosity;
  setLuminosity: (value: PreferredLuminosity) => void;
  toggleDarkMode: () => void;
  isDarkMode: () => boolean;
  sidebarIsOpen: boolean;
  setSidebarIsOpen: (value: boolean) => void;
  toggleSidebar: () => void;
  viewMode: ViewMode;
  setViewMode: (value: ViewMode) => void;
  toggleViewMode: () => void;
  lastAuditId: string | null;
  updateLastAuditId: (value: string) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [lastAuditId, setLastAuditId] = useState(
    DEFAULT_PREFERENCES.lastAuditId,
  );
  const [viewMode, setViewModeState] = useState(DEFAULT_PREFERENCES.viewMode);
  const [sidebarIsOpen, setSidebarState] = useState(
    DEFAULT_PREFERENCES.showSidebar,
  );
  const [luminosity, setLuminosityState] = useState(
    DEFAULT_PREFERENCES.luminosity,
  );

  // Initial load — read all prefs at once.
  useEffect(() => {
    void initPreferences()
      .then((preferences) => {
        setSidebarState(preferences.showSidebar);
        setLuminosityState(preferences.luminosity);
        setViewModeState(preferences.viewMode);
        setLastAuditId(preferences.lastAuditId);
      })
      .catch((error) => console.error("Failed to load preferences:", error))
      .finally(() => setIsMounted(true));
  }, []);

  // watch() keeps the page in sync when preferences change from another
  // context (e.g. a background re-scrape, or the popup writing to sync
  // storage).  Replaces the hand-rolled browser.storage.onChanged pattern.
  useEffect(() => {
    const unwatchSidebar = showSidebarItem.watch((value: boolean) => {
      setSidebarState(value);
    });
    const unwatchLuminosity = luminosityItem.watch(
      (value: PreferredLuminosity) => {
        setLuminosityState(value);
      },
    );
    const unwatchViewMode = viewModeItem.watch((value: ViewMode) => {
      setViewModeState(value);
    });
    const unwatchLastAuditId = lastAuditIdItem.watch((value: string | null) => {
      setLastAuditId(value);
    });

    return () => {
      unwatchSidebar();
      unwatchLuminosity();
      unwatchViewMode();
      unwatchLastAuditId();
    };
  }, []);

  const isDarkMode = useCallback(
    () =>
      luminosity === "dark" ||
      (luminosity === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches),
    [luminosity],
  );

  useEffect(() => {
    if (!isMounted) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      document.documentElement.classList.toggle("dark", isDarkMode());
      document.documentElement.classList.remove("light", "system");
    };
    applyTheme();

    if (luminosity === "system") {
      media.addEventListener("change", applyTheme);
      return () => media.removeEventListener("change", applyTheme);
    }
  }, [isDarkMode, isMounted, luminosity]);

  const setLuminosity = useCallback((value: PreferredLuminosity) => {
    setLuminosityState(value);
    void luminosityItem
      .setValue(value)
      .catch((error) =>
        console.error("Failed to save luminosity preference:", error),
      );
  }, []);
  const setSidebarIsOpen = useCallback((value: boolean) => {
    setSidebarState(value);
    void showSidebarItem
      .setValue(value)
      .catch((error) =>
        console.error("Failed to save sidebar preference:", error),
      );
  }, []);
  const setViewMode = useCallback((value: ViewMode) => {
    setViewModeState(value);
    void viewModeItem
      .setValue(value)
      .catch((error) =>
        console.error("Failed to save view preference:", error),
      );
  }, []);
  const updateLastAuditId = useCallback((value: string) => {
    setLastAuditId(value);
    void lastAuditIdItem
      .setValue(value)
      .catch((error) =>
        console.error("Failed to save audit preference:", error),
      );
  }, []);

  const toggleDarkMode = useCallback(
    () => setLuminosity(isDarkMode() ? "light" : "dark"),
    [setLuminosity, isDarkMode],
  );
  const toggleSidebar = useCallback(
    () => setSidebarIsOpen(!sidebarIsOpen),
    [setSidebarIsOpen, sidebarIsOpen],
  );
  const toggleViewMode = useCallback(
    () => setViewMode(viewMode === "audit" ? "planner" : "audit"),
    [setViewMode, viewMode],
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({
      luminosity,
      setLuminosity,
      toggleDarkMode,
      isDarkMode,
      sidebarIsOpen,
      setSidebarIsOpen,
      toggleSidebar,
      viewMode,
      setViewMode,
      toggleViewMode,
      lastAuditId,
      updateLastAuditId,
    }),
    [
      luminosity,
      setLuminosity,
      toggleDarkMode,
      isDarkMode,
      sidebarIsOpen,
      setSidebarIsOpen,
      toggleSidebar,
      viewMode,
      setViewMode,
      toggleViewMode,
      lastAuditId,
      updateLastAuditId,
    ],
  );

  if (!isMounted) return <LoadingPage />;

  return (
    <PreferencesContext.Provider value={value}>
      <div className="min-h-screen bg-background text-text">{children}</div>
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}
