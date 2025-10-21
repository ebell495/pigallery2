import {NextFunction, Request, Response} from 'express';
import {Config} from '../../common/config/private/Config';

export class ServerTimeEntry {
  public name: string;
  startHR: [number, number];
  public endTime: number = null;

  constructor(name: string) {
    this.name = name;
  }

  public start(): void {
    this.startHR = process.hrtime();
  }

  public end(): void {
    const duration = process.hrtime(this.startHR);
    this.endTime = duration[0] * 1e3 + duration[1] * 1e-6;
  }
}

export const FunctionTime = (id: string, name: string) => {
  return (
    target: unknown,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => any>
  ): void => {
    if (Config.Server.Log.logServerTiming === false) {
      return;
    }
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]): any {
      const timer = new ServerTimeEntry(name);
      timer.start();

      try {
        const result = originalMethod.apply(this, args);

        // Handle both sync and async functions
        if (result && typeof result.then === 'function') {
          // Async function - return a promise that logs timing when resolved
          return result
            .then((value: any) => {
              timer.end();
              console.log(`[${id}] ${name}: ${timer.endTime.toFixed(2)}ms`);
              return value;
            })
            .catch((error: any) => {
              timer.end();
              console.log(`[${id}] ${name}: ${timer.endTime.toFixed(2)}ms (error)`);
              throw error;
            });
        } else {
          // Sync function - log timing immediately
          timer.end();
          console.log(`[${id}] ${name}: ${timer.endTime.toFixed(2)}ms`);
          return result;
        }
      } catch (error) {
        timer.end();
        console.log(`[${id}] ${name}: ${timer.endTime.toFixed(2)}ms (error)`);
        throw error;
      }
    } as any;
  };
};

export const ServerTime = (id: string, name: string) => {
  return (
      target: unknown,
      propertyName: string,
      descriptor: TypedPropertyDescriptor<(req: unknown, res: unknown, next: () => void) => void>
  ): void => {
    if (Config.Server.Log.logServerTiming === false) {
      return;
    }
    const m = descriptor.value;
    const customAction = (req: Request, res: Response, next: NextFunction) => {
      req.timing = req.timing || {};
      req.timing[id] = new ServerTimeEntry(name);
      req.timing[id].start();
      m(req, res, (err?: Error) => {
        req.timing[id].end();
        next(err);
      });
    };
    descriptor.value = new Function(
        'action',
        'return function ' + m.name + '(...args){ action(...args) };'
    )(customAction);
  };
};

const forcedDebug = process.env['NODE_ENV'] === 'debug';

export class ServerTimingMWs {
  /**
   * Add server timing
   */
  public static async addServerTiming(
      req: Request,
      res: Response,
      next: NextFunction
  ): Promise<void> {
    if (
        (Config.Server.Log.logServerTiming === false && !forcedDebug) ||
        !req.timing
    ) {
      return next();
    }
    const l = Object.entries(req.timing)
        .filter((e) => e[1].endTime)
        .map((e) => `${e[0]};dur=${e[1].endTime};desc="${e[1].name}"`);
    res.header('Server-Timing', l.join(', '));
    next();
  }
}
