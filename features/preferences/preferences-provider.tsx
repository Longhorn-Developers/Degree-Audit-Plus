import LoadingPage from "@/features/audit/components/loading-page";
import {
  DEFAULT_PREFERENCES,
  initPreferences,
  setPreference,
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
    void setPreference("luminosity", value).catch((error) =>
      console.error("Failed to save luminosity preference:", error),
    );
  }, []);
  const setSidebarIsOpen = useCallback((value: boolean) => {
    setSidebarState(value);
    void setPreference("showSidebar", value).catch((error) =>
      console.error("Failed to save sidebar preference:", error),
    );
  }, []);
  const setViewMode = useCallback((value: ViewMode) => {
    setViewModeState(value);
    void setPreference("viewMode", value).catch((error) =>
      console.error("Failed to save view preference:", error),
    );
  }, []);
  const updateLastAuditId = useCallback((value: string) => {
    setLastAuditId(value);
    void setPreference("lastAuditId", value).catch((error) =>
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
