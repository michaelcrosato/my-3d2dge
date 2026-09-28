/* =============================================================================
 * LOOT: items, rarities, affixes, legendary powers, drops on the ground, pickup and equipping
 * An ITEM is { uid, base, slot, name, rarity: 0 common | 1 magic | 2 rare | 3 legendary | 4 unique, ilvl,
 *   dmg: [min, max] (weapons), implicit: [{ stat, v }], affixes: [{ id, stat, v }], power (legendary / unique power id),
 *   look: { colors, hat, armor, outfit, cape, bladeLen, weapon } (how it changes the hero), el (weapon element), value }
 * A BASE is def('itemBases', id, { slot, name, minIlvl, dmg, implicit: { stat: v }, look, colors: [palette choices], weight })
 * An AFFIX is def('itemAffixes', id, { stat, kind: 'prefix' | 'suffix', slots: [...], v: [min, max] at item level 1,
 *   scale: 'flat' | 'pct' | 'none', names: [by tier, 5 tiers], minIlvl, weight, pick(R) -> stat (for rank:<skill>) })
 * A POWER is def('powers', id, { name, desc, slots, stats: { ... } (always on), install() (adds BUS listeners that check hasPower) })
 * A UNIQUE is def('uniques', id, { name, base, stats: [[stat, v], ...], power, look, flavor, minIlvl })
 * ============================================================================= */
const RARITY = [
  { id: 'common', name: 'Common', color: '#d8d0c0', n: [0, 0], value: 1 },
  { id: 'magic', name: 'Magic', color: '#7aa8ff', n: [1, 2], value: 3, beam: '#6a9aff' },
  { id: 'rare', name: 'Rare', color: '#ffd84a', n: [3, 5], value: 8, beam: '#ffd84a' },
  { id: 'legendary', name: 'Legendary', color: '#ff8a2a', n: [3, 4], value: 20, beam: '#ff8a2a' },
  { id: 'unique', name: 'Unique', color: '#e8c890', n: [0, 0], value: 30, beam: '#e8c890' }
];
const SLOTS = ['weapon', 'helm', 'chest', 'gloves', 'legs', 'boots', 'cloak', 'amulet', 'ring', 'ring2'];
const SLOT_NAMES = { weapon: 'Weapon', helm: 'Helm', chest: 'Chest', gloves: 'Gloves', legs: 'Legs', boots: 'Boots', cloak: 'Cloak', amulet: 'Amulet', ring: 'Ring', ring2: 'Ring' };
const ARMOR_SLOTS = ['helm', 'chest', 'gloves', 'legs', 'boots', 'cloak'], JEWEL_SLOTS = ['amulet', 'ring'];
let itemUid = 1;
const hasPower = (h, id) => !!h && h.powers.includes(id);

