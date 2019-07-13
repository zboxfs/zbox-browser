set -ex

docker run \
    --rm \
    --volume $PWD/zbox_wasm:/root/zbox \
    zboxfs/wasm \
    cargo build --target wasm32-unknown-unknown --release

docker run \
    --rm \
    --volume $PWD/zbox_wasm:/root/zbox \
    --volume $PWD/src/wasm:/output \
    zboxfs/wasm \
    wasm-bindgen target/wasm32-unknown-unknown/release/zbox_wasm.wasm --out-dir /output
