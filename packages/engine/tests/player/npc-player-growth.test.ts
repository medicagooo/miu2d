import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Magic } from '@miu2d/types';
import sources from './fixtures/npc-growth-source.json';
import { getMagic, getMagicAtLevel } from '../../src/magic/magic-config-loader';
import { getEffectAmount } from '../../src/combat/effect-calc';
import { getMagicGrowthState } from '../../src/magic/magic-growth-state';
import { createDefaultMagicData, createDefaultMagicItemInfo } from '../../src/magic/types';
import { PlayerMagicInventory } from '../../src/player/magic/player-magic-inventory';
import { repairPlayerMagicProgression } from '../../src/player/magic/player-magic-progression';
import { NPC_PLAYER_GROWTH } from '../../src/player/magic/npc-player-growth-data';
import { addMagicExpDirect } from '../../src/player/magic/magic-list-experience';

// Use real API conversion/cache and level calculation: fixtures are selected public API fields,
// not hand-built MagicData matching the implementation's assumptions.
const fixture = vi.hoisted(() => ({ slug: 'demo', npc: [] as Magic[], builders: [] as (() => void)[] }));
vi.mock('../../src/data/game-data-api', () => ({
  getGameSlug: () => fixture.slug,
  getMagicsData: () => ({ player: [], npc: fixture.npc }),
  isGameDataLoaded: () => true,
  registerCacheBuilder: (builder: () => void) => fixture.builders.push(builder),
}));
vi.mock('../../src/magic/magic-config-loader', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/magic/magic-config-loader')>();
  return { ...actual, preloadMagicAsf: vi.fn(async () => {}) };
});

function load(game: string) {
  fixture.slug = game;
  fixture.npc = structuredClone(sources.filter(row => row.game === game).map(row => row.api)) as unknown as Magic[];
  fixture.builders.forEach(build => build());
}
beforeEach(() => load('demo'));

