import {ObjectManagers} from '../../ObjectManagers';
import {DefaultsJobs} from '../../../../common/entities/job/JobDTO';
import {Job} from './Job';
import {DynamicConfig} from '../../../../common/entities/DynamicConfig';
import {SessionContext} from '../../SessionContext';
import {SQLConnection} from '../../database/SQLConnection';

export class AlbumCoverFillingJob extends Job {
  public readonly Name = DefaultsJobs[DefaultsJobs['Album Cover Filling']];
  public readonly ConfigTemplate: DynamicConfig[] = null;
  directoryToSetCover: { id: number; name: string; path: string }[] = null;
  status: 'Persons' | 'Albums' | 'Directory' = 'Persons';
  private availableSessions: SessionContext[];

  public get Supported(): boolean {
    return true;
  }

  protected async init(): Promise<void> {
    this.status = 'Persons';
  }

  protected async step(): Promise<boolean> {
    if (!this.directoryToSetCover) {
      this.Progress.log('Loading Directories to process');
      this.directoryToSetCover =
        await ObjectManagers.getInstance().CoverManager.getPartialDirsWithoutCovers();
      this.availableSessions = await ObjectManagers.getInstance().SessionManager.getAvailableUserSessions();
      this.Progress.Left = this.directoryToSetCover.length + 2;
      return true;
    }

    switch (this.status) {
      case 'Persons':
        await this.stepPersonsPreview();
        this.status = 'Albums';
        return true;
      case 'Albums':
        await this.stepAlbumCover();
        this.status = 'Directory';
        return true;
      case 'Directory':
        return await this.stepDirectoryCover();
    }
    return false;
  }

  private async stepAlbumCover(): Promise<boolean> {
    for (const session of this.availableSessions) {
      await ObjectManagers.getInstance().AlbumManager.getAll(session);
    }
    this.Progress.log('Updating Albums cover');
    this.Progress.Processed++;
    return false;
  }

  private async stepPersonsPreview(): Promise<boolean> {
    for (const session of this.availableSessions) {
      await ObjectManagers.getInstance().PersonManager.getAll(session);
    }
    this.Progress.log('Updating Persons preview');
    this.Progress.Processed++;
    return false;
  }

  private async stepDirectoryCover(): Promise<boolean> {
    if (this.directoryToSetCover.length === 0) {
      this.directoryToSetCover =
        await ObjectManagers.getInstance().CoverManager.getPartialDirsWithoutCovers();
      // double check if there is really no more
      if (this.directoryToSetCover.length > 0) {
        return true; // continue
      }
      this.Progress.Left = 0;
      return false;
    }
    const directory = this.directoryToSetCover.shift();
    this.Progress.log('Setting cover: ' + directory.path + directory.name);
    this.Progress.Left = this.directoryToSetCover.length;

    const conn = await SQLConnection.getConnection();
    for (const session of this.availableSessions) {
      await ObjectManagers.getInstance().ProjectedCacheManager.setAndGetCacheForDirectory(
        conn,
        session,
        directory
      );
    }
    this.Progress.Processed++;
    return true;
  }
}
