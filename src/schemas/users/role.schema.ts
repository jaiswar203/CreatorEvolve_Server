import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, HydratedDocument, Document } from 'mongoose';
import { Permission } from './permission.schema';
import { ROLE } from '@/common/constants/roles.enum';

export type RoleDocument = HydratedDocument<Role>;

@Schema()
export class Role extends Document {
  @Prop({ type: String, unique: true, required: true, enum: ROLE })
  code: string;

  @Prop({ type: String })
  description: string;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Permission' }],
    default: [],
  })
  permissions: Permission[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);
