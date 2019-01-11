set -ex

docker run \
    --rm \
    --volume $PWD:/root/zbox \
    zboxfs/wasm \
    cargo build --target wasm32-unknown-unknown --features storage-zbox-wasm --release

docker run \
    --rm \
    --volume $PWD:/root/zbox \
    zboxfs/wasm \
    wasm-bindgen target/wasm32-unknown-unknown/release/zbox.wasm --out-dir ./wasm/src/wasm
