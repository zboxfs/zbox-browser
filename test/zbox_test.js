if (typeof Zbox === 'undefined') {
  throw 'Zbox not loaded';
}

const TIMEOUT = 60 * 1000;

const uri = "zbox://3Qe3SNZ3Pe7PrkHP2UzmVgXn@Cn3yz3rgnsG4SY";
const pwd = "pwd";

// expect error promise
async function expectError(promise) {
  try {
    await promise;
    expect.fail();
  } catch (err) {
    expect(err).to.be.an('error');
  }
}

// ============================================
// Repo Open/Close Test
// ============================================
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

  it('should check repo exists', async function() {
    const result = await zbox.exists(uri);
    expect(result).to.be.true;
  });

  it('should not open repo with wrong uri', async function() {
    await expectError(zbox.openRepo({ uri: "", pwd }));
    await expectError(zbox.openRepo({ uri: "wrong uri", pwd }));
    await expectError(zbox.openRepo({ uri: "wrong_storage://", pwd }));
    await expectError(zbox.openRepo({ uri: "zbox://wrong_repo", pwd }));
    await expectError(zbox.openRepo({ uri: 123, pwd: 456 }));
  });

  it('should not open repo with wrong password', async function() {
    await expectError(zbox.openRepo({ uri, pwd: null }));
    await expectError(zbox.openRepo({ uri, pwd: "" }));
    await expectError(zbox.openRepo({ uri, pwd: "wrong pwd" }));
    await expectError(zbox.openRepo({ uri, pwd: 123 }));
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

  it('should be OK to close repo twice', async function() {
    if (repo) await repo.close();
  });

  it('should open repo in read-only', async function() {
    repo = await zbox.openRepo({ uri, pwd, opts: { readOnly: true }});
    await expectError(repo.createFile('/foo'));
    await repo.close();
  });

  it('should delete local cache', async function() {
    await zbox.deleteLocalCache(uri);
  });

  it('should exit zbox worker', async function() {
    if (zbox) await zbox.exit();
  });

  it('should not open repo again after exit', async function() {
    await expectError(zbox.openRepo({ uri, pwd, opts: { create: true }}));
  });

  after(async function() {});
});

