import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AbandonarDesafioDto } from './dto/abandonar-desafio.dto';
import { CancelarDesafioDto } from './dto/cancelar-desafio.dto';
import { CreateDesafioDto } from './dto/create-desafio.dto';
import { ListarDesafiosQueryDto } from './dto/listar-desafios.query.dto';
import { UnirseDesafioDto } from './dto/unirse-desafio.dto';
import { UpdateDesafioDto } from './dto/update-desafio.dto';
import { DesafiosService } from './desafios.service';

@Controller('desafios')
export class DesafiosController {
  constructor(private readonly desafiosService: DesafiosService) {}

  @Post()
  create(@Body() createDesafioDto: CreateDesafioDto) {
    return this.desafiosService.create(createDesafioDto);
  }

  @Get()
  findAll(@Query() filtro: ListarDesafiosQueryDto) {
    return this.desafiosService.findAll(filtro);
  }
  
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.desafiosService.findOne(id);
  }
  
  // Las rutas con prefijo fijo deben ir antes de @Get(':id') para que
  // 'codigo', 'persona', etc. no se interpreten como un id.
  @Get('persona/:personaId')
  findByPersona(@Param('personaId') personaId: string) {
    return this.desafiosService.findByPersona(personaId);
  }

  @Get('codigo/:codigo')
  findByCodigo(@Param('codigo') codigo: string) {
    return this.desafiosService.findByCodigo(codigo);
  }


  @Get(':id/participantes')
  findParticipantes(@Param('id') id: string) {
    return this.desafiosService.findParticipantes(id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('unirse')
  unirse(@Body() unirseDesafioDto: UnirseDesafioDto) {
    return this.desafiosService.unirse(unirseDesafioDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDesafioDto: UpdateDesafioDto,
  ) {
    return this.desafiosService.update(id, updateDesafioDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/cancelar')
  cancelar(
    @Param('id') id: string,
    @Body() cancelarDesafioDto: CancelarDesafioDto,
  ) {
    return this.desafiosService.cancelar(id, cancelarDesafioDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/abandonar')
  abandonar(
    @Param('id') id: string,
    @Body() abandonarDesafioDto: AbandonarDesafioDto,
  ) {
    return this.desafiosService.abandonar(id, abandonarDesafioDto);
  }
}
