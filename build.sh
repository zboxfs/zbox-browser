set -ex

docker run \
    --rm \
    --volume $PWD/zbox:/root/zbox \
    zboxfs/wasm \
    cargo build --target wasm32-unknown-unknown --features storage-zbox-wasm --release

docker run \
    --rm \
    --volume $PWD/zbox:/root/zbox \
    --volume $PWD/src/wasm:/output \
    zboxfs/wasm \
    wasm-bindgen target/wasm32-unknown-unknown/release/zbox.wasm --out-dir /output
