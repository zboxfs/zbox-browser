//console.log(Zbox);

async function run() {
    let result;

    try {
        await zbox.init({ logging: true });

        let repo = await zbox.open({ uri, pwd, opts: {
            create: false
        }});

        /*let file = await repo.openFile({
            path: "/file3",
            opts: { create: true }
        });
        let buf = new Uint8Array([44, 55, 66]);
        await file.writeOnce(buf);
        await file.close();*/

        //let file2 = await repo.openFile("/file");
        //let newPos = await file.seek({ from: SeekFrom.START, offset: 1 });
        //console.log(newPos);
        //let dst = new Uint8Array(2);
        //let result = await file.read(dst);
        //let result = await file2.readAll();
        //await file2.close();
        //console.log(`file2 closed`);

        let dirs = await repo.readDir("/");
        console.log(dirs);

        await repo.close();

        zbox.exit();
        console.log(`zbox worker exited`);

    } catch (err) {
        console.error(`${err}`);
    }
}

// expect error promise
async function expectError(promise) {
  try {
    await promise;
    expect.fail();
  } catch (err) {
    expect(err).to.be.an('error');
  }
}

const TIMEOUT = 60 * 1000;

const uri = "zbox://3Qe3SNZ3Pe7PrkHP2UzmVgXn@Cn3yz3rgnsG4SY?cache_size=1mb";
const pwd = "pwd";

describe('Repo Open/Close Test', function() {
  let zbox, repo;

  this.timeout(TIMEOUT);

  before(function() {});

  it('should create zbox object', async function() {
    zbox = new Zbox.Zbox();
    expect(zbox).to.be.an('object');
    await zbox.initEnv({ debug: true });
  });

  it('should open repo', async function() {
    repo = await zbox.openRepo({ uri, pwd, opts: { create: true }});
    expect(repo).to.be.an('object');
  });

  it('should close repo', async function() {
    if (repo) await repo.close();
  });

  it('should not open repo with wrong uri', async function() {
    await expectError(zbox.openRepo({ uri: "", pwd }));
    await expectError(zbox.openRepo({ uri: "wrong uri", pwd }));
    await expectError(zbox.openRepo({ uri: "wrong_storage://", pwd }));
    await expectError(zbox.openRepo({ uri: "zbox://wrong_repo", pwd }));
  });

  it('should not open repo with wrong password', async function() {
    await expectError(zbox.openRepo({ uri, pwd: "wrong pwd" }));
  });

  it('should not open repo with createNew flag', async function() {
    await expectError(zbox.openRepo({ uri, pwd, opts: { createNew: true }}));
  });

  it('should open repo again', async function() {
    repo = await zbox.openRepo({ uri, pwd, opts: { create: true }});
    expect(repo).to.be.an('object');
  });

  it('should close repo again', async function() {
    if (repo) await repo.close();
  });

  it('should OK close repo twice', async function() {
    if (repo) await repo.close();
  });

  it('should exit zbox worker', async function() {
    if (zbox) await zbox.exit();
  });

  it('should not open repo again', async function() {
    await expectError(zbox.openRepo({ uri, pwd, opts: { create: true }}));
  });

  after(async function() {});
});

