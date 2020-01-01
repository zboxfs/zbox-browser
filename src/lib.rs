extern crate log;
extern crate serde;
#[macro_use]
extern crate serde_derive;
extern crate js_sys;
extern crate wasm_bindgen;
extern crate web_sys;
extern crate zbox;

use std::error::Error as StdError;
use std::io::{Read, Seek, SeekFrom, Write};
use std::result;
use std::str::FromStr;
use std::time::SystemTime;

use log::Level;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

use zbox::Error;

mod polyfill;
mod wasm_logger;

#[wasm_bindgen]
pub fn js_random_uint32() -> u32 {
    // since the wasm is running in a web worker, the global scope should be
    // WorkerGlobalScope, not Window
    let global = js_sys::global();
    let worker = global.dyn_into::<web_sys::WorkerGlobalScope>().unwrap();

    // get crypto from worker
    let crypto = worker.crypto().unwrap();

    // generate a random u32 number using the global scope crypto
    let mut buf = vec![0u8; 4];
    crypto.get_random_values_with_u8_array(&mut buf).unwrap();
    let ret: u32 = (buf[3] as u32) << 24
        | (buf[2] as u32) << 16
        | (buf[1] as u32) << 8
        | (buf[0] as u32);

    ret
}

type Result<T> = result::Result<T, JsValue>;

macro_rules! map_js_err {
    ($x:expr) => {
        $x.map_err(|err| {
            let desc = err.description().to_owned();
            let code: i32 = err.into();
            JsValue::from(format!("ZboxFS({}): {}", code, desc))
        });
    };
}

#[inline]
fn time_to_u64(t: SystemTime) -> u64 {
    t.duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs()
}

#[wasm_bindgen]
pub fn init_env(level: &str) {
    if level != "off" {
        let lvl = Level::from_str(level).unwrap_or(Level::Warn);
        wasm_logger::init(lvl).expect("Initialise wasm logger failed");
    };
    zbox::init_env();
}

#[wasm_bindgen]
pub fn zbox_version() -> String {
    zbox::zbox_version()
}

#[wasm_bindgen]
pub struct RepoOpener {
    inner: zbox::RepoOpener,
}

#[wasm_bindgen(js_class = RepoOpener)]
impl RepoOpener {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let mut inner = zbox::RepoOpener::new();
        inner
            .cipher(zbox::Cipher::Xchacha)
            .ops_limit(zbox::OpsLimit::Interactive)
            .mem_limit(zbox::MemLimit::Interactive);
        RepoOpener { inner }
    }

    pub fn create(&mut self, create: bool) {
        self.inner.create(create);
    }

    #[wasm_bindgen(js_name = createNew)]
    pub fn create_new(&mut self, create_new: bool) {
        self.inner.create_new(create_new);
    }

    pub fn compress(&mut self, compress: bool) {
        self.inner.compress(compress);
    }

    #[wasm_bindgen(js_name = versionLimit)]
    pub fn version_limit(&mut self, version_limit: u8) {
        self.inner.version_limit(version_limit);
    }

    #[wasm_bindgen(js_name = dedupChunk)]
    pub fn dedup_chunk(&mut self, dedup_chunk: bool) {
        self.inner.dedup_chunk(dedup_chunk);
    }

    #[wasm_bindgen(js_name = readOnly)]
    pub fn read_only(&mut self, read_only: bool) {
        self.inner.read_only(read_only);
    }

    #[wasm_bindgen(js_name = force)]
    pub fn force(&mut self, force: bool) {
        self.inner.force(force);
    }

    pub fn open(self, uri: &str, pwd: &str) -> Result<Repo> {
        let repo = map_js_err!(self.inner.open(uri, pwd))?;
        Ok(Repo { inner: Some(repo) })
    }
}

#[wasm_bindgen]
pub struct OpenOptions {
    inner: zbox::OpenOptions,
}

