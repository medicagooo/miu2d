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
import { SpriteFactory } from '../../src/magic/manager/sprite-factory';
import type { MagicSprite } from '../../src/magic/magic-sprite';
import { MagicMoveKind } from '../../src/magic/magic-enums';
import { writeFileSync } from 'node:fs';
import { afterAll } from 'vitest';
import { CharacterCombat } from '../../src/character/base/character-combat';
import { MagicCollisionHandler } from '../../src/magic/manager/collision-handler';

const shapeEvidence: unknown[] = [];
afterAll(() => {
  if (process.env.NPC_SHAPE_EVIDENCE) writeFileSync(process.env.NPC_SHAPE_EVIDENCE, JSON.stringify(shapeEvidence, null, 2));
});

// Use real API conversion/cache and level calculation: fixtures are selected public API fields,
// not hand-built MagicData matching the implementation's assumptions.
const fixture = vi.hoisted(() => ({ slug: 'demo', npc: [] as Magic[], builders: [] as (() => void)[] }));
vi.mock('../../src/data/game-data-api', async importOriginal => ({
  ...await importOriginal<typeof import('../../src/data/game-data-api')>(),
  getGameSlug: () => fixture.slug,
  getMagicsData: () => ({ player: [], npc: fixture.npc }),
  getGoodsData: () => [],
  getLevelsData: () => ({ player: [], npc: [] }),
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

function emit(magic: ReturnType<typeof createDefaultMagicData>) {
  const sprites: { sprite: MagicSprite; delay: number }[] = [];
  const factory = new SpriteFactory({} as never, {} as never, {
    addMagicSprite: (sprite: MagicSprite) => sprites.push({ sprite, delay: 0 }),
    addWorkItem: (delay: number, sprite: MagicSprite) => sprites.push({ sprite, delay }),
  } as never);
  const args = ['player', magic, { x: 640, y: 320 }, { x: 960, y: 320 }, false] as const;
  switch (magic.moveKind) {
    case MagicMoveKind.SingleMove: factory.addSingleMoveMagicSprite(...args); break;
    case MagicMoveKind.FollowEnemy: factory.addFollowEnemyMagicSprite(...args); break;
    case MagicMoveKind.LineMove: factory.addLineMoveMagicSprite(...args); break;
    case MagicMoveKind.FixedWall: factory.addFixedWallMagicSprite(...args); break;
    case MagicMoveKind.WallMove: factory.addWallMoveMagicSprite(...args); break;
    case MagicMoveKind.SectorMove: factory.addSectorMoveMagicSprite(...args); break;
    case MagicMoveKind.RandomSector: factory.addRandomSectorMoveMagicSprite(...args); break;
    case MagicMoveKind.RegionBased: factory.addRegionBasedMagicSprite(...args); break;
    case MagicMoveKind.CircleMove: factory.addCircleMoveMagicSprite('player', magic, args[2], false); break;
    case MagicMoveKind.SpiralMove: factory.addSpiralMoveMagicSprite(...args); break;
    default: throw new Error(`Uncovered move kind ${magic.moveKind}`);
  }
  return sprites;
}

describe('actual four-tier sprite factories', () => {
  it.each(NPC_PLAYER_GROWTH)('$game/$key emits its audited shape', ({game, key, shape}) => {
    load(game);
    const raw = getMagic(key)!;
    const configured = repairPlayerMagicProgression(raw, { gameSlug: game, userType: 'npc' });
    const original = emit(getMagicAtLevel(raw, 1));
    for (const [tier, level] of [1, 4, 7, 10].entries()) {
      const magic = getMagicAtLevel(configured, level);
      const shots = emit(magic);
      shapeEvidence.push({ game, key, shape, level, effectExt: magic.effectExt, mana: magic.manaCost,
        shots: shots.map(({sprite, delay}) => ({ position: sprite.positionInWorld, direction: sprite.direction, speed: sprite.velocity, scale: sprite.speedRatio, delay })) });
      const width = 3 + 2 * tier;
      const count = shape === 'square' || shape === 'triangle' ? width ** 2
        : shape === 'rectangle' ? width * 5 : shape === 'circle' || shape === 'spiral' ? 32
        : shape === 'single' || shape === 'tracking' ? tier + 1 : shape === 'line' ? 1 + 2 * tier : width;
      expect(shots).toHaveLength(count);
      expect(shots.every(({sprite}) => Number.isFinite(sprite.positionInWorld.x) && Number.isFinite(sprite.positionInWorld.y))).toBe(true);
      if (tier === 0) {
        expect(shots.map(({sprite}) => sprite.positionInWorld)).toEqual(original.map(({sprite}) => sprite.positionInWorld));
      }
      if (shape === 'single' || shape === 'tracking') expect(shots.map(s => s.delay)).toEqual(Array.from({length: tier + 1}, (_, i) => i * 120));
      if (shape === 'sector' && tier > 0) {
        const angle = (s: typeof shots[number]) => Math.atan2(s.sprite.direction.y, s.sprite.direction.x);
        expect(Math.abs(angle(shots.at(-1)!) - angle(shots[0]))).toBeGreaterThan(Math.abs(angle(original.at(-1)!) - angle(original[0])));
      }
      if (shape === 'square' || shape === 'triangle' || shape === 'rectangle' || shape === 'wall') {
        expect(new Set(shots.map(({sprite}) => `${sprite.positionInWorld.x},${sprite.positionInWorld.y}`)).size).toBe(count);
      }
      if (shape === 'circle' || shape === 'spiral') {
        expect(shots.every(({sprite}) => sprite.speedRatio === 1 + tier * .2)).toBe(true);
        if (shape === 'spiral') for (let i = 0; i < 32; i++) {
          expect(shots[i].sprite.positionInWorld.x - 640).toBeCloseTo((original[i].sprite.positionInWorld.x - 640) * (1 + tier * .2));
          expect(shots[i].sprite.positionInWorld.y - 320).toBeCloseTo((original[i].sprite.positionInWorld.y - 320) * (1 + tier * .2));
        }
      }
      if (magic.specialKind >= 1 && magic.specialKind <= 3) expect(magic.specialKindMilliSeconds).toBe(2000);
      if (magic.specialKind >= 1 && magic.specialKind <= 3) for (const isPlayer of [false, true]) {
        const setter = vi.fn();
        const target = { isPlayer, statusEffects: { setFrozenSeconds: setter, setPoisonSeconds: setter, setPetrifySeconds: setter } };
        const apply = (MagicCollisionHandler.prototype as unknown as { applySpecialKindEffects: (...args: unknown[]) => void }).applySpecialKindEffects;
        apply.call({}, shots[0].sprite, target, magic, null);
        expect(setter).toHaveBeenCalledWith(magic.specialKind === 1 && isPlayer ? 1 : 2, true);
      }
      // Exercise the real defense/minimum-damage path. Totals model landed hits, not guaranteed hits.
      for (const defense of [0, 100, 1000]) {
        const actor = { isPlayer: true, attack: 500, realAttack: 525, attack2: 0, attack3: 0, effectFormulaAdditive: game === 'sword1' };
        const damage = getEffectAmount(magic, actor);
        const target = () => ({ isDeathInvoked: false, isDeath: false, isInGodMode: () => false, invincible: 0,
          life: 1e8, realDefend: defense, defend2: 0, defend3: 0, _magicSpritesInEffect: [],
          onDamaged: vi.fn(), hurting: vi.fn() });
        const hit = (victim: ReturnType<typeof target>) => CharacterCombat.prototype.takeDamageFromMagic.call(victim as never, damage, 0, 0, 0, null);
        const one = target();
        const perHit = hit(one);
        expect(perHit).toBeCloseTo(Math.max(10, damage - defense));
        const group = Array.from({length: 3}, target);
        expect(group.reduce((total, victim) => total + hit(victim), 0)).toBeCloseTo(perHit * 3);
        const repeated = target();
        expect(shots.reduce(total => total + hit(repeated), 0)).toBeCloseTo(perHit * shots.length);
      }
    }
    expect(raw.playerShape).toBeUndefined();
  });
});

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
    const shapeFields = ['moveKind', 'specialKind', 'specialKindValue',
       'speed', 'lifeFrame', 'region', 'passThrough', 'rangeRadius', 'rangeDamage',
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
      expect(info.magic!.effectLevel).toBe(info.magic!.playerShape!.effectLevel);
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
      expect(info?.magic?.effectLevel).toBe(1 + Math.floor((info!.level - 1) / 3) * 3);
    }
    await player.deserializeReplaceLists({ isInReplaceMagicList: true, currentReplaceMagicListFilePath: 'active.ini', replaceLists: {
      'active.ini': [{ index: 1, fileName, level: 7, exp: 5678 }],
      'inactive.ini': [{ index: 1, fileName, level: 8, exp: 6789 }, { index: 1002, fileName, level: 9, exp: 7890, hideCount: 2 }],
    } });
    await player.reloadAllMagics();
    expect(player.getItemInfo(1)).toMatchObject({ level: 7, exp: 5678, magic: { effectLevel: 7, levelupExp: 40000 } });
    expect(shortcut).toMatchObject({ level: 5, exp: 3456, remainColdMilliseconds: 777, magic: { effectLevel: 4 } });
    expect(training).toMatchObject({ level: 6, exp: 4567, magic: { effectLevel: 4 } });
    await player.replaceListTo('inactive.ini', []);
    expect(player.getItemInfo(1)).toMatchObject({ level: 8, exp: 6789, magic: { effectLevel: 7, levelupExp: 64000 } });
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
