import {
  beginStroke,
  canRedo,
  canUndo,
  clearStrokes,
  createMaskState,
  dilate,
  extendStroke,
  rasterizeMask,
  redo,
  undo,
} from '../src/utils/mask';
import type { BrushStroke, Rect } from '../src/types';

function stroke(id: string, points: Array<[number, number]>, mode: 'brush' | 'erase' = 'brush'): BrushStroke {
  return {
    type: 'stroke',
    id,
    mode,
    radius: 0.1,
    points: points.map(([x, y]) => ({ x, y })),
  };
}

describe('rasterizeMask polarity', () => {
  it('starts fully black (preserve) with no selection', () => {
    const mask = rasterizeMask([], [], 4, 4);
    expect(Array.from(mask)).toEqual(new Array(16).fill(0));
  });

  it('stamps a brush stroke white at its center', () => {
    const mask = rasterizeMask([stroke('s1', [[0.5, 0.5]])], [], 100, 100);
    expect(mask[50 * 100 + 50]).toBe(255);
    expect(mask[0]).toBe(0);
  });

  it('erase stroke paints black over a previous brush stroke', () => {
    const brush = stroke('b', [[0.5, 0.5]]);
    const eraser = stroke('e', [[0.5, 0.5]], 'erase');
    const mask = rasterizeMask([brush, eraser], [], 100, 100);
    expect(mask[50 * 100 + 50]).toBe(0);
  });

  it('fills selected rectangles white', () => {
    const rect: Rect = { x: 10, y: 10, width: 10, height: 5 };
    const mask = rasterizeMask([], [rect], 100, 100);
    expect(mask[10 * 100 + 10]).toBe(255);
    expect(mask[14 * 100 + 19]).toBe(255);
    expect(mask[10 * 100 + 9]).toBe(0);
    expect(mask[10 * 100 + 20]).toBe(0);
  });
});

describe('dilate', () => {
  it('expands a single white pixel into a 3x3 block', () => {
    const mask = new Uint8Array(25).fill(0);
    mask[2 * 5 + 2] = 255;
    const result = dilate(mask, 5, 5, 1);
    for (let y = 1; y <= 3; y += 1) {
      for (let x = 1; x <= 3; x += 1) {
        expect(result[y * 5 + x]).toBe(255);
      }
    }
    expect(result[0]).toBe(0);
    expect(result[4]).toBe(0);
  });

  it('preserves already-white pixels across multiple iterations', () => {
    const mask = new Uint8Array(25).fill(0);
    mask[12] = 255;
    const result = dilate(mask, 5, 5, 2);
    expect(result[12]).toBe(255);
    expect(result[0]).toBe(255); // reaches the corner after 2 iterations
  });
});

describe('mask history (undo/redo)', () => {
  it('undoes and redoes a stroke', () => {
    let state = createMaskState();
    expect(canUndo(state)).toBe(false);

    state = beginStroke(state, stroke('s1', [[0.5, 0.5]]));
    expect(state.present).toHaveLength(1);
    expect(canUndo(state)).toBe(true);

    state = undo(state);
    expect(state.present).toHaveLength(0);
    expect(canRedo(state)).toBe(true);

    state = redo(state);
    expect(state.present).toHaveLength(1);
    expect(canRedo(state)).toBe(false);
  });

  it('does not create history entries when extending a stroke', () => {
    let state = createMaskState();
    state = beginStroke(state, stroke('s1', [[0.5, 0.5]]));
    const pastLength = state.past.length;

    state = extendStroke(state, 's1', { x: 0.6, y: 0.6 });
    expect(state.present[0].points).toHaveLength(2);
    expect(state.past.length).toBe(pastLength);
  });

  it('clears strokes and supports undo of clear', () => {
    let state = createMaskState();
    state = beginStroke(state, stroke('s1', [[0.5, 0.5]]));
    state = clearStrokes(state);
    expect(state.present).toHaveLength(0);

    state = undo(state);
    expect(state.present).toHaveLength(1);
  });

  it('redoing after a new stroke discards the redo branch', () => {
    let state = createMaskState();
    state = beginStroke(state, stroke('s1', [[0.5, 0.5]]));
    state = undo(state);
    expect(canRedo(state)).toBe(true);

    state = beginStroke(state, stroke('s2', [[0.25, 0.25]]));
    expect(canRedo(state)).toBe(false);
    expect(state.present.map((s) => s.id)).toEqual(['s2']);
  });
});