#[wasm_bindgen(js_class = OpenOptions)]
impl OpenOptions {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        OpenOptions {
            inner: zbox::OpenOptions::new(),
        }
    }

    pub fn read(&mut self, read: bool) {
        self.inner.read(read);
    }

    pub fn write(&mut self, write: bool) {
        self.inner.write(write);
    }

    pub fn append(&mut self, append: bool) {
        self.inner.append(append);
    }

    pub fn truncate(&mut self, truncate: bool) {
        self.inner.truncate(truncate);
    }

    pub fn create(&mut self, create: bool) {
        self.inner.create(create);
    }

    #[wasm_bindgen(js_name = createNew)]
    pub fn create_new(&mut self, create_new: bool) {
        self.inner.create_new(create_new);
    }

    #[wasm_bindgen(js_name = versionLimit)]
    pub fn version_limit(&mut self, version_limit: u8) {
        self.inner.version_limit(version_limit);
    }

    #[wasm_bindgen(js_name = dedupChunk)]
    pub fn dedup_chunk(&mut self, dedup_chunk: bool) {
        self.inner.dedup_chunk(dedup_chunk);
    }

    pub fn open(self, repo: &mut Repo, path: &str) -> Result<File> {
        let file = map_js_err!(match repo.inner {
            Some(ref mut repo) => self.inner.open(repo, path),
            None => Err(Error::RepoClosed),
        })?;
        Ok(File { inner: Some(file) })
    }
}

#[allow(non_snake_case)]
#[derive(Serialize)]
pub struct RepoInfo {
    pub volumeId: String,
    pub version: String,
    pub uri: String,
    pub compress: bool,
    pub versionLimit: u8,
    pub dedupChunk: bool,
    pub isReadOnly: bool,
    pub createdAt: u64,
}

impl From<zbox::RepoInfo> for RepoInfo {
    fn from(info: zbox::RepoInfo) -> Self {
        RepoInfo {
            volumeId: info.volume_id().to_string(),
            version: info.version(),
            uri: info.uri().to_owned(),
            compress: info.compress(),
            versionLimit: info.version_limit(),
            dedupChunk: info.dedup_chunk(),
            isReadOnly: info.is_read_only(),
            createdAt: time_to_u64(info.created_at()),
        }
    }
}

#[allow(non_snake_case)]
#[derive(Serialize)]
pub struct Metadata {
    pub fileType: String,
    pub contentLen: usize,
    pub currVersion: usize,
    pub createdAt: u64,
    pub modifiedAt: u64,
}

impl From<zbox::Metadata> for Metadata {
    fn from(md: zbox::Metadata) -> Self {
        Metadata {
            fileType: md.file_type().into(),
            contentLen: md.content_len(),
            currVersion: md.curr_version(),
            createdAt: time_to_u64(md.created_at()),
            modifiedAt: time_to_u64(md.modified_at()),
        }
    }
}

#[allow(non_snake_case)]
#[derive(Serialize)]
pub struct DirEntry {
    pub path: String,
    pub fileName: String,
    pub metadata: Metadata,
}

impl From<&zbox::DirEntry> for DirEntry {
    fn from(ent: &zbox::DirEntry) -> Self {
        DirEntry {
            path: ent.path().to_str().unwrap().to_owned(),
            fileName: ent.file_name().to_owned(),
            metadata: Metadata::from(ent.metadata()),
        }
    }
}

#[allow(non_snake_case)]
#[derive(Serialize)]
pub struct Version {
    pub num: usize,
    pub contentLen: usize,
    pub createdAt: u64,
}

impl From<&zbox::Version> for Version {
    fn from(ver: &zbox::Version) -> Self {
        Version {
            num: ver.num(),
            contentLen: ver.content_len(),
            createdAt: time_to_u64(ver.created_at()),
        }
    }
}

#[wasm_bindgen(js_name = VersionReader)]
pub struct VersionReader {
    inner: Option<zbox::VersionReader>,
}

#[wasm_bindgen(js_class = VersionReader)]
impl VersionReader {
    pub fn close(&mut self) {
        self.inner.take();
    }

