/* Saved bindings, native settings dialogs, and multi-touch controls. */
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
const bindingCode = (c) =>
	typeof c === "string" &&
	/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Tab|Enter|NumpadEnter|Backspace|Mouse[0-4]|Pad([0-9]|1[0-5]))$/.test(
		c,
	);
const RESERVED_KEYS = new Set(["KeyV", "KeyM", "KeyH", "Digit0", "Pad9"]);
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
		const codes = storedControls.bindings && storedControls.bindings[a];
		if (
			Array.isArray(codes) &&
			codes.length <= 12 &&
			codes.every((c) => bindingCode(c) && !RESERVED_KEYS.has(c))
		)
			CONTROL.bindings[a] = [...new Set(codes)];
	}
}
CONTROL.deadzone = clamp(CONTROL.deadzone, 0.05, 0.5);
CONTROL.size = clamp(CONTROL.size, 44, 72);
CONTROL.opacity = clamp(CONTROL.opacity, 0.3, 1);
const PAD_LABELS = [
	"A / Cross",
	"B / Circle",
	"X / Square",
	"Y / Triangle",
	"LB / L1",
	"RB / R1",
	"LT / L2",
	"RT / R2",
	"View / Share",
	"Menu / Options",
	"L stick",
	"R stick",
	"D-pad up",
	"D-pad down",
	"D-pad left",
	"D-pad right",
];
function codeLabel(code) {
	if (/^Pad\d+$/.test(code)) return PAD_LABELS[+code.slice(3)] || code;
	return (
		{
			Mouse0: "LMB",
			Mouse1: "MMB",
			Mouse2: "RMB",
			Mouse3: "Mouse 4",
			Mouse4: "Mouse 5",
			Space: "Space",
			ShiftLeft: "L Shift",
			ShiftRight: "R Shift",
		}[code] || code.replace(/^Key|^Digit/, "").replace(/^Arrow/, "")
	);
}
function actionCodes(a) {
	return CONTROL.bindings[a] || INPUT[a] || [];
}
function actionLabel(a, compact = false) {
	const codes = actionCodes(a),
		pad = game.input.lastDevice === "gamepad";
	const code = codes.find((c) => c.startsWith("Pad") === pad) || codes[0];
	if (compact && code && /^Pad\d+$/.test(code))
		return [
			"A",
			"B",
			"X",
			"Y",
			"LB",
			"RB",
			"LT",
			"RT",
			"View",
			"Menu",
			"L3",
			"R3",
			"Up",
			"Down",
			"Left",
			"Right",
		][+code.slice(3)];
	return code ? codeLabel(code) : "—";
}
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
			". Escape cancels.",
	);
}
function setBinding(code) {
	const c = FORM.capture;
	if (!c) return;
	if (!bindingCode(code) || RESERVED_KEYS.has(code)) {
		formStatus("That input is reserved. Choose another; Escape cancels.");
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
	CONTROL.bindings[c.a] = actionCodes(c.a)
		.filter((k) => k.startsWith("Pad") !== (c.kind === "pad"))
		.concat(code);
	FORM.capture = null;
	applyControls();
	renderControls();
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
		const i = inp.padPrev.findIndex((v, i) => v && !c.prev[i]);
		c.prev = inp.padPrev.slice();
		if (i === 9) cancelBinding();
		else if (i >= 0 && c.kind === "pad") setBinding("Pad" + i);
		return;
	}
	if (inp.pressed("pause") || inp.pressed("cancel")) {
		UI.close();
		return;
	}
	const all = [...el.querySelectorAll("button, input, select")].filter(
			(e) => !e.disabled,
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
		all[ix].click();
	}
}
function renderControls() {
	openForm("Controls", (el) => {
		formElement(
			"p",
			"Rebind keyboard, mouse, and controller buttons. Menu navigation always works with arrows / D-pad / left stick, Enter / A, and Escape / Menu. Backspace / B performs secondary actions in inventory and skill panels.",
			el,
		);
		formElement(
			"p",
			"Mouse aims; left stick moves; right stick aims. Click either stick to interact or open a portal. View / Share opens inventory. Skills and passives are also in the pause menu.",
			el,
		);
		formElement("p", "", el, { "data-pad": "", class: "ed-meter" });
		formElement(
			"p",
			"Choose a binding to change it. Changes save automatically.",
			el,
			{ "data-status": "", role: "status", class: "ed-status" },
		);
		const table = formElement("div", "", el, { class: "ed-bindings" });
		for (const [a, label] of CONTROL_ACTIONS) {
			const row = formElement("div", "", table, { class: "ed-binding" });
			formElement("strong", label, row);
			for (const kind of ["key", "pad"]) {
				const group = formElement("div", "", row);
				const codes = actionCodes(a).filter(
					(c) => c.startsWith("Pad") === (kind === "pad"),
				);
				const b = formButton(
					group,
					codes.map(codeLabel).join(" / ") || "Unbound",
					() => beginBinding(a, kind),
				);
				b.setAttribute(
					"aria-label",
					label + (kind === "key" ? " keyboard / mouse" : " gamepad"),
				);
				b.dataset.bind = a + ":" + kind;
				const clear = formButton(group, "Clear", () => {
					CONTROL.bindings[a] = actionCodes(a).filter(
						(c) => c.startsWith("Pad") !== (kind === "pad"),
					);
					applyControls();
					renderControls();
				});
				clear.setAttribute("aria-label", "Clear " + label + " " + kind);
			}
		}
		formElement("h3", "Controller & touch", el);
		formField(
			el,
			"Stick deadzone",
			"range",
			CONTROL.deadzone,
			(v) => {
				CONTROL.deadzone = v;
				applyControls();
			},
			{ min: 0.05, max: 0.5, step: 0.01 },
		);
		formField(
			el,
			"Invert right-stick Y",
			"checkbox",
			CONTROL.invertAimY,
			(v) => {
				CONTROL.invertAimY = v;
				applyControls();
			},
		);
		formField(
			el,
			"Aim assist for sticks / touch",
			"checkbox",
			CONTROL.aimAssist,
			(v) => {
				CONTROL.aimAssist = v;
				applyControls();
			},
		);
		formField(
			el,
			"Touch controls",
			"select",
			CONTROL.touch,
			(v) => {
				CONTROL.touch = v;
				applyControls();
			},
			{
				options: [
					["auto", "Automatic"],
					["on", "Always show"],
					["off", "Hidden"],
				],
			},
		);
		formField(
			el,
			"Action buttons on",
			"select",
			CONTROL.handed,
			(v) => {
				CONTROL.handed = v;
				applyControls();
			},
			{
				options: [
					["right", "Right"],
					["left", "Left"],
				],
			},
		);
		formField(
			el,
			"Touch button size",
			"range",
			CONTROL.size,
			(v) => {
				CONTROL.size = v;
				applyControls();
			},
			{ min: 44, max: 72, step: 2 },
		);
		formField(
			el,
			"Touch opacity",
			"range",
			CONTROL.opacity,
			(v) => {
				CONTROL.opacity = v;
				applyControls();
			},
			{ min: 0.3, max: 1, step: 0.05 },
		);
		formButton(el, "Reset all controls", () => {
			Object.assign(CONTROL, CONTROL_DEFAULT, { bindings: {} });
			applyControls();
			renderControls();
		});
	});
}
UI.def("controls", {
	dom: true,
	captureKeys: true,
	open: renderControls,
	close: closeForm,
	update: updateForm,
});

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
canvas.addEventListener("pointerdown", (e) => {
	if (
		e.pointerType === "mouse" ||
		(game.input.stickId === e.pointerId && game.input.stickOn)
	)
		return;
	UI.mouse.cx = e.clientX;
	UI.mouse.cy = e.clientY;
	UI.mouse.active = true;
	UI.mouse.down = true;
	game.input.press("Act:click");
	canvas.setPointerCapture(e.pointerId);
});
const endTouch = (e) => {
	if (e.pointerType !== "mouse") {
		game.input.release("Act:click");
		UI.mouse.down = false;
		UI.drag = null;
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
	].join(":");
	if (!force && key === TOUCH.key) return;
	TOUCH.key = key;
	if (TOUCH.el) {
		for (const b of TOUCH.el.querySelectorAll("[data-act]"))
			game.input.release("Act:" + b.dataset.act);
		TOUCH.el.remove();
	}
	game.input.touchEnabled = show && !panel;
	if (!show) {
		TOUCH.el = null;
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
	}
	const bar = formElement("div", "", root, { class: "ed-touch-bar" });
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
}
applyControls(false);
