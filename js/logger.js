const TRACE = 1;
const DEBUG = 2;
const INFO = 3;
const WARN = 4;
const ERROR = 5;
const OFF = 99;

// log style definitions
const base = 'color: white; padding: 0 3px; width: 4em; display: inline-block; text-align: center; background: ';
const style = {
  lvl: {
    error: base + 'darkred',
    warn: base + 'orange',
    info: base + 'green',
    debug: base + 'blue',
    trace: base + 'gray'
  },
  loc: 'font-weight: bold; color: inherit; opacity: 0.5;',
  msg: 'background: inherit; color: inherit'
};

// console logger
function consoleLogger(level, msg, from) {
  const loc = from || 'index.js';
  const fmt = `[%c${level}%c ${loc}%c] ${msg}`;
  let output;
  switch (level) {
    case 'trace': output = console.log; break;
    case 'debug': output = console.debug; break;
    case 'info': output = console.info; break;
    case 'warn': output = console.warn; break;
    case 'error': output = console.error; break;
    default: output = console.log; break;
  }
  output(fmt, style.lvl[level], style.loc, style.msg);
}

// logger
class Logger {
  constructor() {
    this.level = WARN;
    this.output = null;
  }

  config(opts) {
    let cfg = opts || {};

    const level = cfg.level || 'warn';
    switch (level) {
      case 'trace': this.level = TRACE; break;
      case 'debug': this.level = DEBUG; break;
      case 'info': this.level = INFO; break;
      case 'warn': this.level = WARN; break;
      case 'error': this.level = ERROR; break;
      case 'off': this.level = OFF; break;
      default: this.level = WARN; break;
    }

    this.output = cfg.logger || consoleLogger;
  }

  trace(msg, from) {
    if (this.level <= TRACE) this.output('trace', msg, from);
  }

  debug(msg, from) {
    if (this.level <= DEBUG) this.output('debug', msg, from);
  }

  info(msg, from) {
    if (this.level <= INFO) this.output('info', msg, from);
  }

  warn(msg, from) {
    if (this.level <= WARN) this.output('warn', msg, from);
  }

  error(msg, from) {
    if (this.level <= ERROR) this.output('error', msg, from);
  }
}

export let logger = new Logger();
