import msgTypes from "./message.js";

let zbox = null;
let repo = null;

onmessage = function(event) {
    let msg = event.data;
    console.log(`Message received from main thread: ${JSON.stringify(msg)}`);

    // reset message result and error
    msg.result = null;
    msg.error = null;

    // dispatch message
    switch (msg.type) {
        case msgTypes.init:
            import("./wasm/zbox")
                .then(wasm => {
                    zbox = wasm;
                    zbox.init_env();
                    repo = new zbox.Repo();
                    postMessage(msg);
                })
                .catch(err => msg.error = err);
            return;

        case msgTypes.open:
            try {
                repo.open(msg.params.uri, msg.params.pwd);
            } catch (err) {
                msg.error = err;
            }
            break;

        case msgTypes.close:
            repo.close();
            repo = null;
            break;
    }

    // send message back to main thread
    postMessage(msg);

    /*import("./wasm/zbox")
        .then(zbox => {
            zbox.init_env();
            console.log(`[js] init_env() completed`);

            zbox.Repo.open();
            //const resp = zbox.Repo.request();
            //const resp = zbox.Repo.put();
            //postMessage(resp);
            postMessage("[js] repo opened");
        })
        .catch(err => {
            console.log(`[js err] ${err}`);
        });

    postMessage('response msg');*/
};
