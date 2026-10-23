import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PersonasModule } from '../personas/personas.module';
import { Desafio, DesafioSchema } from './schemas/desafio.schema';
import { DesafiosController } from './desafios.controller';
import { DesafiosService } from './desafios.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Desafio.name, schema: DesafioSchema }]),
    PersonasModule,
  ],
  controllers: [DesafiosController],
  providers: [DesafiosService],
  exports: [DesafiosService],
})
export class DesafiosModule {}
