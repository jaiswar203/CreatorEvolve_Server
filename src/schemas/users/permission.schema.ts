import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Document } from 'mongoose';
import { PERMISSION } from '@/common/constants/permission.enum';

export type PermissionDocument = HydratedDocument<Permission>;

@Schema()
export class Permission extends Document {
  @Prop({ type: String, unique: true, required: true, enum: PERMISSION })
  code: string;

  @Prop({ type: String })
  description: string;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