describe('File IO Test', function() {
  let zbox, repo, filePath = `/${Date.now()}`;
  const buf = new Uint8Array([1, 2, 3]);
  const buf2 = new Uint8Array([4, 5, 6]);

  this.timeout(TIMEOUT);

  before(async function() {
    zbox = new Zbox.Zbox();
    await zbox.initEnv({ debug: true });
    repo = await zbox.openRepo({ uri, pwd, opts: { create: true }});
  });

  it(`should create empty file ${filePath}`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { create: true } });
    expect(file).to.be.an('object');
    await file.close();
    const result = await repo.isFile(filePath);
    expect(result).to.be.true;
  });

  it(`should read empty file ${filePath}`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { read: true } });
    let result = await file.readAll();
    expect(result).to.be.an('uint8array');
    expect(result.length).to.be.equal(0);
    await file.close();
  });

  it(`should write to file ${filePath}`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { write: true } });
    await file.writeOnce(buf);
    await file.close();
  });

  it(`should read file ${filePath}`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { read: true } });
    let result = await file.readAll();
    expect(result).to.be.an('uint8array');
    expect(result).to.eql(buf);
    await file.close();
  });

  it(`should write to file ${filePath} again`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { write: true } });
    await file.writeOnce(buf2);
    await file.close();
  });

  it(`should read file ${filePath} again`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { read: true } });
    let result = await file.readAll();
    expect(result).to.be.an('uint8array');
    expect(result).to.eql(buf2);
    await file.close();
  });

  after(async function() {
    if (repo) await repo.close();
    if (zbox) await zbox.exit();
  });
});

describe('Dir IO Test', function() {
  let zbox, repo;
  let dirPath = `/${Date.now()}`, dirPath2 = `/1/2/3/${Date.now()}`;

  this.timeout(TIMEOUT);

  before(async function() {
    zbox = new Zbox.Zbox();
    await zbox.initEnv({ debug: true });
    repo = await zbox.openRepo({ uri, pwd, opts: { create: true }});
  });

  it('should read root dir', async function() {
    let dirs = await repo.readDir("/");
    expect(dirs).to.be.an('array');
    expect(dirs.length).to.be.at.least(1);
  });

  it('should not read non-exist dir', async function() {
    await expectError(repo.readDir("/non-exist"));
    const result = await repo.isDir("/non-exist");
    expect(result).to.be.false;
  });

  it('should not create root dir', async function() {
    await expectError(repo.createDir("/"));
  });

  it(`should create empty dir ${dirPath}`, async function() {
    await repo.createDir(dirPath);
    let result = await repo.isDir(dirPath);
    expect(result).to.be.true;
    result = await repo.isFile(dirPath);
    expect(result).to.be.false;
  });

  it(`should read empty dir ${dirPath}`, async function() {
    let dirs = await repo.readDir(dirPath);
    expect(dirs).to.be.an('array');
    expect(dirs.length).to.equal(0);
  });

  it('should read root dir again', async function() {
    let dirs = await repo.readDir('/');
    expect(dirs.length).to.be.at.least(2);
  });

  it(`should create dir ${dirPath2} recursively`, async function() {
    await repo.createDirAll(dirPath2);
  });

  it('should read non-empty dir /1/2/3', async function() {
    let dirs = await repo.readDir('/1/2/3');
    expect(dirs).to.be.an('array');
    expect(dirs.length).to.equal(1);

    const ent = dirs[0];
    expect(ent).to.be.an('object');
    expect(ent.path).to.equal(dirPath2);
    expect(ent.fileName).to.equal(
      dirPath2.substring(dirPath2.lastIndexOf('/') + 1)
    );
    expect(ent.metadata).to.be.an('object');
  });

  it('should not remove root dir', async function() {
    await expectError(repo.removeDir('/'));
  });

  it('should not remove non-exist dir', async function() {
    await expectError(repo.removeDir('/non-exist'));
  });

  it('should not remove dir without absolute path', async function() {
    await expectError(repo.removeDir('1/2/3'));
  });

  it('should not remove non-empty dir', async function() {
    await expectError(repo.removeDir('/1'));
    await expectError(repo.removeDir('/1/2'));
    await expectError(repo.removeDir('/1/2/3'));
  });

  it('should remove empty dir', async function() {
    await repo.removeDir(dirPath2);
    await repo.removeDir('/1/2/3');
  });

  it('should remove non-empty dir recursively', async function() {
    await repo.removeDirAll('/1');
  });

  it('should not read removed dir', async function() {
    await expectError(repo.readDir('/1/2'));
    await expectError(repo.readDir('/1'));

    let result;
    result = await repo.pathExists("/1/2");
    expect(result).to.be.false;
    result = await repo.pathExists("/1");
    expect(result).to.be.false;
  });

  after(async function() {
    if (repo) await repo.close();
    if (zbox) await zbox.exit();
  });
});

