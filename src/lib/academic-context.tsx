import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { SCHOOL, TERMS, SESSIONS } from "@/data/school";

type AcademicContextValue = {
  session: string;
  term: string;
  setSession: (session: string) => void;
  setTerm: (term: string) => void;
};

const AcademicContext = createContext<AcademicContextValue | null>(null);

function readStoredValue(key: string, fallback: string, options: string[]) {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  return value && options.includes(value) ? value : fallback;
}

export function AcademicContextProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(SCHOOL.session);
  const [term, setTerm] = useState(SCHOOL.term);

  useEffect(() => {
    setSession(readStoredValue("educore.session", SCHOOL.session, SESSIONS));
    setTerm(readStoredValue("educore.term", SCHOOL.term, TERMS));
  }, []);

  useEffect(() => {
    window.localStorage.setItem("educore.session", session);
  }, [session]);

  useEffect(() => {
    window.localStorage.setItem("educore.term", term);
  }, [term]);

  return <AcademicContext.Provider value={{ session, term, setSession, setTerm }}>{children}</AcademicContext.Provider>;
}

export function useAcademicContext() {
  const context = useContext(AcademicContext);
  if (!context) throw new Error("useAcademicContext must be used inside AcademicContextProvider");
  return context;
}