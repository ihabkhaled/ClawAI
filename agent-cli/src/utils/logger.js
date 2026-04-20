const COLORS = {
  reset: '\u001B[0m',
  red: '\u001B[31m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  blue: '\u001B[34m',
  dim: '\u001B[2m',
};

function color(level, text) {
  if (process.env.NO_COLOR === '1') return text;
  return `${COLORS[level] ?? ''}${text}${COLORS.reset}`;
}

export function info(message) {
  console.log(color('blue', `ℹ  ${message}`));
}

export function success(message) {
  console.log(color('green', `✔  ${message}`));
}

export function warn(message) {
  console.warn(color('yellow', `⚠  ${message}`));
}

export function error(message) {
  console.error(color('red', `✖  ${message}`));
}

export function dim(message) {
  console.log(color('dim', message));
}

export function json(obj) {
  console.log(JSON.stringify(obj, null, 2));
}
