/**
 * MMF 辅助工具（服务端）
 *
 * 直接内联 MMF 解析/序列化逻辑（不依赖 @miu2d/engine，避免 nodenext 模块兼容问题）。
 * 使用 node:zlib 的 zstd 支持进行压缩/解压。
 * 提供 mmfData (base64 binary) ↔ MiuMapDataDto (JSON-safe) 双向转换。
 * AI trace: `SceneService.create/update` 是写入调用方；未知 extension chunks 作为 DTO
 * 的一部分保留，避免 Dashboard 修改基础图层时损坏未来格式数据。
 */
import { zstdCompressSync, zstdDecompressSync } from "node:zlib";
import type { MiuMapDataDto } from "@miu2d/types";

// ── 内部类型（与 engine/map/types 保持一致） ──

interface MsfEntry {
  name: string;
  looping: boolean;
}

interface TrapEntry {
  trapIndex: number;
  scriptPath: string;
}

interface MiuMapData {
  mapColumnCounts: number;
  mapRowCounts: number;
  mapPixelWidth: number;
  mapPixelHeight: number;
  msfEntries: MsfEntry[];
  trapTable: TrapEntry[];
  layer1: Uint8Array;
  layer2: Uint8Array;
  layer3: Uint8Array;
  barriers: Uint8Array;
  traps: Uint8Array;
  extensions: { id: string; data: Uint8Array }[];
}

// ── MMF 解析 ──

function parseMMF(buffer: ArrayBuffer): MiuMapData | null {
  const view = new DataView(buffer);
  const data = new Uint8Array(buffer);

  if (data.length < 20) return null;

  const magic = String.fromCharCode(data[0], data[1], data[2], data[3]);
  if (magic !== "MMF1") return null;

  const version = view.getUint16(4, true);
  const flags = view.getUint16(6, true);
  let offset = 8;

  if (version !== 1) return null;

  const columns = view.getUint16(offset, true);
  offset += 2;
  const rows = view.getUint16(offset, true);
  offset += 2;
  const msfCount = view.getUint16(offset, true);
  offset += 2;
  const trapCount = view.getUint16(offset, true);
  offset += 2;
  offset += 4; // reserved

  const mapPixelWidth = (columns - 1) * 64;
  const mapPixelHeight = (Math.floor((rows - 3) / 2) + 1) * 32;

  const decoder = new TextDecoder("utf-8");
  const msfEntries: MsfEntry[] = [];
  for (let i = 0; i < msfCount; i++) {
    if (offset >= data.length) break;
    const nameLen = data[offset++];
    const name = decoder.decode(data.slice(offset, offset + nameLen));
    offset += nameLen;
    const entryFlags = data[offset++];
    msfEntries.push({ name, looping: (entryFlags & 1) !== 0 });
  }

  const trapTable: TrapEntry[] = [];
  if (flags & 0x02) {
    for (let i = 0; i < trapCount; i++) {
      if (offset >= data.length) break;
      const trapIndex = data[offset++];
      const pathLen = view.getUint16(offset, true);
      offset += 2;
      const scriptPath = decoder.decode(data.slice(offset, offset + pathLen));
      offset += pathLen;
      trapTable.push({ trapIndex, scriptPath });
    }
  }

  // Preserve extension chunks until END sentinel
  const extensions: { id: string; data: Uint8Array }[] = [];
  while (offset + 8 <= data.length) {
    const chunkId = String.fromCharCode(
      data[offset],
      data[offset + 1],
      data[offset + 2],
      data[offset + 3]
    );
    const chunkLen = view.getUint32(offset + 4, true);
    offset += 8;
    if (chunkId === "END\0") break;
    if (offset + chunkLen > data.length) return null;
    extensions.push({ id: chunkId, data: data.slice(offset, offset + chunkLen) });
    offset += chunkLen;
  }

  // Decompress tile blob
  const compressed = data.slice(offset);
  let blob: Uint8Array;
  if (flags & 0x01) {
    const result = zstdDecompressSync(Buffer.from(compressed));
    blob = new Uint8Array(result.buffer, result.byteOffset, result.byteLength);
  } else {
    blob = compressed;
  }

  const totalTiles = columns * rows;
  const expectedBlobSize = totalTiles * 8;
  if (blob.length < expectedBlobSize) return null;

  let blobOffset = 0;
  const layer1 = blob.slice(blobOffset, blobOffset + totalTiles * 2);
  blobOffset += totalTiles * 2;
  const layer2 = blob.slice(blobOffset, blobOffset + totalTiles * 2);
  blobOffset += totalTiles * 2;
  const layer3 = blob.slice(blobOffset, blobOffset + totalTiles * 2);
  blobOffset += totalTiles * 2;
  const barriers = blob.slice(blobOffset, blobOffset + totalTiles);
  blobOffset += totalTiles;
  const traps = blob.slice(blobOffset, blobOffset + totalTiles);

  return {
    mapColumnCounts: columns,
    mapRowCounts: rows,
    mapPixelWidth,
    mapPixelHeight,
    msfEntries,
    trapTable,
    layer1,
    layer2,
    layer3,
    barriers,
    traps,
    extensions,
  };
}

