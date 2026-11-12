const tables = [1, 2, 5, 10, 3, 4, 6, 7, 8, 9];

export function orderSize(level) {
  if (level <= 9) return 4 + Math.ceil(level / 2);
  return level + 1;
}

export function shuffle(values, random = Math.random) {
  for (let index = values.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [values[index], values[other]] = [values[other], values[index]];
  }
  return values;
}

export function makeFact(level, solved, previous, mistakes, random = Math.random) {
  const unlocked = tables.slice(0, level + 1);
  const focus = level <= 9 ? unlocked.at(-1) : null;
  const candidates = [];
  let weightSum = 0;
  for (const a of unlocked) {
    for (let b = 1; b <= Math.min(4 + level, 10); b++) {
      const key = a + "x" + b;
      if (key === previous) continue;
      weightSum += 1 + (a === focus ? 3 : 0) + Math.min(5, mistakes[key] || 0) * 2;
      candidates.push({ a, b, key, threshold: weightSum });
    }
  }

  const pick = random() * weightSum;
  const fact = candidates.find(candidate => candidate.threshold > pick);
  let { a, b } = fact;
  if (level >= 4 && random() < .44) [a, b] = [b, a];
  const missing = level >= 6 && (solved + level) % (level >= 10 ? 2 : 3) === 0
    ? (random() < .5 ? "a" : "b")
    : "product";
  const product = a * b;
  const answer = missing === "a" ? a : missing === "b" ? b : product;
  const limit = missing === "product" ? 100 : 10;
  const near = missing === "product"
    ? [product-a, product+a, product-b, product+b, product-2, product+2, a+b]
    : [answer-1, answer+1, answer-2, answer+2, answer-3, answer+3];
  const options = new Set([answer]);
  for (const value of shuffle(near, random)) {
    if (value >= 1 && value <= limit) options.add(value);
    if (options.size === 4) break;
  }
  for (let offset = 1; options.size < 4; offset++) {
    if (answer + offset <= limit) options.add(answer + offset);
    if (options.size < 4 && answer - offset >= 1) options.add(answer - offset);
  }

  return { a, b, key: fact.key, missing, answer, product, options: shuffle([...options], random) };
}
