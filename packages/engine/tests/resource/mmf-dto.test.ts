/**
 * Contract tests for the Dashboard scene painter's MMF boundary.
 * Covers blank-map layout, DTO round-trip including future chunks, shared template paths,
 * and length validation before `SceneService` serializes data.
 */
import {
  MiuMapDataDtoSchema,
  resolveSceneMsfPath,
  scopeMsfEntryName,
} from "@miu2d/types";
import { describe, expect, it } from "vitest";
import {
  createBlankMiuMapData,
  dtoToMiuMapData,
  miuMapDataToDto,
} from "../../src/resource/format/mmf-dto";

describe("MMF editor DTO contract", () => {
  it("creates exact zero-filled MMF layers for a blank scene", () => {
    const map = createBlankMiuMapData(10, 7, [{ name: "tiles.msf", looping: false }]);

    expect(map.mapPixelWidth).toBe(576);
    expect(map.mapPixelHeight).toBe(96);
    expect(map.layer1).toHaveLength(140);
    expect(map.layer2).toHaveLength(140);
    expect(map.layer3).toHaveLength(140);
    expect(map.barriers).toHaveLength(70);
    expect(map.traps).toHaveLength(70);
    expect([...map.layer1]).toEqual(new Array(140).fill(0));
  });

  it("rejects blank scenes large enough to exhaust the browser", () => {
    expect(() =>
      createBlankMiuMapData(2000, 1000, [{ name: "tiles.msf", looping: false }])
    ).toThrow("at most 1000000 tiles");
  });

  it("round-trips unknown MMF extension chunks", () => {
    const map = createBlankMiuMapData(4, 5, [{ name: "tiles.msf", looping: true }]);
    map.layer2[6] = 1;
    map.layer2[7] = 3;
    map.extensions = [{ id: "HGHT", data: new Uint8Array([2, 4, 8]) }];

    const dto = miuMapDataToDto(map);
    expect(MiuMapDataDtoSchema.safeParse(dto).success).toBe(true);
    const restored = dtoToMiuMapData(dto);

    expect(restored.layer2).toEqual(map.layer2);
    expect(restored.extensions?.[0]?.id).toBe("HGHT");
    expect(restored.extensions?.[0]?.data).toEqual(new Uint8Array([2, 4, 8]));
  });

  it("resolves normal and shared template MSF references without traversal", () => {
    expect(resolveSceneMsfPath("new-map", "ground.msf")).toBe(
      "msf/map/new-map/ground.msf"
    );
    expect(scopeMsfEntryName("source-map", "ground.msf")).toBe("source-map/ground.msf");
    expect(resolveSceneMsfPath("new-map", "source-map/ground.msf")).toBe(
      "msf/map/source-map/ground.msf"
    );
    expect(scopeMsfEntryName("copied-map", "source-map/ground.msf")).toBe(
      "source-map/ground.msf"
    );
    expect(scopeMsfEntryName("source-map", "../secret.msf")).toBeNull();
    expect(resolveSceneMsfPath("new-map", "/absolute.msf")).toBeNull();
  });

  it("rejects DTO arrays whose decoded lengths do not match dimensions", () => {
    const dto = miuMapDataToDto(
      createBlankMiuMapData(4, 5, [{ name: "tiles.msf", looping: false }])
    );
    dto.layer3 = "AA==";

    const parsed = MiuMapDataDtoSchema.safeParse(dto);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === "layer3")).toBe(true);
    }
  });

  it("rejects tiles that reference an absent MSF table entry", () => {
    const map = createBlankMiuMapData(4, 5, [{ name: "tiles.msf", looping: false }]);
    map.layer1[0] = 2;
    const parsed = MiuMapDataDtoSchema.safeParse(miuMapDataToDto(map));

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === "layer1")).toBe(true);
    }
  });
});
