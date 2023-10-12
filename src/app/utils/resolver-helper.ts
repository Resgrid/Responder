import { DataStore } from '../shell/data-store';
import { Observable, of } from 'rxjs';

export interface IResolvedRouteData<T> {
  data: T | DataStore<T>;
}

export class ResolverHelper<T> {
  // More info on function overloads here: https://www.typescriptlang.org/docs/handbook/functions.html#overloads
  public static extractData<T>(source: (T | DataStore<T>), constructor: (new(...args: any[]) => T)): Observable<T> {
    if (source instanceof DataStore) {
      return source.state;
    } else if (source instanceof constructor) {
      // The right side of instanceof should be an expression evaluating to a constructor function (ie. a class), not a type
      // That's why we included an extra parameter which acts as a constructor function for type T
      // (see: https://github.com/microsoft/TypeScript/issues/5236)
      return of(source);
    }
  }
}
