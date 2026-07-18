// For handling saved preferences like dark mode between sessions.

import LoadingPage from "@/components/loading-page";
import {
  DEFAULT_PREFERENCES,
  initPreferences,
  lastAuditIdItem,
  luminosityItem,
  showSidebarItem,
  viewModeItem,
  type PreferredLuminosity,
  type ViewMode,
} from "./preferences-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

interface PreferencesContextValue {
  luminosity: PreferredLuminosity;
  setLuminosity: (value: PreferredLuminosity) => void;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
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

interface PreferenceItem<T> {
  setValue(value: T): Promise<void>;
  watch(callback: (value: T) => void): () => void;
}

/**
 * State for one preference item: a cross-context watch() subscription plus a
 * persisting setter. The third element updates React state without writing
 * storage — used by the initial batched load.
 */
function usePersistedPreference<T>(
  item: PreferenceItem<T>,
  initial: T,
  label: string,
): [T, (value: T) => void, Dispatch<SetStateAction<T>>] {
  const [value, setLocal] = useState(initial);

  useEffect(() => item.watch(setLocal), [item]);

  const setAndPersist = useCallback(
    (next: T) => {
      setLocal(next);
      void item
        .setValue(next)
        .catch((error) =>
          console.error(`Failed to save ${label} preference:`, error),
        );
    },
    [item, label],
  );

  return [value, setAndPersist, setLocal];
}

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [prefersDark, setPrefersDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [sidebarIsOpen, setSidebarIsOpen, setSidebarState] =
    usePersistedPreference(
      showSidebarItem,
      DEFAULT_PREFERENCES.showSidebar,
      "sidebar",
    );
  const [luminosity, setLuminosity, setLuminosityState] =
    usePersistedPreference(
      luminosityItem,
      DEFAULT_PREFERENCES.luminosity,
      "luminosity",
    );
  const [viewMode, setViewMode, setViewModeState] = usePersistedPreference(
    viewModeItem,
    DEFAULT_PREFERENCES.viewMode,
    "view",
  );
  const [lastAuditId, updateLastAuditId, setLastAuditId] =
    usePersistedPreference(
      lastAuditIdItem,
      DEFAULT_PREFERENCES.lastAuditId,
      "audit",
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
  }, [setSidebarState, setLuminosityState, setViewModeState, setLastAuditId]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) =>
      setPrefersDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const isDarkMode =
    luminosity === "dark" || (luminosity === "system" && prefersDark);

  useEffect(() => {
    if (!isMounted) return;
    document.documentElement.classList.toggle("dark", isDarkMode);
    document.documentElement.classList.remove("light", "system");
  }, [isDarkMode, isMounted]);

  const toggleDarkMode = useCallback(
    () => setLuminosity(isDarkMode ? "light" : "dark"),
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
      {children}
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
