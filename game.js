import { makeFact, orderSize } from "./facts.js?v=3";
import { makeSound } from "./sound.js?v=4";

const $ = id => document.getElementById(id);
const key = "multiplication-bakery:progress";
const play = makeSound($("sound"), "multiplication-bakery:muted");
const hint = $("hint");
const model = $("model");
const choices = $("choices");
const feedback = $("feedback");
const workbench = document.querySelector(".workbench");
const reset = $("reset-dialog");
const recipes = ["chip", "lemon", "berry", "jam"];
const layouts = [
  { id: "tray", title: "מגש האפייה", unit: "שורה", groups: "שורות" },
  { id: "boxes", title: "קופסאות למשלוח", unit: "קופסה", groups: "קופסאות" },
  { id: "shelves", title: "מדפי הוויטרינה", unit: "מדף", groups: "מדפים" }
];

let saved = {};
try { saved = JSON.parse(localStorage.getItem(key)) || {}; } catch {}
let level = Number.isSafeInteger(saved.level) && saved.level >= 1 ? saved.level : 1;
const mistakes = Object.assign(Object.create(null), saved.mistakes);
let solved = Number.isSafeInteger(saved.solved) && saved.solved >= 0 && saved.solved < orderSize(level)
  ? saved.solved
  : 0;
let previous;
let fact;
let locked = false;
let advanceTimer;
let flavor = 0;

function save(next = level) {
  try {
    localStorage.setItem(key, JSON.stringify({ level: next, solved: next === level ? solved : 0, mistakes }));
  } catch {}
}

function progress() {
  const size = orderSize(level);
  $("level").textContent = "מגש " + level;
  $("tally").textContent = solved + " מתוך " + size;
  $("progress").max = size;
  $("progress").value = solved;
}

function renderModel(visible) {
  model.hidden = !visible;
  hint.textContent = visible ? "להסתיר עוגיות" : "לראות עוגיות";
  hint.setAttribute("aria-expanded", String(visible));
}

function makeCookies() {
  const layout = layouts[(level - 1 + solved) % layouts.length];
  const shape = recipes[flavor];
  const label = document.createElement("p");
  label.className = "model-title";
  label.textContent = layout.title;
  model.dataset.layout = layout.id;

  const grid = document.createElement("div");
  grid.className = "cookie-grid";
  grid.style.setProperty("--columns", layout.id === "boxes" ? Math.min(5, fact.b) : fact.b);
  const groupCount = fact.a === 1 ? "קבוצה אחת" : fact.a + " " + layout.groups;
  if (fact.operation === "division") {
    grid.setAttribute("role", "img");
    const cookiesPerGroup = fact.b === 1 ? "עוגייה אחת" : fact.b + " עוגיות";
    grid.setAttribute("aria-label", groupCount + ", " + cookiesPerGroup + " בכל " + layout.unit);
  } else {
    grid.setAttribute("aria-hidden", "true");
  }
  for (let group = 0; group < fact.a; group++) {
    const row = document.createElement("div");
    row.className = "cookie-group";
    for (let index = 0; index < fact.b; index++) {
      const cookie = document.createElement("img");
      cookie.className = "cookie";
      cookie.src = "assets/cookie-" + shape + ".webp";
      cookie.alt = "";
      cookie.draggable = false;
      row.append(cookie);
    }
    grid.append(row);
  }
  const caption = document.createElement("p");
  caption.className = "cookie-caption";
  if (fact.operation === "division") {
    const total = fact.product === 1 ? "עוגייה אחת" : fact.product + " עוגיות";
    const arrangement = fact.a === 1 ? "שמים " + total + " בקבוצה אחת" : "מחלקים " + total + " ל־" + groupCount;
    caption.textContent = arrangement + ". כמה עוגיות יש בכל " + layout.unit + "?";
  } else if (fact.missing === "a") {
    caption.textContent = "ספרו כמה " + layout.groups + " יש.";
  } else if (fact.missing === "b") {
    caption.textContent = "ספרו כמה עוגיות יש בכל " + layout.unit + ".";
  } else {
    caption.textContent = fact.a + " " + layout.groups + ", " + fact.b + " עוגיות בכל " + layout.unit;
  }
  model.replaceChildren(label, grid, caption);
}

function newOrder() {
  fact = makeFact(level, solved, previous, mistakes);
  previous = fact.key;
  locked = false;
  flavor = (level - 1 + solved) % recipes.length;
  workbench.dataset.flavor = recipes[flavor];
  feedback.textContent = "";
  const equation = fact.operation === "division" ? [fact.product, "÷", fact.a, "=", "?"]
    : [fact.missing === "a" ? "?" : fact.a, "×", fact.missing === "b" ? "?" : fact.b,
      "=", fact.missing === "product" ? "?" : fact.product];
  $("problem").textContent = equation.join(" ");
  makeCookies();
  renderModel(false);
  choices.replaceChildren(...fact.options.map(value => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.textContent = value;
    button.addEventListener("click", () => choose(value, button));
    return button;
  }));
}

function choose(value, button) {
  if (locked || button.classList.contains("wrong")) return;
  if (value !== fact.answer) {
    mistakes[fact.key] = Math.min(5, (mistakes[fact.key] || 0) + 1);
    save();
    button.classList.add("wrong");
    button.setAttribute("aria-disabled", "true");
    feedback.textContent = "נסו תשובה אחרת. העוגיות יכולות לעזור.";
    play("retry");
    return;
  }

  locked = true;
  const focused = document.activeElement === button;
  if (mistakes[fact.key]) mistakes[fact.key]--;
  solved++;
  progress();
  button.classList.add("correct");
  for (const option of choices.children) option.setAttribute("aria-disabled", "true");
  feedback.textContent = fact.operation === "division"
    ? "נכון! " + fact.product + " לחלק ל־" + fact.a + " שווה " + fact.b
    : "נכון! " + fact.a + " כפול " + fact.b + " שווה " + fact.product;
  const complete = solved === orderSize(level);
  play(complete ? "ready" : "correct", flavor);
  save(complete ? level + 1 : level);
  advanceTimer = setTimeout(() => {
    if (complete) {
      $("order").hidden = true;
      $("ready").hidden = false;
      $("ready-text").textContent = "המגש הבא מחכה עם " + orderSize(level + 1) + " תרגילים.";
      if (focused) $("next").focus({ preventScroll: true });
    } else {
      newOrder();
      if (focused) choices.firstElementChild.focus({ preventScroll: true });
    }
  }, 620);
}

hint.addEventListener("click", () => {
  const opening = model.hidden;
  renderModel(opening);
  play(opening ? "hint-open" : "hint-close");
});

$("restart").addEventListener("click", () => {
  reset.returnValue = "";
  reset.showModal();
});
reset.addEventListener("close", () => {
  if (reset.returnValue !== "restart") return;
  clearTimeout(advanceTimer);
  level = 1;
  solved = 0;
  previous = undefined;
  for (const key of Object.keys(mistakes)) delete mistakes[key];
  save();
  $("ready").hidden = true;
  $("order").hidden = false;
  progress();
  newOrder();
});
$("next").addEventListener("click", () => {
  level++;
  solved = 0;
  $("ready").hidden = true;
  $("order").hidden = false;
  progress();
  newOrder();
  choices.firstElementChild.focus({ preventScroll: true });
});
progress();
newOrder();
