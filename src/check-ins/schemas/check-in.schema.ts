import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Desafio } from '../../desafios/schemas/desafio.schema';
import { Persona } from '../../personas/schemas/persona.schema';

export type CheckInDocument = HydratedDocument<CheckIn>;

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
export class CheckIn {
  @Prop({ type: MongooseSchema.ObjectId, ref: Desafio.name, required: true })
  desafio: Types.ObjectId;

  @Prop({ type: MongooseSchema.ObjectId, ref: Persona.name, required: true })
  persona: Types.ObjectId;

  /**
   * Fecha calendario 'YYYY-MM-DD' en la zona horaria de la persona
   * (puede diferir del día en la zona del servidor o del desafío).
   */
  @Prop({ required: true })
  fecha: string;

  /** Nota opcional sobre el cumplimiento del objetivo. */
  @Prop({ trim: true, maxlength: 140 })
  nota?: string;

  /** Valor numérico opcional (minutos, kilómetros, páginas…). */
  @Prop()
  valor?: number;
}

export const CheckInSchema = SchemaFactory.createForClass(CheckIn);

// Regla: un único check-in por persona, por desafío y por día.
CheckInSchema.index({ desafio: 1, persona: 1, fecha: 1 }, { unique: true });
