// check if it is object
export function isObject(a) {
  return a !== null && typeof a === 'object';
}

// check if it is number
export function isNumber(n) {
  return typeof n === 'number';
}

// check if it is string
export function isString(s) {
  return typeof s === 'string';
}

// check if it is array buffer view
export function isArrayBufferView(value) {
  return value
    && value.buffer instanceof ArrayBuffer
    && value.byteLength !== undefined;
}

// convert ArrayBuffer to String
export function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}

// convert String to ArrayBuffer
export function str2ab(str) {
  var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

// ensure arg is string
export function ensureStr(s) {
  if (typeof s !== 'string') {
    throw 'Wrong argument, string required';
  }
}

// ensure two args are string
export function ensureStr2(s, s2) {
  if (typeof s !== 'string' || typeof s2 !== 'string') {
    throw 'Wrong argument, string required';
  }
}

// ensure one parameter is positive integer number
export function ensureInt(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw 'Wrong argument, positive integer required';
  }
}

// ensure one parameter is positive or negative integer number
export function ensureIntOrNeg(n) {
  if (!Number.isInteger(n)) {
    throw 'Wrong argument, integer required';
  }
}
