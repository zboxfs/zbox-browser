use std::alloc;
use std::ffi::c_void;
use std::mem;
use std::ptr;

use wasm_bindgen::prelude::*;

const ENOMEM: i32 = 12;
const EINVAL: i32 = 22;

#[wasm_bindgen]
pub fn malloc(size: u32) -> u32 {
    let capacity = (8 + size) as usize;
    let mut buf: Vec<u8> = Vec::with_capacity(capacity);
    let len = buf.len();
    let ptr = buf.as_mut_ptr();
    let p = ptr as *mut u32;
    unsafe {
        mem::forget(buf);
        ptr::write(p, len as u32);
        ptr::write(p.add(1), capacity as u32);
        ptr.add(8) as u32
    }
}

#[wasm_bindgen]
pub fn calloc(nmemb: u32, size: u32) -> u32 {
    malloc(nmemb * size)
}

#[wasm_bindgen]
pub fn free(ptr: u32) {
    if ptr == 0 {
        return;
    }
    let p = ptr as *mut u8;
    unsafe {
        let base = p.sub(8) as *mut u32;
        let len = ptr::read(base) as usize;
        let capacity = ptr::read(base.add(1)) as usize;
        let _buf = Vec::from_raw_parts(base, len, capacity);
        // buffer drops here
    }
}

#[wasm_bindgen]
pub fn posix_memalign(
    memptr: *mut *mut c_void,
    alignment: u32,
    size: u32,
) -> i32 {
    const VOID_PTR_SIZE: u32 = mem::size_of::<*mut c_void>() as u32;

    if alignment % VOID_PTR_SIZE == 0
        && (alignment / VOID_PTR_SIZE).is_power_of_two()
    {
        unsafe {
            let ptr = alloc::alloc(
                alloc::Layout::from_size_align(
                    size as usize,
                    alignment as usize,
                )
                .unwrap(),
            ) as *mut c_void;
            if !ptr.is_null() {
                *memptr = ptr;
                0
            } else {
                ENOMEM
            }
        }
    } else {
        EINVAL
    }
}

#[wasm_bindgen]
pub fn sysconf(name: i32) -> i32 {
    match name {
        // only used by libsodium
        // _SC_PAGE_SIZE: i32 = 30;
        30 => 4096,
        _ => -1,
    }
}

#[wasm_bindgen]
pub fn raise(_sig: i32) -> i32 {
    wasm_bindgen::throw_str("raised with signal");
}

#[wasm_bindgen]
pub fn __errno_location() -> i32 {
    0
}

#[wasm_bindgen]
pub fn strlen(s: u32) -> u32 {
    let p = s as *const u8;
    let mut i: usize = 0;
    unsafe {
        while i < std::u32::MAX as usize {
            if *p.add(i) == 0 {
                break;
            }
            i += 1;
        }
    }
    i as u32
}

#[wasm_bindgen]
pub fn strchr(s: u32, c: u32) -> u32 {
    let mut p = s as *const u8;
    let c = c as u8;
    unsafe {
        while *p != 0 {
            if *p == c {
                return p as u32;
            }
            p = p.offset(1);
        }
    }
    0
}

#[wasm_bindgen]
pub fn strncmp(s1: u32, s2: u32, n: u32) -> i32 {
    let s1 =
        unsafe { core::slice::from_raw_parts(s1 as *const u8, n as usize) };
    let s2 =
        unsafe { core::slice::from_raw_parts(s2 as *const u8, n as usize) };

    for (&a, &b) in s1.iter().zip(s2.iter()) {
        let val = (a as i32) - (b as i32);
        if a != b || a == 0 {
            return val;
        }
    }

    0
}

#[wasm_bindgen]
pub fn emscripten_asm_const_int(_a: i32, _b: i32, _c: i32) -> i32 {
    0
}

#[wasm_bindgen]
pub fn __assert_fail(_assertion: i32, _file: i32, _line: i32, _function: i32) {
    wasm_bindgen::throw_str("assert in C trapped");
}

#[wasm_bindgen]
pub fn abort() {
    wasm_bindgen::throw_str("abort");
}
