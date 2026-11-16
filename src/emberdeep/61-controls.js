/* Saved bindings, native settings dialogs, and multi-touch controls. Every key or button a player reads comes from
   the engine's input.label (keyLabel, keyText below), on the device used last: PlayStation glyphs for a controller by
   default (Settings, Controls, Controller: Button symbols shows Xbox's), keys and mouse buttons for the keyboard. */
const CONTROL_ACTIONS = [
	["up", "Move up"],
	["down", "Move down"],
	["left", "Move left"],
	["right", "Move right"],
	...SLOT_ACTS.map((a, i) => [a, "Skill " + (i + 1)]),
	["dodge", "Dodge"],
	["potion", "Potion"],
	["interact", "Interact"],
	["portal", "Town portal"],
	["bag", "Inventory"],
	["skills", "Skills"],
	["tree", "Passives"],
	["map", "Map (hold)"],
	["labels", "Loot labels"],
];
const CONTROL_DEFAULT = {
	deadzone: 0.18,
	invertAimY: false,
	aimAssist: true,
	touch: "auto",
	handed: "right",
	size: 54,
	opacity: 0.8,
};
const CONTROL = { bindings: {}, ...CONTROL_DEFAULT };
const storedControls = E.store.get("ed:controls", {});
// (Pad17 is a DualSense's touchpad click: bindable, always beside another button. Pad16, PS, is the 52in1 hub's: never)
const bindingCode = (c) =>
	typeof c === "string" &&
	/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Tab|Enter|NumpadEnter|Backspace|Mouse[0-4]|Pad([0-9]|1[0-5]|17))$/.test(
		c,
	);
const RESERVED_KEYS = new Set(["KeyV", "KeyM", "KeyH", "Digit0", "Pad9"]);
const MOVE_ACTS = ["up", "down", "left", "right"];
if (storedControls && typeof storedControls === "object") {
	for (const key of ["deadzone", "size", "opacity"])
		if (Number.isFinite(storedControls[key]))
			CONTROL[key] = storedControls[key];
	for (const key of ["invertAimY", "aimAssist"])
		if (typeof storedControls[key] === "boolean")
			CONTROL[key] = storedControls[key];
	if (["auto", "on", "off"].includes(storedControls.touch))
		CONTROL.touch = storedControls.touch;
	if (["left", "right"].includes(storedControls.handed))
		CONTROL.handed = storedControls.handed;
	for (const [a] of CONTROL_ACTIONS) {
		let codes = storedControls.bindings && storedControls.bindings[a];
		// the d-pad left the moves for the map, the labels, the portal and the use (the left stick moves): a binding
		// saved before keeps its keys, not the old d-pad
		if (Array.isArray(codes) && MOVE_ACTS.includes(a))
			codes = codes.filter((c) => !/^Pad1[2-5]$/.test(c));
		if (
			Array.isArray(codes) &&
			codes.length <= 12 &&
			codes.every((c) => bindingCode(c) && !RESERVED_KEYS.has(c))
		)
			CONTROL.bindings[a] = [...new Set(codes)];
	}
	// a save from before the controls standard (no v): the d-pad and the touchpad's new roles (the map ↑ and the touchpad,
	// the labels ←, the portal ↓, the use →) go to their actions, rebound or not, unless the player gave that button to
	// another action (one of them moved Potion onto the d-pad: it stays Potion's alone); the touchpad is never an
	// action's only pad button
	if (!(storedControls.v >= 2))
		for (const [a, add] of [["interact", ["Pad15"]], ["portal", ["Pad13"]], ["map", ["Pad12", "Pad17"]], ["labels", ["Pad14"]]]) {
			const taken = (c) => Object.entries(CONTROL.bindings).some(([b, cs]) => b !== a && cs.includes(c));
			const own = CONTROL.bindings[a] ? CONTROL.bindings[a].slice() : (INPUT[a] || []).filter((c) => !add.includes(c));
			for (const c of add) if (!taken(c) && !own.includes(c) && own.length < 12) own.push(c);
			if (!own.some((c) => /^Pad/.test(c) && c !== "Pad17") && own.includes("Pad17")) own.splice(own.indexOf("Pad17"), 1);
			if (CONTROL.bindings[a] || own.join() !== (INPUT[a] || []).join()) CONTROL.bindings[a] = own;
		}
}
CONTROL.v = 2;   // (the saves from here on are the standard's)
CONTROL.deadzone = clamp(CONTROL.deadzone, 0.05, 0.5);
CONTROL.size = clamp(CONTROL.size, 44, 72);
CONTROL.opacity = clamp(CONTROL.opacity, 0.3, 1);
/* ---------- what a prompt shows: the engine's labels ----------
 * keyLabel(a): action a's key or button on the device used last (input.label: ✕ ○ □ △ L1 R1 L2 R2 Create Options
 * Touchpad, or A B X Y LB RB with Button symbols: Xbox). Emberdeep aims with the mouse, so on the keyboard a mouse button
 * comes first (LMB, not J). '' where that device has none (a controller has no Skills key: a line says where else to
 * go), and on touch the touch button's own name (DODGE, USE, the skill in that slot) or ''. short: a badge's form
 * ('LMB', '□', 'Spc', '↑'). keyText(s): a line's {key:action} tags filled at draw time (the device may change while it
 * shows). A tag in brackets, ({key:a}), leaves with its brackets where there is nothing to show (on touch, or unbound);
 * a segment of a notice ('  •  ' between them) whose bare tag has nothing leaves whole; one that starts {mouse}, {pad}
 * or {touch} shows on that device only (a hover hint is the mouse's) */
