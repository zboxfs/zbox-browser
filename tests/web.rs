extern crate wasm_bindgen_test;
//extern crate zbox;

use wasm_bindgen_test::{wasm_bindgen_test_configure, wasm_bindgen_test};

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn web_test() {
    //let _ = zbox::zbox_version();
    assert_eq!(1, 1);
}
