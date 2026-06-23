"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
function emit(level, message, data) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...data,
    };
    const line = JSON.stringify(entry);
    if (level === "error") {
        process.stderr.write(line + "\n");
    }
    else {
        process.stdout.write(line + "\n");
    }
}
exports.logger = {
    info: (msg, data) => emit("info", msg, data),
    warn: (msg, data) => emit("warn", msg, data),
    error: (msg, data) => emit("error", msg, data),
};
//# sourceMappingURL=logger.js.map