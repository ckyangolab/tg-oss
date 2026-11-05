import { renderHook, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

let useMeltingTemp;
let useTmType;

describe("local storage backed editor preferences", () => {
  let warnings;
  let warn;
  beforeEach(async () => {
    // tg-use-local-storage-state reads these globals (and patches
    // Storage.prototype) when it is imported, so import it once jsdom is set up
    global.localStorage = window.localStorage;
    global.Storage = window.Storage;
    global.CustomEvent = window.CustomEvent;
    useMeltingTemp = (await import("../src/utils/useMeltingTemp")).default;
    useTmType = (await import("../src/utils/useTmType")).default;
    window.localStorage.clear();
    warnings = [];
    warn = console.warn;
    console.warn = (...args) => warnings.push(args);
  });
  afterEach(() => {
    cleanup();
    console.warn = warn;
  });

  it("reads a value that was never stored as the default, without a warning", () => {
    const { result } = renderHook(() => useMeltingTemp());
    expect(result.current[0]).toBeUndefined();
    expect(warnings).toEqual([]);
  });

  it("reads an empty stored value as the default, without a warning", () => {
    window.localStorage.setItem("showMeltingTemp", "");
    window.localStorage.setItem("tmType", "");
    const { result } = renderHook(() => [useMeltingTemp(), useTmType()]);
    expect(result.current[0][0]).toBeUndefined();
    expect(result.current[1][0]).toBe("default");
    expect(warnings).toEqual([]);
  });

  it("still reads stored values", () => {
    window.localStorage.setItem("showMeltingTemp", "true");
    window.localStorage.setItem("tmType", "breslauer");
    const { result } = renderHook(() => [useMeltingTemp(), useTmType()]);
    expect(result.current[0][0]).toBe(true);
    expect(result.current[1][0]).toBe("breslauer");
    expect(warnings).toEqual([]);
  });
});