/* ---------- bases ---------- */
const CLOTH = ['#2f8f86', '#8a3a3a', '#3a5a9a', '#5a7a3a', '#6a4a8a', '#8a6a3a', '#3a3a4a', '#9a8a6a', '#2a6a5a', '#7a2a4a'];
const LEATHER = ['#6a4128', '#4a3020', '#7a5a3a', '#3a2a22', '#5a3a2a'], METAL = ['#b9c1cf', '#8a94a8', '#c8b078', '#7a8290', '#d8dce8'];
const CAPES = ['#c8452f', '#3a4a9a', '#2a6a4a', '#6a2a6a', '#b88a2a', '#1e1e2a', '#8a1a2a', '#e0e0e8'];
const W = (id, name, lv, dmg, look, o = {}) => def('itemBases', id, Object.assign({ slot: 'weapon', name, minIlvl: lv, dmg, look: Object.assign({ weapon: 'sword' }, look), weight: 10 }, o));
W('shortsword', 'Short Sword', 1, [4, 8], { bladeLen: 9 });
W('longsword', 'Longsword', 1, [6, 11], { bladeLen: 11 });
W('saber', 'Saber', 3, [5, 10], { bladeLen: 10, colors: { metal: '#e8eef8', hilt: '#c8a040' } }, { implicit: { crit: 3 } });
W('broadsword', 'Broadsword', 4, [8, 14], { bladeLen: 12, colors: { metal: '#c8ccd8', metalDk: '#6a7080' } });
W('runeblade', 'Runeblade', 5, [7, 13], { bladeLen: 11, colors: { metal: '#8fe0e0', metalDk: '#2f7f82', hilt: '#3a4a5a' } }, { implicit: { incSpell: 12 } });
W('greatblade', 'Greatblade', 7, [12, 21], { bladeLen: 14, colors: { metal: '#a8b0c0', metalDk: '#505868', hilt: '#5a3a2a' } }, { implicit: { atkSpeed: -8, knockback: 25 } });
W('staff', 'Ember Staff', 2, [5, 12], { weapon: 'staff', colors: { staff: '#6a4a2a', orb: '#ffb347' } }, { implicit: { incSpell: 20, castSpeed: 8 }, el: 'fire' });
W('frostwand', 'Rime Staff', 6, [6, 13], { weapon: 'staff', colors: { staff: '#4a5a7a', orb: '#9fe8ff' } }, { implicit: { incFrost: 20, castSpeed: 8 }, el: 'frost' });
W('fang', 'Serpent Fang', 9, [7, 14], { bladeLen: 10, colors: { metal: '#c8f090', metalDk: '#3a7a1a', hilt: '#2a3a1a' } }, { implicit: { incVenom: 15 }, el: 'venom' });
W('stormedge', 'Storm Edge', 11, [8, 16], { bladeLen: 12, colors: { metal: '#fff4b0', metalDk: '#8a7a3a', hilt: '#3a3a5a' } }, { implicit: { incStorm: 15 }, el: 'storm' });
W('voidblade', 'Hollow Blade', 13, [9, 17], { bladeLen: 12, colors: { metal: '#c8a0ff', metalDk: '#4a2090', hilt: '#1a1028' } }, { implicit: { incVoid: 15 }, el: 'void' });
const AR = (id, slot, name, lv, armor, look, o = {}) => def('itemBases', id, Object.assign({ slot, name, minIlvl: lv, armor, look, weight: 10 }, o));
AR('leathercap', 'helm', 'Leather Cap', 1, 3, { hat: { style: 'cap', color: '#6a4128' } });
AR('hood', 'helm', 'Hood', 1, 2, { hood: true }, { implicit: { ember: 6 } });
AR('ironhelm', 'helm', 'Iron Helm', 3, 7, { hat: { style: 'helmet', color: '#8a94a8' } });
AR('circlet', 'helm', 'Circlet', 5, 3, { hat: { style: 'band', color: '#c8a040' } }, { implicit: { cdr: 3 } });
AR('wizardhat', 'helm', 'Wizard Hat', 6, 2, { hat: { style: 'pointed', color: '#4a2a8a' } }, { implicit: { incSpell: 8 } });
AR('crown', 'helm', 'Crown', 12, 5, { hat: { style: 'crown', color: '#e8c040' } }, { implicit: { magicFind: 10 } });
AR('tunic', 'chest', 'Tunic', 1, 4, { outfit: 'tunic' }, { colors: CLOTH });
AR('jerkin', 'chest', 'Jerkin', 2, 7, { outfit: 'tunic', sleeves: 'long' }, { colors: LEATHER });
AR('mail', 'chest', 'Mail Shirt', 4, 12, { outfit: 'tunic', armor: true }, { colors: CLOTH });
AR('plate', 'chest', 'Plate Armor', 8, 20, { outfit: 'tunic', armor: true, sleeves: 'long' }, { colors: CLOTH, implicit: { moveSpeed: -3 } });
AR('robe', 'chest', 'Robe', 3, 3, { outfit: 'robe', sleeves: 'long' }, { colors: CLOTH, implicit: { ember: 15 } });
AR('coat', 'chest', 'Long Coat', 5, 9, { outfit: 'coat', sleeves: 'long' }, { colors: CLOTH, implicit: { dodge: 3 } });
AR('wraps', 'gloves', 'Wraps', 1, 2, {}, { colors: LEATHER, lookKey: 'glove' });
AR('gauntlets', 'gloves', 'Gauntlets', 4, 6, {}, { colors: METAL, lookKey: 'glove' });
AR('trousers', 'legs', 'Trousers', 1, 3, {}, { colors: ['#3b3552', '#3a3a2a', '#2a2a3a', '#4a3a2a', '#2a3a3a'], lookKey: 'pants' });
AR('greaves', 'legs', 'Greaves', 5, 8, {}, { colors: METAL, lookKey: 'pants' });
AR('shoes', 'boots', 'Shoes', 1, 2, {}, { colors: LEATHER, lookKey: 'boot', implicit: { moveSpeed: 3 } });
AR('boots', 'boots', 'Boots', 3, 5, {}, { colors: LEATHER, lookKey: 'boot' });
AR('sabatons', 'boots', 'Sabatons', 7, 9, {}, { colors: METAL, lookKey: 'boot' });
AR('cape', 'cloak', 'Cape', 1, 2, { cape: { len: 6, width: 5, seg: 2.5 } }, { colors: CAPES, lookKey: 'cape' });
AR('longcape', 'cloak', 'Long Cape', 4, 3, { cape: { len: 8, width: 5.5, seg: 2.5 } }, { colors: CAPES, lookKey: 'cape', implicit: { dodge: 2 } });
AR('mantle', 'cloak', 'Mantle', 6, 4, { cape: { len: 4, width: 6.5, seg: 2.4 } }, { colors: CAPES, lookKey: 'cape', implicit: { armorPct: 8 } });
def('itemBases', 'amulet', { slot: 'amulet', name: 'Amulet', minIlvl: 1, weight: 8, gems: ['#e04a4a', '#4a8ae0', '#4ae08a', '#e0c04a', '#b070ff'] });
def('itemBases', 'ring', { slot: 'ring', name: 'Ring', minIlvl: 1, weight: 10, gems: ['#e04a4a', '#4a8ae0', '#4ae08a', '#e0c04a', '#b070ff', '#e8e8f0'] });

