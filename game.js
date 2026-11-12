import { makeFact, orderSize } from "./facts.js";
import { makeSound } from "./sound.js";

const $ = id => document.getElementById(id);
const key = "multiplication-bakery:progress";
const play = makeSound($("sound"), "multiplication-bakery:muted");
const hint = $("hint");
const model = $("model");
const choices = $("choices");
const feedback = $("feedback");

let saved = {};
try { saved = JSON.parse(localStorage.getItem(key)) || {}; } catch {}
let level = Number.isSafeInteger(saved.level) && saved.level >= 1 ? saved.level : 1;
const mistakes = Object.assign(Object.create(null), saved.mistakes);
let solved = 0;
let previous;
let fact;
let locked = false;

function save(next = level) {
  try { localStorage.setItem(key, JSON.stringify({ level: next, mistakes })); } catch {}
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
  const grid = document.createElement("div");
  grid.className = "cookie-grid";
  grid.style.setProperty("--columns", fact.b);
  grid.setAttribute("aria-hidden", "true");
  for (let index = 0; index < fact.product; index++) {
    const cookie = document.createElement("span");
    cookie.className = "cookie";
    cookie.textContent = "✦";
    grid.append(cookie);
  }
  const caption = document.createElement("p");
  caption.className = "cookie-caption";
  caption.textContent = fact.missing === "a" ? "ספרו כמה שורות יש במגש."
    : fact.missing === "b" ? "ספרו כמה עוגיות יש בכל שורה."
    : fact.a + " שורות, " + fact.b + " עוגיות בכל שורה";
  model.replaceChildren(grid, caption);
}

function newOrder() {
  fact = makeFact(level, solved, previous, mistakes);
  previous = fact.key;
  locked = false;
  feedback.textContent = "";
  const equation = [fact.missing === "a" ? "?" : fact.a, "×", fact.missing === "b" ? "?" : fact.b,
    "=", fact.missing === "product" ? "?" : fact.product];
  $("problem").textContent = equation.join(" ");
  makeCookies();
  renderModel(level <= 2);
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
    play([330, 294], .055);
    return;
  }

  locked = true;
  const focused = document.activeElement === button;
  if (mistakes[fact.key]) mistakes[fact.key]--;
  solved++;
  progress();
  button.classList.add("correct");
  for (const option of choices.children) option.setAttribute("aria-disabled", "true");
  feedback.textContent = "נכון! " + fact.a + " כפול " + fact.b + " שווה " + fact.product;
  play([523, 659, 784], .07);
  const complete = solved === orderSize(level);
  save(complete ? level + 1 : level);
  setTimeout(() => {
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

hint.addEventListener("click", () => renderModel(model.hidden));
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
