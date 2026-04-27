import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight, Check, Save, Loader2, AlertCircle, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { uploadCourseBatch, generateTempId, uploadLessonImage, WizardCourseData, WizardTopicData, WizardLessonData, WizardBatchPayload } from '../utils/courseWizardService';
import { resolveMediaUrl } from '../utils/api';
import { LessonAttachmentsField } from './LessonAttachmentsField';

// Step indicator component
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const steps = ['Course Basics', 'Add Topics', 'Day-Wise Lessons', 'Review & Publish'];
  
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold transition-all ${
              index < currentStep 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : index === currentStep 
                  ? 'border-blue-600 text-blue-600 bg-white' 
                  : 'border-gray-300 text-gray-400 bg-white'
            }`}>
              {index < currentStep ? <Check className="h-5 w-5" /> : index + 1}
            </div>
            <span className={`ml-2 text-sm font-medium ${
              index <= currentStep ? 'text-gray-900' : 'text-gray-400'
            }`}>
              {step}
            </span>
            {index < totalSteps - 1 && (
              <div className={`flex-1 h-0.5 mx-4 ${
                index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Wizard Component
export default function CourseWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  // Wizard state
  const [courseData, setCourseData] = useState<WizardCourseData>({
    name: '',
    description: '',
    icon: 'Briefcase',
    color: '#4299E1',
    order: 1,
    attachments: [],
  });
  
  const [topics, setTopics] = useState<WizardTopicData[]>([]);
  const [lessons, setLessons] = useState<WizardLessonData[]>([]);
  
  // Load draft from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('courseWizardDraft');
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.courseData) setCourseData(draft.courseData);
        if (draft.topics) setTopics(draft.topics);
        if (draft.lessons) setLessons(draft.lessons);
        if (draft.currentStep) setCurrentStep(draft.currentStep);
        toast.info('Draft restored');
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, []);
  
  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('courseWizardDraft', JSON.stringify({
        courseData,
        topics,
        lessons,
        currentStep,
      }));
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [courseData, topics, lessons, currentStep]);
  
  const handleNext = useCallback(() => {
    if (currentStep === 0) {
      // Validate course basics
      if (!courseData.name.trim()) {
        toast.error('Course name is required');
        return;
      }
    }
    
    if (currentStep === 1) {
      // Validate topics
      if (topics.length === 0) {
        toast.error('Add at least one topic');
        return;
      }
    }
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, courseData.name, topics.length]);
  
  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);
  
  const handlePublish = useCallback(async () => {
    try {
      setIsSaving(true);
      
      // Build payload
      const payload: WizardBatchPayload = {
        course: courseData,
        topics: topics.map(topic => ({
          topic: {
            name: topic.name,
            description: topic.description,
            icon: topic.icon,
            color: topic.color,
            image: topic.image,
            order: topic.order,
            attachments: topic.attachments,
          },
          lessons: lessons
            .filter(l => l.topicId === topic.id)
            .map(lesson => ({
              title: lesson.title,
              content: lesson.content,
              day: lesson.day,
              type: lesson.type,
              order: lesson.order,
              images: lesson.images,
              attachments: lesson.attachments,
            })),
        })),
      };
      
      await uploadCourseBatch(payload);
      
      // Clear draft
      localStorage.removeItem('courseWizardDraft');
      
      toast.success('Course published successfully!');
      navigate('/admin/courses');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish course');
    } finally {
      setIsSaving(false);
    }
  }, [courseData, topics, lessons, navigate]);
  
  const handleCancel = useCallback(() => {
    if (confirm('Are you sure you want to cancel? Your progress will be saved as a draft.')) {
      navigate('/admin/courses');
    }
  }, [navigate]);
  
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-20 bg-gray-50">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Courses
            </button>
            <h1 className="text-3xl font-bold">Create New Course</h1>
            <p className="text-gray-600 mt-2">
              Follow the steps below to create your course with topics and day-wise lessons
            </p>
          </div>
        </div>
        
        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} totalSteps={4} />
        
        {/* Wizard Content */}
        <Card className="p-8 min-h-[500px]">
          {currentStep === 0 && (
            <CourseBasicsStep 
              courseData={courseData} 
              onChange={setCourseData} 
            />
          )}
          {currentStep === 1 && (
            <TopicsStep 
              topics={topics}
              onChange={setTopics}
            />
          )}
          {currentStep === 2 && (
            <LessonsStep 
              topics={topics}
              lessons={lessons}
              onChange={setLessons}
            />
          )}
          {currentStep === 3 && (
            <ReviewStep 
              courseData={courseData}
              topics={topics}
              lessons={lessons}
            />
          )}
        </Card>
        
        {/* Navigation Buttons */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0 || isSaving}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex gap-3">
            {currentStep < 3 ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handlePublish}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Publish Course
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 1: Course Basics Form
function CourseBasicsStep({ courseData, onChange }: { courseData: WizardCourseData; onChange: (data: WizardCourseData) => void }) {
  const [imageBusy, setImageBusy] = useState(false);
  
  const iconOptions = [
    'Briefcase', 'Code', 'Palette', 'FileText', 'Sheet', 'Presentation',
    'Layout', 'Braces', 'Database', 'Globe', 'Smartphone', 'Camera',
    'Book', 'GraduationCap', 'Users', 'Zap', 'Settings', 'Heart',
    'Star', 'Lightbulb', 'Puzzle', 'Target', 'Rocket', 'Shield',
  ];
  
  const colorOptions = [
    '#4299E1', '#48BB78', '#F6AD55', '#FC8181', '#B794F4',
    '#63B3ED', '#68D391', '#F6E05E', '#FEB2B2', '#D6BCFA',
    '#4C51BF', '#38A169', '#DD6B20', '#E53E3E', '#805AD5',
  ];
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Course Basics</h2>
        <p className="text-gray-600">Enter the fundamental details about your course</p>
      </div>
      
      {/* Course Name */}
      <div>
        <Label htmlFor="courseName">Course Name *</Label>
        <Input
          id="courseName"
          value={courseData.name}
          onChange={(e) => onChange({ ...courseData, name: e.target.value })}
          placeholder="e.g., Complete Django Development"
          className="mt-2"
        />
      </div>
      
      {/* Description */}
      <div>
        <Label htmlFor="courseDesc">Description</Label>
        <Textarea
          id="courseDesc"
          value={courseData.description}
          onChange={(e) => onChange({ ...courseData, description: e.target.value })}
          placeholder="Brief description of what students will learn"
          rows={4}
          className="mt-2"
        />
      </div>
      
      {/* Icon Selection */}
      <div>
        <Label>Icon</Label>
        <div className="grid grid-cols-8 gap-2 mt-2">
          {iconOptions.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => onChange({ ...courseData, icon })}
              className={`p-3 rounded-lg border-2 transition-all ${
                courseData.icon === icon
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              title={icon}
            >
              <span className="text-xs">{icon.substring(0, 2)}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">Selected: {courseData.icon}</p>
      </div>
      
      {/* Color Selection */}
      <div>
        <Label>Color</Label>
        <div className="grid grid-cols-10 gap-2 mt-2">
          {colorOptions.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange({ ...courseData, color })}
              className={`w-12 h-12 rounded-lg border-2 transition-all ${
                courseData.color === color
                  ? 'border-gray-900 scale-110'
                  : 'border-transparent hover:border-gray-300'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Label htmlFor="customColor">Custom:</Label>
          <Input
            id="customColor"
            type="color"
            value={courseData.color}
            onChange={(e) => onChange({ ...courseData, color: e.target.value })}
            className="w-20 h-10"
          />
        </div>
      </div>
      
      {/* Banner Image */}
      <div>
        <Label>Course Banner Image (Optional)</Label>
        <div className="mt-2 space-y-3">
          {courseData.image && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200">
              <img
                src={resolveMediaUrl(courseData.image)}
                alt="Course banner"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => onChange({ ...courseData, image: undefined })}
                className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-sm"
                title="Remove image"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full relative"
            disabled={imageBusy}
          >
            {imageBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {courseData.image ? 'Change Image' : 'Upload Image'}
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setImageBusy(true);
                  const url = await uploadLessonImage(file);
                  onChange({ ...courseData, image: url });
                  toast.success('Image uploaded');
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Upload failed');
                } finally {
                  setImageBusy(false);
                }
              }}
            />
          </Button>
        </div>
      </div>
      
      {/* Attachments */}
      <div>
        <Label>Course Materials & Attachments (Optional)</Label>
        <p className="text-xs text-gray-500 mb-3">
          Upload PDFs, documents, and other course-level resources
        </p>
        <LessonAttachmentsField
          attachments={courseData.attachments || []}
          onAttachmentsChange={(attachments) => {
            const newAttachments = typeof attachments === 'function' ? attachments(courseData.attachments || []) : attachments;
            onChange({ ...courseData, attachments: newAttachments });
          }}
        />
      </div>
    </div>
  );
}

function TopicsStep({ topics, onChange }: any) {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold mb-4">Step 2: Add Topics</h2>
      <p className="text-gray-600">Topics management interface will be implemented here</p>
    </div>
  );
}

function LessonsStep({ topics, lessons, onChange }: any) {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold mb-4">Step 3: Day-Wise Lessons</h2>
      <p className="text-gray-600">Day-wise lessons builder will be implemented here</p>
    </div>
  );
}

function ReviewStep({ courseData, topics, lessons }: any) {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold mb-4">Step 4: Review & Publish</h2>
      <p className="text-gray-600">Review summary will be implemented here</p>
    </div>
  );
}
