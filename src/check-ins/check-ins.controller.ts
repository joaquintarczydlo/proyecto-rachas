import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CheckInsService } from './check-ins.service';
import { CreateCheckInDto } from './dto/create-check-in.dto';
import { DeshacerCheckInDto } from './dto/deshacer-check-in.dto';
import { ListarCheckInsQueryDto } from './dto/listar-check-ins.query.dto';

/**
 * Check-ins anidados en el desafío:
 * `/desafios/:desafioId/check-ins`. Vive en CheckInsModule para no generar
 * una dependencia circular con DesafiosModule.
 */
@Controller('desafios/:desafioId/check-ins')
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post()
  registrar(
    @Param('desafioId') desafioId: string,
    @Body() createCheckInDto: CreateCheckInDto,
  ) {
    return this.checkInsService.registrar(desafioId, createCheckInDto);
  }

  @Get()
  findByPersona(
    @Param('desafioId') desafioId: string,
    @Query() filtro: ListarCheckInsQueryDto,
  ) {
    return this.checkInsService.findByPersona(desafioId, filtro.personaId);
  }

  @HttpCode(HttpStatus.OK)
  @Delete('ultimo')
  deshacer(
    @Param('desafioId') desafioId: string,
    @Body() deshacerCheckInDto: DeshacerCheckInDto,
  ) {
    return this.checkInsService.deshacer(desafioId, deshacerCheckInDto);
  }
}
