import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import * as mongooseDelete from 'mongoose-delete';

export type ResearchDocument = HydratedDocument<Research> & mongooseDelete.SoftDeleteDocument;

@Schema()
export class Research extends Document {
  @Prop({ type: String })
  name: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ResearchChat' })
  chat_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: String })
  document: string; // this is the document which is created by user it will be simply the string with html tags
}

const ResearchSchema = SchemaFactory.createForClass(Research);

ResearchSchema.virtual('chat', {
  ref: 'ResearchChat',
  localField: 'chat_id',
  foreignField: '_id',
  justOne: true, // Set this to true if each research has only one chat
});

ResearchSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: 'all' });

ResearchSchema.set('toObject', { virtuals: true });
ResearchSchema.set('toJSON', { virtuals: true });

export { ResearchSchema };
