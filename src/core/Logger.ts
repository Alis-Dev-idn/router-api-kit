export class Logger {
  static logRequest(
    method: string,
    url: string,
    status: number,
    durationMs: number,
    error?: unknown,
    customHandler?: (level: "info" | "error", message: string, meta: any) => void
  ) {
    const isError = status >= 400;
    const level = isError ? "error" : "info";
    const icon = isError ? "❌" : "✅";
    
    // ANSI Colors
    const reset = "\x1b[0m";
    const methodColor = "\x1b[36m"; // Cyan
    const statusColor = isError ? "\x1b[31m" : "\x1b[32m"; // Red or Green
    const timeColor = "\x1b[90m"; // Gray

    const methodUpper = String(method).toUpperCase();
    const message = `${icon} ${methodColor}[${methodUpper}]${reset} ${url} - ${statusColor}${status}${reset} ${timeColor}(${durationMs}ms)${reset}`;
    
    console.log(message);
    if (isError && error && status >= 500) {
       console.error(error);
    }

    if (customHandler) {
      const cleanMessage = `${icon} [${methodUpper}] ${url} - ${status} (${durationMs}ms)`;
      customHandler(level, cleanMessage, { method: methodUpper, path: url, status, durationMs, error });
    }
  }
}
