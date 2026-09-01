/**
 * MMF DTO (Data Transfer Object) conversion utilities
 *
 * Converts between MiuMapData (engine runtime, Uint8Array fields)
 * and MiuMapDataDto (JSON-safe, base64-encoded string fields).
 *
 * AI trace:
 * - Server API writes use `miuMapDataToDto`/the mirrored server codec; Dashboard reads use
 *   `dtoToMiuMapData`, and its new-scene wizard uses `createBlankMiuMapData`.
 * - Tile arrays, trap metadata and unknown MMF extension chunks must move together so a
 *   visual edit never turns into a lossy binary rewrite.
 */

import { getMmfMapPixelSize, type MiuMapDataDto, type MsfEntryDto } from "@miu2d/types";
import type { MiuMapData } from "../../map/types";

const MAX_EDITOR_TILE_COUNT = 1_000_000;

// ============= Base64 helpers (works in both Node.js and browser) =============

function uint8ArrayToBase64(arr: Uint8Array): string {
  // Node.js
  if (typeof Buffer !== "undefined") {
    return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString("base64");
  }
  // Browser
  let binary = "";
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(b64: string): Uint8Array {
  // Node.js
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(b64, "base64");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  // Browser
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}

// ============= Conversion functions =============

/**
 * Convert MiuMapData (engine runtime) to MiuMapDataDto (JSON-safe)
 *
 * Encodes all Uint8Array fields as base64 strings.
 */
export function miuMapDataToDto(data: MiuMapData): MiuMapDataDto {
  return {
    mapColumnCounts: data.mapColumnCounts,
    mapRowCounts: data.mapRowCounts,
    mapPixelWidth: data.mapPixelWidth,
    mapPixelHeight: data.mapPixelHeight,
    msfEntries: data.msfEntries.map((e) => ({ name: e.name, looping: e.looping })),
    trapTable: data.trapTable.map((e) => ({ trapIndex: e.trapIndex, scriptPath: e.scriptPath })),
    layer1: uint8ArrayToBase64(data.layer1),
    layer2: uint8ArrayToBase64(data.layer2),
    layer3: uint8ArrayToBase64(data.layer3),
    barriers: uint8ArrayToBase64(data.barriers),
    traps: uint8ArrayToBase64(data.traps),
    extensions: data.extensions?.map((extension) => ({
      id: extension.id,
      data: uint8ArrayToBase64(extension.data),
    })),
  };
}

/**
 * Convert MiuMapDataDto (JSON-safe) back to MiuMapData (engine runtime)
 *
 * Decodes base64 string fields back to Uint8Array.
 */
export function dtoToMiuMapData(dto: MiuMapDataDto): MiuMapData {
  return {
    mapColumnCounts: dto.mapColumnCounts,
    mapRowCounts: dto.mapRowCounts,
    mapPixelWidth: dto.mapPixelWidth,
    mapPixelHeight: dto.mapPixelHeight,
    msfEntries: dto.msfEntries.map((e) => ({ name: e.name, looping: e.looping })),
    trapTable: dto.trapTable.map((e) => ({ trapIndex: e.trapIndex, scriptPath: e.scriptPath })),
    layer1: base64ToUint8Array(dto.layer1),
    layer2: base64ToUint8Array(dto.layer2),
    layer3: base64ToUint8Array(dto.layer3),
    barriers: base64ToUint8Array(dto.barriers),
    traps: base64ToUint8Array(dto.traps),
    extensions: dto.extensions?.map((extension) => ({
      id: extension.id,
      data: base64ToUint8Array(extension.data),
    })),
  };
}

/**
 * Create an empty, immediately renderable MMF map using an existing MSF resource table.
 * The arrays follow the exact MMF1 layout; callers paint `{msfIndex, frame}` pairs later.
 */
export function createBlankMiuMapData(
  columns: number,
  rows: number,
  msfEntries: readonly MsfEntryDto[]
): MiuMapData {
  if (!Number.isInteger(columns) || columns < 2 || columns > 0xffff) {
    throw new RangeError("MMF columns must be an integer between 2 and 65535");
  }
  if (!Number.isInteger(rows) || rows < 3 || rows > 0xffff) {
    throw new RangeError("MMF rows must be an integer between 3 and 65535");
  }
  if (msfEntries.length > 0xff) {
    throw new RangeError("MMF supports at most 255 MSF entries");
  }

  const totalTiles = columns * rows;
  if (totalTiles > MAX_EDITOR_TILE_COUNT) {
    throw new RangeError(`Editor maps support at most ${MAX_EDITOR_TILE_COUNT} tiles`);
  }
  const { width, height } = getMmfMapPixelSize(columns, rows);
  return {
    mapColumnCounts: columns,
    mapRowCounts: rows,
    mapPixelWidth: width,
    mapPixelHeight: height,
    msfEntries: msfEntries.map((entry) => ({ ...entry })),
    trapTable: [],
    layer1: new Uint8Array(totalTiles * 2),
    layer2: new Uint8Array(totalTiles * 2),
    layer3: new Uint8Array(totalTiles * 2),
    barriers: new Uint8Array(totalTiles),
    traps: new Uint8Array(totalTiles),
    extensions: [],
  };
}