/* ---------- affixes ---------- */
const WPN = ['weapon'], ARM = ARMOR_SLOTS, JWL = JEWEL_SLOTS, ANY = SLOTS.filter(s => s !== 'ring2');
const TIERS = (a, b, c, d, e) => [a, b, c, d, e];
const AF = (id, stat, kind, slots, v, names, o = {}) => def('itemAffixes', id, Object.assign({ stat, kind, slots, v, names, scale: 'pct', weight: 10, minIlvl: 1 }, o));
AF('sharp', 'dmgFlat', 'prefix', WPN, [2, 5], TIERS('Sharp', 'Keen', 'Honed', 'Vicious', 'Merciless'), { scale: 'flat', weight: 14 });
AF('heavy', 'dmgPct', 'prefix', WPN, [15, 32], TIERS('Heavy', 'Cruel', 'Brutal', 'Savage', 'Tyrannical'), { weight: 12 });
AF('fiery', 'incFire', 'prefix', WPN.concat(JWL, ['gloves']), [8, 16], TIERS('Smoldering', 'Burning', 'Blazing', 'Infernal', 'Cinderborn'));
AF('icy', 'incFrost', 'prefix', WPN.concat(JWL, ['gloves']), [8, 16], TIERS('Chilled', 'Frosted', 'Rimed', 'Glacial', 'Winterborn'));
AF('charged', 'incStorm', 'prefix', WPN.concat(JWL, ['gloves']), [8, 16], TIERS('Static', 'Charged', 'Crackling', 'Thundering', 'Stormborn'));
AF('hollow', 'incVoid', 'prefix', WPN.concat(JWL, ['gloves']), [8, 16], TIERS('Dusky', 'Hollow', 'Umbral', 'Abyssal', 'Voidborn'));
AF('toxic', 'incVenom', 'prefix', WPN.concat(JWL, ['gloves']), [8, 16], TIERS('Tainted', 'Toxic', 'Venomous', 'Virulent', 'Plagueborn'));
AF('duelist', 'incMelee', 'prefix', WPN.concat(['gloves', 'ring']), [10, 20], TIERS("Squire's", "Duelist's", "Champion's", "Warlord's", "Legend's"));
AF('arcane', 'incSpell', 'prefix', WPN.concat(['helm', 'amulet']), [10, 20], TIERS("Apprentice's", "Adept's", "Mage's", "Archmage's", "Emberlord's"));
AF('mighty', 'incDmg', 'prefix', ['amulet', 'ring'], [5, 12], TIERS('Mighty', 'Powerful', 'Dominant', 'Overwhelming', 'Godly'), { weight: 7 });
AF('hale', 'life', 'prefix', ARM.concat(JWL), [8, 20], TIERS('Hale', 'Stout', 'Robust', 'Titanic', 'Colossal'), { scale: 'flat', weight: 14 });
AF('vital', 'lifePct', 'prefix', ['chest', 'amulet'], [4, 9], TIERS('Vital', 'Hardy', 'Enduring', 'Undying', 'Eternal'), { weight: 7 });
AF('plated', 'armor', 'prefix', ARM, [6, 14], TIERS('Studded', 'Plated', 'Fortified', 'Bulwark', 'Adamant'), { scale: 'flat', weight: 12 });
AF('warded', 'armorPct', 'prefix', ARM, [10, 25], TIERS('Warded', 'Reinforced', 'Bastion', 'Citadel', 'Unbreaking'));
AF('glowing', 'ember', 'prefix', ['helm', 'amulet', 'ring', 'chest'], [8, 16], TIERS('Glowing', 'Radiant', 'Luminous', 'Blazing', 'Sunlit'), { scale: 'flat' });
AF('deadly', 'critDmg', 'prefix', WPN.concat(['amulet', 'gloves']), [12, 26], TIERS('Deadly', 'Lethal', 'Murderous', 'Executioner\'s', 'Fatal'));
AF('precise', 'crit', 'prefix', WPN.concat(['gloves', 'ring', 'helm']), [1.5, 4], TIERS('Precise', 'Keen-eyed', 'Unerring', 'Sniper\'s', 'Fateful'), { scale: 'none' });
AF('swift', 'atkSpeed', 'prefix', WPN.concat(['gloves', 'ring']), [4, 9], TIERS('Swift', 'Quick', 'Rapid', 'Blurring', 'Lightning'), { scale: 'none' });
AF('chanting', 'castSpeed', 'prefix', WPN.concat(['amulet', 'helm']), [4, 9], TIERS('Chanting', 'Fluent', 'Eloquent', 'Rapturous', 'Unending'), { scale: 'none' });
const RES = (id, stat, n) => AF(id, stat, 'suffix', ARM.concat(JWL), [8, 16], TIERS('of ' + n[0], 'of ' + n[1], 'of ' + n[2], 'of ' + n[3], 'of ' + n[4]), { scale: 'none' });
RES('ofember', 'resFire', ['Embers', 'the Hearth', 'the Forge', 'the Furnace', 'the Sun']);
RES('offrost', 'resFrost', ['Frost', 'Winter', 'the Glacier', 'the Pole', 'Endless Winter']);
RES('ofstorm', 'resStorm', ['Sparks', 'Grounding', 'the Storm', 'the Tempest', 'the Thunder King']);
RES('ofshade', 'resVoid', ['Shade', 'the Veil', 'the Hollow', 'the Abyss', 'the Void']);
RES('ofcure', 'resVenom', ['Remedy', 'the Cure', 'Purity', 'the Antidote', 'the Unblighted']);
AF('ofprism', 'resAll', 'suffix', ['amulet', 'ring', 'chest'], [4, 8], TIERS('of Warding', 'of the Prism', 'of Shelter', 'of the Sanctum', 'of Immunity'), { scale: 'none', weight: 5 });
AF('ofregen', 'lifeRegen', 'suffix', ARM.concat(JWL), [.5, 1.5], TIERS('of Mending', 'of Healing', 'of Renewal', 'of the Troll', 'of the Phoenix'), { scale: 'flat' });
AF('ofleech', 'lifeOnHit', 'suffix', WPN.concat(['gloves', 'ring']), [1, 3], TIERS('of the Tick', 'of the Leech', 'of the Bat', 'of the Lamprey', 'of the Vampire'), { scale: 'flat' });
AF('ofthirst', 'leech', 'suffix', WPN.concat(['ring']), [.8, 2], TIERS('of Thirst', 'of Craving', 'of Hunger', 'of Famine', 'of the Bloodlord'), { scale: 'none', weight: 6 });
AF('offocus', 'emberRegen', 'suffix', ['helm', 'amulet', 'weapon', 'ring'], [1, 2.5], TIERS('of Focus', 'of Kindling', 'of the Flame', 'of the Pyre', 'of the Everburn'), { scale: 'none' });
AF('ofspeed', 'moveSpeed', 'suffix', ['boots'], [6, 12], TIERS('of Haste', 'of Speed', 'of the Wind', 'of the Gale', 'of the Comet'), { scale: 'none', weight: 16 });
AF('ofevasion', 'dodge', 'suffix', ['boots', 'legs', 'cloak'], [2, 5], TIERS('of Evasion', 'of Shadows', 'of the Fox', 'of the Phantom', 'of Mist'), { scale: 'none' });
AF('ofreadiness', 'cdr', 'suffix', ['helm', 'amulet', 'ring'], [4, 8], TIERS('of Readiness', 'of Alacrity', 'of Tempo', 'of the Hourglass', 'of Eternity'), { scale: 'none', weight: 7 });
AF('ofreach', 'area', 'suffix', ['amulet', 'chest', 'gloves'], [6, 12], TIERS('of Reach', 'of Breadth', 'of the Expanse', 'of Dominion', 'of the Horizon'), { scale: 'none' });
AF('ofgreed', 'goldFind', 'suffix', ['ring', 'amulet', 'helm', 'boots'], [10, 25], TIERS('of Coin', 'of Greed', 'of Plenty', 'of the Hoard', 'of Midas'), { scale: 'none', weight: 6 });
AF('offortune', 'magicFind', 'suffix', ['ring', 'amulet', 'helm', 'boots'], [6, 15], TIERS('of Luck', 'of Fortune', 'of Chance', 'of the Gambler', 'of Destiny'), { scale: 'none', weight: 6 });
AF('oflore', 'xpGain', 'suffix', ['helm', 'amulet'], [4, 10], TIERS('of Study', 'of Lore', 'of Wisdom', 'of the Sage', 'of Enlightenment'), { scale: 'none', weight: 5 });
AF('ofreaching', 'pickup', 'suffix', ['boots', 'gloves'], [20, 40], TIERS('of Grasping', 'of Reaching', 'of the Magnet', 'of Attraction', 'of Gathering'), { scale: 'none', weight: 5 });
AF('ofthorns', 'thorns', 'suffix', ['chest', 'legs'], [3, 8], TIERS('of Thorns', 'of Brambles', 'of Spikes', 'of the Porcupine', 'of the Iron Maiden'), { scale: 'flat' });
AF('offorce', 'knockback', 'suffix', WPN.concat(['gloves']), [10, 25], TIERS('of Force', 'of Impact', 'of the Ram', 'of the Avalanche', 'of the Titan'), { scale: 'none' });
AF('ofaffliction', 'statusChance', 'suffix', WPN.concat(['amulet', 'gloves']), [10, 25], TIERS('of Affliction', 'of Blight', 'of Torment', 'of Ruin', 'of Calamity'), { scale: 'none' });
AF('ofvolley', 'projectiles', 'suffix', ['weapon', 'amulet'], [1, 1], TIERS('of Volleys', 'of Volleys', 'of Barrages', 'of Barrages', 'of the Storm of Blades'), { scale: 'none', weight: 3, minIlvl: 8 });
AF('ofskill', 'rank:', 'suffix', ['amulet', 'helm', 'weapon', 'gloves'], [1, 1], TIERS('of Practice', 'of Skill', 'of Mastery', 'of Virtuosity', 'of Perfection'), { scale: 'none', weight: 5, minIlvl: 3,
  pick: R => { const ids = Object.keys(REG.skills).filter(id => !REG.skills[id].noRank); return 'rank:' + R.pick(ids); } });