// ============================================
// File IO Test
// ============================================
describe.only('File IO Test', function() {
  let zbox, repo, filePath;
  const buf = new Uint8Array([1, 2, 3]);
  const buf2 = new Uint8Array([4, 5, 6]);

  this.timeout(TIMEOUT);

  before(async function() {
    filePath = `/${Date.now()}`;
    zbox = new Zbox.Zbox();
    await zbox.initEnv({ debug: true });
    repo = await zbox.openRepo({ uri, pwd, opts: {
      create: true,
      versionLimit: 5
    }});
  });

  it(`should not create file with wrong argument`, async function() {
    await expectError(repo.openFile());
    await expectError(repo.openFile(123));
    await expectError(repo.openFile({}));
    await expectError(repo.openFile({ opts: { create: true } }));
  });

  it.only(`should create empty file`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { create: true } });
    expect(file).to.be.an('object');
    await file.close();
    const result = await repo.isFile(filePath);
    expect(result).to.be.true;
  });

  it(`should read empty file`, async function() {
    let file = await repo.openFile(filePath);
    let result = await file.readAll();
    expect(result).to.be.an('uint8array');
    expect(result.length).to.be.equal(0);
    await file.close();
  });

  it.only(`should write to file in all`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { write: true } });
    await file.writeOnce(buf.slice());
    await file.close();
  });

  it.only(`should read file in parts`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { read: true } });
    let result = await file.read(new Uint8Array(2));
    expect(result).to.eql(new Uint8Array([1, 2]));
    result = await file.read(new Uint8Array(2));
    expect(result).to.eql(new Uint8Array([3]));
    await file.close();
  });

  it(`should read file in all`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { read: true } });
    let result = await file.readAll();
    expect(result).to.be.an('uint8array');
    expect(result).to.eql(buf);
    await file.close();
  });

  it(`should write to file in parts again`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { write: true } });
    let result = await file.write(buf2.slice(0, 2));
    expect(result).to.equal(2);
    result = await file.write(buf2.slice(2));
    expect(result).to.equal(1);
    await file.finish();
    await file.close();
  });

  it(`should read file all again`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { read: true } });
    let result = await file.readAll();
    expect(result).to.be.an('uint8array');
    expect(result).to.eql(buf2);
    await file.close();
  });

  it(`should get current version of`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { read: true } });
    let ver = await file.currVersion();
    expect(ver).to.equal(3);
    await file.close();
  });

  it(`should get metadata of`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { read: true } });
    let md = await file.metadata();
    expect(md).to.be.an('object');
    expect(md.fileType).to.equal('File');
    expect(md.contentLen).to.equal(3);
    expect(md.currVersion).to.equal(3);
    expect(md.createdAt).to.be.a('number');
    expect(md.modifiedAt).to.be.a('number');
    await file.close();
  });

  it(`should get history of`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { read: true } });
    let hist = await file.history();
    expect(hist).to.be.an('array');
    expect(hist.length).to.equal(3);
    expect(hist[2].num).to.equal(3);
    expect(hist[2].contentLen).to.equal(3);
    expect(hist[2].createdAt).to.be.a('number');
    await file.close();
  });

  it(`should able to read current versions of`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { read: true } });
    let ver = await file.currVersion();
    expect(ver).to.equal(3);

    let vrdr = await file.versionReader(ver);
    let result = await vrdr.readAll();
    expect(result).to.be.an('uint8array');
    expect(result).to.eql(buf2);
    await vrdr.close();

    await file.close();
  });

  it(`should able to read previous versions of`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { read: true } });
    let ver = await file.currVersion();
    expect(ver).to.equal(3);

    let vrdr = await file.versionReader(ver - 1);

    let result = await vrdr.read(new Uint8Array(2));
    expect(result).to.eql(new Uint8Array([1, 2]));
    result = await vrdr.read(new Uint8Array(2));
    expect(result).to.eql(new Uint8Array([3]));
    await vrdr.close();

    await file.close();
  });

  it(`should able to seek in file`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { write: true } });
    let newPos = await file.seek({ from: Zbox.SeekFrom.START, offset: 1 });
    expect(newPos).to.equal(1);
    newPos = await file.seek({ from: Zbox.SeekFrom.START, offset: 2 });
    expect(newPos).to.equal(2);
    newPos = await file.seek({ from: Zbox.SeekFrom.END, offset: -2 });
    expect(newPos).to.equal(1);
    newPos = await file.seek({ from: Zbox.SeekFrom.CURRENT, offset: 1 });
    expect(newPos).to.equal(2);
    await file.close();
  });

  it(`should write to file at offset 1`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { write: true } });

    await file.seek({ from: Zbox.SeekFrom.START, offset: 1 });
    await file.writeOnce(buf);

    // read new file content from start
    await file.seek({ from: Zbox.SeekFrom.START, offset: 0 });
    let result = await file.readAll();
    expect(result).to.eql(new Uint8Array([4, 1, 2, 3]));

    await file.close();
  });

  it(`should able to truncate file length to 2`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { write: true } });
    await file.setLen(2);
    await file.seek({ from: Zbox.SeekFrom.START, offset: 0 });
    let result = await file.readAll();
    expect(result).to.eql(new Uint8Array([4, 1]));
    await file.close();
  });

  it(`should able to extend file length to 4`, async function() {
    let file = await repo.openFile({ path: filePath, opts: { write: true } });
    await file.setLen(4);
    await file.seek({ from: Zbox.SeekFrom.START, offset: 0 });
    let result = await file.readAll();
    expect(result).to.eql(new Uint8Array([4, 1, 0, 0]));
    await file.close();
  });

  it(`should able to read and write string to file`, async function() {
    const path = `/${Date.now()}`;
    const str = 'foo bar';

    let file = await repo.openFile({ path, opts: { create: true } });
    await file.writeOnce(str);

    await file.seek({ from: Zbox.SeekFrom.START, offset: 0 });
    let result = await file.readAllString();
    expect(result).to.equal(str);

    await file.close();
  });

  it.only(`should able to run API reference doc example #1`, async function() {
    const buf = new Uint8Array([1, 2, 3, 4, 5, 6]);
    const path = `/${Date.now()}`;
    var file = await repo.createFile(path);
    await file.writeOnce(buf.slice());

    // read the first 2 bytes
    await file.seek({ from: Zbox.SeekFrom.START, offset: 0 });
    var dst = await file.read(new Uint8Array(2));   // now dst is [1, 2]
    expect(dst).to.eql(new Uint8Array([1, 2]));

    // create a new version, now the file content is [1, 2, 7, 8, 5, 6]
    await file.writeOnce(new Uint8Array([7, 8]));

    // notice that reading is on the latest version
    await file.seek({ from: Zbox.SeekFrom.CURRENT, offset: -2 });
    dst = await file.read(dst);   // now dst is [7, 8]
    expect(dst).to.eql(new Uint8Array([7, 8]));

    await file.close();
  });

  it(`should able to run API reference doc example #2`, async function() {
    const path = `/${Date.now()}`;

    // create file and write 2 versions
    var file = await repo.createFile(path);
    await file.writeOnce('foo');
    await file.writeOnce('bar');

    // get latest version number
    const currVer = await file.currVersion();

    // create a version reader and read latest version of content
    var vrdr = await file.versionReader(currVer);
    var content = await vrdr.readAllString();    // now content is 'foobar'
    expect(content).to.equal('foobar');
    await vrdr.close();

    // create another version reader and read previous version of content
    vrdr = await file.versionReader(currVer - 1);
    content = await vrdr.readAllString()    // now content is 'foo'
    expect(content).to.equal('foo');
    await vrdr.close();

    await file.close();
  });

  after(async function() {
    if (repo) await repo.close();
    if (zbox) await zbox.exit();
  });
});

