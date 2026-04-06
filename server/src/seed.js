import { trimEnvQuotes } from './loadEnv.js';
import mongoose from 'mongoose';
import { Course, Topic, Lesson } from './models.js';

const MONGODB_URI =
  trimEnvQuotes(process.env.MONGODB_URI) ||
  'mongodb://127.0.0.1:27017/course_management';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const c = await Course.countDocuments();
  if (c > 0) {
    console.log('Database already has courses; skip seed.');
    await mongoose.disconnect();
    return;
  }

  const office = await Course.create({
    name: 'Microsoft Office',
    description:
      'Complete Microsoft Office Suite training including Word, Excel, PowerPoint, and more.',
    icon: 'Briefcase',
    color: '#4299E1',
  });

  const word = await Topic.create({
    courseId: office._id,
    name: 'MS Word',
    description: 'Document creation and formatting',
    icon: 'FileText',
    color: '#2B6CB0',
    order: 1,
  });

  await Lesson.create([
    {
      topicId: word._id,
      day: 1,
      title: 'Introduction to MS Word',
      content:
        'Learn the basics of Microsoft Word interface, creating new documents, and saving files.',
      type: 'teaching',
      order: 1,
    },
    {
      topicId: word._id,
      day: 1,
      title: 'Create Your First Document',
      content: 'Practice creating a professional letter using proper formatting.',
      type: 'practice',
      order: 2,
      images: [],
    },
  ]);

  console.log('Seed complete: sample course + topic + lessons.');
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
