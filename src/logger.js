const TRACE = 1;
const DEBUG = 2;
const INFO = 3;
const WARN = 4;
const ERROR = 5;
const OFF = 99;

// logger
class Logger {
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

  trace(msg) {
    if (this.level <= TRACE) console.log(msg);
  }

  debug(msg) {
    if (this.level <= DEBUG) console.debug(msg);
  }

  info(msg) {
    if (this.level <= INFO) console.info(msg);
  }

  warn(msg) {
    if (this.level <= WARN) console.warn(msg);
  }

  error(msg) {
    if (this.level <= ERROR) console.error(msg);
  }
}

export let logger = new Logger();
