// Which field of a form is "open" right now (e.g. the iOS calendar of a
// DateField). Focusing a text field, opening another date field or tapping
// an empty part of the form closes it. Provided by BottomSheet.
import { createContext, useContext, useState, type ReactNode } from "react";

type FormFocus = {
  /** Id of the open date field, or null */
  activeId: string | null;
  setActiveId: (id: string | null) => void;
};

const FormFocusContext = createContext<FormFocus | null>(null);

export function FormFocusProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  return (
    <FormFocusContext.Provider value={{ activeId, setActiveId }}>{children}</FormFocusContext.Provider>
  );
}

/** Outside a provider (field not in a sheet) each field keeps its own state. */
export function useFormFocus(): FormFocus | null {
  return useContext(FormFocusContext);
}