    pub fn version(&self) -> Result<JsValue> {
        let ver = map_js_err!(match self.inner {
            Some(ref rdr) => rdr.version().map_err(Error::from),
            None => Err(Error::Closed),
        })?;
        Ok(JsValue::from_serde(&ver).unwrap())
    }

    pub fn read(&mut self, dst: &mut [u8]) -> Result<usize> {
        let read = map_js_err!(match self.inner {
            Some(ref mut rdr) => rdr.read(dst).map_err(Error::from),
            None => Err(Error::Closed),
        })?;
        Ok(read)
    }

    #[wasm_bindgen(js_name = readAll)]
    pub fn read_all(&mut self) -> Result<js_sys::Uint8Array> {
        let mut buf = Vec::new();
        map_js_err!(match self.inner {
            Some(ref mut rdr) => rdr.read_to_end(&mut buf).map_err(Error::from),
            None => Err(Error::Closed),
        })?;
        let array = unsafe { js_sys::Uint8Array::view(&buf) };
        Ok(array.slice(0, array.length()))
    }

    pub fn seek(&mut self, from: u32, offset: i32) -> Result<u32> {
        let new_pos = map_js_err!(match self.inner {
            Some(ref mut rdr) => {
                let pos = match from {
                    0 => SeekFrom::Start(offset as u64),
                    1 => SeekFrom::End(offset as i64),
                    2 => SeekFrom::Current(offset as i64),
                    _ => return map_js_err!(Err(Error::InvalidArgument)),
                };
                rdr.seek(pos).map_err(Error::from)
            }
            None => Err(Error::Closed),
        })?;
        Ok(new_pos as u32)
    }
}

#[wasm_bindgen(js_name = File)]
pub struct File {
    inner: Option<zbox::File>,
}

#[wasm_bindgen(js_class = File)]
impl File {
    pub fn close(&mut self) {
        self.inner.take();
    }

    pub fn read(&mut self, dst: &mut [u8]) -> Result<usize> {
        let read = map_js_err!(match self.inner {
            Some(ref mut file) => file.read(dst).map_err(Error::from),
            None => Err(Error::Closed),
        })?;
        Ok(read)
    }

    #[wasm_bindgen(js_name = readAll)]
    pub fn read_all(&mut self) -> Result<js_sys::Uint8Array> {
        let mut buf = Vec::new();
        map_js_err!(match self.inner {
            Some(ref mut file) => {
                file.read_to_end(&mut buf).map_err(Error::from)
            }
            None => Err(Error::Closed),
        })?;
        let array = unsafe { js_sys::Uint8Array::view(&buf) };
        Ok(array.slice(0, array.length()))
    }

    pub fn write(&mut self, buf: &[u8]) -> Result<usize> {
        let written = map_js_err!(match self.inner {
            Some(ref mut file) => file.write(buf).map_err(Error::from),
            None => Err(Error::Closed),
        })?;
        Ok(written)
    }

    pub fn finish(&mut self) -> Result<()> {
        map_js_err!(match self.inner {
            Some(ref mut file) => file.finish(),
            None => Err(Error::Closed),
        })
    }

    #[wasm_bindgen(js_name = writeOnce)]
    pub fn write_once(&mut self, buf: &[u8]) -> Result<()> {
        map_js_err!(match self.inner {
            Some(ref mut file) => file.write_once(buf),
            None => Err(Error::Closed),
        })?;
        Ok(())
    }

    pub fn seek(&mut self, from: u32, offset: i32) -> Result<u32> {
        let new_pos = map_js_err!(match self.inner {
            Some(ref mut file) => {
                let pos = match from {
                    0 => SeekFrom::Start(offset as u64),
                    1 => SeekFrom::End(offset as i64),
                    2 => SeekFrom::Current(offset as i64),
                    _ => return map_js_err!(Err(Error::InvalidArgument)),
                };
                file.seek(pos).map_err(Error::from)
            }
            None => Err(Error::Closed),
        })?;
        Ok(new_pos as u32)
    }

