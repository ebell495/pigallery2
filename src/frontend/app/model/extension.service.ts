import {Injectable} from '@angular/core';
import {UIExtensionDTO} from '../../../common/entities/extension/IClientUIConfig';

/* Injected config / user from server side */
// eslint-disable-next-line @typescript-eslint/prefer-namespace-keyword, @typescript-eslint/no-namespace
declare module ServerInject {
  export let UIExtensionConfigs: UIExtensionDTO[];
}

@Injectable({
  providedIn: 'root'
})
export class ExtensionService {
  public readonly UIExtensionConfig: UIExtensionDTO[];

  constructor() {
    this.UIExtensionConfig = ServerInject.UIExtensionConfigs;
  }

}
