// Behavioral regression checks: real keyboard/mouse/touch events and Gamepad API polling.
// Run after npm run build. Screenshots and a JSON result are saved under check-output/controls.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const out = resolve("check-output/controls");
mkdirSync(out, { recursive: true });
const url = pathToFileURL(resolve("examples/emberdeep.html")).href;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [],
	checks = [];
const context = await browser.newContext({
	viewport: { width: 1280, height: 800 },
});
await context.addInitScript(() => {
	window.testPads = [];
	Object.defineProperty(navigator, "getGamepads", {
		value: () => window.testPads,
	});
});
function track(page) {
	page.on("pageerror", (e) => errors.push(e.message));
	page.on("console", (m) => {
		if (m.type() === "error") errors.push(m.text());
	});
}
const page = await context.newPage();
track(page);
async function ready(p, hash = "town") {
	await p.goto(url + (hash ? "#" + hash : ""));
	await p.waitForFunction(() => window.__ed?.ED.L);
	await p.waitForTimeout(700);
}
async function key(p, code) {
	await p.keyboard.down(code);
	await p.waitForTimeout(80);
	await p.keyboard.up(code);
	await p.waitForTimeout(80);
}
async function canvasButton(p, label, touch = false) {
	await p.waitForFunction(
		(label) => window.__ed.UI.hot.some((h) => h.label === label),
		label,
	);
	const [x, y] = await p.evaluate((label) => {
		const { game, UI } = window.__ed,
			h = UI.hot.find((h) => h.label === label),
			sc = game.screen,
			rc = sc.canvas.getBoundingClientRect();
		return [
			rc.left +
				((h.x + h.w / 2) * sc.S + sc.OX - Math.round(sc.fx * sc.S)) / sc.dpr,
			rc.top +
				((h.y + h.h / 2) * sc.S + sc.OY - Math.round(sc.fy * sc.S)) / sc.dpr,
		];
	}, label);
	if (touch) await p.touchscreen.tap(x, y);
	else await p.mouse.click(x, y);
	await p.waitForTimeout(130);
}
/* a page of the Settings window, opened from the pause menu (or the title) */
async function settingsPage(p, tab, touch = false) {
	await canvasButton(p, "SETTINGS", touch);
	const t = p.getByRole("tab", { name: tab, exact: true });
	if (touch) await t.tap();
	else await t.click();
	await p.waitForTimeout(100);
}
const save = (p) =>
	p.evaluate(() => JSON.stringify(My3D2dge.store.get("ed:save")));
/* the phone layout, in page pixels: whether the picture fills the screen, where the HUD bar, the action buttons, the
   top buttons and the minimap sit (UI.frame: the HUD's frame, 61-controls HUD_layout) */
const phoneLayout = (p) =>
	p.evaluate(() => {
		const sc = __ed.game.screen,
			F = __ed.UI.frame,
			rc = sc.canvas.getBoundingClientRect(),
			py = (y) => rc.top + (y * sc.S + sc.OY) / sc.dpr,
			a = document.querySelector(".ed-touch-actions")?.getBoundingClientRect(),
			b = document.querySelector(".ed-touch-bar")?.getBoundingClientRect(),
			under = F.barB > 0 ? Math.max(0, Math.ceil(F.barB - F.t) + 1) : 0;
		return {
			fills:
				sc.OX <= 0 && sc.OY <= 0 && sc.W * sc.S >= sc.canvas.width - sc.S && sc.H * sc.S >= sc.canvas.height - sc.S,
			hudTop: py(sc.H - F.b - 39),   // the orbs' tops
			hudBottom: py(sc.H - F.b - 5),
			gridTop: a && a.top,
			gridBottom: a && a.bottom,
			barBottom: b && b.bottom,
			mapTop: py(F.t + under + 4),
			mapBottom: py(F.t + under + 58),
		};
	});
