import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Persona } from '../../personas/schemas/persona.schema';
import {
  CATEGORIAS_DESAFIO,
  PARTICIPANTES_POR_DEFECTO,
  calcularEstadoDesafio,
} from '../utils/desafio.utils';
import type { CategoriaDesafio, EstadoDesafio } from '../utils/desafio.utils';

export type DesafioDocument = HydratedDocument<Desafio>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, any>) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: (_doc, ret: Record<string, any>) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Desafio {
  @Prop({ required: true, trim: true, minlength: 3, maxlength: 60 })
  nombre: string;

  @Prop({ trim: true, maxlength: 280 })
  descripcion?: string;

  @Prop({ type: String, required: true, enum: CATEGORIAS_DESAFIO })
  categoria: CategoriaDesafio;

  /** Fecha calendario 'YYYY-MM-DD' (sin hora ni UTC), igual que en Personas. */
  @Prop({ required: true })
  fechaInicio: string;

  /** Fecha calendario 'YYYY-MM-DD' (sin hora ni UTC), igual que en Personas. */
  @Prop({ required: true })
  fechaFin: string;

  @Prop({
    required: true,
    default: PARTICIPANTES_POR_DEFECTO,
    min: 2,
    max: 20,
  })
  maxParticipantes: number;

  /** Generado por el servidor; nunca se repite (índice único). */
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  codigoInvitacion: string;

  @Prop({ type: MongooseSchema.ObjectId, ref: Persona.name, required: true })
  creador: Types.ObjectId;

  /** Incluye siempre al creador desde la creación. */
  @Prop({ type: [MongooseSchema.ObjectId], ref: Persona.name, required: true })
  participantes: Types.ObjectId[];

  /**
   * Historial de quienes abandonaron el desafío: conservan su registro pero
   * dejan de figurar en `participantes` (y en el ranking) y no pueden volver
   * a unirse.
   */
  @Prop({ type: [MongooseSchema.ObjectId], ref: Persona.name, default: [] })
  abandonados: Types.ObjectId[];

  /**
   * Único estado que no se puede deducir de las fechas, por eso se persiste.
   * PROGRAMADO / ACTIVO / FINALIZADO se calculan en el virtual `estado`.
   */
  @Prop({ required: true, default: false })
  cancelado: boolean;
}

export const DesafioSchema = SchemaFactory.createForClass(Desafio);

/**
 * Estado derivado en cada lectura: nunca queda desactualizado porque
 * se recalcula a partir de `cancelado`, `fechaInicio`, `fechaFin` y el día de hoy.
 */
DesafioSchema.virtual('estado').get(function (this: Desafio): EstadoDesafio {
  return calcularEstadoDesafio(this);
});

DesafioSchema.index({ codigoInvitacion: 1 }, { unique: true });
