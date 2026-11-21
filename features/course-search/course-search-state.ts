import type { CoreArea } from "@/domain/course";
import { useCallback, useState } from "react";

export interface CourseSearchData {
  searchQuery: string;
  department: string;
  lowerDivision: boolean;
  upperDivision: boolean;
  core?: CoreArea;
}

export const EMPTY_FORM: CourseSearchData = {
  searchQuery: "",
  department: "",
  lowerDivision: true,
  upperDivision: true,
};

// session storage so a refresh keeps the last search but a new tab starts empty
export function useSessionState<T>(
  key: string,
  initial: T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const saved = sessionStorage.getItem(key);
    if (saved === null) return initial;
    return JSON.parse(saved) as T;
  });

  const setAndSave = useCallback(
    (next: T) => {
      setValue(next);
      sessionStorage.setItem(key, JSON.stringify(next));
    },
    [key],
  );

  return [value, setAndSave];
}
