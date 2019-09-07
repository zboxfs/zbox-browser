set -ex

docker run \
    --rm \
    --volume $PWD:/root/zbox \
    zboxfs/wasm \
    npm run build
