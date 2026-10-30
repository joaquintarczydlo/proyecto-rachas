import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PersonasModule } from '../personas/personas.module';
import { CheckInsModule } from '../check-ins/check-ins.module';
import { Desafio, DesafioSchema } from './schemas/desafio.schema';
import { DesafiosController } from './desafios.controller';
import { DesafiosService } from './desafios.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Desafio.name, schema: DesafioSchema },
    ]),
    forwardRef(() => CheckInsModule),
    PersonasModule,
  ],
  controllers: [DesafiosController],
  providers: [DesafiosService],
  exports: [DesafiosService],
})
export class DesafiosModule {}
