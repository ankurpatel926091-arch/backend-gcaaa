import mongoose from 'mongoose';

const contactPageContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'contact-page',
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

const ContactPageContent = mongoose.model(
  'ContactPageContent',
  contactPageContentSchema
);

export default ContactPageContent;
