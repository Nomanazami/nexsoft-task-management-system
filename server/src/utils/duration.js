export function durationToMs(input) {
  // supports: 15m, 2h, 7d
  const match = /^(\d+)([mhd])$/.exec(String(input).trim());
  if (!match) throw Object.assign(new Error("Invalid duration format"), { statusCode: 500 });
  const value = Number(match[1]);
  const unit = match[2];
  const mult = unit === "m" ? 60e3 : unit === "h" ? 3600e3 : 86400e3;
  return value * mult;
}

