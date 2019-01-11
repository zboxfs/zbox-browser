/* tslint:disable */
import * as wasm from './zbox_bg';

const lTextDecoder = typeof TextDecoder === 'undefined' ? require('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8');

let cachegetUint8Memory = null;
function getUint8Memory() {
    if (cachegetUint8Memory === null || cachegetUint8Memory.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory;
}

function getStringFromWasm(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory().subarray(ptr, ptr + len));
}

export function __wbg_log_b0a2841514986cd0(arg0, arg1) {
    let varg0 = getStringFromWasm(arg0, arg1);
    console.log(varg0);
}
/**
* @param {number} arg0
* @returns {number}
*/
export function malloc(arg0) {
    return wasm.malloc(arg0);
}

/**
* @param {number} arg0
* @param {number} arg1
* @returns {number}
*/
export function calloc(arg0, arg1) {
    return wasm.calloc(arg0, arg1);
}

/**
* @param {number} arg0
* @returns {void}
*/
export function free(arg0) {
    return wasm.free(arg0);
}

/**
* @returns {number}
*/
export function __errno_location() {
    return wasm.__errno_location();
}

/**
* @param {number} arg0
* @returns {number}
*/
export function strlen(arg0) {
    return wasm.strlen(arg0);
}

/**
* @param {number} arg0
* @param {number} arg1
* @returns {number}
*/
export function strchr(arg0, arg1) {
    return wasm.strchr(arg0, arg1);
}

/**
* @param {number} arg0
* @param {number} arg1
* @param {number} arg2
* @returns {number}
*/
export function strncmp(arg0, arg1, arg2) {
    return wasm.strncmp(arg0, arg1, arg2);
}

/**
* @returns {number}
*/
export function js_random_uint32() {
    return wasm.js_random_uint32();
}

/**
* @param {number} arg0
* @param {number} arg1
* @param {number} arg2
* @returns {number}
*/
export function emscripten_asm_const_int(arg0, arg1, arg2) {
    return wasm.emscripten_asm_const_int(arg0, arg1, arg2);
}

/**
* @param {number} arg0
* @param {number} arg1
* @param {number} arg2
* @param {number} arg3
* @returns {void}
*/
export function __assert_fail(arg0, arg1, arg2, arg3) {
    return wasm.__assert_fail(arg0, arg1, arg2, arg3);
}

/**
* @returns {void}
*/
export function abort() {
    return wasm.abort();
}

/**
* @returns {void}
*/
export function init_env() {
    return wasm.init_env();
}

const lTextEncoder = typeof TextEncoder === 'undefined' ? require('util').TextEncoder : TextEncoder;

let cachedTextEncoder = new lTextEncoder('utf-8');

let WASM_VECTOR_LEN = 0;

function passStringToWasm(arg) {

    const buf = cachedTextEncoder.encode(arg);
    const ptr = wasm.__wbindgen_malloc(buf.length);
    getUint8Memory().set(buf, ptr);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
}

const heap = new Array(32);

heap.fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