AF('ofall', 'allSkills', 'suffix', ['amulet'], [1, 1], TIERS('of the Adept', 'of the Adept', 'of the Master', 'of the Master', 'of the Deep'), { scale: 'none', weight: 2, minIlvl: 15 });
AF('ofdodging', 'dodgeCharges', 'suffix', ['boots', 'cloak'], [1, 1], TIERS('of Tumbling', 'of Tumbling', 'of the Acrobat', 'of the Acrobat', 'of the Wind Dancer'), { scale: 'none', weight: 3, minIlvl: 10 });

/* ---------- generation ---------- */
function rollAffix(A, ilvl, R) {
  const k = A.scale === 'flat' ? SCALE.ilvl(ilvl) : A.scale === 'pct' ? 1 + Math.min(1.5, (ilvl - 1) * .025) : 1;
  let v = R.range(A.v[0], A.v[1]) * k;
  v = A.v[1] - A.v[0] < 3 && A.scale !== 'flat' ? Math.round(v * 10) / 10 : Math.round(v);
  const tier = clamp(Math.floor((ilvl - 1) / 8 + R() * 1.2), 0, 4);
  return { id: A.id, stat: A.pick ? A.pick(R) : A.stat, v: Math.max(A.v[0] < 1 ? .1 : 1, v), tier };
}
function pickBase(slot, ilvl, R) {
  const opts = Object.values(REG.itemBases).filter(b => (b.minIlvl || 1) <= ilvl + 1 && (!slot || b.slot === slot || (slot === 'ring2' && b.slot === 'ring')));
  return R.weighted(opts, b => (b.weight || 10) * (1 + Math.max(0, (b.minIlvl || 1) - ilvl * .5) * 0));
}
function rollRarity(ilvl, R, mf = 0, boost = 0) {
  const k = 1 + mf / 100;
  const w = [60, 30 * k, (7 + boost * 20) * k, (1 + boost * 6) * k * (ilvl >= 3 ? 1 : 0), (.35 + boost * 2) * k * (ilvl >= 5 ? 1 : 0)];
  let s = w.reduce((a, b) => a + b, 0), x = R() * s;
  for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) return i; }
  return 0;
}
const RARE_A = ['Grim', 'Doom', 'Blood', 'Storm', 'Dread', 'Soul', 'Bone', 'Ember', 'Rune', 'Gloom', 'Wraith', 'Night', 'Ash', 'Iron', 'Raven', 'Hollow', 'Dusk', 'Viper', 'Oath', 'Star'];
const RARE_B = { weapon: ['Bite', 'Edge', 'Song', 'Fang', 'Razor', 'Thirst', 'Cleaver', 'Spike'], helm: ['Crown', 'Visage', 'Cowl', 'Brow', 'Mask', 'Hood'], chest: ['Shell', 'Hide', 'Coat', 'Carapace', 'Mantle', 'Wrap'],
  gloves: ['Grip', 'Hand', 'Claw', 'Fist', 'Touch'], legs: ['Stride', 'Legs', 'Greaves', 'Pace'], boots: ['Stride', 'Tread', 'Step', 'Trail', 'Road'], cloak: ['Shroud', 'Wing', 'Veil', 'Mantle', 'Banner'],
  amulet: ['Heart', 'Eye', 'Charm', 'Talisman', 'Star', 'Tear'], ring: ['Loop', 'Band', 'Coil', 'Circle', 'Knot', 'Spiral'] };
/**
 * make an item. o: { ilvl, slot, base, rarity, R, power, unique }
 */
