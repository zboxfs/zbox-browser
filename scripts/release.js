"use strict";

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Octokit = require('@octokit/rest');

const owner = 'zboxfs';
const repo = 'zbox-browser';

// read package.json to get the current version
const packageJSON = fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8');
const version = JSON.parse(packageJSON).version;

const releaseName = `zbox-browser-${version}`;
const releaseDir = `./dist/${releaseName}`;
const releaseFile = `${releaseName}.tar.gz`;
const tarball = `./dist/${releaseFile}`;

// create release dir and copy lib files to it
execSync(`rm -rf ${releaseDir}`);
execSync(`mkdir -p ${releaseDir}`);
execSync(`cp lib/* ${releaseDir}`);

// add release file
execSync(`echo 'ZboxFS browser js binding v${version}' > ${releaseDir}/release.txt`);

// create release tar ball
execSync(`tar zcf ${tarball} -C ./dist ${releaseName}`);
console.log(`Zbox release created at ${tarball}`);

// create Octokit instance
var token = process.env.ZBOX_BROWSER_GITHUB_TOKEN;
if(!token) throw new Error('ZBOX_BROWSER_GITHUB_TOKEN environment variable not found');
const octokit = Octokit({
  auth: token,
  baseUrl: 'https://api.github.com',
  userAgent: `Zbox browser js binding v${version}`,
});

(async () => {
  // get release list from GitHub
  const { data } = await octokit.repos.listReleases({ owner, repo });

  // find release of this version
  let release = data.find(release => release.tag_name === `${version}`);

  if (release) {
    // delete asset if it is already uploaded
    if (release.assets.length > 0) {
      await octokit.repos.deleteReleaseAsset({
        owner,
        repo,
        asset_id: release.assets[0].id
      });
    }

  } else {
    // if no release found, create a new draft release
    await octokit.repos.createRelease({
      owner,
      repo,
      tag_name: version,
      target_commitish: 'master',
      name: `v${version}`,
      body: `Zbox browser js binding v${version}`,
      draft: true,
      prerelease: false
    });
    console.log(`New draft release created v${version}`);
  }

  // then upload release tarball
  await octokit.repos.uploadReleaseAsset({
    url: release.upload_url,
    headers: {
      'content-type': 'application/gzip',
      'content-length': fs.statSync(tarball).size
    },
    name: releaseFile,
    file: fs.createReadStream(tarball)
  });
  console.log(`Zbox release asset ${releaseFile} uploaded`);

})();