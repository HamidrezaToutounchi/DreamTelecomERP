import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Decimal } from '@prisma/client/runtime/library';

function serializeDecimals(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Decimal) {
    return obj.toFixed(2);
  }

  if (typeof obj === 'object' && obj.isDecimal && typeof obj.toFixed === 'function') {
    return obj.toFixed(2);
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeDecimals);
  }

  if (typeof obj === 'object') {
    // If it's Date, keep it as is (JSON.stringify converts it to ISO string)
    if (obj instanceof Date) {
      return obj;
    }
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = serializeDecimals(obj[key]);
    }
    return result;
  }

  return obj;
}

@Injectable()
export class DecimalTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => serializeDecimals(data)));
  }
}