const ctlDevice = () => {
	const d = game.input.lastDevice;
	return d === "keyboard" ? "mouse" : d;
};
const TOUCH_NAMES = { dodge: "DODGE", potion: "POTION", interact: "USE", portal: "PORTAL", bag: "BAG", map: "MAP", pause: "MENU" };
function touchName(a) {
	const i = SLOT_ACTS.indexOf(a);
	if (i < 0) return TOUCH_NAMES[a] || "";
	const id = ED.hero && ED.hero.slots[i],
		S = id && REG.skills[id];
	return S ? S.name.toUpperCase() : "";
}
function keyLabel(a, short = false, dev = ctlDevice()) {
	const I = game.input;
	if (!I.map || !I.map[a]) return "";
	if (dev === "touch") return touchName(a);
	const pad = dev === "gamepad";
	if (!I.bound(a, pad ? "gamepad" : "keyboard")) return "";
	return I.label(a, pad ? "gamepad" : "mouse", short ? { short: true } : undefined);
}
/** a skill slot's badge: its key or button (LMB, □, 1), or its number where there is none */
const slotKey = (i, short = true) => (ctlDevice() !== "touch" && keyLabel(SLOT_ACTS[i], short)) || String(i + 1);   // (on touch its number: the buttons name the skills)
function keyText(s) {
	s = String(s);
	if (s.indexOf("{") < 0) return s;
	const dev = ctlDevice(),
		on = dev === "gamepad" ? "pad" : dev === "touch" ? "touch" : "mouse";
	const out = [];
	for (let q of s.split("  •  ")) {
		const only = /^\{(mouse|pad|touch)\}/.exec(q);
		if (only) {
			if (only[1] !== on) continue;
			q = q.slice(only[0].length);
		}
		let gone = false;
		q = q
			.replace(/\s*\(\{key:(\w+)\}\)/g, (t, a) => {
				const k = dev === "touch" ? "" : keyLabel(a, false, dev);
				return k ? " (" + k + ")" : "";
			})
			.replace(/\{key:(\w+)\}/g, (t, a) => {
				const k = keyLabel(a, false, dev);
				if (!k) gone = true;
				return k;
			});
		if (!gone) out.push(q);
	}
	return out.join("  •  ");
}
/** an interaction prompt ('{key:interact} Talk to Bram'): the key in brackets ('[E] Talk to Bram', '[L3] ...'); on
 *  touch none (the Use button says the verb) */
function promptText(s) {
	const touch = ctlDevice() === "touch";
	return keyText(
		String(s).replace(/^\{key:(\w+)\}\s*/, (t, a) => {
			const k = touch ? "" : keyLabel(a);
			return k ? "[" + k + "] " : "";
		}),
	);
}
function actionCodes(a) {
	return CONTROL.bindings[a] || INPUT[a] || [];
}
/** the label tools and tests read (window.__ed.actionLabel): the engine's, '—' for none */
function actionLabel(a) {
	return keyLabel(a) || "—";
}
const codeLabel = (code) => game.input.codeLabel(code);
function applyControls(save = true) {
	const map = { ...INPUT };
	for (const [a] of CONTROL_ACTIONS) map[a] = actionCodes(a);
	game.input.use(map);
	game.input.deadzone = CONTROL.deadzone;
	game.input.invertAimY = CONTROL.invertAimY;
	game.input.stickSide = CONTROL.handed === "right" ? "left" : "right";
	game.input.stickRadius = CONTROL.size * 0.82;
	if (save) E.store.set("ed:controls", CONTROL);
	syncTouchControls(true);
}

