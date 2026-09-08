/**
 * AI-TRACE: Bundled NPC martial-art description contract.
 * Purpose: provide polished `intro` fallbacks for the 34 verified NPC magic keys whose public
 * API records mostly have no prose. Upstream callers pass the original intro, key, and userType.
 * Downstream consumers are engine MagicData conversion and Dashboard magic-picker previews.
 * Compatibility: verified NPC keys use the approved local prose consistently; player, unknown,
 * and `Relation.Ini` records retain authored API prose, and no database or remote data is mutated.
 */

export const BUNDLED_NPC_MAGIC_DESCRIPTIONS = {
  "magic-百剑诀.ini":
    "凝神御剑，化一剑为百剑。剑气环列成阵，自四面八方袭向敌手，其中暗藏阴毒之劲，令人防不胜防。",
  "magic-柳叶飞刀.ini":
    "以巧劲掷出柳叶飞刀，刀身轻薄、来势迅疾。寒芒一闪之间，便可直取敌人要害。",
  "magic-月眉儿攻击.ini":
    "将真气凝成数道月牙锋芒，于敌阵之中回旋绽放。蓝紫刃光交错，可同时威胁一片区域。",
  "magic-弓箭.ini":
    "引弓蓄力，将劲气尽数贯入箭锋。一箭离弦，去势如电，可于远处穿袭敌手。",
  "magic-蜂王毒刺.ini":
    "取蜂王尾针之势，将剧毒凝于一点骤然射出。中招者不但受锐器穿刺，更会遭受毒力侵蚀。",
  "magic-孟知秋攻击.ini":
    "运剑劈出雄浑剑气，蓝金锋芒落地后向四周迸发。气势沉稳厚重，可压制一片区域内的敌人。",
  "magic-两格长枪.ini":
    "挺枪直刺，将全身劲力聚于枪尖。招式朴实却迅猛凌厉，可在近身之前先一步贯穿对手。",
  "magic-金针攻击.ini":
    "以内力同时催动成排金针，使其如一道锋锐铁壁向前推进。针势连绵，令正面的敌人难以闪避。",
  "magic-紫轩攻击.ini":
    "将花瓣揉入真气，凝成一道紫红飞梭。看似柔美轻盈，实则锋锐异常，可直取敌人咽喉。",
  "magic-强盗飞刀.ini":
    "江湖强盗惯用的飞刀手法。虽无精妙章法，却胜在出手突然、散射无常，常令对手措手不及。",
  "magic-刀.ini":
    "以腰马之力挥刀横斩，刀锋裹挟赤红劲气。招式简洁直接，最适合近身迎敌。",
  "magic-毒液2.ini":
    "将腐蚀毒液聚于掌前，向扇面骤然喷洒。毒液覆盖之处皆受侵蚀，可同时压制多名敌人。",
  "magic-符咒攻击.ini":
    "运气激活数道符纸，使其并列飞出。符咒落向前方扇面，以法力封锁敌人的闪避空间。",
  "magic-推山填海.ini":
    "密宗至阴至寒的护法神功。真气爆发时如冰潮破狱，数股寒劲散射而出，可冻结敌人、迟滞其行动。",
  "magic-土系攻击2.ini":
    "引动大地厚重之气，使岩石与尘沙沿螺旋轨迹席卷而出。其势沉猛，足以撕开敌人的防守。",
  "magic-悲天悯人咒.ini":
    "默诵悲悯法咒，引来净水与白莲之影。咒力于地面徐徐铺开，在宁静祥和之中暗藏制敌威势。",
  "magic-火系攻击2.ini":
    "将烈焰凝为火种投入敌阵，落地后骤然化作燃烧法阵。阵中火势翻涌，可灼伤一片区域内的敌人。",
  "magic-飞刀.ini":
    "将内劲灌入飞刀，抬手之间寒光已至。刀势沿直线疾行，专取单一目标的薄弱之处。",
  "magic-蔷薇攻击.ini":
    "以真气催生蔷薇与荆棘，使其锁定敌人的气息追袭而去。花影虽美，触及之时却尽是锋芒。",
  "magic-毒液.ini":
    "将紫绿毒液化作扇形浪潮泼向前方。毒势覆盖宽广，敌人稍有不慎便会陷入毒液包围。",
  "magic-暗器2.ini":
    "以内家真力掷出十字暗器，暗器破空而行，射程悠远。蓝黑寒芒一闪，便可远取敌首。",
  "magic-小符咒攻击.ini":
    "以轻巧手法连续打出小型符咒，符纸借雷火之力随机散射。招式变化难测，令人无从预判。",
  "magic-火系攻击3.ini":
    "将烈火真气运至双掌，猛然推出一道扇形火浪。炽热掌风席卷前方，可同时焚击多名敌人。",
  "magic-冰刀攻击.ini":
    "凝水成冰、化冰为刃。冰刀离手后携霜气直袭目标，中招者只觉寒意透骨。",
  "magic-蝙蝠.ini":
    "以邪异真气化出妖蝠，振翼俯冲敌手。妖蝠来势诡谲，紫绿魔气更添几分阴森。",
  "magic-纳兰潜凛攻击.ini":
    "将阴寒剑气分化为数道刃影，使其绕心回旋。敌人一旦踏入其中，便会遭到接连不断的环绕斩击。",
  "magic-水系攻击2.ini":
    "汇聚水灵之气，凝成一条冰蓝水龙奔袭而出。水势看似柔和，正面冲击却足以撼动敌手。",
  "magic-毒烟攻击.ini":
    "运功释放蛇形毒烟，使烟气蜿蜒扑向目标。毒烟久久不散，可从远处侵蚀敌人的气血。",
  "magic-长剑.ini":
    "持剑迅疾挥斩，银色剑锋带出一线冷芒。招式虽是基础剑法，却兼具速度与精准。",
  "magic-金刚电闪.ini":
    "将金刚拳劲与雷电之力融为一体，出拳时紫电向前随机分裂。拳雷交击，可同时威胁多个方向。",
  "magic-水系攻击1.ini":
    "将水气压缩成一枚青蓝水弹，沿直线迅速射出。招式凝练，适合快速攻击单一目标。",
  "magic-沙暴攻击.ini":
    "引动狂风与黄沙，凝成一道旋转风刃向前推进。沙暴所经之处视野尽失，锋芒更可割裂血肉。",
  "magic-金钱镖.ini":
    "将内劲附于方孔钱币，使其化作锋锐暗器扇形飞出。金光闪烁之间，数枚钱镖已同时袭至。",
  "magic-花瓣攻击.ini":
    "以内力牵引漫天花瓣，使其围绕中心不断旋舞。花瓣柔中带锐，可从四周持续切割敌人。",
} as const;

function normalizeMagicKey(key: string): string {
  return key.replace(/\\/g, "/").split("/").pop()?.toLowerCase() ?? "";
}

export function getBundledNpcMagicDescription(
  key: string,
  userType?: string | null
): string | undefined {
  if (userType && userType !== "npc") return undefined;

  const normalizedKey = normalizeMagicKey(key);
  return BUNDLED_NPC_MAGIC_DESCRIPTIONS[
    normalizedKey as keyof typeof BUNDLED_NPC_MAGIC_DESCRIPTIONS
  ];
}

export function resolveMagicIntro(
  intro: string | null | undefined,
  key: string,
  userType?: string | null
): string | undefined {
  return getBundledNpcMagicDescription(key, userType) ?? (intro?.trim() ? intro : undefined);
}
