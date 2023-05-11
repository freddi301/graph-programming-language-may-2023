import React from "react";

export function useLocalStorage<Value>({
  key,
  initialValue,
  serialize,
  deserialize,
}: {
  key: string;
  initialValue: Value;
  serialize(value: Value): string;
  deserialize(value: string): Value | null;
}) {
  const [storedValue, setStoredValue] = React.useState<Value>(() => {
    const item = window.localStorage.getItem(key);
    if (item) {
      const deserialized = deserialize(item);
      if (deserialized) {
        return deserialized;
      }
    }
    return initialValue;
  });
  const setValue = (value: Value) => {
    const serialized = serialize(value);
    window.localStorage.setItem(key, serialized);
    setStoredValue(value);
  };
  return [storedValue, setValue] as const;
}
