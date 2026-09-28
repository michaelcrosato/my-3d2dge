/* =============================================================================
 * TIPS: one-time hints, each shown once per save (h.tips), at the moment it matters
 * ============================================================================= */
function tip(id, text, color = '#bff6ff', dur = 5) {
  const h = ED.hero; if (!h || ED.demo || (h.bot && !ED.demo && BOT_RUN.on)) return;
  h.tips = h.tips || []; if (h.tips.includes(id)) return;
  h.tips.push(id); notify(text, color, dur);
}
BUS.on('levelStart', e => { if (e.L.depth === 1) game.after(6.5, () => tip('roll', 'SPACE ROLLS THROUGH ATTACKS  •  ROLL JUST AS A BLOW LANDS AND TIME SLOWS')); if (e.L.depth === 1) game.after(14, () => tip('exit', 'THE WAYSTONE AT THE FAR END TAKES YOU DEEPER  •  T OPENS A PORTAL HOME')); });
BUS.on('hurt', e => { const h = ED.hero; if (h && h.hp < h.maxHp * .45 && h.potions > 0) tip('potion', 'Q DRINKS A POTION  •  POTIONS REFILL IN TOWN AND DROP FROM MONSTERS', '#ff9aa8'); });
BUS.on('heroLevel', () => tip('points', 'LEVEL UP!  K SPENDS SKILL POINTS  •  P OPENS THE PASSIVE TREE', '#ffe070', 6));
BUS.on('pickup', e => { if (e.item.rarity >= 2) tip('bag', 'I OPENS THE BAG  •  CLICK AN ITEM TO WEAR IT', RARITY[e.item.rarity].color); if (e.item.rarity >= 3) tip('legend', 'LEGENDARY POWERS CHANGE HOW YOUR SKILLS WORK', '#ff8a2a'); });
BUS.on('spawn', e => { if (e.m.elite === 2 && ED.mode === 'level') game.after(1, () => tip('elite', 'GOLD NAMES ARE RARE ELITES: EXTRA AFFIXES, EXTRA LOOT', '#ffd36a')); });
BUS.on('perfectDodge', () => tip('perfect', 'PERFECT DODGE: A ROLL THROUGH A STRIKE SLOWS TIME', '#8fe3ff'));
