import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  Document,
  HydratedDocument,
  Schema as MongooseSchema,
  Model,
} from 'mongoose';
import { ROLE } from '@/common/constants/roles.enum';
import { Video } from '@/db/schemas/media/video.schema';
import { Dubbing } from '../media/dubbing.schema';
import { Audio } from '../media/audio.schema';

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

  @Prop({ type: String })
  password: string;

  @Prop({ type: String })
  google_id: string;

  @Prop({ type: String })
  google_access_token: string;

  @Prop({ type: String })
  google_refresh_token: string;

  @Prop({ type: Boolean })
  is_google_authenticated: boolean;

  @Prop({ type: Boolean })
  is_youtube_authenticated: boolean;

  @Prop({ type: [{ type: String, enum: ROLE }], default: [ROLE.USER] })
  roles: ROLE[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Video' }] })
  videos: Video[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Audio' }] })
  audios: Audio[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Dubbing' }] })
  dubbings: Dubbing[];

  @Prop({ type: Number, unique: true })
  access_code: number;

  @Prop({ type: String })
  refresh_token: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Function to generate a random 6-digit access code
const generateAccessCode = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

// Function to check if an access code is unique
const isAccessCodeUnique = async (code, model) => {
  const user = await model.findOne({ access_code: code });
  return !user;
};

// Middleware to generate a unique access code before saving
UserSchema.pre('save', async function (next) {
  const user = this as UserDocument;
  const UserModel = this.constructor as Model<UserDocument>;

  if (user.isNew || user.isModified('access_code')) {
    let accessCode = generateAccessCode();
    while (!(await isAccessCodeUnique(accessCode, UserModel))) {
      accessCode = generateAccessCode();
    }
    user.access_code = accessCode;
  }

  next();
});