/* Native dialogs remain legible on portrait phones and support browser focus/scrolling. */
const FORM = { el: null, capture: null, message: "" };
function formElement(tag, text, parent, attrs = {}) {
	const el = document.createElement(tag);
	if (text) el.textContent = text;
	for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
	if (parent) parent.appendChild(el);
	return el;
}
function formButton(parent, text, fn) {
	const el = formElement("button", text, parent, { type: "button" });
	el.onclick = fn;
	return el;
}
function formField(parent, label, type, value, change, extra = {}) {
	const row = formElement("label", "", parent, { class: "ed-field" });
	formElement("span", label, row);
	const el = formElement(
		type === "select" ? "select" : "input",
		"",
		row,
		type === "select" ? {} : { type, ...extra },
	);
	if (type === "select")
		for (const [v, t] of extra.options)
			formElement("option", t, el, { value: v });
	if (type === "checkbox") el.checked = value;
	else el.value = value;
	el.onchange = () =>
		change(
			type === "checkbox"
				? el.checked
				: type === "select"
					? el.value
					: Number(el.value),
		);
	return el;
}
function openForm(title, build) {
	closeForm();
	const el = formElement("dialog", "", document.body, {
		class: "ed-dialog",
		"aria-labelledby": "ed-dialog-title",
	});
	FORM.el = el;
	const head = formElement("header", "", el);
	formElement("h2", title, head, { id: "ed-dialog-title" });
	formButton(head, "Back", () => UI.close());
	el.addEventListener("cancel", (e) => {
		e.preventDefault();
		if (FORM.capture) cancelBinding();
		else UI.close();
	});
	el.addEventListener("keydown", (e) => e.stopPropagation());
	el.addEventListener("contextmenu", (e) => e.preventDefault());
	// the mouse's hover moves the one focus a pad and the keys move (one highlight, and keys go on from it)
	el.addEventListener("pointerover", (e) => {
		if (e.pointerType !== "mouse") return;
		const t = e.target.closest && e.target.closest("button, select, input[type=checkbox], input[type=range]");
		if (t && !t.disabled && document.activeElement !== t) t.focus({ preventScroll: true });
	});
	// a flick sideways on a touch screen takes the window away (a binding being chosen is cancelled first); the page
	// list and the sliders scroll and slide sideways, so a flick that starts on them is theirs
	let flickFrom = null;
	el.addEventListener("pointerdown", (e) => (flickFrom = e.target), true);
	game.input.swipeOn(el, (dir) => {
		if (dir !== "left" && dir !== "right") return;
		if (flickFrom && flickFrom.closest && flickFrom.closest("input[type=range], .ed-menu-nav, .ed-seg-wrap")) return;
		if (FORM.capture) cancelBinding();
		else UI.close();
	});
	// the tap that opened this window lifts over it: a click whose press was not on the window (a pointer's click,
	// detail > 0, with no press here since it opened) is the finger leaving the canvas, not a press of what lies under
	// it now (it hit PLAY AS on the character window). Keys and a pad click with detail 0
	let downAt = -1;
	el.addEventListener("pointerdown", () => (downAt = performance.now()), true);
	el.addEventListener(
		"click",
		(e) => {
			if (e.detail && (downAt < 0 || performance.now() - downAt > 5000)) {
				e.preventDefault();
				e.stopImmediatePropagation();
			}
		},
		true,
	);
	build(el);
	el.showModal();
	el.querySelector("button").focus();
}
function closeForm() {
	FORM.capture = null;
	if (FORM.el) {
		FORM.el.close();
		FORM.el.remove();
		FORM.el = null;
	}
	game.input.clear();
}
function formStatus(message) {
	FORM.message = message;
	const el = FORM.el && FORM.el.querySelector("[data-status]");
	if (el) el.textContent = message;
}
function cancelBinding() {
	FORM.capture = null;
	formStatus("Binding cancelled.");
	game.input.clear();
}
function beginBinding(a, kind) {
	FORM.capture = { a, kind, prev: game.input.padPrev.slice() };
	formStatus(
		"Press " +
			(kind === "pad" ? "a controller button" : "a key or mouse button") +
			" for " +
			CONTROL_ACTIONS.find((x) => x[0] === a)[1] +
			". " +
			cancelKeys() +
			" cancels.",
	);
}
/** what cancels a binding being chosen: Esc, and the menu button on a pad (Options) */
const cancelKeys = () => [game.input.codeLabel("Escape"), keyLabel("pause", false, "gamepad")].filter(Boolean).join(" or ");
function setBinding(code) {
	const c = FORM.capture;
	if (!c) return;
	if (!bindingCode(code) || RESERVED_KEYS.has(code)) {
		formStatus("That input is reserved. Choose another; " + cancelKeys() + " cancels.");
		return;
	}
	const conflict = CONTROL_ACTIONS.find(
		([a]) => a !== c.a && actionCodes(a).includes(code),
	);
	if (conflict) {
		formStatus(
			codeLabel(code) +
				" is used by " +
				conflict[1] +
				". Clear that binding first, or choose another.",
		);
		return;
	}
	// the touchpad is never an action's only button (a controller without one plays the whole game): it joins the pad
	// buttons the action has
	const pads = actionCodes(c.a).filter((k) => k.startsWith("Pad") && k !== "Pad17");
	if (code === "Pad17" && !pads.length) {
		formStatus("The touchpad goes beside another button. Give " + CONTROL_ACTIONS.find((x) => x[0] === c.a)[1] + " a button first.");
		return;
	}
	CONTROL.bindings[c.a] = code === "Pad17"
		? actionCodes(c.a).filter((k) => k !== "Pad17").concat(code)
		: actionCodes(c.a)
			.filter((k) => k.startsWith("Pad") !== (c.kind === "pad"))
			.concat(code);
	FORM.capture = null;
	applyControls();
	menuRender();
	formStatus("Saved " + codeLabel(code) + ".");
}
addEventListener(
	"keydown",
	(e) => {
		if (!FORM.capture) return;
		e.preventDefault();
		e.stopImmediatePropagation();
		if (e.code === "Escape") cancelBinding();
		else if (FORM.capture.kind === "key" && !e.repeat) setBinding(e.code);
	},
	true,
);
addEventListener(
	"pointerdown",
	(e) => {
		if (
			!FORM.capture ||
			FORM.capture.kind !== "key" ||
			e.pointerType !== "mouse"
		)
			return;
		e.preventDefault();
		e.stopImmediatePropagation();
		setBinding("Mouse" + e.button);
	},
	true,
);
function updateForm() {
	const inp = game.input,
		el = FORM.el;
	if (!el) return;
	const meter = el.querySelector("[data-pad]");
	if (meter)
		meter.textContent = inp.padId
			? inp.padId +
				" · sticks " +
				inp.padAxes.map((v) => v.toFixed(2)).join(", ") +
				" · buttons " +
				inp.padPrev
					.map((v, i) => (v ? i : null))
					.filter((v) => v !== null)
					.join(", ")
			: "No controller detected. Press a button to connect.";
	if (FORM.capture) {
		const c = FORM.capture;
		const i = inp.padPrev.findIndex((v, i) => v && !c.prev[i] && i !== 16);   // (PS is the hub's)
		c.prev = inp.padPrev.slice();
		if (i === 9) cancelBinding();
		else if (i >= 0 && c.kind === "pad") setBinding("Pad" + i);
		return;
	}
	if (inp.pressed("pause") || inp.pressed("cancel")) {
		UI.close();
		return;
	}
	el.classList.toggle("ed-pad", inp.lastDevice === "gamepad");   // (a controller: each row's help shows only on the focused row)
	// the search box is the keyboard's: a controller walks past it (a text field is a dead stop on a TV)
	const all = [...el.querySelectorAll("button, input, select")].filter(
			(e) => !e.disabled && e.offsetParent !== null && !(inp.lastDevice === "gamepad" && e.type === "search"),
		),
		cur = document.activeElement;
	let ix = Math.max(0, all.indexOf(cur));
	const focus = (d) => {
		ix = (ix + d + all.length) % all.length;
		all[ix].focus();
		all[ix].scrollIntoView({ block: "nearest" });
	};
	if (inp.repeat("menuUp")) focus(-1);
	else if (inp.repeat("menuDown")) focus(1);
	const dir = inp.repeat("menuLeft") ? -1 : inp.repeat("menuRight") ? 1 : 0;
	if (dir) {
		if (cur && cur.tagName === "SELECT") {
			cur.selectedIndex =
				(cur.selectedIndex + dir + cur.options.length) % cur.options.length;
			cur.dispatchEvent(new Event("change"));
		} else if (cur && ["range", "number"].includes(cur.type)) {
			dir > 0 ? cur.stepUp() : cur.stepDown();
			cur.dispatchEvent(new Event("change"));
		} else focus(dir);
	}
	if (inp.pressed("confirm") && all[ix]) {
		inp.consumeAll();
		if (all[ix].type === "checkbox" || all[ix].tagName === "BUTTON") all[ix].click();
		else if (all[ix].tagName === "SELECT") {   // ✕ on a choice steps it on, as the sides do
			all[ix].selectedIndex = (all[ix].selectedIndex + 1) % all[ix].options.length;
			all[ix].dispatchEvent(new Event("change"));
		}
	}
}
/** Settings > Controls, a page for each way to play, the one in use first: Keyboard & mouse (each action's keys),
 *  Controller (each action's buttons, Button symbols, the sticks, vibration, the aim assist, the DualSense's extras) and
 *  Touch (the buttons, their side and size, Touch assists). A binding is changed by choosing it and pressing the new key
 *  or button; changes save at once */
