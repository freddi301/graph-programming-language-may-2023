import React from "react";

type Theme = {
  backgroundColor: string;
  backgroundColorSecondary: string;
  backgroundColorHighlight: string;
  textColor: string;
  textColorSecondary: string;
  fontFamily: string;
};

const defaultTheme: Theme = {
  backgroundColor: "#263238",
  backgroundColorSecondary: "#37474f",
  backgroundColorHighlight: "#546e7a",
  textColor: "#eceff1",
  textColorSecondary: "#90a4ae",
  fontFamily: "'JetBrains Mono', monospace",
};

const ThemeContext = React.createContext(defaultTheme);

export function useTheme() {
  return React.useContext(ThemeContext);
}
