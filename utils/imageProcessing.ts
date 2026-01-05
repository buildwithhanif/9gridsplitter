import { ProcessedImage, SplitOptions } from '../types';

/**
 * Loads an image from a Data URL source.
 */
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Calculates energy profile of the image to find content vs solid borders.
 * Solid borders have low energy (change), content has high energy.
 */
const getEnergyProfile = (data: Uint8ClampedArray, width: number, height: number, axis: 'x' | 'y') => {
  const length = axis === 'x' ? width : height;
  const profile = new Float32Array(length);
  
  // Optimization: Sample every Nth pixel to keep it fast
  const stride = 2; 

  if (axis === 'y') {
    // Row profile (sum diffs horizontally)
    for (let y = 0; y < height; y++) {
      let sum = 0;
      for (let x = stride; x < width; x += stride) {
        const i = (y * width + x) * 4;
        const prev = (y * width + (x - stride)) * 4;
        sum += Math.abs(data[i] - data[prev]) + 
               Math.abs(data[i+1] - data[prev+1]) + 
               Math.abs(data[i+2] - data[prev+2]);
      }
      profile[y] = sum;
    }
  } else {
    // Column profile (sum diffs vertically)
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let y = stride; y < height; y += stride) {
        const i = (y * width + x) * 4;
        const prev = ((y - stride) * width + x) * 4;
        sum += Math.abs(data[i] - data[prev]) + 
               Math.abs(data[i+1] - data[prev+1]) + 
               Math.abs(data[i+2] - data[prev+2]);
      }
      profile[x] = sum;
    }
  }
  return profile;
};

/**
 * Analyzes a profile to find distinct high-energy regions (the photos).
 */
const findSegments = (profile: Float32Array, length: number) => {
  let maxVal = 0;
  for (let i = 0; i < length; i++) if (profile[i] > maxVal) maxVal = profile[i];

  // Threshold: Regions with < 5% of max energy are likely solid borders/gutters
  const threshold = maxVal * 0.05;

  const segments: { start: number; end: number; size: number }[] = [];
  let inSegment = false;
  let start = 0;

  for (let i = 0; i < length; i++) {
    if (profile[i] > threshold) {
      if (!inSegment) {
        inSegment = true;
        start = i;
      }
    } else {
      if (inSegment) {
        inSegment = false;
        segments.push({ start, end: i, size: i - start });
      }
    }
  }
  if (inSegment) {
    segments.push({ start, end: length, size: length - start });
  }

  // Filter out tiny noise segments (< 5% of total length)
  const minSize = length * 0.05;
  let validSegments = segments.filter(s => s.size > minSize);

  // If we found more than 3 segments (e.g. internal lines in photos), 
  // assume the 3 largest are the grid cells.
  if (validSegments.length > 3) {
    validSegments.sort((a, b) => b.size - a.size);
    validSegments = validSegments.slice(0, 3);
    validSegments.sort((a, b) => a.start - b.start); // Restore spatial order
  }

  return validSegments;
};

/**
 * Attempts to detect the 3x3 grid structure automatically.
 */
const detectGrid = (img: HTMLImageElement) => {
  // Use a smaller proxy canvas for analysis speed
  const workWidth = 600;
  const scale = Math.min(1, workWidth / img.width);
  const workHeight = Math.floor(img.height * scale);
  
  const canvas = document.createElement('canvas');
  canvas.width = workWidth; // scaled width
  canvas.height = workHeight; // scaled height
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const rowProfile = getEnergyProfile(imageData.data, canvas.width, canvas.height, 'y');
  const colProfile = getEnergyProfile(imageData.data, canvas.width, canvas.height, 'x');

  const rowSegments = findSegments(rowProfile, canvas.height);
  const colSegments = findSegments(colProfile, canvas.width);

  // We need exactly 3 distinct regions in both axes to confidently use auto-detect
  if (rowSegments.length === 3 && colSegments.length === 3) {
    // Map back to original coordinates
    return {
      rows: rowSegments.map(s => ({ start: s.start / scale, size: s.size / scale })),
      cols: colSegments.map(s => ({ start: s.start / scale, size: s.size / scale }))
    };
  }

  return null; // Detection failed or ambiguous
};

/**
 * Trims borders (white/black/solid color) from a canvas context.
 * Scans from edges inwards until it finds a pixel that deviates from the edge color.
 */
