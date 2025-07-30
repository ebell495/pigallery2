import {NextFunction, Request, Response} from 'express';
import {ErrorCodes, ErrorDTO} from '../../../common/entities/Error';
import {ObjectManagers} from '../../model/ObjectManagers';
import {StatisticDTO} from '../../../common/entities/settings/StatisticDTO';
import {MessengerRepository} from '../../model/messenger/MessengerRepository';
import {JobStartDTO} from '../../../common/entities/job/JobDTO';
import {ExtensionListItem} from '../../../common/entities/extension/ExtensionListItem';

export class ExtensionMWs {
  public static async getExtensionList(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Use the new wrapper function to get extensions with installed status
      req.resultPipe = await ObjectManagers.getInstance().ExtensionManager.getExtensionListWithInstallStatus();
      return next();
    } catch (err) {
      if (err instanceof Error) {
        return next(
          new ErrorDTO(
            ErrorCodes.JOB_ERROR,
            'Job error: ' + err.toString(),
            err
          )
        );
      }
      return next(
        new ErrorDTO(
          ErrorCodes.JOB_ERROR,
          'Job error: ' + JSON.stringify(err, null, '  '),
          err
        )
      );
    }
  }

  public static async installExtension(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Extract the extension ID from the request body
      const extensionId = req.body.id;

      if (!extensionId) {
        return next(
          new ErrorDTO(
            ErrorCodes.INPUT_ERROR,
            'Extension ID is required'
          )
        );
      }

      // Call the installExtension method on the ExtensionManager
      await ObjectManagers.getInstance().ExtensionManager.installExtension(extensionId);

      // Set the result to an empty object (success)
      req.resultPipe = { success: true };
      return next();
    } catch (err) {
      if (err instanceof Error) {
        return next(
          new ErrorDTO(
            ErrorCodes.JOB_ERROR,
            'Extension installation error: ' + err.toString(),
            err
          )
        );
      }
      return next(
        new ErrorDTO(
          ErrorCodes.JOB_ERROR,
          'Extension installation error: ' + JSON.stringify(err, null, '  '),
          err
        )
      );
    }
  }
}
