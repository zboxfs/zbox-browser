const TRACE = 1;
const DEBUG = 2;
const INFO = 3;
const WARN = 4;
const ERROR = 5;
const OFF = 99;

// post log message to main thread
function postLogMsg(level, msg, from) {
  postMessage({
    scope: 'log',
    level,
    msg: `${msg}`,
    from: from || 'worker.js'
  });
}

// worker logger
class WorkerLogger {
  constructor(level) {
    this.level = level || WARN;
  }

  setLevel(level) {
    switch (level) {
      case 'trace': this.level = TRACE; return level;
      case 'debug': this.level = DEBUG; return level;
      case 'info': this.level = INFO; return level;
      case 'warn': this.level = WARN; return level;
      case 'error': this.level = ERROR; return level;
      case 'off': this.level = OFF; return level;
      default: this.level = WARN; return 'warn';
    }
  }

  trace(msg, from) {
    if (this.level <= TRACE) postLogMsg('trace', msg, from);
  }

  debug(msg, from) {
    if (this.level <= DEBUG) postLogMsg('debug', msg, from);
  }

  info(msg, from) {
    if (this.level <= INFO) postLogMsg('info', msg, from);
  }

  warn(msg, from) {
    if (this.level <= WARN) postLogMsg('warn', msg, from);
  }

  error(msg, from) {
    if (this.level <= ERROR) postLogMsg('error', msg, from);
  }
}

export let logger = new WorkerLogger();

// --------------------------
// export functions for wasm
// --------------------------
export function log(lvl, file, line, msg) {
  // suppress common prefix in file name
  const idx = file.lastIndexOf('/src/');
  const from = `${file.substring(idx + 5)}:${line}`;

  switch (lvl) {
    case 'ERROR':
      logger.error(msg, from);
      break;
    case 'WARN':
      logger.warn(msg, from);
      break;
    case 'INFO':
      logger.info(msg, from);
      break;
    case 'DEBUG':
      logger.debug(msg, from);
      break;
    case 'TRACE':
      logger.trace(msg, from);
      break;
  }
}
