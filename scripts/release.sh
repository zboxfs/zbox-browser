set -ex

docker run \
    -e ZBOX_BROWSER_GITHUB_TOKEN
    --rm \
    --volume $PWD:/root/zbox \
    zboxfs/wasm \
    npm run release