const CTL_PAGES = [
	["keys", "Keyboard & mouse"],
	["pad", "Controller"],
	["touch", "Touch"],
];
function controlsPage(el) {
	const I = game.input;
	if (!CTL_PAGES.some((p) => p[0] === FORM.ctl))
		FORM.ctl = I.lastDevice === "gamepad" ? "pad" : I.lastDevice === "touch" ? "touch" : "keys";
	const tabs = formElement("div", "", el, { class: "ed-seg ed-seg-wrap ed-ctl-tabs", role: "tablist", "aria-label": "Ways to play" });
	for (const [id, name] of CTL_PAGES) {
		const b = formButton(tabs, name, () => {
			FORM.ctl = id;
			menuRender();
			const f = FORM.el && FORM.el.querySelector(".ed-ctl-tabs [aria-selected=true]");
			if (f) f.focus();
		});
		b.setAttribute("role", "tab");
		b.setAttribute("aria-selected", String(FORM.ctl === id));
	}
	const page = FORM.ctl,
		pad = page === "pad";
	const L = (a) => keyLabel(a, false, pad ? "gamepad" : "mouse") || "—";
	if (page !== "touch") {
		formElement(
			"p",
			pad
				? "In menus " + L("confirm") + " chooses, " + L("cancel") + " goes back, " + L("alt") + " drops, sells or takes back, " + L("pagePrev") + " " + L("pageNext") + " turn tabs and pages, " + L("panelPrev") + " " + L("panelNext") + " go between the bag, skills and passives. Skills and passives are in the menu too (" + L("pause") + ")."
				: "The mouse aims. In menus " + L("confirm") + " chooses, " + L("cancel") + " goes back, " + L("alt") + " drops, sells or takes back, " + L("pageNext") + " turns tabs. Choose a binding to change it; changes save at once.",
			el,
			{ class: "ed-dev-intro" },
		);
		if (pad) formElement("p", "", el, { "data-pad": "", class: "ed-meter" });
		const table = formElement("div", "", el, { class: "ed-bindings" });
		const kind = pad ? "pad" : "key";
		if (pad) formElement("p", "The left stick moves and the right stick aims; the d-pad holds the map (↑, with the touchpad), the loot labels (←), opens a portal (↓) and uses (→).", table, { class: "ed-about" });
		for (const [a, label] of CONTROL_ACTIONS) {
			if (pad && MOVE_ACTS.includes(a) && !actionCodes(a).some((c) => c.startsWith("Pad"))) continue;   // (the stick moves: no rows of Unbound)
			const row = formElement("div", "", table, { class: "ed-binding" });
			formElement("strong", label, row);
			const group = formElement("div", "", row);
			const codes = actionCodes(a).filter((c) => c.startsWith("Pad") === pad);
			const b = formButton(group, codes.map(codeLabel).join(" / ") || "Unbound", () => beginBinding(a, kind));
			b.setAttribute("aria-label", label + (pad ? " gamepad" : " keyboard / mouse"));
			b.dataset.bind = a + ":" + kind;
			const clear = formButton(group, "Clear", () => {
				CONTROL.bindings[a] = actionCodes(a).filter((c) => c.startsWith("Pad") !== pad);
				applyControls();
				menuRender();
			});
			clear.setAttribute("aria-label", "Clear " + label + " " + kind);
		}
	}
	if (pad) {
		formElement("h3", "Controller", el);
		settingField(el, "glyphs");
		formField(el, "Stick deadzone", "range", CONTROL.deadzone, (v) => {
			CONTROL.deadzone = v;
			applyControls();
		}, { min: 0.05, max: 0.5, step: 0.01 });
		formField(el, "Invert right-stick Y", "checkbox", CONTROL.invertAimY, (v) => {
			CONTROL.invertAimY = v;
			applyControls();
		});
		formField(
			el,
			"Vibration",
			"range",
			game.settings.rumble,
			(v) => game.settings.set("rumble", v),   // the engine's setting (saved with the player's other choices): 0 turns it off
			{ min: 0, max: 1, step: 0.05 },
		);
		formField(el, "Aim assist (controller and keyboard)", "checkbox", CONTROL.aimAssist, (v) => {
			CONTROL.aimAssist = v;
			applyControls();
		});
		const ds = ["padLight", "padTriggers", "gyro", "padSpeaker"].filter((k) => game.settings.spec(k));
		if (ds.length) {
			formElement("h3", "DualSense", el);
			formElement(
				"p",
				"What a DualSense adds: the light bar shows your life, L2 clicks like a stopper while a potion is left, R2 pushes back while its skill waits, gyro aim fine-tunes the right stick, the speaker plays a potion and a pickup. Each works once the controller is allowed in 52in1 Settings.",
				el,
				{ class: "ed-about" },
			);
			for (const k of ds) settingField(el, k);
		}
	}
	if (page === "touch") {
		formField(el, "Touch controls", "select", CONTROL.touch, (v) => {
			CONTROL.touch = v;
			applyControls();
		}, { options: [["auto", "Automatic"], ["on", "Always show"], ["off", "Hidden"]] });
		formField(el, "Action buttons on", "select", CONTROL.handed, (v) => {
			CONTROL.handed = v;
			applyControls();
		}, { options: [["right", "Right"], ["left", "Left"]] });
		formField(el, "Touch button size", "range", CONTROL.size, (v) => {
			CONTROL.size = v;
			applyControls();
		}, { min: 44, max: 72, step: 2 });
		formField(el, "Touch opacity", "range", CONTROL.opacity, (v) => {
			CONTROL.opacity = v;
			applyControls();
		}, { min: 0.3, max: 1, step: 0.05 });
		settingField(el, "assists");
		formElement(
			"p",
			"With Touch assists on, the basic attack swings by itself at a monster in reach (not while you pull away from it), and your aim leans onto the monster nearest the way you run. A controller, the keyboard and the mouse play as before. Swipe a window, a notice or a card away.",
			el,
			{ class: "ed-about" },
		);
	}
	formButton(el, "Reset all controls", () => {
		Object.assign(CONTROL, CONTROL_DEFAULT, { bindings: {} });
		applyControls();
		menuRender();
	});
}
/** one of the engine's settings (game.settings: Button symbols, Touch assists, the DualSense's rows) as a field: a switch
 *  or a choice. A row the player can't change yet (the DualSense not allowed in 52in1) shows disabled, with why */
