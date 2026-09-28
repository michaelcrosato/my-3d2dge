/* ---------- START: powers listen, the title (or a deep link: #town, #depth-7, #proving) ---------- */
installPowers();
const scenes = { title: titleScene, town: townScene, level: levelScene, proving: provingScene };
game.views = ['iso', 'threequarter', 'topdown', 'brawler'];
const link = (location.hash || '').slice(1), dm = /^depth-(\d+)$/.exec(link);
if (link === 'town' || dm || link === 'proving') { ED.hero = loadHeroOrNew(); }
game.start({ scenes, scene: link === 'town' ? 'town' : dm ? 'level' : link === 'proving' ? 'proving' : 'title', data: dm ? { depth: +dm[1] } : link === 'town' ? { arrive: 'waystone' } : undefined });
/* a handle for tools, tests and the curious: window.__ed */
window.__ed = { game, ED, REG, UI, DIFF, OPT, BUS, FX, spawnMonster, spawnPack, spawnBoss, makeItem, equip, recipe, buildLevel, descend, goTown, saveGame, newHero, computeStats, gainXp, dealDamage, heroHit, RNG };
})();
