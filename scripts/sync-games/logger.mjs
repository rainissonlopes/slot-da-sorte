export function createLogger() {
  const events = [];
  const write = (level, message, details) => {
    const event = { at: new Date().toISOString(), level, message, ...(details ? { details } : {}) };
    events.push(event);
    const suffix = details ? ` ${JSON.stringify(details)}` : "";
    console.log(`[sync-games] ${level.toUpperCase()} ${message}${suffix}`);
  };
  return {
    events,
    info: (message, details) => write("info", message, details),
    warn: (message, details) => write("warn", message, details),
    error: (message, details) => write("error", message, details),
  };
}