function settingField(el, key) {
	const S = game.settings,
		sp = S.spec(key);
	if (!sp) return null;
	const lock = typeof sp.locked === "function" ? sp.locked(game) : null;
	const f =
		sp.type === "toggle"
			? formField(el, sp.label, "checkbox", !!S[key], (v) => {
					S.set(key, v);
					menuRender();
				})
			: formField(el, sp.label, "select", S[key], (v) => {
					S.set(key, v);
					menuRender();
				}, { options: (sp.options || []).map((o) => (Array.isArray(o) ? o : [o, String(o)])) });
	if (lock) {
		f.disabled = true;
		formElement("p", lock, el, { class: "ed-about ed-locked" });
	} else if (sp.help) formElement("p", sp.help, el, { class: "ed-about" });
	return f;
}

/* Touch taps hit the same canvas widgets as a mouse. Only open world space starts a stick. */
game.input.touchFilter = (e) => {
	const sc = game.screen,
		pt = sc.clientToScreen(e.clientX, e.clientY),
		m = { x: pt[0] - sc.ix, y: pt[1] - sc.iy };
	return (
		!UI.modal &&
		ED.mode !== "title" &&
		ED.mode !== "gallery" &&
		!UI.hot.some((h) => (h.click || h.drag) && inRect(m, h))
	);
};
UI.fingers = new Set(); // the fingers on the canvas (not the stick's): two or more are a pinch, never a drag
canvas.addEventListener("pointerdown", (e) => {
	if (
		e.pointerType === "mouse" ||
		(game.input.stickId === e.pointerId && game.input.stickOn)
	)
		return;
	UI.fingers.add(e.pointerId);
	UI.mouse.cx = e.clientX;
	UI.mouse.cy = e.clientY;
	UI.mouse.active = true;
	UI.mouse.down = true;
	game.input.press("Act:click");
	canvas.setPointerCapture(e.pointerId);
});
const endTouch = (e) => {
	UI.fingers.delete(e.pointerId);
	if (e.pointerType !== "mouse") {
		game.input.release("Act:click");
		UI.mouse.down = false;
		UI.drag = null;
		UI.mouse.lift = true;   // a finger has no hover: once the step has taken its tap, the pointer leaves (updateUI), so no tooltip stays behind
	}
};
addEventListener("pointerup", endTouch);
addEventListener("pointercancel", endTouch);
function pauseOnFocusLoss() {
	UI.mouse.down = false;
	UI.drag = null;
	if (!UI.modal && ["town", "level", "proving"].includes(ED.mode) && !ED.demo)
		UI.open("pause");
}
addEventListener("blur", pauseOnFocusLoss);
document.addEventListener("visibilitychange", () => {
	if (document.hidden) pauseOnFocusLoss();
});
/* Full screen: the game fills the phone without the browser's bars. On a touch screen, a tap on the title menu asks for
   it (a browser only goes full screen from a tap or a click); FULL SCREEN on the title and in the pause menu turn it
   on and off, and leaving it there is remembered. An iPhone has no full screen for a web page:
   there, Add to Home Screen opens Emberdeep as an app, with no browser bars (the page's web-app tags). */