    #[wasm_bindgen(js_name = setLen)]
    pub fn set_len(&mut self, len: usize) -> Result<()> {
        map_js_err!(match self.inner {
            Some(ref mut file) => file.set_len(len),
            None => Err(Error::Closed),
        })
    }

    #[wasm_bindgen(js_name = currVersion)]
    pub fn curr_version(&self) -> Result<usize> {
        map_js_err!(match self.inner {
            Some(ref file) => file.curr_version(),
            None => Err(Error::Closed),
        })
    }

    #[wasm_bindgen(js_name = versionReader)]
    pub fn version_reader(&self, ver_num: usize) -> Result<VersionReader> {
        let rdr = map_js_err!(match self.inner {
            Some(ref file) => file.version_reader(ver_num),
            None => Err(Error::Closed),
        })?;
        Ok(VersionReader { inner: Some(rdr) })
    }

    pub fn metadata(&self) -> Result<JsValue> {
        let md = map_js_err!(match self.inner {
            Some(ref file) => file.metadata(),
            None => Err(Error::Closed),
        })?;
        let ret = Metadata::from(md);
        Ok(JsValue::from_serde(&ret).unwrap())
    }

    pub fn history(&self) -> Result<JsValue> {
        let hist = map_js_err!(match self.inner {
            Some(ref file) => file.history(),
            None => Err(Error::Closed),
        })?;
        let ret: Vec<Version> = hist.iter().map(Version::from).collect();
        Ok(JsValue::from_serde(&ret).unwrap())
    }
}

#[wasm_bindgen]
pub struct Repo {
    inner: Option<zbox::Repo>,
}

#[wasm_bindgen(js_class = Repo)]
impl Repo {
    pub fn close(&mut self) {
        self.inner.take();
    }

    pub fn exists(uri: &str) -> Result<bool> {
        map_js_err!(zbox::Repo::exists(uri))
    }

    pub fn info(&self) -> Result<JsValue> {
        let info = map_js_err!(match self.inner {
            Some(ref repo) => repo.info(),
            None => Err(Error::RepoClosed),
        })?;
        let ret = RepoInfo::from(info);
        Ok(JsValue::from_serde(&ret).unwrap())
    }

    #[wasm_bindgen(js_name = resetPassword)]
    pub fn reset_password(
        &mut self,
        old_pwd: &str,
        new_pwd: &str,
    ) -> Result<()> {
        map_js_err!(match self.inner {
            Some(ref mut repo) => repo.reset_password(
                old_pwd,
                new_pwd,
                zbox::OpsLimit::Interactive,
                zbox::MemLimit::Interactive
            ),
            None => Err(Error::RepoClosed),
        })
    }

    #[wasm_bindgen(js_name = repairSuperBlock)]
    pub fn repair_super_block(uri: &str, pwd: &str) -> Result<()> {
        map_js_err!(zbox::Repo::repair_super_block(uri, pwd))
    }

    #[wasm_bindgen(js_name = pathExists)]
    pub fn path_exists(&self, path: &str) -> Result<bool> {
        map_js_err!(match self.inner {
            Some(ref repo) => repo.path_exists(path),
            None => Err(Error::RepoClosed),
        })
    }

    #[wasm_bindgen(js_name = isFile)]
    pub fn is_file(&self, path: &str) -> Result<bool> {
        map_js_err!(match self.inner {
            Some(ref repo) => repo.is_file(path),
            None => Err(Error::RepoClosed),
        })
    }

    #[wasm_bindgen(js_name = isDir)]
    pub fn is_dir(&self, path: &str) -> Result<bool> {
        map_js_err!(match self.inner {
            Some(ref repo) => repo.is_dir(path),
            None => Err(Error::RepoClosed),
        })
    }

    #[wasm_bindgen(js_name = createFile)]
    pub fn create_file(&mut self, path: &str) -> Result<File> {
        let file = map_js_err!(match self.inner {
            Some(ref mut repo) => repo.create_file(path),
            None => Err(Error::RepoClosed),
        })?;
        Ok(File { inner: Some(file) })
    }

