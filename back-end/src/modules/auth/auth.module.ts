import { Global, Module } from '@nestjs/common';
import { StateModule } from '../state/state.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Global()
@Module({ imports: [StateModule], controllers: [AuthController], providers: [AuthService], exports: [AuthService] })
export class AuthModule {}