const FS = {   // the engine's game.fullscreen (new E.Game({ fullscreen: 'button' }): the title's tap decides here, not the engine)
	can: () => game.fullscreen.supported,
	on: () => game.fullscreen.on,
	enter: () => game.fullscreen.enter(),
	exit: () => game.fullscreen.exit(),
	toggle() {
		OPT.fullscreen = !FS.on();
		saveOpts();
		if (OPT.fullscreen) FS.enter();
		else FS.exit();
	},
	/** from a tap on the title menu: a phone or a tablet (a finger is its main pointer) goes full screen unless the
	 *  player left it */
	auto() {
		if (OPT.fullscreen !== false && FS.can() && matchMedia("(pointer: coarse)").matches) FS.enter();
	},
};
for (const ev of ["fullscreenchange", "webkitfullscreenchange"])
	document.addEventListener(ev, () => syncTouchControls(true));
const TOUCH = { el: null, key: "" };
function syncTouchControls(force = false) {
	const show =
		!UI.top()?.dom &&
		(CONTROL.touch === "on" ||
			(CONTROL.touch === "auto" &&
				matchMedia("(any-pointer: coarse)").matches));
	const panel = UI.modal || ED.mode === "title" || ED.mode === "gallery";
	const key = [
		show,
		panel,
		ED.mode,
		CONTROL.size,
		CONTROL.handed,
		CONTROL.opacity,
		FS.on(),
	].join(":");
	if (!force && key === TOUCH.key) {
		touchLook();
		return;
	}
	TOUCH.key = key;
	if (TOUCH.el) {
		for (const b of TOUCH.el.querySelectorAll("[data-act]"))
			game.input.release("Act:" + b.dataset.act);
		TOUCH.el.remove();
	}
	game.input.touchEnabled = show && !panel;
	if (!show) {
		TOUCH.el = null;
		HUD_layout();
		return;
	}
	const root = formElement("div", "", document.getElementById("stage"), {
		class: "ed-touch " + (CONTROL.handed === "left" ? "ed-left" : ""),
	});
	TOUCH.el = root;
	root.style.setProperty("--touch-size", CONTROL.size + "px");
	root.style.setProperty("--touch-opacity", CONTROL.opacity);
	if (!panel) {
		const actions = formElement("div", "", root, { class: "ed-touch-actions" });
		for (const [a, label] of [
			...SLOT_ACTS.map((a, i) => [a, "Skill " + (i + 1)]),
			["dodge", "Dodge"],
			["potion", "Potion"],
			["interact", "Use"],
		])
			formElement("button", label, actions, { type: "button", "data-act": a });
		TOUCH.look = {};
	}
	const bar = formElement("div", "", root, { class: "ed-touch-bar" });
	if (!(ED.mode === "title" && !UI.modal))   // the title's menu is all on the canvas (FULL SCREEN too)
		for (const [a, label] of ED.mode === "gallery" && !UI.modal
		? [
				["menuLeft", "Previous"],
				["menuRight", "Next"],
				["menuDown", "Reel"],
				["confirm", "Replay"],
				["labels", "Slow"],
				["pause", "Back"],
			]
		: panel
			? [["pause", "Back"]]
			: [
					["pause", "Menu"],
					["bag", "Bag"],
					["map", "Map"],
					["portal", "Portal"],
				])
		formElement("button", label, bar, { type: "button", "data-act": a });
	game.input.bindButtons(root);
	TOUCH.look = {};
	touchLook();
	HUD_layout();
}
/** the touch buttons as the moment changes (each step; a button is touched only when what it shows changes): a skill
 *  button names the skill in its slot (an empty slot's stays hidden, holding its place), dims while it cools or Ember is
 *  short; Use pops up only where there is something to use, saying what (TRADE, TALK, TRAVEL, EXECUTE, PICK UP: UI.promptVerb);
 *  Potion counts what is left; Portal shows only where one can open (a depth, the Proving Grounds) */