async function check(name, fn) {
	await fn();
	checks.push(name);
	console.log("ok", name);
}
async function padButton(i) {
	await page.evaluate((i) => {
		window.testPads[2].buttons[i].pressed = true;
	}, i);
	await page.waitForTimeout(100);
	await page.evaluate((i) => {
		window.testPads[2].buttons[i].pressed = false;
	}, i);
	await page.waitForTimeout(100);
}
try {
	await ready(page);
	await check(
		"Menu access, keyboard rebinding, conflicts, reset and persistence",
		async () => {
			await key(page, "Escape");
			await settingsPage(page, "Controls");
			await page
				.getByRole("button", {
					name: "Move right keyboard / mouse",
					exact: true,
				})
				.click();
			await key(page, "KeyR");
			assert.deepEqual(await page.evaluate(() => __ed.CONTROL.bindings.right), [
				"KeyR",
			]); // (the d-pad no longer moves: the left stick does, the d-pad holds the map, labels, portal and use)
			await page
				.getByRole("button", { name: "Move up keyboard / mouse", exact: true })
				.click();
			await key(page, "KeyR");
			assert.match(
				await page.locator("[data-status]").innerText(),
				/used by Move right/,
			);
			await key(page, "Escape");
			assert.equal(await page.locator("dialog").count(), 1);
			await key(page, "Escape");
			await key(page, "Escape");
			await page.waitForFunction(() => !__ed.ED.hero.act); // (the hero's drop-in done: it would eat the hold)
			const before = await page.evaluate(() => [
				__ed.ED.hero.x,
				__ed.ED.hero.y,
			]);
			await page.keyboard.down("KeyR");
			await page.waitForTimeout(400);
			await page.keyboard.up("KeyR");
			const after = await page.evaluate(() => [__ed.ED.hero.x, __ed.ED.hero.y]);
			assert.ok(
				Math.hypot(after[0] - before[0], after[1] - before[1]) > 10,
				"rebound movement moves hero",
			);
			await ready(page);
			assert.ok(
				await page.evaluate(() => __ed.game.input.map.right.includes("KeyR")),
			);
			await key(page, "Escape");
			await settingsPage(page, "Controls");
			await page
				.getByRole("button", { name: "Skill 1 keyboard / mouse", exact: true })
				.click();
			await page.mouse.click(640, 220, { button: "middle" });
			assert.ok(
				await page.evaluate(() => __ed.game.input.map.s0.includes("Mouse1")),
			);
			await page
				.getByRole("button", { name: "Reset all controls", exact: true })
				.click();
			assert.ok(
				await page.evaluate(
					() =>
						__ed.game.input.map.s0.includes("Mouse0") &&
						__ed.game.input.map.right.includes("KeyD"),
				),
			);
			await page.screenshot({ path: out + "/desktop-controls.png" });
			await key(page, "Escape");
			await key(page, "Escape");
		},
	);
	await check(
		"Gamepad in slot 2: movement, aim, actions, menus and disconnect cleanup",
		async () => {
			await page.evaluate(() => {
				window.testPads[2] = {
					index: 2,
					id: "Test standard controller",
					connected: true,
					axes: [0, 0, 0, 0],
					buttons: Array.from({ length: 16 }, () => ({ pressed: false })),
				};
				__ed.ED.hero.act = null;
				window.skillEvents = 0;
				__ed.BUS.on("skill", () => window.skillEvents++);
			});
			// A parked mouse over a skill widget must not block keyboard/gamepad attacks.
			const hudPoint = await page.evaluate(() => {
				const { game, UI } = __ed,
					sc = game.screen;
				const h = UI.hot.find((h) => h.w === 18 && h.h === 18 && h.click);
				const rc = sc.canvas.getBoundingClientRect();
				return [
					rc.left +
						((h.x + 9) * sc.S + sc.OX - Math.round(sc.fx * sc.S)) / sc.dpr,
					rc.top +
						((h.y + 9) * sc.S + sc.OY - Math.round(sc.fy * sc.S)) / sc.dpr,
				];
			});
			await page.mouse.move(...hudPoint);
			await padButton(2);
			assert.ok(await page.evaluate(() => window.skillEvents > 0));
			assert.equal(await page.evaluate(() => __ed.game.input.aimSource), "pad");
			const potions = await page.evaluate(() => __ed.ED.hero.potions);
			await padButton(6);
			assert.equal(
				await page.evaluate(() => __ed.ED.hero.potions),
				potions - 1,
			);
			await page.mouse.move(20, 20);
			await page.evaluate(() => {
				window.testPads[2].axes = [0.65, 0, 0, -0.8];
			});
			await page.waitForTimeout(250);
			assert.ok(
				await page.evaluate(
					() =>
						__ed.game.input.aimSource === "pad" &&
						__ed.game.input.padMove[0] > 0 &&
						__ed.game.input.padAim[1] < 0,
				),
			);
			await page.evaluate(() => {
				window.testPads[2].axes = [0.03, 0, 0, 0];
			});
			await page.waitForTimeout(80);
			assert.deepEqual(
				await page.evaluate(() => __ed.game.input.padMove),
				[0, 0],
			);
			await padButton(9);
			assert.equal(await page.evaluate(() => __ed.UI.top().id), "pause");
			await page.evaluate(() => {
				window.testPads[2].axes[1] = 0.8;
			});
			await page.waitForTimeout(120);
			assert.equal(await page.evaluate(() => __ed.UI.focus), 1);
			await page.evaluate(() => {
				window.testPads[2].axes[1] = 0;
			});
			await padButton(0);
			assert.equal(await page.evaluate(() => __ed.UI.top().id), "inventory");
			await padButton(9);
			await padButton(9);
			await page.evaluate(() => {
				__ed.ED.hero.x = __ed.ED.L.waystone.x;
				__ed.ED.hero.y = __ed.ED.L.waystone.y;
				__ed.ED.hero.act = null;
			});
			await padButton(10);
			assert.equal(await page.evaluate(() => __ed.UI.top().id), "waystone");
			await padButton(9);
			await key(page, "Escape");
			await settingsPage(page, "Controls");
			await page.getByRole("tab", { name: "Controller", exact: true }).click(); // (the pad's bindings are on the Controller page)
			await page
				.getByRole("button", { name: "Clear Interact pad", exact: true })
				.click();
			await page
				.getByRole("button", { name: "Skill 1 gamepad", exact: true })
				.click();
			await padButton(10);
			assert.ok(
				await page.evaluate(() => __ed.CONTROL.bindings.s0.includes("Pad10")),
			);
			await page
				.getByRole("button", { name: "Reset all controls", exact: true })
				.click();
			await page
				.getByRole("checkbox", { name: "Invert right-stick Y", exact: true })
				.check();
			await page.evaluate(() => {
				window.testPads[2].axes[3] = -0.8;
			});
			await page.waitForTimeout(80);
			assert.ok(await page.evaluate(() => __ed.game.input.padAim[1] > 0));
			await page.evaluate(() => {
				window.testPads[2].axes[3] = 0;
			});
			await page
				.getByRole("checkbox", { name: "Invert right-stick Y", exact: true })
				.uncheck();
			await padButton(1);
			await padButton(9);
			await page.evaluate(() => {
				window.testPads[2].axes = [0.8, 0.7, -0.8, 0.2];
				window.testPads[2].buttons[2].pressed = true;
			});
			await page.waitForTimeout(100);
			await page.evaluate(() => {
				window.testPads = [];
			});
			await page.waitForTimeout(100);
			assert.ok(
				await page.evaluate(
					() =>
						![...__ed.game.input.held].some((c) => c.startsWith("Pad")) &&
						__ed.game.input.padMove.every((v) => v === 0) &&
						__ed.game.input.padAim === null,
				),
			);
		},
	);
	await check("Focus loss clears holds and pauses the game", async () => {
		await page.keyboard.down("KeyD");
		await page.waitForTimeout(100);
		await page.evaluate(() => dispatchEvent(new Event("blur")));
		assert.equal(await page.evaluate(() => __ed.game.input.held.size), 0);
		assert.equal(await page.evaluate(() => __ed.UI.top().id), "pause");
		await page.keyboard.up("KeyD");
		await key(page, "Escape");
	});
	await check(
		"Tools act on the hero you play: switches, stepping, spawning, travel, and the save keeps it",
		async () => {
			await page.evaluate(() => __ed.saveGame());
			const gold = await page.evaluate(() => __ed.ED.hero.gold);
			await key(page, "Escape");
			await canvasButton(page, "TOOLS");
			await page.getByRole("tab", { name: "Tools", exact: true }).waitFor();
			assert.equal(
				await page.getByRole("tab", { name: "Tools", exact: true }).getAttribute("aria-selected"),
				"true",
			);
			await page
				.getByRole("checkbox", { name: "Invulnerable", exact: true })
				.check();
			assert.equal(
				await page.evaluate(() =>
					__ed.dealDamage(__ed.ED.hero, { amount: 999, el: "fire", var: 0 }),
				),
				0,
			);
			await page
				.getByRole("checkbox", {
					name: "Unlimited ember, potions & dodges",
					exact: true,
				})
				.check();
			await page
				.getByRole("checkbox", { name: "No skill cooldowns", exact: true })
				.check();
			await page
				.getByRole("button", { name: "Grant 10,000 gold", exact: true })
				.click();
			await page
				.getByRole("button", {
					name: "Grant 10 skill & passive points",
					exact: true,
				})
				.click();
			await page
				.getByRole("button", { name: "Unlock all skills", exact: true })
				.click();
			await page
				.getByRole("button", { name: "Create item in bag", exact: true })
				.click();
			assert.ok(
				await page.evaluate(
					() =>
						__ed.ED.hero.bag.length > 0 &&
						__ed.ED.hero.pts.skill >= 10 &&
						Object.keys(__ed.ED.hero.skills).length ===
							Object.keys(__ed.REG.skills).length,
				),
			);
			await page
				.getByRole("checkbox", { name: "Pause simulation", exact: true })
				.check();
			const t = await page.evaluate(() => __ed.ED.t);
			await page.evaluate(() => {
				const h = __ed.ED.hero;
				h.ember = h.potions = h.dodges = 0;
				h.cds = { ember: 20 };
			});
			await page
				.getByRole("button", {
					name: "Step 1 frame (while paused)",
					exact: true,
				})
				.click();
			assert.ok(
				Math.abs((await page.evaluate(() => __ed.ED.t)) - t - 1 / 60) < 1e-8,
			);
			assert.ok(
				await page.evaluate(() => {
					const h = __ed.ED.hero;
					return (
						h.ember === h.maxEmber &&
						h.potions === h.maxPotions &&
						h.dodges === h.maxDodge &&
						!Object.keys(h.cds).length
					);
				}),
			);
			await page.waitForTimeout(120);
			assert.ok(
				Math.abs((await page.evaluate(() => __ed.ED.t)) - t - 1 / 60) < 1e-8,
			);
			await page
				.getByRole("button", { name: "Spawn monsters", exact: true })
				.click();
			await page
				.getByRole("button", { name: "Spawn boss", exact: true })
				.click();
			assert.ok(
				await page.evaluate(() => __ed.ED.foes.length >= 2 && __ed.ED.boss),
			);
			await page
				.getByRole("checkbox", { name: "Freeze enemy AI", exact: true })
				.check();
			const foeState = () =>
				page.evaluate(() =>
					__ed.ED.foes.map((m) => [m.x, m.y, m.spawnT, m.stunT]),
				);
			const frozen = await foeState();
			await page
				.getByRole("button", {
					name: "Step 1 frame (while paused)",
					exact: true,
				})
				.click();
			assert.deepEqual(await foeState(), frozen);
			await page
				.getByRole("checkbox", { name: "Freeze enemy AI", exact: true })
				.uncheck();
			await page
				.getByRole("button", {
					name: "Step 1 frame (while paused)",
					exact: true,
				})
				.click();
			assert.notDeepEqual(await foeState(), frozen);
			await page
				.getByRole("button", { name: "Reveal map", exact: true })
				.click();
			assert.ok(
				await page.evaluate(() => __ed.ED.L.seen.every((v) => v === 1)),
			);
			await page
				.getByRole("button", {
					name: "Clear enemies & projectiles",
					exact: true,
				})
				.click();
			assert.equal(await page.evaluate(() => __ed.ED.foes.length), 0);
			// the overlays and the full lighting are Graphics settings now, kept with the options
			await page.getByRole("tab", { name: "Graphics", exact: true }).click();
			await page
				.getByRole("checkbox", { name: "Full lighting", exact: true })
				.check();
			await page
				.getByRole("checkbox", { name: "Collision circles", exact: true })
				.check();
			await page.waitForTimeout(100);
			assert.equal(await page.evaluate(() => __ed.game.lights.enabled), false);
			assert.ok(
				await page.evaluate(() => {
					const o = My3D2dge.store.get("ed:opt");
					return o.fullLight === true && o.hitboxes === true;
				}),
			);
			await page
				.getByRole("checkbox", { name: "Full lighting", exact: true })
				.uncheck();
			await page
				.getByRole("checkbox", { name: "Collision circles", exact: true })
				.uncheck();
			await page.getByRole("tab", { name: "Tools", exact: true }).click();
			await page
				.getByRole("combobox", { name: "Simulation speed", exact: true })
				.selectOption("2");
			assert.equal(await page.evaluate(() => __ed.SLOW.base), 2);
			await page
				.getByRole("spinbutton", { name: "Depth (1–500)", exact: true })
				.fill("7");
			await page
				.getByRole("button", { name: "Travel to depth", exact: true })
				.click();
			await page.waitForFunction(() => __ed.ED.depth === 7);
			await page.evaluate(() => __ed.saveGame());
			assert.equal(
				JSON.parse(await save(page)).gold,
				gold + 10000,
				"the granted gold is the hero's own, and saves with him",
			);
			await key(page, "Escape");
			await canvasButton(page, "TOOLS");
			await page.screenshot({ path: out + "/tools.png" });
			await page
				.getByRole("button", { name: "Start autopilot", exact: true })
				.click();
			assert.ok(await page.evaluate(() => __ed.ED.hero.bot));
			await page
				.getByRole("button", { name: "Stop autopilot", exact: true })
				.click();
			assert.ok(await page.evaluate(() => !__ed.ED.hero.bot));
			// difficulty: a page of its own, kept as soon as it changes
			await page.getByRole("tab", { name: "Difficulty", exact: true }).click();
			await page.getByRole("slider", { name: "Hero damage", exact: true }).focus();
			await page.keyboard.press("ArrowRight");
			assert.ok(await page.evaluate(() => __ed.DIFF.heroDmg > 1));
			assert.ok(
				await page.evaluate(() => My3D2dge.store.get("ed:diff").heroDmg > 1),
			);
			await page
				.getByRole("button", { name: "Reset difficulty", exact: true })
				.click();
			assert.equal(await page.evaluate(() => __ed.DIFF.heroDmg), 1);
			// the switches off again, and home
			await page.getByRole("tab", { name: "Tools", exact: true }).click();
			for (const name of [
				"Invulnerable",
				"Unlimited ember, potions & dodges",
				"No skill cooldowns",
				"Pause simulation",
			])
				await page.getByRole("checkbox", { name, exact: true }).uncheck();
			await page
				.getByRole("combobox", { name: "Simulation speed", exact: true })
				.selectOption("1");
			await page
				.getByRole("button", { name: "Return to town", exact: true })
				.click();
			await page.waitForFunction(() => __ed.ED.mode === "town");
			assert.equal(await page.evaluate(() => __ed.SLOW.base), 1);
			assert.ok(
				await page.evaluate(
					() => !__ed.DEV.god && !__ed.DEV.paused && !__ed.UI.stack.length,
				),
			);
		},
	);
	await check(
		"Town conversations can pause and do not leak across travel",
		async () => {
			await page.evaluate(() => {
				const n = __ed.ED.L.npcs.find((n) => n.id === "bram");
				__ed.ED.hero.x = n.x;
				__ed.ED.hero.y = n.y + 8;
				__ed.ED.hero.act = null;
			});
			await key(page, "KeyE");
			assert.ok(
				await page.evaluate(() =>
					__ed.ED.L.npcs.some((n) => n.id === "bram" && n.talking),
				),
			);
			await key(page, "Escape");
			assert.equal(await page.evaluate(() => __ed.UI.top().id), "pause");
			await canvasButton(page, "TOOLS");
			await page
				.getByRole("button", { name: "Return to town", exact: true })
				.click();
			await page.waitForTimeout(700);
			const t = await page.evaluate(() => __ed.ED.t);
			await page.waitForTimeout(150);
			assert.ok(
				await page.evaluate((t) => __ed.ED.t > t, t),
				"the old conversation does not hold the world after travel",
			);
		},
	);
	await check(
		"Mobile portrait / landscape menus, two-finger play, cancellation and handedness",
		async () => {
			const mobile = await browser.newContext({
				viewport: { width: 390, height: 844 },
				deviceScaleFactor: 3,   // a phone's screen (an iPhone 14's)
				isMobile: true,
				hasTouch: true,
			});
			const p = await mobile.newPage();
			track(p);
			await ready(p, "");
			// held upright, the title fills the phone, and a touch screen that can go full screen offers it
			assert.ok((await phoneLayout(p)).fills);
			assert.ok(await p.evaluate(() => __ed.UI.hot.some((h) => h.label === "FULL SCREEN")));
			await settingsPage(p, "Controls", true);
			// any tap on the title menu takes a phone full screen (a browser only allows it from a tap)
			assert.ok(await p.evaluate(() => !!document.fullscreenElement));
			assert.equal(await p.locator("dialog").count(), 1);
			assert.ok(
				await p
					.locator("dialog")
					.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
			);
			await p.getByRole("button", { name: "Back", exact: true }).tap();
			await canvasButton(p, "GALLERY", true);
			await p.waitForFunction(() => __ed.ED.mode === "gallery");
			const gallerySave = await save(p);
			await p.evaluate(() => __ed.saveGame());
			assert.equal(await save(p), gallerySave);
			const firstSkill = await p.evaluate(() => __ed.ED.hero.slots[5]);
			await p.getByRole("button", { name: "Next", exact: true }).tap();
			await p.waitForFunction(
				(first) => __ed.ED.hero.slots[5] !== first,
				firstSkill,
			);
			await p.getByRole("button", { name: "Reel", exact: true }).tap();
			await p.waitForFunction(() => __ed.ED.foes.length === 1);
			await p.getByRole("button", { name: "Slow", exact: true }).tap();
			await p.waitForFunction(() => __ed.game.timeScale < 1);
			await p.getByRole("button", { name: "Back", exact: true }).tap();
			await p.waitForFunction(() => __ed.ED.mode === "title");
			assert.deepEqual(await p.evaluate(() => __ed.game.errors), []);
			await canvasButton(p, "NEW GAME", true);
			await p.waitForFunction(() => __ed.ED.mode === "town");
			await p.waitForTimeout(1200);
			assert.equal(await p.locator(".ed-touch-actions button").count(), 9);
			// the picture fills the upright screen: the HUD bar rides over the action buttons, the minimap sits
			// under the top buttons, and the camera keeps the hero in the open ground between them
			const up = await phoneLayout(p);
			assert.ok(up.fills, "the picture fills the upright screen");
			assert.ok(up.hudBottom <= up.gridTop, "the HUD bar is above the action buttons");
			assert.ok(up.mapTop >= up.barBottom, "the minimap is under the top buttons");
			assert.ok(await p.evaluate(() => __ed.game.cam.offset[1] < 0));
			await p.screenshot({ path: out + "/mobile-portrait.png" });
			const cdp = await mobile.newCDPSession(p),
				attack = await p.locator('[data-act="s0"]').boundingBox();
			const finger = { x: 55, y: 410, id: 1 },
				finger2 = {
					x: attack.x + attack.width / 2,
					y: attack.y + attack.height / 2,
					id: 2,
				};
			await cdp.send("Input.dispatchTouchEvent", {
				type: "touchStart",
				touchPoints: [finger],
			});
			await cdp.send("Input.dispatchTouchEvent", {
				type: "touchMove",
				touchPoints: [{ ...finger, x: 95 }],
			});
			await cdp.send("Input.dispatchTouchEvent", {
				type: "touchStart",
				touchPoints: [{ ...finger, x: 95 }, finger2],
			});
			await p.waitForTimeout(180);
			assert.ok(
				await p.evaluate(
					() =>
						__ed.game.input.stickOn &&
						__ed.game.input.move()[0] > 0.5 &&
						__ed.game.input.down("s0"),
				),
			);
			await cdp.send("Input.dispatchTouchEvent", {
				type: "touchCancel",
				touchPoints: [],
			});
			await p.waitForTimeout(100);
			assert.ok(
				await p.evaluate(
					() => !__ed.game.input.stickOn && !__ed.game.input.down("s0"),
				),
			);
			await p.locator('[data-act="pause"]').tap();
			// leaving full screen from the pause menu is remembered (the title then leaves the phone as it is)
			await canvasButton(p, "LEAVE FULL SCREEN", true);
			await p.waitForFunction(() => !document.fullscreenElement);
			assert.equal(await p.evaluate(() => My3D2dge.store.get("ed:opt").fullscreen), false);
			await settingsPage(p, "Controls", true);
			await p
				.getByRole("combobox", { name: "Action buttons on", exact: true })
				.selectOption("left");
			await p.getByRole("button", { name: "Back", exact: true }).tap();
			await canvasButton(p, "RESUME", true);
			assert.equal(await p.evaluate(() => __ed.game.input.stickSide), "right");
			await p.setViewportSize({ width: 844, height: 390 });
			await p.waitForTimeout(300);
			// on its side the action buttons stand above the HUD bar, under the minimap
			const side = await phoneLayout(p);
			assert.ok(side.fills, "the picture fills the screen on its side");
			assert.ok(side.gridBottom <= side.hudTop, "the action buttons are above the HUD bar");
			assert.ok(side.gridTop >= side.mapBottom, "the action buttons are under the minimap");
			assert.ok(
				await p.locator(".ed-touch-actions").evaluate((el) => {
					const r = el.getBoundingClientRect();
					return (
						r.left >= 0 &&
						r.right <= innerWidth &&
						r.top >= 0 &&
						r.bottom <= innerHeight
					);
				}),
			);
			await p.screenshot({ path: out + "/mobile-landscape.png" });
			assert.deepEqual(await p.evaluate(() => __ed.game.errors), []);
			await mobile.close();
		},
	);
	await check(
		"A finger's tap follows its own finger: the first after a mouse or a pad, another finger landing or lifting meanwhile, a hit-stop, the focus lost under it, the waystone with the touch buttons hidden (a drag that scrolls it is no tap)",
		async () => {
			// a hot rect's middle in page pixels; what the top panel shows; touch points by CDP ([id, x, y]: a touchEnd that
			// lists points lifts those alone)
			const mid = (p, r) => p.evaluate((r) => { const sc = __ed.game.screen, rc = sc.canvas.getBoundingClientRect(); return [rc.left + ((r.x + r.w / 2) * sc.S + sc.OX - Math.round(sc.fx * sc.S)) / sc.dpr, rc.top + ((r.y + r.h / 2) * sc.S + sc.OY - Math.round(sc.fy * sc.S)) / sc.dpr]; }, r);
			const hotBy = (p, label) => p.evaluate((l) => { const h = __ed.UI.hot.find((q) => q.label === l); return h && { x: h.x, y: h.y, w: h.w, h: h.h }; }, label);
			const shown = (p) => p.evaluate(() => { const t = __ed.UI.top(); return t ? [t.id, __ed.UI.data(t.id) || null] : null; });
			const fingers = (cdp) => (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([id, x, y]) => ({ id, x, y })) });
			// 1. a touch laptop or a tablet: the HUD and the loot panels lay out for the device in use, so a finger lands on
			// what the mouse's or the pad's layout drew and is held over its own; its first tap still acts on what it pressed
			const lap = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2, hasTouch: true });
			let p = await lap.newPage();
			track(p);
			await ready(p);
			let T = fingers(await lap.newCDPSession(p));
			for (const prev of ["mouse", "gamepad"]) {
				await p.evaluate(() => __ed.UI.closeAll());
				if (prev === "mouse") { await p.mouse.move(500, 300); await p.mouse.move(560, 340, { steps: 3 }); }
				else await p.evaluate(() => { __ed.game.input.lastDevice = "gamepad"; });
				await p.waitForTimeout(300);
				const slot = await p.evaluate(() => { const H = __ed.game.screen.H, s = __ed.UI.hot.filter((h) => h.click && h.y > H - 70 && h.w < 30 && h.w === h.h).sort((a, b) => a.x - b.x)[2]; return s && { x: s.x, y: s.y, w: s.w, h: s.h }; });
				assert.ok(slot, prev + ": the HUD's six skill slots");
				const [x, y] = await mid(p, slot);
				await T("touchStart", [[1, x, y]]);
				await p.waitForTimeout(150);
				await T("touchEnd", []);
				await p.waitForTimeout(400);
				assert.deepEqual(await shown(p), ["skills", { slot: 2 }], "after the " + prev + ", a finger's first tap on skill slot 3 opens Skills at it (its SKILL BAR is drawn over the slots while it is down)");
			}
			await p.evaluate(() => __ed.UI.closeAll());
			await p.mouse.move(500, 300);
			await p.mouse.move(560, 340, { steps: 3 });
			await p.evaluate(() => __ed.UI.open("inventory"));
			await p.waitForTimeout(400);
			const tab = await p.evaluate(() => { const n = __edLoot.ui.navLast.find((q) => q.key === "tab:stats"); return n && { x: n.x, y: n.y, w: n.w, h: n.h }; });
			const [tx, ty] = await mid(p, tab);
			assert.equal(await p.evaluate(() => __edLoot.ui.tab), "bag");
			await T("touchStart", [[1, tx, ty]]);
			await p.waitForTimeout(150);
			await T("touchEnd", []);
			await p.waitForTimeout(400);
			assert.equal(await p.evaluate(() => __edLoot.ui.tab), "stats", "after the mouse, a finger's first tap on the CHARACTER tab turns to it (the tab grows a finger tall while it is down)");
			assert.deepEqual(await p.evaluate(() => __ed.game.errors), []);
			await lap.close();
			// 2. a phone on its side: the left thumb on the stick (lifting or landing) while the right taps the HUD; a hit-stop
			const phone = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
			p = await phone.newPage();
			track(p);
			await ready(p);
			T = fingers(await phone.newCDPSession(p));
			const S = [210, 230];
			await T("touchStart", [[9, ...S]]);
			await p.waitForTimeout(120);
			await T("touchEnd", []);
			await p.waitForTimeout(500);
			const B = await mid(p, await hotBy(p, "SKILL BAR")), C = await mid(p, await hotBy(p, "POINTS"));
			const runs = [
				["the stick lifts during a tap on SKILL BAR", B, async (P) => { await T("touchStart", [[1, ...S]]); await p.waitForTimeout(150); await T("touchStart", [[1, ...S], [2, ...P]]); await p.waitForTimeout(120); await T("touchEnd", [[1, ...S]]); await p.waitForTimeout(150); await T("touchEnd", [[2, ...P]]); }],
				["the stick lifts during a tap on the points chip", C, async (P) => { await T("touchStart", [[1, ...S]]); await p.waitForTimeout(150); await T("touchStart", [[1, ...S], [2, ...P]]); await p.waitForTimeout(120); await T("touchEnd", [[1, ...S]]); await p.waitForTimeout(150); await T("touchEnd", [[2, ...P]]); }],
				["the stick lands during a tap on SKILL BAR", B, async (P) => { await T("touchStart", [[2, ...P]]); await p.waitForTimeout(120); await T("touchStart", [[2, ...P], [1, ...S]]); await p.waitForTimeout(150); assert.ok(await p.evaluate(() => __ed.game.input.stickOn), "the thumb steers"); await T("touchEnd", [[2, ...P]]); await p.waitForTimeout(150); await T("touchEnd", []); }],
				// (the input's step runs in a hit-stop, the scene's doesn't: the press waits for the first step in play)
				["a tap on SKILL BAR in a hit-stop", B, async (P) => { await p.evaluate(() => { __ed.game.hitstop = 0.4; }); await T("touchStart", [[1, ...P]]); await p.waitForTimeout(60); await T("touchEnd", []); await p.waitForTimeout(500); }],
			];
			for (const [name, P, run] of runs) {
				await p.evaluate(() => __ed.UI.closeAll());
				await p.waitForTimeout(250);
				await run(P);
				await p.waitForTimeout(300);
				assert.equal((await shown(p))?.[0], "skills", name + " opens Skills");
			}
			// and what made the press wait for the tap still holds: a flick begun on SKILL BAR opens nothing
			await p.evaluate(() => __ed.UI.closeAll());
			await p.waitForTimeout(250);
			await T("touchStart", [[1, ...B]]);
			for (let k = 1; k <= 4; k++) { await p.waitForTimeout(8); await T("touchMove", [[1, B[0] - k * 20, B[1] - k * 15]]); }
			await T("touchEnd", []);
			await p.waitForTimeout(400);
			assert.equal(await shown(p), null, "a flick begun on SKILL BAR opens nothing");
			// a finger resting on a bag item (its tooltip up) as the window loses focus: its press goes, and its hover with
			// it, so its lift leaves no tooltip behind
			await p.evaluate(() => { const { ED, UI } = __ed, h = ED.hero; UI.closeAll(); h.bag.length = 0; for (let i = 0; i < 3; i++) h.bag.push(__ed.makeItem({ slot: "helm", ilvl: 20, rarity: 1 })); UI.open("inventory"); });
			await p.waitForTimeout(400);
			await p.evaluate(() => { __edLoot.ui.gear = false; __edLoot.ui.tab = "bag"; });
			await p.waitForTimeout(250);
			const I = await mid(p, await p.evaluate(() => { const n = __edLoot.ui.navLast.find((q) => q.it && /^bag/.test(q.key)); return n && { x: n.x, y: n.y, w: n.w, h: n.h }; }));
			const itemTip = () => p.evaluate(() => !!(__edLoot.ui.tip && __edLoot.ui.tip.it));
			await T("touchStart", [[1, ...I]]);
			await p.waitForTimeout(250);
			assert.ok(await itemTip(), "a finger on a bag item shows its tooltip");
			await p.evaluate(() => dispatchEvent(new Event("blur")));
			await p.waitForTimeout(200);
			await T("touchEnd", []);
			await p.waitForTimeout(500);
			assert.ok(!(await itemTip()), "the finger down as the focus went has lifted: its tooltip has gone with it");
			// 3. the waystone with the touch buttons hidden (Settings, Controls): a finger dragged up its list scrolls it
			await p.evaluate(() => { __ed.UI.closeAll(); __ed.CONTROL.touch = "off"; __ed.ED.hero.maxDepth = 70; __ed.UI.open("waystone"); });
			await p.waitForTimeout(400);
			const rows = await p.evaluate(() => __ed.UI.hot.filter((h) => /^DEPTH/.test(h.label || "")).map((h) => ({ x: h.x, y: h.y, w: h.w, h: h.h, l: h.label })));
			const [x0, y0] = await mid(p, rows[rows.length - 1]), [x1, y1] = await mid(p, rows[0]);
			await T("touchStart", [[1, x0, y0]]);
			await p.waitForTimeout(60);
			for (let k = 1; k <= 12; k++) { await T("touchMove", [[1, x0 + ((x1 - x0) * k) / 12, y0 + ((y1 - y0) * k) / 12]]); await p.waitForTimeout(40); }
			await T("touchEnd", []);
			await p.waitForTimeout(400);
			const way = await p.evaluate(() => ({ first: (__ed.UI.hot.find((h) => /^DEPTH/.test(h.label || "")) || {}).label, open: __ed.UI.top()?.id, mode: __ed.ED.mode, buttons: !!document.querySelector(".ed-touch") }));
			assert.ok(!way.buttons && way.open === "waystone" && way.mode === "town" && way.first !== rows[0].l, "the touch buttons hidden, a finger's drag scrolls the waystone and descends nowhere: " + JSON.stringify(way));
			await p.evaluate(() => { __ed.CONTROL.touch = "auto"; });
			assert.deepEqual(await p.evaluate(() => __ed.game.errors), []);
			await phone.close();
			// 4. a small phone on its side (a CSS px a game px), the touch buttons hidden: the rows a menu's height, half a row
			// is less than a tap's 12 CSS px, so a short drag up scrolls a row under the finger before it lifts. A press that
			// scrolled is a drag: it descends nowhere, not to the depth scrolled under it; a tap still descends
			const small = await browser.newContext({ viewport: { width: 568, height: 320 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
			p = await small.newPage();
			track(p);
			await ready(p);
			T = fingers(await small.newCDPSession(p));
			const wayRows = () => p.evaluate(() => __ed.UI.hot.filter((h) => h.drag && /^DEPTH/.test(h.label || "")).map((h) => ({ x: h.x, y: h.y, w: h.w, h: h.h, l: h.label })));
			const wayOpen = async () => { await p.evaluate(() => { __ed.UI.closeAll(); __ed.CONTROL.touch = "off"; const h = __ed.ED.hero, w = __ed.ED.L.waystone; h.maxDepth = 70; h.x = w.x + 16; h.y = w.y + 4; __ed.UI.open("waystone"); }); await p.waitForTimeout(400); return wayRows(); };
			let wr = await wayOpen();
			const r2 = wr[2], [nx, ny] = await mid(p, { x: r2.x, y: r2.y + r2.h - 3, w: r2.w, h: 2 });   // (near the bottom of DEPTH 60's row)
			assert.ok(/^DEPTH 60/.test(r2.l) && r2.h < 16, "the third row is DEPTH 60, a menu row: " + JSON.stringify(r2));
			await T("touchStart", [[1, nx, ny]]);
			await p.waitForTimeout(80);
			for (let k = 1; k <= 6; k++) { await T("touchMove", [[1, nx, ny - (10 * k) / 6]]); await p.waitForTimeout(50); }
			await p.waitForTimeout(120);
			const nudged = (await wayRows())[0].l;
			await T("touchEnd", []);
			await p.waitForTimeout(600);
			const after = await p.evaluate(() => ({ open: __ed.UI.top()?.id, mode: __ed.ED.mode, depth: __ed.ED.depth }));
			assert.ok(nudged !== wr[0].l && after.open === "waystone" && after.mode === "town", "a finger dragged up 10 CSS px scrolls the waystone a row and descends nowhere: " + JSON.stringify({ nudged, ...after }));
			wr = await wayOpen();
			const [qx, qy] = await mid(p, wr[2]);
			await T("touchStart", [[1, qx, qy]]);
			await p.waitForTimeout(100);
			await T("touchEnd", []);
			await p.waitForTimeout(600);
			assert.deepEqual(await p.evaluate(() => [__ed.ED.mode, __ed.ED.depth]), ["level", 60], "a tap on DEPTH 60 descends to it");
			assert.deepEqual(await p.evaluate(() => __ed.game.errors), []);
			await small.close();
		},
	);
	await check(
		"inside 52in1 the DualSense comes through the hub's channel (AIHubSettings), each extra only while its Settings allow it, never WebHID",
		async () => {
			const hubCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
			await hubCtx.addInitScript(() => {
				// a stand-in for 52in1's companion (its lib/hub/companion.js): what the game is told, and what it asks
				const calls = [], api = new EventTarget();
				let gyroReads = 0, fingers = [], gy = { x: 0, y: 40, z: 0 }, pull = null;
				const pad = {
					connected: true, lightbar: true, triggers: false, motion: true, touchpad: true, speaker: false, aim: false,
					light: (c) => calls.push(["light", c]),
					trigger: (w, e) => calls.push(["trigger", w, e]),
					openSpeaker: () => Promise.resolve(null),
				};
				Object.defineProperty(pad, "gyro", { get: () => (gyroReads++, gy) });
				Object.defineProperty(pad, "accel", { get: () => pull });   // (the accelerometer's pull in g; none until a phase lays the controller on a table)
				Object.defineProperty(pad, "touches", { get: () => fingers });
				let mics = 0;
				Object.assign(api, { version: 1, music: 1, effects: 1, vibration: 1, mic: false, muted: false, dualsense: pad, openMicrophone: () => (mics++, Promise.resolve(null)) });
				window.AIHubSettings = api;
				window.__hub = { calls, pad, api, gyroReads: () => gyroReads, mics: () => mics, fingers: (f) => (fingers = f), turn: (y, x = 0, z = 0) => (gy = { x, y, z }), pull: (a) => (pull = a), tell: () => api.dispatchEvent(new Event("change")) };
				window.__hidTouched = false;
				Object.defineProperty(Navigator.prototype, "hid", { configurable: true, get() { window.__hidTouched = true; return undefined; } });
			});
			const p = await hubCtx.newPage();
			track(p);
			await ready(p);
			const step = (n) => p.evaluate((n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);   // (n frames of the page)
			await p.evaluate(() => window.__ed.game.settings.set("gyro", "off"));
			const r = await p.evaluate(async () => {
				const g = window.__ed.game, S = g.settings, ds = My3D2dge.DualSense.attach(g), H = window.__hub, lock = (k) => S.spec(k).locked(g);
				const out = { connected: ds.connected, light: lock("padLight"), triggers: lock("padTriggers"), gyro: lock("gyro"), speaker: lock("padSpeaker") };
				ds.light("#ff2040"); ds.trigger("right", { weapon: [0.2, 0.6, 0.8] });
				out.lit = H.calls.filter((c) => c[0] === "light").pop();
				out.trigOff = H.calls.filter((c) => c[0] === "trigger" && c[1] === "right").pop();
				out.readsOff = H.gyroReads();
				return out;
			});
			assert.equal(r.connected, true, "a DualSense connected in 52in1's Settings is the game's");
			assert.equal(r.light, null, "the light bar's row is open: 52in1 lets games colour it");
			assert.equal(r.gyro, null, "and gyro aim's");
			assert.match(r.triggers || "", /52in1/, "the triggers' row is locked while 52in1's Trigger effects are off, and says where");
			assert.match(r.speaker || "", /52in1/, "the speaker's while 52in1 has not allowed it");
			assert.deepEqual(r.lit, ["light", "#ff2040"], "the light bar's colour goes through the hub");
			assert.deepEqual(r.trigOff, ["trigger", "right", null], "a trigger 52in1 keeps from games stays free");
			await step(10);
			assert.equal(await p.evaluate(() => window.__hub.gyroReads()), 0, "the gyro is not read while gyro aim is off: the hub's own Motion aim keeps the stick");
			// 52in1's Settings changed over the game: the triggers allowed, gyro aim on
			await p.evaluate(() => { window.__hub.pad.triggers = true; window.__hub.tell(); window.__ed.game.settings.set("gyro", "high"); });
			await step(10);
			const r2 = await p.evaluate(() => {
				const g = window.__ed.game, ds = My3D2dge.DualSense.attach(g), H = window.__hub;
				ds.trigger("right", { weapon: [0.2, 0.6, 0.8] });
				return { lock: g.settings.spec("padTriggers").locked(g), trig: H.calls.filter((c) => c[0] === "trigger" && c[1] === "right").pop(), reads: H.gyroReads(), aim: ds.gyroAim(1 / 60) };
			});
			assert.equal(r2.lock, null, "allowed in 52in1's Settings: the row opens at once");
			assert.deepEqual(r2.trig, ["trigger", "right", { kind: "weapon", from: 0.2, to: 0.6, strength: 0.8 }], "the effect in the hub's words");
			assert.ok(r2.reads > 0 && r2.aim[0] < 0, "gyro aim on: the turn left (+y) moves the aim left");
			// the gyro's drift is never learned from a reading that gives aim: a slow, steady turn of the hand (4 degrees a
			// second, after holding still) moves the aim all the way and nothing creeps back after it, nor after a turn that
			// speeds up gently to 30 and stops, nor after a slower one (2.5 degrees a second for 4 s: under 3 it was taken for
			// drift, and the aim ran back by itself at rest). A real drift (2 degrees a second, past the dead zone) is learned
			// where the accelerometer says the controller lies on a table (its first rest), and a slow turn on the table after
			// it (the pull steady, the reading held 4 s: under the 5 s that makes a reading lying there the drift) is aim, not
			// drift. Each phase the module's own steps, the reading (the turn and the drift) set for the next step
			await p.evaluate(() => {
				const g = window.__ed.game, ds = My3D2dge.DualSense.attach(g), H = window.__hub, T = 26.7;
				const turn = (t) => (t < 1.2 ? 0 : t < 3.2 ? 4 : t < 4.7 ? 0 : t < 6.2 ? (t - 4.7) * 20 : t < 8.2 ? 0 : t < 12.2 ? 2.5 : t < 19.7 ? 0 : t < 23.7 ? -2.5 : 0);
				const drift = (t) => (t < 16.2 ? 0 : 2), ends = [1.2, 3.2, 4.7, 6.2, 8.2, 12.2, 16.2, 18.2, 19.7, 23.7, T];
				const run = (window.__gyroRun = { t: 0, phases: ends.map(() => ({ deg: 0, px: 0 })) });
				H.turn(0);
				g.hook("input", (dt) => {
					if (run.t >= T) return;
					const ph = run.phases[ends.findIndex((e) => run.t < e)];
					ph.deg += turn(run.t) * dt; ph.px += ds.gyroAim(dt)[0];
					run.t += dt; H.turn(run.t >= T ? 0 : turn(run.t) + drift(run.t)); H.pull(run.t >= 16.2 && run.t < T ? { x: 0, y: 1, z: 0 } : null);
				});
			});
			await p.waitForFunction(() => window.__gyroRun.t >= 26.7, null, { timeout: 90000 });
			const gr = await p.evaluate(() => window.__gyroRun.phases.map((ph) => ({ deg: +ph.deg.toFixed(2), px: +ph.px.toFixed(1) })));
			assert.ok(-gr[1].px >= gr[1].deg * 9 * 0.9, "a slow, steady turn after holding still moves the aim (9 px a degree on High): " + JSON.stringify(gr));
			assert.ok(Math.abs(gr[2].px) < 2, "and held still after it, the aim stays put: " + JSON.stringify(gr));
			assert.ok(-gr[3].px >= gr[3].deg * 9 * 0.9, "a turn that speeds up gently moves it all the way: " + JSON.stringify(gr));
			assert.ok(Math.abs(gr[4].px) < 3, "and nothing creeps after it stops: " + JSON.stringify(gr));
			assert.ok(-gr[5].px >= gr[5].deg * 9 * 0.9, "a slower turn, 2.5 degrees a second for 4 s, moves it all the way too: " + JSON.stringify(gr));
			assert.ok(Math.abs(gr[6].px) < 3, "and held still after it, nothing runs back: " + JSON.stringify(gr));
			assert.ok(Math.abs(gr[8].px) < 2, "a drift of 2 degrees a second, the controller lying on a table, is learned: the aim stays put: " + JSON.stringify(gr));
			assert.ok(gr[9].px >= -gr[9].deg * 9 * 0.9, "turned slowly on the table (2.5 degrees a second, right), the aim moves all the way: " + JSON.stringify(gr));
			assert.ok(Math.abs(gr[10].px) < 3, "and left lying after it, nothing runs back: " + JSON.stringify(gr));
			// a first rest that came mid-turn (a hand as steady as a table, turning 2.5 degrees a second as the controller
			// connects, the controller drifting 0.4 degrees a second on another axis, its pitch) is given back once an ordinary
			// hand holds still (its turn trembling about a degree a second, its pull a hundredth and a half of a g: never lying
			// still): the aim runs back a moment, then no further. And a drift of 2 degrees a second, in a hand whose turn is
			// calm but whose pull trembles (never lying still either), creeps until it has held 10 s, longer than an aiming
			// turn holds one speed, and is then learned. Each with a controller connected afresh (52in1's channel says it went
			// and came back: its drift its own, and its gyro read again), the reading set for the next step
			await p.evaluate(() => {
				const g = window.__ed.game, ds = My3D2dge.DualSense.attach(g), H = window.__hub, T = 23.5, ends = [1.5, 3.5, 7.5, 19.5, T];
				const run = (window.__gyroRun2 = { t: 0, again: false, phases: ends.map(() => ({ deg: 0, px: 0 })) });
				const again = () => { H.pad.connected = false; H.tell(); H.pad.connected = true; H.tell(); };
				const shake = (t, s) => s * (0.7 * Math.sin(2 * Math.PI * 8.7 * t) + 0.5 * Math.sin(2 * Math.PI * 11.3 * t + 1) + 0.3 * Math.sin(2 * Math.PI * 0.7 * t));   // (a hand's tremor, degrees a second)
				const read = (t) => {   // (the turn and the drift, the hand's tremor, the pull in g)
					if (t < 1.5) return { y: 2.5, x: 0.4, a: { x: 0, y: 0.82, z: 0.57 } };
					const w = shake(t, t < 7.5 ? 1 : 0.5), j = 0.012 * Math.sin(2 * Math.PI * 9 * t) + 0.006 * Math.sin(2 * Math.PI * 1.3 * t);
					return { y: (t < 7.5 ? 0 : -2) + w, x: (t < 7.5 ? 0.4 : 0) + w * 0.8, a: { x: j, y: 0.82 + j * 0.7, z: 0.57 - j } };
				};
				const set = (t) => { const r = read(t); H.turn(r.y, r.x); H.pull(r.a); };
				again(); set(0);
				g.hook("input", (dt) => {
					if (run.t >= T) return;
					const ph = run.phases[ends.findIndex((e) => run.t < e)];
					ph.deg += (run.t < 1.5 ? 2.5 : 0) * dt; ph.px += ds.gyroAim(dt)[0];
					run.t += dt; if (run.t >= 7.5 && !run.again) { run.again = true; again(); }
					if (run.t < T) set(run.t); else { H.turn(0); H.pull(null); }
				});
			});
			await p.waitForFunction(() => window.__gyroRun2.t >= 23.5, null, { timeout: 90000 });
			const g2 = await p.evaluate(() => window.__gyroRun2.phases.map((ph) => ({ deg: +ph.deg.toFixed(2), px: +ph.px.toFixed(1) })));
			assert.ok(g2[0].px <= -0.5 * g2[0].deg * 9, "connected afresh, the gyro is read: the turn moves the aim (at least half of it before the first rest takes it): " + JSON.stringify(g2));
			assert.ok(Math.abs(g2[1].px) < 45, "a first rest that came mid-turn, then an ordinary hand held still: the aim runs back a moment: " + JSON.stringify(g2));
			assert.ok(Math.abs(g2[2].px) < 3, "then no further (the drift before the turn back on its axis, though another axis drifts): " + JSON.stringify(g2));
			assert.ok(g2[3].px > 50, "connected afresh again, the gyro is read: a drift of 2 degrees a second creeps before it is learned: " + JSON.stringify(g2));
			assert.ok(Math.abs(g2[4].px) < 3, "a drift of 2 degrees a second in a calm hand whose pull trembles is learned once held 10 s: the aim stays put: " + JSON.stringify(g2));
			// a drift of 2 degrees a second, found by the controller's first rest on a table, then picked up: a slow pan
			// against it at its own speed (2 degrees a second for 2 s reads the drift before it was found, long enough to undo
			// it) gets it back in the pause after, so the pans and pauses after move the aim as turned and leave it put (it
			// stayed undone while the pauses were under a second and a half: each crept, each pan with the drift moved twice
			// as far, each against it not at all)
			await p.evaluate(() => {
				const g = window.__ed.game, ds = My3D2dge.DualSense.attach(g), H = window.__hub, T = 16, ends = [3, 4, 6, 7, 9, 10, 12, 13, 15, T];
				const run = (window.__gyroRun3 = { t: 0, phases: ends.map(() => ({ deg: 0, px: 0 })) });
				const turn = (t) => (t < 4 ? 0 : t < 6 || (t >= 10 && t < 12) ? -2 : (t >= 7 && t < 9) || (t >= 13 && t < 15) ? 2 : 0);
				const shake = (t) => 0.7 * Math.sin(2 * Math.PI * 8.7 * t) + 0.5 * Math.sin(2 * Math.PI * 11.3 * t + 1) + 0.3 * Math.sin(2 * Math.PI * 0.7 * t);
				const set = (t) => {   // (on the table: the drift alone, the pull steady; in the hand: the turn, the drift and the tremor)
					if (t < 3) { H.turn(2, 0); H.pull({ x: 0, y: 1, z: 0 }); return; }
					const w = shake(t), j = 0.012 * Math.sin(2 * Math.PI * 9 * t) + 0.006 * Math.sin(2 * Math.PI * 1.3 * t);
					H.turn(turn(t) + 2 + w, w * 0.8); H.pull({ x: j, y: 0.82 + j * 0.7, z: 0.57 - j });
				};
				H.pad.connected = false; H.tell(); H.pad.connected = true; H.tell(); set(0);
				g.hook("input", (dt) => {
					if (run.t >= T) return;
					const ph = run.phases[ends.findIndex((e) => run.t < e)];
					ph.deg += turn(run.t) * dt; ph.px += ds.gyroAim(dt)[0];
					run.t += dt; if (run.t < T) set(run.t); else { H.turn(0); H.pull(null); }
				});
			});
			await p.waitForFunction(() => window.__gyroRun3.t >= 16, null, { timeout: 90000 });
			const g3 = await p.evaluate(() => window.__gyroRun3.phases.map((ph) => ({ deg: +ph.deg.toFixed(2), px: +ph.px.toFixed(1) })));
			assert.ok(Math.abs(g3[1].px) < 3, "a drift of 2 degrees a second, found on a table, then picked up: the aim stays put: " + JSON.stringify(g3));
			for (const i of [4, 6, 8]) { const want = g3[i].deg * 9; assert.ok(-g3[i].px / want > 0.5 && -g3[i].px / want < 1.4, "after a slow pan against the drift at its speed, each pan moves the aim as turned (" + i + "): " + JSON.stringify(g3)); }
			for (const i of [5, 7, 9]) assert.ok(Math.abs(g3[i].px) < 4, "and each pause leaves it put (" + i + "): " + JSON.stringify(g3));
			await p.evaluate(() => window.__hub.pull(null));
			// a flick on the touchpad
			await p.evaluate(() => { const ds = My3D2dge.DualSense.attach(window.__ed.game); window.__ed.game.hook("input", () => { if (ds.swipe()) window.__sw = ds.swipe(); }); window.__hub.fingers([{ id: 1, x: 0.2, y: 0.5 }]); });
			await step(2);
			await p.evaluate(() => window.__hub.fingers([{ id: 1, x: 0.7, y: 0.5 }]));
			await step(2);
			await p.evaluate(() => window.__hub.fingers([]));
			await step(3);
			const sw = await p.evaluate(() => window.__sw || null);
			assert.equal(sw, "right", "a flick on the touchpad from the hub's fingers");
			// 52in1's Light bar off: the row locked, and no colour of the game's reaches the hub
			const lb = await p.evaluate(() => {
				const g = window.__ed.game, ds = My3D2dge.DualSense.attach(g), H = window.__hub;
				H.pad.lightbar = false; H.tell(); const n = H.calls.length; ds.light("#00ff00");
				const out = { lock: g.settings.spec("padLight").locked(g), sent: H.calls.slice(n).filter((c) => c[0] === "light" && c[1]) };
				H.pad.lightbar = true; H.tell(); return out;
			});
			assert.match(lb.lock || "", /52in1/, "52in1 keeps the light bar from games: its row is locked and says where");
			assert.deepEqual(lb.sent, [], "and no colour of the game's is sent");
			// the microphone: its row opens only once 52in1 lets games hear it, and only then is it opened
			const mic = await p.evaluate(async () => {
				const g = window.__ed.game, S = g.settings, H = window.__hub, wait = () => new Promise((r) => setTimeout(r, 50));
				My3D2dge.DualSense.attach(g, { mic: true });
				const out = { before: S.spec("mic").locked(g) };
				S.set("mic", true); await wait(); out.opensBefore = H.mics();
				H.api.mic = true; H.tell(); await wait(); out.after = S.spec("mic").locked(g); out.opensAfter = H.mics();
				H.api.mic = false; H.tell(); out.again = S.spec("mic").locked(g); S.set("mic", false);
				return out;
			});
			assert.match(mic.before || "", /52in1/, "the microphone's row is locked until 52in1 lets games hear it");
			assert.equal(mic.opensBefore, 0, "and the game never asks for it then, even with its own row on");
			assert.equal(mic.after, null, "allowed in 52in1: the row opens");
			assert.equal(mic.opensAfter, 1, "and the microphone is opened through the hub, once");
			assert.match(mic.again || "", /52in1/, "taken back in 52in1: locked again");
			// 52in1's DualSense gone: every row locked again, the light given back
			const r3 = await p.evaluate(() => { const g = window.__ed.game, H = window.__hub; H.pad.connected = false; H.tell(); return { light: g.settings.spec("padLight").locked(g), connected: My3D2dge.DualSense.attach(g).connected }; });
			assert.equal(r3.connected, false);
			assert.match(r3.light || "", /Connect a DualSense/, "no DualSense in 52in1: its rows say how to connect one");
			assert.equal(await p.evaluate(() => window.__hidTouched), false, "the game never touched WebHID");
			assert.deepEqual(await p.evaluate(() => window.__ed.game.errors), []);
			await hubCtx.close();
		},
	);
	assert.deepEqual(await page.evaluate(() => __ed.game.errors), []);
	assert.deepEqual(errors, []);
	writeFileSync(
		out + "/results.json",
		JSON.stringify({ checks, errors }, null, 2),
	);
	console.log("All", checks.length, "control / tools scenarios passed.");
} catch (error) {
	await page.screenshot({ path: out + "/failure.png" });
	console.error("Browser errors:", errors);
	throw error;
} finally {
	await browser.close();
}