describe('audited NPC arts learned by the player', () => {
  it.each(sources)('$game/$api.key has real-loadable growth and unchanged NPC combat', async ({ game, api }) => {
    load(game);
    const raw = getMagic(api.key)!;
    expect(raw).not.toBeNull();
    const snapshot = structuredClone(raw);
    const player = new PlayerMagicInventory(true);
    const companion = new PlayerMagicInventory();
    expect((await player.addMagic(api.key)).status).toBe('added');
    await companion.addMagic(api.key);
    const info = player.getItemInfo(1)!;
    const first = info.magic!;
    const npcFirst = getMagicAtLevel(raw, 1);
    expect(first.levels?.size).toBe(10);
    expect(companion.getItemInfo(1)?.magic?.levels?.size ?? 0).toBe(0);
    expect(getMagicGrowthState(first, 1)).toBe('trainable');
    const shapeFields = ['moveKind', 'specialKind', 'specialKindValue', 'specialKindMilliSeconds',
      'effectLevel', 'speed', 'lifeFrame', 'region', 'passThrough', 'rangeRadius', 'rangeDamage',
      'rangePoison', 'rangeFreeze', 'rangePetrify', 'keepMilliseconds'] as const;
    for (const attack of [50, 500, 2000]) {
      const actor = { isPlayer: true, attack, realAttack: attack + 25, attack2: 0, attack3: 0, effectFormulaAdditive: game === 'sword1' };
      let previous = getEffectAmount(npcFirst, actor);
      expect(getEffectAmount(first, actor)).toBe(previous);
      let previousMana = first.manaCost;
      expect(previousMana).toBe(raw.manaCost);
      for (let level = 2; level <= 10; level++) {
        const atLevel = getMagicAtLevel(first, level);
        const amount = getEffectAmount(atLevel, actor);
        expect(amount).toBeGreaterThan(previous);
        expect(atLevel.manaCost).toBeGreaterThan(previousMana);
        for (const field of shapeFields) expect(atLevel[field], `${api.key}/${field}`).toBe(npcFirst[field]);
        previous = amount;
        previousMana = atLevel.manaCost;
      }
    }
    for (let level = 1; level < 10; level++) {
      expect(info.magic!.levelupExp).toBeGreaterThan(info.exp);
      expect(addMagicExpDirect({ callbacks: {}, updateView: vi.fn() }, info, info.magic!.levelupExp - info.exp)).toBe(true);
      expect(info.level).toBe(level + 1);
      expect(info.magic!.effectLevel).toBe(1);
    }
    expect(getMagicGrowthState(info.magic!, 10)).toBe('maxed');
    expect(addMagicExpDirect({ callbacks: {}, updateView: vi.fn() }, info, 999999)).toBe(false);
    expect(getMagic(api.key)).toEqual(snapshot);
  });

  it('covers every eligible snapshot key once and preserves ownership', () => {
    expect(NPC_PLAYER_GROWTH.filter(row => row.game === 'sword1')).toHaveLength(60);
    expect(NPC_PLAYER_GROWTH.filter(row => row.game === 'demo')).toHaveLength(25);
    expect(new Set(NPC_PLAYER_GROWTH.map(row => `${row.game}/${row.key}`)).size).toBe(85);
    expect(NPC_PLAYER_GROWTH.map(row => `${row.game}/${row.key}`).sort()).toEqual(sources.map(row => `${row.game}/${row.api.key}`).sort());
    expect(fixture.npc.every(row => row.userType === 'npc')).toBe(true);
  });

  it('lets author changes, existing levels, unsupported games and exclusions win', () => {
    const raw = getMagic('magic-百剑诀.ini')!;
    for (const edit of [{ effect: 42 }, { speed: raw.speed + 1 }, { goodsName: 'item.ini' }, { flyMagic: 'linked.ini' }, { levels: new Map([[1, { levelupExp: 333 }]]) }]) {
      const source = { ...raw, ...edit };
      expect(repairPlayerMagicProgression(source, { gameSlug: 'demo', userType: 'npc' })).toBe(source);
    }
    for (const gameSlug of ['sword2', 'unknown']) expect(repairPlayerMagicProgression(raw, { gameSlug, userType: 'npc' })).toBe(raw);
    expect(repairPlayerMagicProgression(raw, { gameSlug: 'demo', userType: 'player' })).toBe(raw);
    for (const fileName of ['magic-暗器2.ini', 'magic-长剑.ini', 'magic-弓箭.ini']) {
      const source = { ...raw, fileName };
      expect(repairPlayerMagicProgression(source, { gameSlug: 'demo', userType: 'npc' })).toBe(source);
    }
  });

  it('repairs old NPC saves in every container and replacement form without resetting item state', async () => {
    const fileName = 'magic-百剑诀.ini';
    const raw = getMagic(fileName)!;
    const player = new PlayerMagicInventory(true);
    await player.addMagicBatch([{ fileName, index: 1, level: 3, exp: 1234 }]);
    await player.addHiddenMagicBatch([{ fileName, index: 2, level: 4, exp: 2345, hideCount: 2 }]);
    const shortcut = createDefaultMagicItemInfo(getMagicAtLevel(raw, 5), 5);
    shortcut.exp = 3456;
    shortcut.remainColdMilliseconds = 777;
    player.setBottomSlotForLoad(0, shortcut);
    const training = createDefaultMagicItemInfo(getMagicAtLevel(raw, 6), 6);
    training.exp = 4567;
    player.setXiuLianForLoad(training);
    for (const info of [player.getItemInfo(1), player.getHiddenItemInfo(2), player.getBottomMagicInfo(0), player.getXiuLianMagic()]) {
      expect(info?.magic?.levels?.size).toBe(10);
      expect(info?.magic?.effectLevel).toBe(1);
    }
    await player.deserializeReplaceLists({ isInReplaceMagicList: true, currentReplaceMagicListFilePath: 'active.ini', replaceLists: {
      'active.ini': [{ index: 1, fileName, level: 7, exp: 5678 }],
      'inactive.ini': [{ index: 1, fileName, level: 8, exp: 6789 }, { index: 1002, fileName, level: 9, exp: 7890, hideCount: 2 }],
    } });
    await player.reloadAllMagics();
    expect(player.getItemInfo(1)).toMatchObject({ level: 7, exp: 5678, magic: { effectLevel: 1, levelupExp: 40000 } });
    expect(shortcut).toMatchObject({ level: 5, exp: 3456, remainColdMilliseconds: 777, magic: { effectLevel: 1 } });
    expect(training).toMatchObject({ level: 6, exp: 4567, magic: { effectLevel: 1 } });
    await player.replaceListTo('inactive.ini', []);
    expect(player.getItemInfo(1)).toMatchObject({ level: 8, exp: 6789, magic: { effectLevel: 1, levelupExp: 64000 } });
    expect(raw.levels).toBeUndefined();
  });

  it('distinguishes mastered skills from empty placeholder tables and fixed old attacks', () => {
    const raw = createDefaultMagicData();
    expect(getMagicGrowthState(raw, 1)).toBe('unconfigured');
    expect(getMagicGrowthState(raw, 10)).toBe('unconfigured');
    raw.levels = new Map(Array.from({ length: 10 }, (_, i) => [i + 1, { levelupExp: 0 }]));
    expect(getMagicGrowthState(raw, 10)).toBe('unconfigured');
    raw.levels.get(9)!.levelupExp = 100;
    expect(getMagicGrowthState(raw, 10)).toBe('maxed');
    expect(getMagicGrowthState(raw, 5)).toBe('unconfigured');
  });
});
