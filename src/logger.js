// logger
class Logger {
  constructor() {
    this.isOn = false;
  }

  enable(isOn) {
    this.isOn = isOn;
  }

  log(msg) {
    if (this.isOn) console.log(msg);
  }

  warn(msg) {
    if (this.isOn) console.warn(msg);
  }

  error(msg) {
    if (this.isOn) console.error(msg);
  }
}

export let logger = new Logger();

export function log(msg) {
  logger.log(msg);
}
