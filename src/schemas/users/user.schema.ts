import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Role } from './role.schema';
import { Video } from '@/schemas/videos/video.schema';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User extends Document {
  @Prop({ required: true, type: String })
  name: string;

  @Prop({
    required: true,
    unique: true,
    validate: {
      validator: function (v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: (props) => `${props.value} is not a valid email!`,
    },
    type: String,
  })
  email: string;

  @Prop({ type: String })
  img: string;

  @Prop()
  phone: string;

  @Prop({ required: true, default: false, type: Boolean })
  is_verified: boolean;

  @Prop({ type: Number, required: true, default: 0 })
  credits: number;

  @Prop({type:String})
  password: string;

  @Prop({type:String})
  google_id: string;

  @Prop({type:String})
  google_access_token: string;

  @Prop({type:String})
  google_refresh_token: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Role' }] })
  roles: Role[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Video' }] })
  videos: Video[];
}

export const UserSchema = SchemaFactory.createForClass(User);
