/* Developer mode uses a disposable hero; autosaves never write this session. */
const DEV_DEFAULT = {
	god: false,
	resources: false,
	cooldowns: false,
	freezeFoes: false,
	paused: false,
	speed: 1,
	bright: false,
	hitboxes: false,
	stats: true,
};
const DEV = {
	enabled: false,
	...DEV_DEFAULT,
	steps: 0,
	depth: 1,
	monster: "husk",
	count: 1,
	elite: 0,
	rarity: 3,
	itemLevel: 1,
	boss: null,
};
function devEnable() {
	if (DEV.enabled) return;
	const source = ED.hero || loadHeroOrNew(),
		data = {};
	for (const k of SAVE_KEYS) if (source[k] !== undefined) data[k] = source[k];
	DEV.original = source;
	DEV.diff = { ...DIFF };
	DEV.savedLevel = ED.savedLevel;
	DEV.enabled = true;
	ED.hero = makeHero(JSON.parse(JSON.stringify(data)));
	refreshPowers(ED.hero);
	computeStats(ED.hero);
	ED.savedLevel = null;
	UI.closeAll();
	goTown();
	notify("DEVELOPER SANDBOX • NORMAL SAVE KEPT", "#8fe3ff", 5);
}
function devDisable() {
	if (!DEV.enabled) return;
	UI.closeAll();
	BOT_RUN.on = false;
	ED.hero = DEV.original;
	ED.savedLevel = DEV.savedLevel;
	Object.assign(DIFF, DEV.diff);
	Object.assign(DEV, DEV_DEFAULT, {
		enabled: false,
		steps: 0,
		original: null,
		diff: null,
		savedLevel: null,
	});
	slowMoReset(1);
	UI.hideHud = false;
	computeStats(ED.hero);
	goTown();
	notify("NORMAL GAME RESTORED", "#8affb0");
}
function devRestore() {
	if (!DEV.enabled || !ED.hero) return;
	reviveHero(ED.hero);
	ED.hero.cds = {};
	ED.hero.dodges = ED.hero.maxDodge;
	ED.hero.inv = 1;
}
function devStep() {
	if (
		!DEV.enabled ||
		!DEV.paused ||
		!["town", "level", "proving"].includes(ED.mode)
	)
		return;
	// Step the same scene update used by live play, with panels temporarily detached.
	const stack = UI.stack;
	UI.stack = [];
	DEV.steps = 1;
	try {
		game.scene.update(1 / 60);
	} finally {
		DEV.steps = 0;
		UI.stack = stack;
		syncTouchControls(true);
	}
}
function devTravel(depth) {
	if (!DEV.enabled || !Number.isFinite(depth)) return;
	DEV.depth = clamp(Math.round(depth), 1, 500);
	ED.savedLevel = null;
	devRestore();
	UI.closeAll();
	descend(DEV.depth);
}
function devSpawn(boss = false) {
	if (!DEV.enabled || !ED.L || !["town", "level", "proving"].includes(ED.mode))
		return;
	if (ED.foes.length >= 300) {
		formStatus("Spawn limit reached (300). Clear enemies first.");
		return;
	}
	const h = ED.hero;
	const count = Math.min(boss ? 1 : DEV.count, 300 - ED.foes.length);
	for (let i = 0; i < count; i++) {
		const a = h.facing + (i - (DEV.count - 1) / 2) * 0.4,
			pt = {
				x: h.x + Math.cos(a) * 52,
				y: h.y + Math.sin(a) * 52,
				z: 0,
				r: 8,
				step: 2,
			};
		ED.L.map.collide(pt);
		const m = boss
			? spawnBoss(DEV.boss || Object.keys(REG.bosses)[0], pt.x, pt.y, {
					level: Math.max(1, ED.depth),
				})
			: spawnMonster(DEV.monster, pt.x, pt.y, {
					level: Math.max(1, ED.depth),
					elite: DEV.elite,
				});
		if (m && boss) {
			ED.boss = m;
			wakeBoss(m);
		}
	}
	formStatus(
		"Spawned " + (boss ? "boss" : count + " enemies") + ". Back to resume.",
	);
}
function renderDeveloper() {
	openForm("Developer sandbox", (el) => {
		formElement(
			"p",
			DEV.enabled
				? "Sandbox active. Hero progress, loot, and difficulty experiments stay in this session. Leave to restore your normal hero in town."
				: "Try builds, enemies, and depths with a disposable copy of your hero. Your normal save is kept.",
			el,
		);
		formButton(
			el,
			DEV.enabled ? "Leave sandbox" : "Enable developer mode",
			() => (DEV.enabled ? devDisable() : devEnable()),
		);
		if (!DEV.enabled) return;
		formElement("p", "", el, {
			"data-status": "",
			role: "status",
			class: "ed-status",
		});
		formElement("h3", "Simulation", el);
		for (const [key, label] of [
			["god", "Invulnerable"],
			["resources", "Unlimited ember, potions & dodges"],
			["cooldowns", "No skill cooldowns"],
			["freezeFoes", "Freeze enemy AI"],
			["paused", "Pause simulation"],
			["bright", "Full lighting"],
			["hitboxes", "Collision circles"],
			["stats", "Performance overlay"],
		]) {
			formField(el, label, "checkbox", DEV[key], (v) => {
				DEV[key] = v;
				if (key === "cooldowns" && v) ED.hero.cds = {};
			});
		}
		formField(
			el,
			"Simulation speed",
			"select",
			DEV.speed,
			(v) => {
				DEV.speed = +v;
				slowMoReset(DEV.speed);
			},
			{ options: [0.25, 0.5, 1, 2, 4].map((v) => [v, v + "×"]) },
		);
		formButton(el, "Step 1 frame (while paused)", devStep);
		formButton(el, "Restore life & resources", () => {
			devRestore();
			formStatus("Life, ember, potions, dodges and cooldowns restored.");
		});
		formButton(el, ED.hero.bot ? "Stop autopilot" : "Start autopilot", () => {
			botOn(ED.hero, !ED.hero.bot);
			renderDeveloper();
		});
		formElement("h3", "Travel & encounters", el);
		formField(
			el,
			"Depth (1–500)",
			"number",
			DEV.depth,
			(v) => {
				if (Number.isFinite(v)) DEV.depth = clamp(Math.round(v), 1, 500);
			},
			{ min: 1, max: 500, step: 1 },
		);
		formButton(el, "Travel to depth", () => devTravel(DEV.depth));
		formButton(el, "Return to town", () => {
			UI.closeAll();
			devRestore();
			goTown();
		});
		formButton(el, "Proving grounds", () => {
			UI.closeAll();
			devRestore();
			game.go("proving");
		});
		formField(
			el,
			"Monster",
			"select",
			DEV.monster,
			(v) => {
				DEV.monster = v;
			},
			{
				options: Object.values(REG.archetypes).map((m) => [
					m.id,
					m.name || m.id,
				]),
			},
		);
		formField(
			el,
			"Count",
			"select",
			DEV.count,
			(v) => {
				DEV.count = +v;
			},
			{ options: [1, 5, 10, 25].map((n) => [n, n]) },
		);
		formField(
			el,
			"Monster tier",
			"select",
			DEV.elite,
			(v) => {
				DEV.elite = +v;
			},
			{
				options: [
					[0, "Normal"],
					[1, "Champion"],
					[2, "Rare"],
				],
			},
		);
		formButton(el, "Spawn monsters", () => devSpawn());
		formField(
			el,
			"Boss",
			"select",
			DEV.boss || Object.keys(REG.bosses)[0],
			(v) => {
				DEV.boss = v;
			},
			{ options: Object.values(REG.bosses).map((b) => [b.id, b.name || b.id]) },
		);
		formButton(el, "Spawn boss", () => devSpawn(true));
		formButton(el, "Clear enemies & projectiles", () => {
			ED.foes.length = 0;
			ED.boss = null;
			ED.fx.length = 0;
			GRID.build([]);
			formStatus("Enemies cleared without kill rewards.");
		});
		formButton(el, "Reveal map", () => {
			ED.L.seen.fill(1);
			ED.L.seenV = (ED.L.seenV || 0) + 1;
			formStatus("Map revealed.");
		});
		formElement("h3", "Build experiments", el);
		formButton(el, "Grant 10 skill & passive points", () => {
			ED.hero.pts.skill += 10;
			ED.hero.pts.passive += 10;
			formStatus("Granted 10 points of each type.");
		});
		formButton(el, "Unlock all skills", () => {
			for (const id in REG.skills)
				if (!ED.hero.skills[id]) ED.hero.skills[id] = { rank: 1 };
			formStatus("All skills unlocked. Assign them in Skills.");
		});
		formButton(el, "Grant 10,000 gold", () => {
			ED.hero.gold += 10000;
			formStatus("Granted 10,000 gold.");
		});
		formField(
			el,
			"Item level",
			"number",
			DEV.itemLevel,
			(v) => {
				if (Number.isFinite(v)) DEV.itemLevel = clamp(Math.round(v), 1, 500);
			},
			{ min: 1, max: 500, step: 1 },
		);
		formField(
			el,
			"Item rarity",
			"select",
			DEV.rarity,
			(v) => {
				DEV.rarity = +v;
			},
			{
				options: [
					[0, "Common"],
					[1, "Magic"],
					[2, "Rare"],
					[3, "Legendary"],
				],
			},
		);
		formButton(el, "Create item in bag", () => {
			if (ED.hero.bag.length >= BAG_MAX)
				return formStatus("Bag full. Make room first.");
			ED.hero.bag.push(makeItem({ ilvl: DEV.itemLevel, rarity: DEV.rarity }));
			formStatus("Item added to inventory.");
		});
		formButton(el, "Difficulty sliders", () => {
			UI.close("developer");
			UI.open("settings");
		});
	});
}
UI.def("developer", {
	dom: true,
	captureKeys: true,
	open: renderDeveloper,
	close: closeForm,
	update: updateForm,
});
function devBeforeWorld() {
	if (!DEV.enabled) return;
	const h = ED.hero;
	if (DEV.resources && h && h.alive) {
		h.ember = h.maxEmber;
		h.potions = h.maxPotions;
		h.dodges = h.maxDodge;
	}
	if (DEV.cooldowns && h) h.cds = {};
}
function devDraw(r) {
	if (!DEV.enabled) return;
	if (DEV.hitboxes)
		for (const u of [ED.hero, ...ED.foes])
			if (u && u.alive)
				r.decal(
					() =>
						r.groundRing(
							u.x,
							u.y,
							u.r,
							u === ED.hero ? "#8fe3ff" : "#ff8a6a",
							0.9,
						),
					{ emissive: true },
				);
	r.overlay((g) => {
		const label =
			"SANDBOX" + (DEV.paused ? " • PAUSED" : "") + " • " + DEV.speed + "x";
		E.font.text(g, label, r.W / 2, 15, "#8fe3ff", {
			align: "center",
			font: "tiny",
		});
		if (DEV.stats)
			E.font.text(
				g,
				Math.round(game.fps) +
					" FPS • " +
					game.stats.updateMs.toFixed(1) +
					"ms UPDATE • " +
					game.stats.renderMs.toFixed(1) +
					"ms DRAW • " +
					ED.foes.length +
					" FOES",
				r.W / 2,
				24,
				"#e8e0f8",
				{ align: "center", font: "tiny" },
			);
	});
}
