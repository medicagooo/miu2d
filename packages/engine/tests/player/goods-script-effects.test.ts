import { describe, expect, it } from "vitest";
import { goodsScriptTeachesMagic } from "../../src/player/goods/good";

describe("goodsScriptTeachesMagic", () => {
  it("recognizes an active AddMagic command", () => {
    expect(goodsScriptTeachesMagic('  AddMagic("player-magic-风火雷.ini");')).toBe(true);
  });

  it("ignores comments and similarly named commands", () => {
    const script = [
      '// AddMagic("player-magic-风火雷.ini");',
      'Say("AddMagic(不是命令)", 0);',
      'AddMagicExp("player-magic-风火雷.ini", 10);',
    ].join("\n");

    expect(goodsScriptTeachesMagic(script)).toBe(false);
  });

  it("recognizes commands before a trailing comment", () => {
    expect(
      goodsScriptTeachesMagic(
        'AddMagic("player-magic-镇狱破天劲.ini"); // 集齐羊皮后学会武功'
      )
    ).toBe(true);
  });
});
