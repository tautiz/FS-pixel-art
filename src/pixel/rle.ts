export interface PixelGridSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Converts a flat list of horizontal spans [x0, y0, w0, x1, y1, w1, ...]
 * into a compact, crisp SVG path string (one unit high per span).
 */
export function spansToSvgPath(spans: readonly number[]): string {
  if (spans.length === 0) return '';
  const parts: string[] = [];
  for (let i = 0; i < spans.length; i += 3) {
    const x = spans[i];
    const y = spans[i + 1];
    const w = spans[i + 2];
    if (w <= 0) continue;
    parts.push(`M${x} ${y}h${w}v1h-${w}z`);
  }
  return parts.join('');
}

/**
 * Decodes a base64-encoded Uint16Array of 2D merged rectangles [x, y, w, h, ...]
 * into a Uint16Array, working in both Browser and Node.js environments.
 */
export function decodeRectsB64(b64: string): Uint16Array {
  if (!b64) return new Uint16Array(0);
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(b64, 'base64');
    return new Uint16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2);
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Uint16Array(bytes.buffer);
}

/**
 * Converts base64-encoded 2D rectangles [x, y, w, h, ...] into a single SVG path string.
 */
export function rectsB64ToSvgPath(b64: string): string {
  const arr = decodeRectsB64(b64);
  if (arr.length === 0) return '';
  const parts: string[] = [];
  for (let i = 0; i < arr.length; i += 4) {
    const x = arr[i];
    const y = arr[i + 1];
    const w = arr[i + 2];
    const h = arr[i + 3];
    if (w <= 0 || h <= 0) continue;
    parts.push(`M${x} ${y}h${w}v${h}h-${w}z`);
  }
  return parts.join('');
}

/**
 * Validates that every 2D rectangle in a decoded Uint16Array fits inside bounds.
 */
export function validateRectsBounds(
  rects: Uint16Array,
  bounds: PixelGridSize,
): boolean {
  if (rects.length % 4 !== 0) return false;
  for (let i = 0; i < rects.length; i += 4) {
    const x = rects[i];
    const y = rects[i + 1];
    const w = rects[i + 2];
    const h = rects[i + 3];
    if (w <= 0 || h <= 0 || x + w > bounds.width || y + h > bounds.height) {
      return false;
    }
  }
  return true;
}

/**
 * Counts total pixels covered by a decoded 2D rectangle Uint16Array [x, y, w, h, ...].
 */
export function countPixelsInRects(rects: Uint16Array): number {
  let total = 0;
  for (let i = 0; i < rects.length; i += 4) {
    total += rects[i + 2] * rects[i + 3];
  }
  return total;
}

/**
 * Encodes a 2D color grid (row-major [y][x]) into flat [x, y, w] spans grouped by color.
 */
export function encodeGridSpans(
  grid: readonly (readonly (string | null)[])[],
): Map<string, number[]> {
  const result = new Map<string, number[]>();
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    let x = 0;
    while (x < row.length) {
      const color = row[x];
      if (!color) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < row.length && row[x + w] === color) {
        w++;
      }
      let bucket = result.get(color);
      if (!bucket) {
        bucket = [];
        result.set(color, bucket);
      }
      bucket.push(x, y, w);
      x += w;
    }
  }
  return result;
}

/**
 * Counts total pixels covered by a flat [x, y, w, ...] span array.
 */
export function countPixelsInSpans(spans: readonly number[]): number {
  let total = 0;
  for (let i = 0; i < spans.length; i += 3) {
    total += spans[i + 2];
  }
  return total;
}

/**
 * Validates that every span in a flat [x, y, w, ...] list fits inside [0..width) x [0..height).
 */
export function validateSpansBounds(
  spans: readonly number[],
  bounds: PixelGridSize,
): boolean {
  if (spans.length % 3 !== 0) return false;
  for (let i = 0; i < spans.length; i += 3) {
    const x = spans[i];
    const y = spans[i + 1];
    const w = spans[i + 2];
    if (w <= 0 || x < 0 || y < 0 || x + w > bounds.width || y >= bounds.height) {
      return false;
    }
  }
  return true;
}