function touchLook() {
	const root = TOUCH.el,
		h = ED.hero,
		was = TOUCH.look || (TOUCH.look = {});
	if (!root || !h) return;
	for (const b of root.querySelectorAll("[data-act]")) {
		const a = b.dataset.act,
			i = SLOT_ACTS.indexOf(a);
		let text = null, hide = false, gone = false, dim = false;
		if (i >= 0) {
			const id = h.slots[i], S = id && REG.skills[id];
			hide = !S;
			text = S ? S.name : "";
			dim = !!S && (h.cds[id] > 0 || h.ember < skillCost(h, S));
		} else if (a === "interact") {
			hide = !UI.promptVerb || UI.modal;
			text = UI.promptVerb || "Use";
		} else if (a === "potion") {
			text = "Potion " + h.potions;
			dim = h.potions <= 0;
		} else if (a === "portal" && b.parentElement.classList.contains("ed-touch-bar")) gone = ED.mode !== "level" && ED.mode !== "proving";
		const k = [text, hide, gone, dim].join("|");
		if (was[a] === k) continue;
		was[a] = k;
		if (text !== null && b.textContent !== text) b.textContent = text;
		b.style.visibility = hide ? "hidden" : "";
		b.style.display = gone ? "none" : "";
		b.classList.toggle("dim", dim);
		if ((hide || gone) && b.classList.contains("on")) {   // (gone from under a finger: let go)
			b.classList.remove("on");
			game.input.release("Act:" + a);
		}
	}
}
/* The HUD's frame (UI.frame, in screen pixels) on a phone. The safe areas first: the picture fills the whole screen,
   under the notch, the status bar and the home bar, and the HUD keeps out of them. Then the touch buttons: held
   upright, the action buttons take the bottom of the screen and the HUD bar (orbs, skills, xp) rides just above them;
   on a wide screen they stand in the ember orb's corner, above the HUD bar. The buttons at the top push the minimap,
   the boss bar and the notices down (barB). Runs when the buttons change and when the screen does. */
