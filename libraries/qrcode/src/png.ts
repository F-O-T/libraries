import { deflateSync } from "node:zlib";

/**
 * CRC32 lookup table for PNG chunk checksums.
 */
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Encode a QR code matrix to PNG format.
 * @param modules - The QR code module matrix (true = dark)
 * @param targetSize - Target image size in pixels
 * @param margin - Number of quiet zone modules
 */
export function encodePng(
  modules: boolean[][],
  targetSize: number,
  margin: number,
): Uint8Array {
  const matrixSize = modules.length;
  const totalModules = matrixSize + margin * 2;

  // Calculate scale factor so the image is close to targetSize
  const scale = Math.max(1, Math.floor(targetSize / totalModules));
  const imageSize = totalModules * scale;

  // Build raw image data (filter byte + RGB pixels per row)
  const rowBytes = 1 + imageSize * 3; // filter byte + RGB
  const rawData = new Uint8Array(rowBytes * imageSize);

  for (let py = 0; py < imageSize; py++) {
    const rowOffset = py * rowBytes;
    rawData[rowOffset] = 0; // Filter type: None

    for (let px = 0; px < imageSize; px++) {
      // Map pixel to module coordinate
      const moduleRow = Math.floor(py / scale) - margin;
      const moduleCol = Math.floor(px / scale) - margin;

      // Determine if this pixel is dark
      let isDark = false;
      if (
        moduleRow >= 0 &&
        moduleRow < matrixSize &&
        moduleCol >= 0 &&
        moduleCol < matrixSize
      ) {
        isDark = modules[moduleRow]![moduleCol]!;
      }

      const pixelOffset = rowOffset + 1 + px * 3;
      const color = isDark ? 0x00 : 0xff;
      rawData[pixelOffset] = color;
      rawData[pixelOffset + 1] = color;
      rawData[pixelOffset + 2] = color;
    }
  }

  // Compress with zlib deflate
  const compressed = deflateSync(rawData);

  // Build PNG file
  const chunks: Uint8Array[] = [];

  // PNG signature
  chunks.push(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

  // IHDR chunk
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, imageSize);  // Width
  ihdrView.setUint32(4, imageSize);  // Height
  ihdr[8] = 8;  // Bit depth
  ihdr[9] = 2;  // Color type: RGB
  ihdr[10] = 0; // Compression method
  ihdr[11] = 0; // Filter method
  ihdr[12] = 0; // Interlace method
  chunks.push(createChunk(new TextEncoder().encode("IHDR"), ihdr));

  // IDAT chunk
  chunks.push(createChunk(new TextEncoder().encode("IDAT"), new Uint8Array(compressed)));

  // IEND chunk
  chunks.push(createChunk(new TextEncoder().encode("IEND"), new Uint8Array(0)));

  // Concatenate all chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * Create a PNG chunk: length (4 bytes) + type (4 bytes) + data + CRC32 (4 bytes).
 */
function createChunk(type: Uint8Array, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(4 + 4 + data.length + 4);
  const view = new DataView(chunk.buffer);

  // Length
  view.setUint32(0, data.length);

  // Type
  chunk.set(type, 4);

  // Data
  chunk.set(data, 8);

  // CRC32 (over type + data)
  const crcData = new Uint8Array(4 + data.length);
  crcData.set(type, 0);
  crcData.set(data, 4);
  view.setUint32(8 + data.length, crc32(crcData));

  return chunk;
}