// ============================================
// Dir IO Test
// ============================================
describe('Dir IO Test', function() {
  let zbox, repo;
  let dirPath, dirPath2;

  this.timeout(TIMEOUT);

  before(async function() {
    dirPath = `/${Date.now()}`;
    dirPath2 = `/1/2/3/${Date.now()}`;
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

  it('should not read dir with wrong argument', async function() {
    await expectError(repo.readDir(123));
    await expectError(repo.readDir({}));
    await expectError(repo.readDir([1,2,3]));
  });

  it('should not create root dir', async function() {
    await expectError(repo.createDir("/"));
  });

  it(`should create empty dir`, async function() {
    await repo.createDir(dirPath);
    let result = await repo.isDir(dirPath);
    expect(result).to.be.true;
    result = await repo.isFile(dirPath);
    expect(result).to.be.false;
  });

  it(`should read empty dir`, async function() {
    let dirs = await repo.readDir(dirPath);
    expect(dirs).to.be.an('array');
    expect(dirs.length).to.equal(0);
  });

  it('should read root dir again', async function() {
    let dirs = await repo.readDir('/');
    expect(dirs.length).to.be.at.least(2);
  });

  it(`should create dir recursively`, async function() {
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
    result = await repo.pathExists('/1/2');
    expect(result).to.be.false;
    result = await repo.pathExists('/1');
    expect(result).to.be.false;
  });

  after(async function() {
    if (repo) await repo.close();
    if (zbox) await zbox.exit();
  });
});

// ============================================
// FS Test
// ============================================
describe('FS Test', function() {
  let zbox, repo;
  const newPwd = 'newpwd';
  let filePath, dirPath;

  this.timeout(TIMEOUT);

  before(async function() {
    filePath = `/${Date.now()}`;
    dirPath = `/1/2/3/${Date.now()}`;
    zbox = new Zbox.Zbox();
    await zbox.initEnv({ debug: true });
    repo = await zbox.openRepo({ uri, pwd, opts: { create: false }});
  });

  it('should run repo.info() for root dir', async function() {
    let info = await repo.info();
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

  it('should not check path with wrong argument', async function() {
    await expectError(repo.pathExists(123));
    await expectError(repo.pathExists([]));
    await expectError(repo.pathExists({}));
    await expectError(repo.pathExists(null));
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