// ── MMF 序列化 ──

function serializeMMF(mapData: MiuMapData): ArrayBuffer {
  const encoder = new TextEncoder();
  const totalTiles = mapData.mapColumnCounts * mapData.mapRowCounts;

  // Persistence boundary: every byte array must match the declared dimensions and every
  // non-zero tile reference must resolve through the MMF MSF table. `SceneService.create/update`
  // call this before storing `mmfData`; the renderer may skip invalid indices, but storage must
  // reject them so the editor cannot persist a silently incomplete scene.
  const expectedLayerLength = totalTiles * 2;
  for (const [layerName, layer] of [
    ["layer1", mapData.layer1],
    ["layer2", mapData.layer2],
    ["layer3", mapData.layer3],
  ] as const) {
    if (layer.length !== expectedLayerLength) {
      throw new RangeError(`${layerName} length does not match the MMF dimensions`);
    }
    for (let offset = 0; offset < layer.length; offset += 2) {
      if (layer[offset] > mapData.msfEntries.length) {
        throw new RangeError(
          `${layerName} tile ${offset / 2} references missing MSF index ${layer[offset]}`
        );
      }
    }
  }
  if (mapData.barriers.length !== totalTiles || mapData.traps.length !== totalTiles) {
    throw new RangeError("MMF property layer length does not match the declared dimensions");
  }

  let msfTableSize = 0;
  const encodedMsfNames: Uint8Array[] = [];
  for (const entry of mapData.msfEntries) {
    const nameBytes = encoder.encode(entry.name);
    encodedMsfNames.push(nameBytes);
    msfTableSize += 1 + nameBytes.length + 1;
  }

  let trapTableSize = 0;
  const encodedTrapPaths: Uint8Array[] = [];
  for (const entry of mapData.trapTable) {
    const pathBytes = encoder.encode(entry.scriptPath);
    encodedTrapPaths.push(pathBytes);
    trapTableSize += 1 + 2 + pathBytes.length;
  }

  // Compose uncompressed tile blob
  const blobSize = totalTiles * 8;
  const blob = new Uint8Array(blobSize);
  let blobOffset = 0;
  blob.set(mapData.layer1.subarray(0, totalTiles * 2), blobOffset);
  blobOffset += totalTiles * 2;
  blob.set(mapData.layer2.subarray(0, totalTiles * 2), blobOffset);
  blobOffset += totalTiles * 2;
  blob.set(mapData.layer3.subarray(0, totalTiles * 2), blobOffset);
  blobOffset += totalTiles * 2;
  blob.set(mapData.barriers.subarray(0, totalTiles), blobOffset);
  blobOffset += totalTiles;
  blob.set(mapData.traps.subarray(0, totalTiles), blobOffset);

  // Compress with zstd
  const result = zstdCompressSync(Buffer.from(blob));
  const compressedBlob = new Uint8Array(result.buffer, result.byteOffset, result.byteLength);

  const hasTraps = mapData.trapTable.length > 0;
  const flags = 0x01 | (hasTraps ? 0x02 : 0); // always zstd

  const extensionSize = mapData.extensions.reduce(
    (sum, extension) => sum + 8 + extension.data.length,
    0
  );
  const headerSize = 8 + 12 + msfTableSize + (hasTraps ? trapTableSize : 0) + extensionSize + 8;
  const totalSize = headerSize + compressedBlob.length;

  const buf = new ArrayBuffer(totalSize);
  const view = new DataView(buf);
  const out = new Uint8Array(buf);
  let offset = 0;

  // Preamble
  out[0] = 0x4d;
  out[1] = 0x4d;
  out[2] = 0x46;
  out[3] = 0x31; // "MMF1"
  view.setUint16(4, 1, true);
  view.setUint16(6, flags, true);
  offset = 8;

  // Map Header
  view.setUint16(offset, mapData.mapColumnCounts, true);
  offset += 2;
  view.setUint16(offset, mapData.mapRowCounts, true);
  offset += 2;
  view.setUint16(offset, mapData.msfEntries.length, true);
  offset += 2;
  view.setUint16(offset, mapData.trapTable.length, true);
  offset += 2;
  view.setUint32(offset, 0, true);
  offset += 4;

  // MSF Table
  for (let i = 0; i < mapData.msfEntries.length; i++) {
    const nameBytes = encodedMsfNames[i];
    out[offset++] = nameBytes.length;
    out.set(nameBytes, offset);
    offset += nameBytes.length;
    out[offset++] = mapData.msfEntries[i].looping ? 1 : 0;
  }

  // Trap Table
  if (hasTraps) {
    for (let i = 0; i < mapData.trapTable.length; i++) {
      const entry = mapData.trapTable[i];
      const pathBytes = encodedTrapPaths[i];
      out[offset++] = entry.trapIndex;
      view.setUint16(offset, pathBytes.length, true);
      offset += 2;
      out.set(pathBytes, offset);
      offset += pathBytes.length;
    }
  }

  // Extension chunks (preserve original order and bytes)
  for (const extension of mapData.extensions) {
    for (let i = 0; i < 4; i++) out[offset + i] = extension.id.charCodeAt(i) & 0xff;
    view.setUint32(offset + 4, extension.data.length, true);
    offset += 8;
    out.set(extension.data, offset);
    offset += extension.data.length;
  }

  // End Sentinel
  out[offset] = 0x45;
  out[offset + 1] = 0x4e;
  out[offset + 2] = 0x44;
  out[offset + 3] = 0x00;
  view.setUint32(offset + 4, 0, true);
  offset += 8;

  // Compressed tile blob
  out.set(compressedBlob, offset);

  return buf;
}