function getArrayU8FromWasm(ptr, len) {
    return getUint8Memory().subarray(ptr / 1, ptr / 1 + len);
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

let cachegetUint32Memory = null;
function getUint32Memory() {
    if (cachegetUint32Memory === null || cachegetUint32Memory.buffer !== wasm.memory.buffer) {
        cachegetUint32Memory = new Uint32Array(wasm.memory.buffer);
    }
    return cachegetUint32Memory;
}

export function __widl_f_get_random_values_with_u8_array_Crypto(arg0, arg1, arg2, exnptr) {
    let varg1 = getArrayU8FromWasm(arg1, arg2);
    try {
        return addHeapObject(getObject(arg0).getRandomValues(varg1));
    } catch (e) {
        const view = getUint32Memory();
        view[exnptr / 4] = 1;
        view[exnptr / 4 + 1] = addHeapObject(e);

    }
}

export function __widl_instanceof_WorkerGlobalScope(idx) {
    return getObject(idx) instanceof WorkerGlobalScope ? 1 : 0;
}

export function __widl_f_crypto_WorkerGlobalScope(arg0, exnptr) {
    try {
        return addHeapObject(getObject(arg0).crypto);
    } catch (e) {
        const view = getUint32Memory();
        view[exnptr / 4] = 1;
        view[exnptr / 4 + 1] = addHeapObject(e);

    }
}

export function __widl_f_new_XMLHttpRequest(exnptr) {
    try {
        return addHeapObject(new XMLHttpRequest());
    } catch (e) {
        const view = getUint32Memory();
        view[exnptr / 4] = 1;
        view[exnptr / 4 + 1] = addHeapObject(e);

    }
}

export function __widl_f_get_all_response_headers_XMLHttpRequest(ret, arg0, exnptr) {
    try {

        const retptr = passStringToWasm(getObject(arg0).getAllResponseHeaders());
        const retlen = WASM_VECTOR_LEN;
        const mem = getUint32Memory();
        mem[ret / 4] = retptr;
        mem[ret / 4 + 1] = retlen;

    } catch (e) {
        const view = getUint32Memory();
        view[exnptr / 4] = 1;
        view[exnptr / 4 + 1] = addHeapObject(e);

    }
}

export function __widl_f_open_with_async_XMLHttpRequest(arg0, arg1, arg2, arg3, arg4, arg5, exnptr) {
    let varg1 = getStringFromWasm(arg1, arg2);
    let varg3 = getStringFromWasm(arg3, arg4);
    try {
        getObject(arg0).open(varg1, varg3, arg5 !== 0);
    } catch (e) {
        const view = getUint32Memory();
        view[exnptr / 4] = 1;
        view[exnptr / 4 + 1] = addHeapObject(e);

    }
}

export function __widl_f_send_XMLHttpRequest(arg0, exnptr) {
    try {
        getObject(arg0).send();
    } catch (e) {
        const view = getUint32Memory();
        view[exnptr / 4] = 1;
        view[exnptr / 4 + 1] = addHeapObject(e);

    }
}

export function __widl_f_send_with_opt_buffer_source_XMLHttpRequest(arg0, arg1, exnptr) {
    try {
        getObject(arg0).send(getObject(arg1));
    } catch (e) {
        const view = getUint32Memory();
        view[exnptr / 4] = 1;
        view[exnptr / 4 + 1] = addHeapObject(e);

    }
}

export function __widl_f_ready_state_XMLHttpRequest(arg0) {
    return getObject(arg0).readyState;
}

export function __widl_f_set_timeout_XMLHttpRequest(arg0, arg1) {
    getObject(arg0).timeout = arg1;
}

export function __widl_f_status_XMLHttpRequest(arg0, exnptr) {
    try {
        return getObject(arg0).status;
    } catch (e) {
        const view = getUint32Memory();
        view[exnptr / 4] = 1;
        view[exnptr / 4 + 1] = addHeapObject(e);

    }
}

export function __widl_f_set_response_type_XMLHttpRequest(arg0, arg1) {
    getObject(arg0).responseType = takeObject(arg1);
}

export function __widl_f_response_XMLHttpRequest(arg0, exnptr) {
    try {
        return addHeapObject(getObject(arg0).response);
    } catch (e) {
        const view = getUint32Memory();
        view[exnptr / 4] = 1;
        view[exnptr / 4 + 1] = addHeapObject(e);

    }
}

export function __widl_f_debug_4_(arg0, arg1, arg2, arg3) {
    console.debug(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
}

export function __widl_f_error_1_(arg0) {
    console.error(getObject(arg0));
}

export function __widl_f_error_4_(arg0, arg1, arg2, arg3) {
    console.error(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
}

export function __widl_f_info_4_(arg0, arg1, arg2, arg3) {
    console.info(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
}

export function __widl_f_log_4_(arg0, arg1, arg2, arg3) {
    console.log(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
}

export function __widl_f_warn_4_(arg0, arg1, arg2, arg3) {
    console.warn(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
}

export function __wbg_newnoargs_a6ad1b52f5989ea9(arg0, arg1) {
    let varg0 = getStringFromWasm(arg0, arg1);
    return addHeapObject(new Function(varg0));
}

export function __wbg_call_720151a19a4c6808(arg0, arg1, exnptr) {
    try {
        return addHeapObject(getObject(arg0).call(getObject(arg1)));
    } catch (e) {
        const view = getUint32Memory();
        view[exnptr / 4] = 1;
        view[exnptr / 4 + 1] = addHeapObject(e);

    }
}

export function __wbg_new_d90640b4228ff695(arg0) {
    return addHeapObject(new Uint8Array(getObject(arg0)));
}

export function __wbg_newwithbyteoffset_f1da1a70b7f3e2a0(arg0, arg1) {
    return addHeapObject(new Uint8Array(getObject(arg0), arg1));
}

export function __wbg_newwithbyteoffsetandlength_288ba536f23a7477(arg0, arg1, arg2) {
    return addHeapObject(new Uint8Array(getObject(arg0), arg1, arg2));
}

export function __wbg_length_cece07c643f59431(arg0) {
    return getObject(arg0).length;
}

export function __wbg_byteLength_048ab011435fc456(arg0) {
    return getObject(arg0).byteLength;
}

export function __wbg_set_17d4223f7634d1e7(arg0, arg1, arg2) {
    getObject(arg0).set(getObject(arg1), arg2);
}

export function __wbg_buffer_0346d756c794d630(arg0) {
    return addHeapObject(getObject(arg0).buffer);
}

function freeRepo(ptr) {

    wasm.__wbg_repo_free(ptr);
}
/**
*/
export class Repo {

    free() {
        const ptr = this.ptr;
        this.ptr = 0;
        freeRepo(ptr);
    }

    /**
    * @returns {}
    */
    constructor() {
        this.ptr = wasm.repo_new();
    }
    /**
    * @param {string} arg0
    * @param {string} arg1
    * @returns {void}
    */
    open(arg0, arg1) {
        const ptr0 = passStringToWasm(arg0);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm(arg1);
        const len1 = WASM_VECTOR_LEN;
        try {
            return wasm.repo_open(this.ptr, ptr0, len0, ptr1, len1);

        } finally {
            wasm.__wbindgen_free(ptr0, len0 * 1);
            wasm.__wbindgen_free(ptr1, len1 * 1);

        }

    }
    /**
    * @returns {void}
    */
    close() {
        return wasm.repo_close(this.ptr);
    }
    /**
    * @returns {any}
    */
    static put() {
        return takeObject(wasm.repo_put());
    }
    /**
    * @returns {any}
    */
    static request() {
        return takeObject(wasm.repo_request());
    }
}

export function __wbindgen_object_clone_ref(idx) {
    return addHeapObject(getObject(idx));
}

export function __wbindgen_object_drop_ref(i) { dropObject(i); }

export function __wbindgen_string_new(p, l) {
    return addHeapObject(getStringFromWasm(p, l));
}

export function __wbindgen_number_get(n, invalid) {
    let obj = getObject(n);
    if (typeof(obj) === 'number') return obj;
    getUint8Memory()[invalid] = 1;
    return 0;
}

export function __wbindgen_is_null(idx) {
    return getObject(idx) === null ? 1 : 0;
}

export function __wbindgen_is_undefined(idx) {
    return getObject(idx) === undefined ? 1 : 0;
}

export function __wbindgen_boolean_get(i) {
    let v = getObject(i);
    if (typeof(v) === 'boolean') {
        return v ? 1 : 0;
    } else {
        return 2;
    }
}

export function __wbindgen_is_symbol(i) {
    return typeof(getObject(i)) === 'symbol' ? 1 : 0;
}

export function __wbindgen_string_get(i, len_ptr) {
    let obj = getObject(i);
    if (typeof(obj) !== 'string') return 0;
    const ptr = passStringToWasm(obj);
    getUint32Memory()[len_ptr / 4] = WASM_VECTOR_LEN;
    return ptr;
}

export function __wbindgen_memory() { return addHeapObject(wasm.memory); }

export function __wbindgen_rethrow(idx) { throw takeObject(idx); }

export function __wbindgen_throw(ptr, len) {
    throw new Error(getStringFromWasm(ptr, len));
}

