# zbox-browser

This package is browser javascript binding for [ZboxFS].

ZboxFS is a zero-details, privacy-focused in-app file system. Its goal is
to help application store files securely, privately and reliably. Check more
details about ZboxFS: https://github.com/zboxfs/zbox.

# Get Started

## Installation

- Download `zbox-browser-0.1.0.tar.gz` from [latest release]
- Extract it to your website's `static` or `public` folder
- Import it using `<script>` tag

  ```html
  <script src="zbox-browser-0.1.0/index.js"></script>
  ```

## Hello World Example

Visit https://try.zbox.io to create a test repo. Copy its URI and replace
`[your_repo_uri]` in below.

```html
<script src="zbox-browser-0.1.0/index.js"></script>

<script>
  // create a Zbox instance
  const zbox = new Zbox();

  (async () => {
    // initialise environment, called once before using Zbox
    await zbox.initEnv({ debug: true });

    // open the repo
    var repo = await zbox.openRepo({
      uri: '[your_repo_uri]',
      pwd: 'pwd',
      opts: { create: true }
    });

    // create a file
    var file = await repo.createFile('/hello_world.txt')

    // write content to file
    await file.writeOnce('Hello World!')

    // seek to begining of the file
    await file.seek({ from: Zbox.SeekFrom.Start, offset: 0 });

    // read all content as string
    const str = await file.readAllString()
    console.log(str);

    // close file and repo
    await file.close();
    await repo.close();
  })();
</script>
```

# API Documentation

Check the API documentation at https://docs.zbox.io/api/.

# How to Build

This is for advanced user. If simply use this package, you don't need to build
by yourself.

## Prerequisites

Docker

## Build WebAssembly

```sh
npm run build-wasm
```

After running this command, wasm file will generate in `src/wasm` folder.

## Build Package

```sh
npm run build
```

After running this command, release lib files will be created in `lib` folder.

# How to Release

To release this package to GitHub, you need a [Personal access tokens].

```sh
export ZBOX_BROWSER_GITHUB_TOKEN=[your Personal access token]
npm run release
```

After running this command, release tarball will be created in `dist` folder
and uploaded to GitHub. A draft release will be created as well if it is not
there yet.

# License

This package is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE)
file for details.

[ZboxFS]: https://github.com/zboxfs/zbox
[latest release]: https://github.com/zboxfs/zbox-browser/releases/latest
[Personal access tokens]: https://github.com/
