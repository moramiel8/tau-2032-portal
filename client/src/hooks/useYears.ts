import { useYearsContext } from "../context/YearsContext";

export type UseYearsResult = ReturnType<typeof useYearsContext>; // הכי פשוט
export function useYears(): UseYearsResult {
  return useYearsContext();
}
