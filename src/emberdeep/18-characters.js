/* Playable identities. The original save stays at ed:save; each new character has its own slot. */
const CHARACTERS = {
	wanderer: {
		id: "wanderer",
		name: "Wanderer",
		title: "The emberbound swordsman",
		color: "#6fd6cc",
		desc: "Steel, fire, and a stubborn heart. Chain sword strikes and tumble through danger.",
		style: "Grounded footwork · sword combos · somersault dodge",
		skills: ["blade", "ember"],
		speed: 84,
		acceleration: 1000,
		dodgeTime: 0.27,
		dodgeSpeed: 255,
	},
	codex: {
		id: "codex",
		name: "Codex",
		title: "The Unwritten",
		color: "#9cebdd",
		desc: "A lost archive that wrote itself a soul. An ivory mask, a brass-bound folio, and pages that refuse to fall.",
		style: "Inertial glide · written magic · foldstep dodge",
		skills: [
			"cx_quill",
			"cx_seal",
			"cx_folio",
			"cx_revision",
			"cx_orbit",
			"cx_finale",
		],
		speed: 90,
		acceleration: 620,
		dodgeTime: 0.32,
		dodgeSpeed: 245,
	},
};
const characterId = (id) => (Object.hasOwn(CHARACTERS, id) ? id : "wanderer");
const CHAR = {
	selected: characterId(
		qs.get("character") || E.store.get("ed:character", "wanderer"),
	),
	preview: null,
};
const characterOf = (h) => CHARACTERS[characterId(h && h.character)];
const characterSaveKey = (id = CHAR.selected) =>
	characterId(id) === "codex" ? "ed:save:codex" : "ed:save";
const characterSave = (id = CHAR.selected) =>
	E.store.get(characterSaveKey(id), null);
const skillAvailable = (h, S) =>
	!!S && (!S.character || S.character === characterOf(h).id);
statSource((h, add) => {
	if (h.character !== "codex") return;
	add("ember", 25);
	add("emberRegen", 2);
	add("castSpeed", 10);
});
