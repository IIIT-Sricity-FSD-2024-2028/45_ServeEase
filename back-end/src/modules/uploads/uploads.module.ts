import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { UploadOwnerContextMiddleware } from './upload-owner-context.middleware';

@Module({ controllers: [UploadsController], providers: [UploadsService] })
export class UploadsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(UploadOwnerContextMiddleware)
      .forRoutes(
        { path: 'uploads/verification', method: RequestMethod.POST },
        { path: 'uploads/tickets', method: RequestMethod.POST },
        { path: 'uploads/profiles/photo', method: RequestMethod.POST },
      );
  }
}