function makeItem(o = {}) {
  const R = o.R || rnd, ilvl = Math.max(1, o.ilvl || ED.depth || 1);
  if (o.unique || o.rarity === 4) {
    const pool = Object.values(REG.uniques).filter(u => (u.minIlvl || 1) <= ilvl + 2), id = o.unique || (pool.length ? R.pick(pool).id : null);
    const u = id && makeUnique(id, ilvl, R); if (u) return u;
    return makeItem(Object.assign({}, o, { rarity: 3, unique: null }));
  }
  const base = o.base ? REG.itemBases[o.base] : pickBase(o.slot, ilvl, R);
  const rarity = o.rarity === undefined ? rollRarity(ilvl, R) : Math.min(3, o.rarity);
  const it = { uid: itemUid++, base: base.id, slot: base.slot, rarity, ilvl, affixes: [], implicit: [], look: JSON.parse(JSON.stringify(base.look || {})), name: base.name };
  if (base.dmg) { const k = SCALE.ilvl(ilvl); it.dmg = [Math.round(base.dmg[0] * k), Math.round(base.dmg[1] * k)]; it.el = base.el || 'phys'; }
  if (base.armor) it.armor = Math.round(base.armor * SCALE.ilvl(ilvl));
  if (base.implicit) for (const k in base.implicit) it.implicit.push({ stat: k, v: base.implicit[k] });
  if (it.armor) it.implicit.unshift({ stat: 'armor', v: it.armor });
  // colors: a piece of cloth, leather or metal in one of the base's colors (deeper items get richer hues)
  if (base.colors) { const c = R.pick(base.colors), key = base.lookKey || 'cloth'; it.look.colors = Object.assign(it.look.colors || {}, { [key]: c }); if (key === 'cape') it.look.colors.capeIn = E.shade(c, -.4); if (key === 'cloth' && it.look.armor) it.look.colors.metal = R.pick(METAL); }
  if (base.gems) it.gem = R.pick(base.gems);
  // affixes
  const [n0, n1] = RARITY[rarity].n, n = R.int(n0, n1), taken = new Set();
  for (let i = 0; i < n; i++) {
    const kindWant = i % 2 === 0 ? 'prefix' : 'suffix';
    const opts = Object.values(REG.itemAffixes).filter(A => !taken.has(A.stat) && (A.minIlvl || 1) <= ilvl && A.slots.includes(it.slot) && (rarity < 2 || A.kind === kindWant || R() < .3));
    if (!opts.length) break;
    const A = R.weighted(opts, a => a.weight || 10); taken.add(A.stat);
    it.affixes.push(rollAffix(A, ilvl, R));
  }
  // element tint: a weapon with an elemental affix takes that element's glow
  if (it.slot === 'weapon' && it.el === 'phys') { const ea = it.affixes.find(a => /^inc(Fire|Frost|Storm|Void|Venom)$/.test(a.stat)); if (ea && rarity >= 2) it.el = ea.stat.slice(3).toLowerCase(); }
  // legendary power
  if (rarity === 3) { const pw = o.power ? REG.powers[o.power] : R.pick(Object.values(REG.powers).filter(p => !p.slots || p.slots.includes(it.slot)) || []); if (pw) { it.power = pw.id; } else it.rarity = 2; }
  it.name = itemName(it, R);
  it.value = Math.round(4 * (1 + ilvl * .35) * RARITY[it.rarity].value);
  if (it.rarity >= 2 && it.look) tintLegend(it, R);
  return it;
}
function makeUnique(id, ilvl, R) {
  const U = REG.uniques[id]; if (!U) return null;
  const base = REG.itemBases[U.base]; if (!base) return null;
  const it = { uid: itemUid++, base: base.id, slot: base.slot, rarity: 4, ilvl, affixes: [], implicit: [], look: JSON.parse(JSON.stringify(Object.assign({}, base.look || {}, U.look || {}))), name: U.name, unique: id, power: U.power, flavor: U.flavor };
  if (base.dmg) { const k = SCALE.ilvl(ilvl) * 1.15; it.dmg = [Math.round(base.dmg[0] * k), Math.round(base.dmg[1] * k)]; it.el = U.el || base.el || 'phys'; }
  if (base.armor) { it.armor = Math.round(base.armor * SCALE.ilvl(ilvl) * 1.2); it.implicit.push({ stat: 'armor', v: it.armor }); }
  for (const [stat, v] of U.stats || []) { const k = STATS[stat] && STATS[stat].f === 'flat' ? SCALE.ilvl(ilvl) : 1; it.affixes.push({ id: 'u', stat, v: Math.round(v * k * 10) / 10, tier: 4 }); }
  if (base.gems) it.gem = U.gem || base.gems[0];
  it.value = Math.round(4 * (1 + ilvl * .35) * 30);
  return it;
}
/** rares and legendaries get a matching trim and a richer finish */
function tintLegend(it, R) {
  const c = it.look.colors || (it.look.colors = {});
  if (it.slot === 'weapon' && it.el !== 'phys') { const e = EL(it.el); c.metal = E.mix(c.metal || '#dce8f1', e.light, .45); c.metalDk = E.mix(c.metalDk || '#7f93ab', e.dark, .5); if (it.look.weapon === 'staff') c.orb = e.color; }
  if (it.slot === 'chest' && it.rarity >= 3) c.trim = R.pick(['#e8c040', '#c8d8f0', '#ff8a4a']);
}
function itemName(it, R) {
  const base = REG.itemBases[it.base];
  if (it.rarity === 1) {
    const pre = it.affixes.find(a => REG.itemAffixes[a.id] && REG.itemAffixes[a.id].kind === 'prefix'), suf = it.affixes.find(a => REG.itemAffixes[a.id] && REG.itemAffixes[a.id].kind === 'suffix');
    return (pre ? REG.itemAffixes[pre.id].names[pre.tier] + ' ' : '') + base.name + (suf ? ' ' + REG.itemAffixes[suf.id].names[suf.tier] : '');
  }
  if (it.rarity === 2) { const b = RARE_B[it.slot === 'ring2' ? 'ring' : it.slot] || ['Relic']; return R.pick(RARE_A) + ' ' + R.pick(b); }
  if (it.rarity === 3) { const pw = REG.powers[it.power]; return pw ? pw.name + (pw.noun ? '' : ' ' + base.name) : base.name; }
  return base.name;
}
/** tooltip lines: [{ t, c }] */
function itemLines(it) {
  const out = [], rc = RARITY[it.rarity].color, base = REG.itemBases[it.base];
  out.push({ t: it.name, c: rc, big: true });
  out.push({ t: RARITY[it.rarity].name + ' ' + (base ? base.name : '') + '  •  item level ' + it.ilvl, c: '#9a90b0' });
  if (it.dmg) out.push({ t: it.dmg[0] + '-' + it.dmg[1] + ' ' + (it.el && it.el !== 'phys' ? EL(it.el).name + ' ' : '') + 'Damage', c: '#ffffff' });
  for (const a of it.implicit) out.push({ t: statText(a.stat, a.v), c: '#c8c0d8' });
  if (it.implicit.length && it.affixes.length) out.push({ t: '', c: '#000', sep: true });
  for (const a of it.affixes) out.push({ t: statText(a.stat, a.v), c: '#8ab4ff' });
  if (it.power && REG.powers[it.power]) { const pw = REG.powers[it.power]; out.push({ t: '', sep: true }); for (const l of E.font.wrap(pw.desc, 150)) out.push({ t: l, c: '#ff9a4a' }); }
  if (it.flavor) out.push({ t: it.flavor, c: '#a89878' });
  out.push({ t: 'Sells for ' + fmt(it.value) + ' gold', c: '#8a8070' });
  return out;
}