    #[wasm_bindgen(js_name = openFile)]
    pub fn open_file(&mut self, path: &str) -> Result<File> {
        let file = map_js_err!(match self.inner {
            Some(ref mut repo) => repo.open_file(path),
            None => Err(Error::RepoClosed),
        })?;
        Ok(File { inner: Some(file) })
    }

    #[wasm_bindgen(js_name = createDir)]
    pub fn create_dir(&mut self, path: &str) -> Result<()> {
        map_js_err!(match self.inner {
            Some(ref mut repo) => repo.create_dir(path),
            None => Err(Error::RepoClosed),
        })
    }

    #[wasm_bindgen(js_name = createDirAll)]
    pub fn create_dir_all(&mut self, path: &str) -> Result<()> {
        map_js_err!(match self.inner {
            Some(ref mut repo) => repo.create_dir_all(path),
            None => Err(Error::RepoClosed),
        })
    }

    #[wasm_bindgen(js_name = readDir)]
    pub fn read_dir(&self, path: &str) -> Result<JsValue> {
        let dirs = map_js_err!(match self.inner {
            Some(ref repo) => repo.read_dir(path),
            None => Err(Error::RepoClosed),
        });
        let dirs = dirs?;
        let ret: Vec<DirEntry> = dirs.iter().map(DirEntry::from).collect();
        Ok(JsValue::from_serde(&ret).unwrap())
    }

    pub fn metadata(&self, path: &str) -> Result<JsValue> {
        let md = map_js_err!(match self.inner {
            Some(ref repo) => repo.metadata(path),
            None => Err(Error::RepoClosed),
        })?;
        let ret = Metadata::from(md);
        Ok(JsValue::from_serde(&ret).unwrap())
    }

    pub fn history(&self, path: &str) -> Result<JsValue> {
        let hist = map_js_err!(match self.inner {
            Some(ref repo) => repo.history(path),
            None => Err(Error::RepoClosed),
        })?;
        let ret: Vec<Version> = hist.iter().map(Version::from).collect();
        Ok(JsValue::from_serde(&ret).unwrap())
    }

    pub fn copy(&mut self, from: &str, to: &str) -> Result<()> {
        map_js_err!(match self.inner {
            Some(ref mut repo) => repo.copy(from, to),
            None => Err(Error::RepoClosed),
        })
    }

    #[wasm_bindgen(js_name = copyDirAll)]
    pub fn copy_dir_all(&mut self, from: &str, to: &str) -> Result<()> {
        map_js_err!(match self.inner {
            Some(ref mut repo) => repo.copy_dir_all(from, to),
            None => Err(Error::RepoClosed),
        })
    }

    #[wasm_bindgen(js_name = removeFile)]
    pub fn remove_file(&mut self, path: &str) -> Result<()> {
        map_js_err!(match self.inner {
            Some(ref mut repo) => repo.remove_file(path),
            None => Err(Error::RepoClosed),
        })
    }

    #[wasm_bindgen(js_name = removeDir)]
    pub fn remove_dir(&mut self, path: &str) -> Result<()> {
        map_js_err!(match self.inner {
            Some(ref mut repo) => repo.remove_dir(path),
            None => Err(Error::RepoClosed),
        })
    }

    #[wasm_bindgen(js_name = removeDirAll)]
    pub fn remove_dir_all(&mut self, path: &str) -> Result<()> {
        map_js_err!(match self.inner {
            Some(ref mut repo) => repo.remove_dir_all(path),
            None => Err(Error::RepoClosed),
        })
    }

    pub fn rename(&mut self, from: &str, to: &str) -> Result<()> {
        map_js_err!(match self.inner {
            Some(ref mut repo) => repo.rename(from, to),
            None => Err(Error::RepoClosed),
        })
    }

    pub fn destroy(uri: &str) -> Result<()> {
        map_js_err!(zbox::Repo::destroy(uri))
    }
}
