import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "Briefcase" },
    color: { type: String, default: "#4299E1" },
    image: { type: String, default: "" },
    order: { type: Number, default: 1 },
    attachments: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

const topicSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "FileText" },
    color: { type: String, default: "#4299E1" },
    image: { type: String, default: "" },
    order: { type: Number, default: 1 },
    attachments: { type: [String], default: [] },
  },
  { versionKey: false },
);

const lessonSchema = new mongoose.Schema(
  {
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
      required: true,
      index: true,
    },
    day: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    type: {
      type: String,
      enum: ["teaching", "practice", "project"],
      default: "teaching",
    },
    order: { type: Number, default: 1 },
    images: { type: [String], default: [] },
    attachments: { type: [String], default: [] },
  },
  { versionKey: false },
);

export const Course =
  mongoose.models.Course || mongoose.model("Course", courseSchema);
export const Topic =
  mongoose.models.Topic || mongoose.model("Topic", topicSchema);
export const Lesson =
  mongoose.models.Lesson || mongoose.model("Lesson", lessonSchema);
