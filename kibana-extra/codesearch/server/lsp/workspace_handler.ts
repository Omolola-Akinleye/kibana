/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import fs from 'fs';
import { Clone, Commit, Error, Repository, Reset } from 'nodegit';
import path from 'path';
import Url from 'url';
import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { Location, TextDocumentPositionParams } from 'vscode-languageserver';
import { Full } from '../../../../lsp/javascript-typescript-langserver/src/lsp-extend';
import { LspRequest } from '../../model';
import { GitOperations } from '../git_operations';
import { Log } from '../log';

export class WorkspaceHandler {
  private git: GitOperations;
  private log: Log;
  private revisionMap: { [uri: string]: string } = {};

  constructor(readonly repoPath: string, private readonly workspacePath: string, log: Log) {
    this.git = new GitOperations(repoPath);
    this.log = log;
  }

  /**
   * open workspace for repositoryUri, updated it from bare repository if need.
   * @param repositoryUri the uri of bare repository.
   * @param revision
   */
  public async openWorkspace(repositoryUri: string, revision: string) {
    const bareRepo = await this.git.openRepo(repositoryUri);
    const targetCommit = await this.git.getCommit(bareRepo, revision);
    if (revision !== 'head') {
      await this.checkCommit(bareRepo, targetCommit);
      revision = 'head';
    }
    let workspaceRepo: Repository;
    if (this.workspaceExists(repositoryUri, revision)) {
      workspaceRepo = await this.updateWorkspace(repositoryUri, revision, targetCommit);
    } else {
      workspaceRepo = await this.cloneWorkspace(bareRepo, repositoryUri, revision);
    }
    const headCommit = await workspaceRepo.getHeadCommit();
    if (headCommit.sha() !== targetCommit.sha()) {
      const commit = await workspaceRepo.getCommit(targetCommit.sha());
      this.log.info(`checkout ${workspaceRepo.workdir()} to commit ${targetCommit.sha()}`);
      const result = await Reset.reset(workspaceRepo, commit, Reset.TYPE.HARD, {});
      if (result !== undefined && result !== Error.CODE.OK) {
        throw Boom.internal(`checkout workspace to commit ${targetCommit.sha()} failed.`);
      }
    }
    this.setWorkspaceRevision(workspaceRepo, headCommit);
    return { workspaceRepo, workspaceRevision: headCommit.sha().substring(0, 7) };
  }

  public async handleRequest(request: LspRequest): Promise<void> {
    const { method, params } = request;
    switch (method) {
      case 'textDocument/definition':
      case 'textDocument/hover':
      case 'textDocument/references':
      case 'textDocument/documentSymbol':
      case 'textDocument/full': {
        const payload: TextDocumentPositionParams = params;
        const { filePath, workspacePath, workspaceRevision } = await this.resolveUri(
          params.textDocument.uri
        );
        if (filePath) {
          payload.textDocument.uri = request.resolvedFilePath = filePath;
          request.workspacePath = workspacePath;
          request.workspaceRevision = workspaceRevision;
        }
        break;
      }
      default:
      // do nothing
    }
  }

  public handleResponse(request: LspRequest, response: ResponseMessage): ResponseMessage {
    const { method } = request;
    switch (method) {
      case 'textDocument/definition': {
        const result = response.result;
        if (result) {
          if (Array.isArray(result)) {
            (result as Location[]).forEach(location => this.convertLocation(location));
          } else {
            this.convertLocation(result);
          }
        }
        return response;
      }
      case 'textDocument/full': {
        const result = Array.isArray(response.result)
          ? (response.result as Full[])
          : [response.result as Full];
        for (const full of result) {
          if (full.symbols) {
            for (const symbol of full.symbols) {
              this.convertLocation(symbol.symbolInformation.location);
            }
          }
          if (full.references) {
            for (const reference of full.references) {
              this.convertLocation(reference.location);
            }
          }
        }
        return response;
      }
      case 'textDocument/references': {
        if (response.result) {
          for (const location of response.result as Location[]) {
            this.convertLocation(location);
          }
        }
        return response;
      }
      case 'textDocument/documentSymbol': {
        if (response.result) {
          for (const symbol of response.result) {
            this.convertLocation(symbol.location);
          }
        }
        return response;
      }
      default:
        return response;
    }
  }

  // todo add an unit test
  private convertLocation(location: Location) {
    const uri = location.uri;
    if (uri && uri.startsWith('file://')) {
      const filePath = uri.substring('file://'.length);
      if (filePath.startsWith(this.workspacePath)) {
        const relativePath = path.relative(this.workspacePath, filePath);
        const regex = /^(.*?\/.*?\/.*?)\/(.*?)\/(.*)$/;
        const m = relativePath.match(regex);
        if (m) {
          const repoUri = m[1];
          const revision = m[2];
          const gitRevision = this.revisionMap[`${repoUri}/${revision}`] || revision;
          const file = m[3];
          location.uri = `git://${repoUri}?${gitRevision}#${file}`;
        }
      }
    }
  }

  /**
   * convert a git uri to absolute file path, checkout code into workspace
   * @param uri the uri
   */
  private async resolveUri(uri: string) {
    if (uri.startsWith('git://')) {
      const url = Url.parse(uri);
      const domain = url.hostname;
      const repo = url.pathname;
      const revision = url.query ? url.query.toLocaleLowerCase() : 'head';
      const filePath = url.hash ? url.hash.substr(1) : '/';
      const repositoryUri = `${domain}/${repo}`;
      const { workspaceRepo, workspaceRevision } = await this.openWorkspace(
        repositoryUri,
        revision
      );
      return {
        workspacePath: workspaceRepo.workdir(),
        filePath: `file://${path.resolve(workspaceRepo.workdir(), filePath)}`,
        uri,
        workspaceRevision,
      };
    } else {
      return {
        workspacePath: undefined,
        workspaceRevision: undefined,
        filePath: undefined,
        uri,
      };
    }
  }

  private async checkCommit(repository: Repository, commit: Commit) {
    // we only support HEAD now.
    const head = await repository.getHeadCommit();
    if (head.sha() !== commit.sha()) {
      throw Boom.badRequest(`revision must be HEAD.`);
    }
  }

  private workspaceExists(repositoryUri: string, revision: string) {
    const workspaceDir = path.join(this.workspacePath, repositoryUri, revision);
    return fs.existsSync(workspaceDir);
  }

  private async updateWorkspace(
    repositoryUri: string,
    revision: string,
    targetCommit: Commit
  ): Promise<Repository> {
    const workspaceDir = path.join(this.workspacePath, repositoryUri, revision);
    const workspaceRepo = await Repository.open(workspaceDir);
    const workspaceHead = await workspaceRepo.getHeadCommit();
    if (workspaceHead.sha() !== targetCommit.sha()) {
      this.log.info(`fetch workspace ${workspaceDir} from origin`);
      await workspaceRepo.fetch('origin');
    }
    return workspaceRepo;
  }

  private async cloneWorkspace(
    bareRepo: Repository,
    repositoryUri: string,
    revision: string
  ): Promise<Repository> {
    const workspaceDir = path.join(this.workspacePath, repositoryUri, revision);
    this.log.info(`clone workspace ${workspaceDir} from url ${bareRepo.path()}`);
    return await Clone.clone(bareRepo.path(), workspaceDir);
  }

  private setWorkspaceRevision(workspaceRepo: Repository, headCommit: Commit) {
    const workspaceRelativePath = path.relative(this.workspacePath, workspaceRepo.workdir());
    this.revisionMap[workspaceRelativePath] = headCommit.sha().substring(0, 7);
  }
}
