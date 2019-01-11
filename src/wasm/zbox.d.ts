/* tslint:disable */
export function malloc(arg0: number): number;

export function calloc(arg0: number, arg1: number): number;

export function free(arg0: number): void;

export function __errno_location(): number;

export function strlen(arg0: number): number;

export function strchr(arg0: number, arg1: number): number;

export function strncmp(arg0: number, arg1: number, arg2: number): number;

export function js_random_uint32(): number;

export function emscripten_asm_const_int(arg0: number, arg1: number, arg2: number): number;

export function __assert_fail(arg0: number, arg1: number, arg2: number, arg3: number): void;

export function abort(): void;

export function init_env(): void;

export class Repo {
free(): void;

 constructor();

 open(arg0: string, arg1: string): void;

 close(): void;

static  put(): any;

static  request(): any;

}