/* ---------- equipping ---------- */
statSource((h, add) => {
  for (const s of SLOTS) { const it = h.gear[s]; if (!it) continue; for (const a of it.implicit) if (a.stat !== 'armor') add(a.stat, a.v); if (it.armor) add('armor', it.armor); for (const a of it.affixes) add(a.stat, a.v); if (it.power && REG.powers[it.power] && REG.powers[it.power].stats) for (const k in REG.powers[it.power].stats) add(k, REG.powers[it.power].stats[k]); }
});
function refreshPowers(h) { h.powers = SLOTS.map(s => h.gear[s] && h.gear[s].power).filter(Boolean); }
/** put an item on (from the bag). Returns the item it replaced (now in the bag) */
function equip(h, it, slot) {
  slot = slot || (it.slot === 'ring' ? (!h.gear.ring ? 'ring' : !h.gear.ring2 ? 'ring2' : 'ring') : it.slot);
  const i = h.bag.indexOf(it); if (i >= 0) h.bag.splice(i, 1);
  const old = h.gear[slot]; h.gear[slot] = it;
  if (old) h.bag.push(old);
  refreshPowers(h); computeStats(h); dressHero(h); sfx('pickup', { vol: .5 });
  return old;
}
function unequip(h, slot) { const it = h.gear[slot]; if (!it || h.bag.length >= BAG_MAX) return; delete h.gear[slot]; h.bag.push(it); refreshPowers(h); computeStats(h); dressHero(h); }
const BAG_MAX = 40;

