/* eslint-disable @typescript-eslint/no-empty-function */
import React from "react";
import { render, act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { ReflexContainer, ReflexElement } from "../src/Reflex";

// jsdom has no layout, so fake the container width and the ResizeObserver
let containerWidth;
let observers;
class FakeResizeObserver {
  constructor(cb) {
    this.cb = cb;
    this.targets = [];
    observers.push(this);
  }
  observe(el) {
    this.targets.push(el);
  }
  unobserve() {}
  disconnect() {
    this.targets = [];
  }
}
const resizeContainer = width => {
  containerWidth = width;
  observers.forEach(o => o.targets.length && o.cb([], o));
};

const flexOf = el => Number(el.style.flex.split(" ")[0]);

describe("ReflexContainer", () => {
  let originalResizeObserver;
  let warn;
  beforeEach(() => {
    observers = [];
    containerWidth = 0;
    originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = FakeResizeObserver;
    Object.defineProperty(window.HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() {
        return this.classList.contains("reflex-container") ? containerWidth : 0;
      }
    });
    // react-measure needs these on unmount and jsdom does not provide them
    window.requestAnimationFrame = cb => setTimeout(cb, 0);
    window.cancelAnimationFrame = id => clearTimeout(id);
    warn = console.warn;
    console.warn = () => {};
  });
  afterEach(() => {
    cleanup();
    global.ResizeObserver = originalResizeObserver;
    console.warn = warn;
  });

  const renderPanels = () =>
    render(
      <ReflexContainer orientation="vertical">
        <ReflexElement className="panelA">A</ReflexElement>
        <ReflexElement className="panelB">B</ReflexElement>
      </ReflexContainer>
    );

  it("recomputes flex once a container that mounted with zero width gets a size", async () => {
    const { container } = renderPanels();
    const a = () => container.querySelector(".panelA");
    const b = () => container.querySelector(".panelB");
    // mounted while hidden: every element gets flex 0
    expect(flexOf(a())).toBe(0);
    expect(flexOf(b())).toBe(0);

    await act(async () => {
      resizeContainer(1000);
    });
    expect(flexOf(a())).toBeCloseTo(0.5, 5);
    expect(flexOf(b())).toBeCloseTo(0.5, 5);
  });

  it("does not recompute flex on later resizes once it was computed with a size", async () => {
    containerWidth = 800;
    const original = ReflexContainer.prototype.computeFlexData;
    let calls = 0;
    ReflexContainer.prototype.computeFlexData = function (...args) {
      calls++;
      return original.apply(this, args);
    };
    try {
      const { container } = renderPanels();
      expect(flexOf(container.querySelector(".panelA"))).toBeCloseTo(0.5, 5);
      const callsAfterMount = calls;
      await act(async () => {
        resizeContainer(400);
      });
      // user-adjusted splitter positions must survive ordinary resizes
      expect(calls).toBe(callsAfterMount);
    } finally {
      ReflexContainer.prototype.computeFlexData = original;
    }
  });
});