describe.only('FS Test', function() {
  let zbox, repo;
  const newPwd = 'newpwd';
  let filePath = `/${Date.now()}`, dirPath = `/1/2/3/${Date.now()}`;

  this.timeout(TIMEOUT);

  before(async function() {
    zbox = new Zbox.Zbox();
    await zbox.initEnv({ debug: true });
    repo = await zbox.openRepo({ uri, pwd, opts: { create: false }});
  });

  it('should run repo.info() for root dir', async function() {
    let info = await repo.info("/");
    expect(info).to.be.an('object');
    expect(info.volumeId).to.be.an('string');
    expect(info.version).to.be.an('string');
    expect(info.uri).to.be.an('string');
    expect(info.compress).to.be.false;
    expect(info.versionLimit).to.be.a('number');
    expect(info.dedupChunk).to.be.true;
    expect(info.isReadOnly).to.be.false;
    expect(info.createdAt).to.be.a('number');
  });

  it('should run repo.resetPassword()', async function() {
    await repo.resetPassword({ oldPwd: pwd, newPwd });
    await repo.close();
  });

  it('should not open repo with old password', async function() {
    await expectError(zbox.openRepo({ uri, pwd, opts: { create: false }}));
  });

  it('should open repo with new password', async function() {
    repo = await zbox.openRepo({ uri, pwd: newPwd, opts: { create: false }});
  });

  it('should change repo password back', async function() {
    await repo.resetPassword({ oldPwd: newPwd, newPwd: pwd });
  });

  it('should check path exists', async function() {
    let result;
    result = await repo.pathExists("/");
    expect(result).to.be.true;
    result = await repo.pathExists("/non-exists");
    expect(result).to.be.false;
  });

  it('should create file', async function() {
    let file = await repo.createFile(filePath);
    expect(file).to.be.an('object');
    await file.close();
  });

  it('should read metadata for a path', async function() {
    let md = await repo.metadata(filePath);
    expect(md).to.be.an('object');
    expect(md.fileType).to.equal('File');
    expect(md.contentLen).to.equal(0);
    expect(md.currVersion).to.equal(1);
    expect(md.createdAt).to.be.a('number');
    expect(md.modifiedAt).to.be.a('number');
  });

  it('should read history for a path', async function() {
    let hist = await repo.history(filePath);
    expect(hist).to.be.an('array');
    expect(hist.length).to.equal(1);
    expect(hist[0].num).to.equal(1);
    expect(hist[0].contentLen).to.equal(0);
    expect(hist[0].createdAt).to.be.a('number');
  });

  it('should copy a file', async function() {
    const to = filePath + '.copy';
    await repo.copy({ from: filePath, to });
    const result = await repo.isFile(to);
    expect(result).to.be.true;
  });

  it('should copy a file to itself', async function() {
    await repo.copy({ from: filePath, to: filePath });
  });

  it('should remove a file', async function() {
    await repo.removeFile(filePath);
  });

  it('should fail remove file again', async function() {
    await expectError(repo.removeFile(filePath));
  });

  it('should rename a file', async function() {
    let to = filePath + '.new';
    let file = await repo.createFile(filePath);
    await file.close();
    await repo.rename({ from: filePath, to });
  });

  it('should not rename to an existing file', async function() {
    let to = filePath + '.new';
    await expectError(repo.rename({ from: filePath, to }));
  });

  it('should repair super block', async function() {
    await repo.close();
    await zbox.repairSuperBlock({ uri, pwd });
    repo = await zbox.openRepo({ uri, pwd, opts: { create: false }});
  });

  after(async function() {
    if (repo) await repo.close();
    if (zbox) await zbox.exit();
  });
});