/* ---------- drops on the ground ---------- */
// ED.drops: { kind: 'item' | 'gold' | 'potion', item, n, x, y, z, vx, vy, vz, t, rest }
function dropLoot(kind, x, y, o = {}) {
  const a = Math.random() * TAU, sp = 20 + Math.random() * 40;
  const d = Object.assign({ kind, x, y, z: 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 110 + Math.random() * 50, t: 0, rest: false, bounces: 0 }, o);
  ED.drops.push(d);
  if (kind === 'item' && d.item.rarity >= 3) { sfx(d.item.rarity === 4 ? 'secret' : 'powerup', { vol: .7 }); notify(RARITY[d.item.rarity].name.toUpperCase() + ' DROPPED: ' + d.item.name, RARITY[d.item.rarity].color, 3); }
  else if (kind === 'item' && d.item.rarity === 2) sfx('key', { vol: .4 });
  return d;
}
/** what a dead monster leaves: gold, potions, items (champions, rares and bosses much more) */
BUS.on('kill', e => {
  const m = e.tgt; if (m.team !== 'foe' || m.noLoot) return;
  const h = ED.hero, mf = (h && h.stats.magicFind) || 0, gf = (h && h.stats.goldFind) || 0, depth = m.level || ED.depth || 1, lk = DIFF.loot;
  const nItems = m.boss ? 5 + rnd.int(0, 3) : m.elite === 2 ? 2 + rnd.int(0, 1) : m.elite === 1 ? (rnd.chance(.6) ? 1 : 0) : rnd.chance(.085 * lk) ? 1 : 0;
  for (let i = 0; i < nItems; i++) dropLoot('item', m.x, m.y, { item: makeItem({ ilvl: depth + (m.elite ? 1 : 0), rarity: m.boss && i === 0 ? 3 : rollRarity(depth, rnd, mf, m.boss ? .6 : m.elite === 2 ? .35 : m.elite ? .15 : 0) }) });
  if (rnd.chance(m.elite ? .9 : .32 * lk)) { const n = Math.max(1, Math.round((3 + rnd() * 7) * SCALE.gold(depth) * (1 + gf / 100) * (m.elite ? 3 : 1) * (m.boss ? 8 : 1))); const piles = m.boss ? 6 : m.elite ? 3 : 1; for (let i = 0; i < piles; i++) dropLoot('gold', m.x, m.y, { n: Math.ceil(n / piles) }); }
  if (h && rnd.chance(m.elite ? .35 : .035) && h.potions + ED.drops.filter(d => d.kind === 'potion').length < h.maxPotions) dropLoot('potion', m.x, m.y);
});
const pickupR = h => 12 * (1 + ((h && h.stats.pickup) || 0) / 100);
function updateDrops(dt) {
  const h = ED.hero, map = ED.L && ED.L.map;
  for (let i = ED.drops.length - 1; i >= 0; i--) {
    const d = ED.drops[i]; d.t += dt;
    if (!d.rest) {
      d.vz -= 420 * dt; d.z += d.vz * dt; const nx = d.x + d.vx * dt, ny = d.y + d.vy * dt;
      if (map && map.solidAt(nx, ny)) { d.vx *= -.5; d.vy *= -.5; } else { d.x = nx; d.y = ny; }
      if (d.z <= 0) { d.z = 0; if (d.bounces++ < 2 && d.vz < -40) { d.vz = -d.vz * .35; d.vx *= .5; d.vy *= .5; if (d.kind === 'gold') sfx('coin', { vol: .15, pitch: 1.5 }); } else { d.rest = true; d.vx = d.vy = d.vz = 0; if (map) lootToGround(d, map); } }
    }
    if (!h || !h.alive) continue;
    const dd = Math.hypot(h.x - d.x, h.y - d.y);
    if (d.kind === 'gold' || d.kind === 'potion') {
      if (d.t > .4 && dd < pickupR(h) * 3) { const k = Math.min(1, dt * 10); d.x = lerp(d.x, h.x, k); d.y = lerp(d.y, h.y, k); }   // gold and potions fly to him
      if (d.t > .4 && dd < pickupR(h)) {
        if (d.kind === 'gold') { gainGold(h, d.n); P.text(h.x, h.y, 30, '+' + fmt(d.n), '#ffd23a'); sfx('coin', { vol: .35 }); }
        else if (h.potions < h.maxPotions) { h.potions++; sfx('pickup'); P.text(h.x, h.y, 30, '+POTION', '#ff8a9a'); } else continue;
        ED.drops.splice(i, 1);
      }
    } else if (d.rest && dd < pickupR(h) && labelShown(d) && !d.noAuto) {
      if (h.bag.length >= BAG_MAX) { if (!d.fullWarn) { d.fullWarn = true; notify('BAG FULL', '#ff8a7a', 1.5); } continue; }
      h.bag.push(d.item); ED.drops.splice(i, 1); sfx('pickup', { vol: .6 }); BUS.emit('pickup', { item: d.item });
      if (d.item.rarity >= 1) notify(d.item.name, RARITY[d.item.rarity].color, 2.2);
    }
  }
}
/** loot that lands over a pit, deep water or a wall slides to the nearest ground a hero can reach */
function lootToGround(d, map) {
  const cx = Math.floor(d.x / T16), cy = Math.floor(d.y / T16); if (map.walkable(cx, cy)) return;
  let best = null, bd = 1e9;
  for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) if (map.walkable(x, y)) { const dd = (x - cx) * (x - cx) + (y - cy) * (y - cy); if (dd < bd) { bd = dd; best = [x, y]; } }
  if (best) { d.x = (best[0] + .3 + Math.random() * .4) * T16; d.y = (best[1] + .3 + Math.random() * .4) * T16; }
}
/** the loot filter: 0 shows everything, 1 hides commons, 2 shows rares and better (Z shows all) */
const labelShown = d => d.kind !== 'item' || d.item.rarity >= OPT.labels || game.input.down('labels');
function drawDrops(r) {
  const labels = [];
  for (const d of ED.drops) {
    if (!r.visible(d.x, d.y, d.z, 20, 20, 20)) continue;
    r.shadow(d.x, d.y, 3, .4);
    if (d.kind === 'gold') r.queue(d.x, d.y, d.z, g => { const [x, y] = r.w(d.x, d.y, d.z), n = Math.min(4, 1 + Math.floor(Math.log10(d.n + 1))); for (let k = 0; k < n; k++) { px.ell(g, x + (k % 2) * 3 - 1, y - k * 1.5, 2.5, 1.4, '#b88a1a'); px.ell(g, x + (k % 2) * 3 - 1, y - k * 1.5 - 1, 2.2, 1, '#ffd23a'); } px.dot(g, x - 1, y - n * 1.5, '#fffbd0'); }, { emissive: false });
    else if (d.kind === 'potion') r.queue(d.x, d.y, d.z, g => { const [x, y] = r.w(d.x, d.y, d.z); px.rect(g, x - 1, y - 8, 2, 2, '#c8b890'); px.disc(g, x, y - 3.5, 3, '#6a1a2a'); px.disc(g, x, y - 3.5, 2.3, '#e03a4a'); px.dot(g, x - 1, y - 5, '#ffc0c8'); }, {});
    else {
      const it = d.item, rc = RARITY[it.rarity];
      if (!labelShown(d)) continue;
      r.queue(d.x, d.y, d.z, g => { const [x, y] = r.w(d.x, d.y, d.z); drawItemIcon(g, it, x - 6, y - 11, .75); }, {});
      if (rc.beam && d.rest) {   // a loot beam: a column of light in the rarity's color
        const tall = it.rarity >= 3 ? 90 : 55, pulse = .7 + .3 * Math.sin(game.time * 4 + d.x);
        r.queue(d.x, d.y, 0, g => { const [x, y] = r.w(d.x, d.y, 0), [, ty] = r.w(d.x, d.y, tall); px.glow(g, 1); px.blend(g, .35 * pulse, 'add', () => { px.rect(g, x - 2, ty, 4, y - ty, rc.beam); px.rect(g, x - 1, ty, 2, y - ty, '#ffffff'); }); }, { emissive: true, bias: -.1 });
        L.add(d.x, d.y, 6, it.rarity >= 3 ? 60 : 36, .7, { color: rc.beam });
      }
      labels.push(d);
    }
  }
  // name labels above items (overlapping ones stack upward)
  r.overlay(g => {
    const placed = [];
    for (const d of labels) {
      let [x, y] = r.w(d.x, d.y, d.z + 16); const it = d.item, w = E.font.width(it.name, { font: 'tiny' }) + 6;
      x = Math.round(x - w / 2); y = Math.round(y);
      for (let k = 0; k < 8; k++) { if (placed.some(p => x < p[0] + p[2] && x + w > p[0] && Math.abs(y - p[1]) < 9)) y -= 9; else break; }
      placed.push([x, y, w]); d.lab = [x, y, w, 9];
      const hov = UI.mouse && UI.mouse.x >= x && UI.mouse.x < x + w && UI.mouse.y >= y && UI.mouse.y < y + 9;
      px.blend(g, .8, 'normal', () => px.rect(g, x, y, w, 9, hov ? '#2a2440' : '#0c0818'));
      px.rect(g, x, y, w, 1, RARITY[it.rarity].color);
      E.font.text(g, it.name, x + 3, y + 2, RARITY[it.rarity].color, { font: 'tiny', outline: false });
      if (hov) UI.hotItem = d;
    }
  });
}