const SAFE = formElement("div", "", document.body, { "aria-hidden": "true" });
SAFE.style.cssText =
	"position:fixed;inset:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)";
function HUD_layout() {
	const sc = game.screen,
		F = UI.frame,
		rc = canvas.getBoundingClientRect(),
		cs = getComputedStyle(SAFE),
		pad = (v) => parseFloat(v) || 0;
	if (!(rc.width > 0 && rc.height > 0)) return;
	// page (CSS) pixels to screen pixels and back
	const sx = (x) => ((x - rc.left) * sc.dpr - sc.OX) / sc.S,
		sy = (y) => ((y - rc.top) * sc.dpr - sc.OY) / sc.S,
		py = (y) => rc.top + (y * sc.S + sc.OY) / sc.dpr;
	F.l = Math.max(0, Math.ceil(sx(rc.left + pad(cs.paddingLeft))));
	F.r = Math.max(0, Math.ceil(sc.W - sx(rc.right - pad(cs.paddingRight))));
	F.t = Math.max(0, Math.ceil(sy(rc.top + pad(cs.paddingTop))));
	F.b = Math.max(0, Math.ceil(sc.H - sy(rc.bottom - pad(cs.paddingBottom))));
	const acts = TOUCH.el && TOUCH.el.querySelector(".ed-touch-actions"),
		bar = TOUCH.el && TOUCH.el.querySelector(".ed-touch-bar"),
		tall = rc.height > rc.width;
	F.barB = bar && bar.childElementCount ? Math.max(0, Math.ceil(sy(bar.getBoundingClientRect().bottom))) : 0;
	F.barL = bar && bar.childElementCount ? Math.floor(sx(bar.getBoundingClientRect().left)) : 0;   // (where they begin: a full-screen panel's top row ends before it)
	if (acts) {
		acts.style.removeProperty("--touch-size");
		if (tall) {
			acts.style.bottom = "max(10px, env(safe-area-inset-bottom, 0px))";
			F.b = Math.max(F.b, Math.ceil(sc.H - sy(acts.getBoundingClientRect().top) + 3));
		} else {
			acts.style.bottom =
				Math.max(8, Math.ceil(rc.bottom - py(sc.H - F.b - 42))) + "px";   // the orbs reach 39 px up
			// a short wide screen (a phone on its side, a notch and a home bar taking their share): smaller buttons, so
			// the grid fits between the minimap and the HUD bar (the menu buttons and the minimap stay on the right for
			// either hand; a left hand's grid has the left side to itself)
			const a = acts.getBoundingClientRect(),
				mapB = py(F.t + HUD_under() + 4 + 54) + 4;
			if (CONTROL.handed !== "left" && a.top < mapB)
				acts.style.setProperty("--touch-size", Math.max(44, Math.floor((a.bottom - mapB - 10) / 3)) + "px");
		}
	}
	// in play the hero sits in the middle of the open ground between them (kept while a panel is up, so the view holds
	// still); the title and the gallery frame their own scenes
	if (!["town", "level", "proving"].includes(ED.mode)) game.cam.offset = null;
	else if (acts || !TOUCH.el) game.cam.offset = [Math.round((F.l - F.r) / 2), Math.round((Math.max(F.t, acts && tall ? F.barB : 0) - F.b) / 2)];
}
game.screen.listeners.push(HUD_layout);
applyControls(false);
