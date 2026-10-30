import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DesafiosModule } from '../desafios/desafios.module';
import { PersonasModule } from '../personas/personas.module';
import { CheckInsController } from './check-ins.controller';
import { CheckInsService } from './check-ins.service';
import { CheckIn, CheckInSchema } from './schemas/check-in.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CheckIn.name, schema: CheckInSchema },
    ]),
    forwardRef(() => DesafiosModule),
    PersonasModule,
  ],
  providers: [CheckInsService],
  controllers: [CheckInsController],
  exports: [CheckInsService],
})
export class CheckInsModule {}