/* ---------- item icons (bag, gear, tooltips, the ground) ---------- */
function drawItemIcon(g, it, x, y, s = 1) {
  const c = (it.look && it.look.colors) || {}, slot = it.slot, R = (a, b, w, h, col) => px.rect(g, x + a * s, y + b * s, Math.max(1, w * s), Math.max(1, h * s), col);
  const T = col => E.tones(col);
  if (slot === 'weapon') {
    if (it.look && it.look.weapon === 'staff') { px.line(g, x + 3 * s, y + 14 * s, x + 12 * s, y + 3 * s, T(c.staff || '#6a4a2a').base, Math.max(1, Math.round(1.5 * s))); px.disc(g, x + 12.5 * s, y + 2.5 * s, 2.2 * s, c.orb || '#ffb347'); px.dot(g, x + 12 * s, y + 2 * s, '#ffffff'); }
    else { const L0 = ((it.look && it.look.bladeLen) || 11) / 14; px.line(g, x + 3 * s, y + 13 * s, x + (3 + 10 * L0) * s, y + (13 - 10 * L0) * s, c.metal || '#dce8f1', Math.max(1, Math.round(1.6 * s))); px.line(g, x + 4 * s, y + 13 * s, x + (3 + 10 * L0) * s, y + (13 - 10 * L0) * s, T(c.metal || '#dce8f1').hi); px.line(g, x + 2 * s, y + 10 * s, x + 6 * s, y + 14 * s, c.hilt || '#e8b04e', Math.max(1, Math.round(s))); px.dot(g, x + 2 * s, y + 14 * s, '#5a3620'); }
    if (it.el && it.el !== 'phys') px.dot(g, x + 13 * s, y + 2 * s, EL(it.el).light);
  } else if (slot === 'helm') {
    const hat = it.look.hat, col = hat ? hat.color : it.look.hood ? '#3a3448' : '#6a4128', t = T(col);
    if (hat && hat.style === 'crown') { R(3, 8, 10, 3, t.base); for (const a of [3, 7, 11]) R(a, 5, 2, 3, t.lt); }
    else if (hat && hat.style === 'pointed') { px.poly(g, [[x + 3 * s, y + 12 * s], [x + 13 * s, y + 12 * s], [x + 11 * s, y + 3 * s]], t.base); R(2, 11, 12, 2, t.sh); }
    else { px.disc(g, x + 8 * s, y + 9 * s, 5 * s, t.base); px.disc(g, x + 7 * s, y + 8 * s, 3 * s, t.lt); R(3, 10, 10, 3, t.sh); }
  } else if (slot === 'chest') {
    const t = T(c.cloth || '#2f8f86'); px.poly(g, [[x + 3 * s, y + 3 * s], [x + 13 * s, y + 3 * s], [x + 12 * s, y + 14 * s], [x + 4 * s, y + 14 * s]], t.base); R(1, 3, 3, 6, t.sh); R(12, 3, 3, 6, t.sh); R(6, 3, 4, 2, t.deep); if (it.look.armor) { const m = T(c.metal || '#b9c1cf'); R(5, 6, 6, 5, m.base); R(5, 6, 6, 1, m.hi); }
    if (c.trim) R(4, 13, 8, 1, c.trim);
  } else if (slot === 'gloves') { const t = T(c.glove || '#6a4128'); R(3, 5, 5, 8, t.base); R(8, 7, 5, 6, t.sh); R(3, 5, 5, 1, t.lt); R(2, 11, 11, 2, t.deep); }
  else if (slot === 'legs') { const t = T(c.pants || '#3b3552'); R(4, 2, 8, 4, t.base); R(4, 5, 3, 9, t.base); R(9, 5, 3, 9, t.sh); }
  else if (slot === 'boots') { const t = T(c.boot || '#6a4128'); R(4, 3, 4, 8, t.base); R(4, 10, 8, 3, t.base); R(4, 3, 4, 1, t.lt); R(4, 12, 8, 1, t.deep); }
  else if (slot === 'cloak') { const t = T(c.cape || '#c8452f'); px.poly(g, [[x + 5 * s, y + 2 * s], [x + 11 * s, y + 2 * s], [x + 14 * s, y + 14 * s], [x + 2 * s, y + 14 * s]], t.base); px.line(g, x + 8 * s, y + 3 * s, x + 7 * s, y + 13 * s, t.sh); R(5, 2, 6, 1, t.lt); }
  else if (slot === 'amulet') { for (let i = 0; i < 12; i++) { const a = Math.PI * .1 + i / 11 * Math.PI * .8; px.dot(g, x + 8 * s + Math.cos(a + Math.PI) * 5 * s, y + 6 * s + Math.sin(a + Math.PI) * -5 * s, '#c8a040'); } px.disc(g, x + 8 * s, y + 11 * s, 2.5 * s, it.gem || '#e04a4a'); px.dot(g, x + 7 * s, y + 10 * s, '#ffffff'); }
  else { px.disc(g, x + 8 * s, y + 10 * s, 4 * s, '#c8a040'); px.disc(g, x + 8 * s, y + 10 * s, 2.6 * s, '#0c0818'); px.disc(g, x + 8 * s, y + 5 * s, 2 * s, it.gem || '#4a8ae0'); px.dot(g, x + 7.5 * s, y + 4.5 * s, '#ffffff'); }
}

/* ---------- three legendary powers to start the language (more in the loot content file) ---------- */
def('powers', 'cindertrail', { name: 'Cinderstep', noun: false, slots: ['boots', 'cloak'], desc: 'Dodging leaves a trail of burning ground.',
  install() { BUS.on('dodge', e => { if (!hasPower(e.h, 'cindertrail')) return; const h = e.h; let n = 0; const tk = game.every(.05, () => { if (++n > 4) return tk.cancel(); FX.area({ team: 'hero', src: h, x: h.x, y: h.y, r: 10, dur: 2.5, el: 'fire', tick: .4, hit: heroHit(h, .25, { el: 'fire', tags: ['dot'] }) }); }); }); } });
def('powers', 'thunderstruck', { name: 'Thunderstruck', slots: ['weapon', 'gloves', 'ring'], desc: 'Every fourth hit calls down lightning on the target.',
  install() { let n = 0; BUS.on('hit', e => { const h = ED.hero; if (e.src !== h || !hasPower(h, 'thunderstruck') || (e.hit.tags || []).includes('proc')) return; if (++n % 4) return; FX.strike({ team: 'hero', src: h, x: e.tgt.x, y: e.tgt.y, r: 14, delay: .12, el: 'storm', hit: heroHit(h, .9, { el: 'storm', tags: ['spell', 'proc'] }) }); }); } });
def('powers', 'shatter', { name: 'Shattering', slots: ['weapon', 'amulet', 'chest'], desc: 'Enemies you kill explode in a nova of their element.',
  install() { BUS.on('kill', e => { const h = ED.hero; if (e.src !== h || !hasPower(h, 'shatter') || e.tgt.team !== 'foe') return; const el = e.tgt.el === 'phys' ? 'frost' : e.tgt.el; FX.nova({ team: 'hero', src: h, x: e.tgt.x, y: e.tgt.y, r0: 4, r1: 32, dur: .25, el, hit: heroHit(h, .5, { el, tags: ['aoe', 'proc'] }) }); }); } });
function installPowers() { for (const p of Object.values(REG.powers)) if (p.install && !p._in) { p._in = true; p.install(); } }