const trimCanvas = (canvas: HTMLCanvasElement, threshold: number): HTMLCanvasElement | null => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Helper to get pixel comparison value (simple RGB distance)
  const getDiff = (i: number, r: number, g: number, b: number) => {
    return Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b);
  };

  // 1. Sample the top-left corner as the "background" color to remove
  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];

  let top = 0;
  let bottom = height;
  let left = 0;
  let right = width;

  // Scan Top
  for (top = 0; top < height; top++) {
    let rowHasContent = false;
    for (let x = 0; x < width; x++) {
      const i = (top * width + x) * 4;
      if (getDiff(i, bgR, bgG, bgB) > threshold) {
        rowHasContent = true;
        break;
      }
    }
    if (rowHasContent) break;
  }

  // Scan Bottom
  for (bottom = height - 1; bottom >= top; bottom--) {
    let rowHasContent = false;
    for (let x = 0; x < width; x++) {
      const i = (bottom * width + x) * 4;
      if (getDiff(i, bgR, bgG, bgB) > threshold) {
        rowHasContent = true;
        break;
      }
    }
    if (rowHasContent) break;
  }

  // Scan Left
  for (left = 0; left < width; left++) {
    let colHasContent = false;
    for (let y = top; y <= bottom; y++) {
      const i = (y * width + left) * 4;
      if (getDiff(i, bgR, bgG, bgB) > threshold) {
        colHasContent = true;
        break;
      }
    }
    if (colHasContent) break;
  }

  // Scan Right
  for (right = width - 1; right >= left; right--) {
    let colHasContent = false;
    for (let y = top; y <= bottom; y++) {
      const i = (y * width + right) * 4;
      if (getDiff(i, bgR, bgG, bgB) > threshold) {
        colHasContent = true;
        break;
      }
    }
    if (colHasContent) break;
  }

  const trimmedWidth = right - left + 1;
  const trimmedHeight = bottom - top + 1;

  if (trimmedWidth <= 0 || trimmedHeight <= 0) {
    return canvas; 
  }

  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = trimmedWidth;
  trimmedCanvas.height = trimmedHeight;
  const trimmedCtx = trimmedCanvas.getContext('2d');
  
  if (!trimmedCtx) return null;

  trimmedCtx.drawImage(
    canvas,
    left, top, trimmedWidth, trimmedHeight,
    0, 0, trimmedWidth, trimmedHeight
  );

  return trimmedCanvas;
};

/**
 * Main function to split the grid.
 */
export const splitImageGrid = async (
  imageSrc: string, 
  options: SplitOptions
): Promise<ProcessedImage[]> => {
  const img = await loadImage(imageSrc);
  const totalWidth = img.width;
  const totalHeight = img.height;
  
  const results: ProcessedImage[] = [];
  
  // 1. Try Automatic Grid Detection
  const gridStructure = detectGrid(img);
  let cellDefs: { x: number, y: number, w: number, h: number }[] = [];

  if (gridStructure) {
    console.log("Automatic grid detection successful", gridStructure);
    // Generate the 9 coordinates from the detected rows/cols
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        cellDefs.push({
          x: gridStructure.cols[c].start,
          y: gridStructure.rows[r].start,
          w: gridStructure.cols[c].size,
          h: gridStructure.rows[r].size
        });
      }
    }
  } else {
    console.log("Automatic detection failed, using standard 3x3 split");
    // Fallback: Standard mathematical 3x3 split
    const cellWidth = Math.floor(totalWidth / 3);
    const cellHeight = Math.floor(totalHeight / 3);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        cellDefs.push({
          x: col * cellWidth,
          y: row * cellHeight,
          w: cellWidth,
          h: cellHeight
        });
      }
    }
  }
  
  // 2. Extract and Trim
  for (let i = 0; i < cellDefs.length; i++) {
    const def = cellDefs[i];
    
    const cellCanvas = document.createElement('canvas');
    cellCanvas.width = def.w;
    cellCanvas.height = def.h;
    const ctx = cellCanvas.getContext('2d');
    
    if (!ctx) continue;
    
    ctx.drawImage(
      img,
      def.x, def.y, def.w, def.h, // Source
      0, 0, def.w, def.h // Destination
    );
    
    // 3. Trim borders (fine tuning)
    // Even with auto-detection, there might be internal borders or padding.
    // The auto-detection skips the main gutters, but trimCanvas cleans up the edges strictly.
    const processedCanvas = trimCanvas(cellCanvas, options.threshold) || cellCanvas;
    
    results.push({
      id: i,
      originalIndex: i,
      dataUrl: processedCanvas.toDataURL('image/png'),
      width: processedCanvas.width,
      height: processedCanvas.height
    });
  }
  
  return results;
};
