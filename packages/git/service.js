const { promisify } = require('util');
const mkdirp = promisify(require('mkdirp'));
const filenamifyUrl = require('filenamify-url');
const { existsSync } = require('fs');
const { join } = require('path');
const { Clone, Cred } = require('@cardstack/nodegit');

class GitLocalCache {
  constructor() {
    this._remotes = new Map();
  }

  async getRepo(remoteUrl, remote) {
    let existingRepo = this._remotes.get(remoteUrl);

    if (existingRepo) {
      return existingRepo.repo;
    }

    let cacheDirectory = remote.cacheDir || '/srv/hub/local-git-repos';

    let repoPath = join(cacheDirectory, filenamifyUrl(remote.url));

    if(!existsSync(repoPath)) {
      await mkdirp(repoPath);
    }

    let fetchOpts = {
      callbacks: {
        credentials: (url, userName) => {
          if (remote.privateKey) {
            return Cred.sshKeyMemoryNew(userName, remote.publicKey || '', remote.privateKey, remote.passphrase || '');
          }
          return Cred.sshKeyFromAgent(userName);
        }
      }
    };

    let repo = await Clone(remote.url, repoPath, {
      fetchOpts
    });

    this._remotes.set(remote.url, {
      repo,
      fetchOpts,
      repoPath,
    });

    return repo;
  }
}

module.exports = new GitLocalCache();