// ── DTO 转换 ──

function miuMapDataToDto(data: MiuMapData): MiuMapDataDto {
  return {
    mapColumnCounts: data.mapColumnCounts,
    mapRowCounts: data.mapRowCounts,
    mapPixelWidth: data.mapPixelWidth,
    mapPixelHeight: data.mapPixelHeight,
    msfEntries: data.msfEntries.map((e) => ({ name: e.name, looping: e.looping })),
    trapTable: data.trapTable.map((e) => ({ trapIndex: e.trapIndex, scriptPath: e.scriptPath })),
    layer1: Buffer.from(data.layer1).toString("base64"),
    layer2: Buffer.from(data.layer2).toString("base64"),
    layer3: Buffer.from(data.layer3).toString("base64"),
    barriers: Buffer.from(data.barriers).toString("base64"),
    traps: Buffer.from(data.traps).toString("base64"),
    extensions: data.extensions.map((extension) => ({
      id: extension.id,
      data: Buffer.from(extension.data).toString("base64"),
    })),
  };
}

function dtoToMiuMapData(dto: MiuMapDataDto): MiuMapData {
  return {
    mapColumnCounts: dto.mapColumnCounts,
    mapRowCounts: dto.mapRowCounts,
    mapPixelWidth: dto.mapPixelWidth,
    mapPixelHeight: dto.mapPixelHeight,
    msfEntries: dto.msfEntries.map((e) => ({ name: e.name, looping: e.looping })),
    trapTable: dto.trapTable.map((e) => ({ trapIndex: e.trapIndex, scriptPath: e.scriptPath })),
    layer1: new Uint8Array(Buffer.from(dto.layer1, "base64")),
    layer2: new Uint8Array(Buffer.from(dto.layer2, "base64")),
    layer3: new Uint8Array(Buffer.from(dto.layer3, "base64")),
    barriers: new Uint8Array(Buffer.from(dto.barriers, "base64")),
    traps: new Uint8Array(Buffer.from(dto.traps, "base64")),
    extensions: (dto.extensions ?? []).map((extension) => ({
      id: extension.id,
      data: new Uint8Array(Buffer.from(extension.data, "base64")),
    })),
  };
}

// ── 公共 API ──

/**
 * 将 mmfData (base64 binary) 解析为 MiuMapDataDto (JSON-safe)
 */
export function parseMmfToDto(mmfBase64: string): MiuMapDataDto | null {
  const binary = Buffer.from(mmfBase64, "base64");
  const arrayBuffer = binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength);
  const mapData = parseMMF(arrayBuffer);
  if (!mapData) return null;
  return miuMapDataToDto(mapData);
}

/**
 * 将 MiuMapDataDto (JSON) 序列化为 mmfData (base64 binary)
 */
export function serializeDtoToMmf(dto: MiuMapDataDto): string {
  const mapData = dtoToMiuMapData(dto);
  const buffer = serializeMMF(mapData);
  return Buffer.from(buffer).toString("base64");
}
