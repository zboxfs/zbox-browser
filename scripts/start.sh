set -ex

docker run \
    -p 9000:9000 \
    --rm \
    --volume $PWD:/root/zbox \
    zboxfs/wasm \
    npm run start
