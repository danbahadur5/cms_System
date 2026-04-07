import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import {
  fetchAdminTree,
  createCourse,
  updateCourse,
  deleteCourse,
  createTopic,
  updateTopic,
  deleteTopic,
  createLesson,
  updateLesson,
  deleteLesson,
} from "../utils/courseService";
import type { Course, Topic, Lesson } from "../types/course";
import { resolveMediaUrl } from "../utils/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { ImageLightboxDialog } from "../components/ImageLightboxDialog";
import { LessonPracticeImagesField } from "../components/LessonPracticeImagesField";
import { LessonAttachmentsField } from "../components/LessonAttachmentsField";
import { toast } from "sonner";

type DialogType = "course" | "topic" | "lesson" | null;

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(
    new Set(),
  );
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [parentId, setParentId] = useState<string>("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{
    type: DialogType;
    id: string;
  } | null>(null);

  // Form states
  const [courseName, setCourseName] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseIcon, setCourseIcon] = useState("Briefcase");
  const [courseColor, setCourseColor] = useState("#4299E1");
  const [courseImage, setCourseImage] = useState("");
  const [courseImageBusy, setCourseImageBusy] = useState(false);

  const [topicName, setTopicName] = useState("");
  const [topicDesc, setTopicDesc] = useState("");
  const [topicIcon, setTopicIcon] = useState("FileText");
  const [topicColor, setTopicColor] = useState("#4299E1");
  const [topicImage, setTopicImage] = useState("");
  const [topicImageBusy, setTopicImageBusy] = useState(false);
  const [topicOrder, setTopicOrder] = useState("1");

  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonDay, setLessonDay] = useState("1");
  const [lessonType, setLessonType] = useState<
    "teaching" | "practice" | "project"
  >("teaching");
  const [lessonOrder, setLessonOrder] = useState("1");

  const [lessonImages, setLessonImages] = useState<string[]>([]);
  const [practiceImagesBusy, setPracticeImagesBusy] = useState(false);
  const [lessonAttachments, setLessonAttachments] = useState<string[]>([]);
  const [attachmentsBusy, setAttachmentsBusy] = useState(false);
  const [imageLightbox, setImageLightbox] = useState<{
    urls: string[];
    index: number;
  } | null>(null);

  const topicsForCourse = useCallback(
    (courseId: string) =>
      allTopics
        .filter((t) => t.courseId === courseId)
        .sort((a, b) => a.order - b.order),
    [allTopics],
  );

  const lessonsForTopic = useCallback(
    (topicId: string) =>
      allLessons
        .filter((l) => l.topicId === topicId)
        .sort((a, b) => a.day - b.day || a.order - b.order),
    [allLessons],
  );

  const refreshData = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const tree = await fetchAdminTree();
      setCourses(tree.courses);
      setAllTopics(tree.topics);
      setAllLessons(tree.lessons);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load catalog");
      setCourses([]);
      setAllTopics([]);
      setAllLessons([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const toggleCourse = (courseId: string) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseId)) {
      newExpanded.delete(courseId);
    } else {
      newExpanded.add(courseId);
    }
    setExpandedCourses(newExpanded);
  };

  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  const openDialog = (type: DialogType, parent?: string, item?: any) => {
    setDialogType(type);
    setEditingItem(item || null);
    setParentId(parent || "");

    if (item) {
      if (type === "course") {
        setCourseName(item.name);
        setCourseDesc(item.description);
        setCourseIcon(item.icon);
        setCourseColor(item.color);
        setCourseImage(item.image || "");
      } else if (type === "topic") {
        setTopicName(item.name);
        setTopicDesc(item.description);
        setTopicIcon(item.icon);
        setTopicColor(item.color);
        setTopicImage(item.image || "");
        setTopicOrder(item.order.toString());
      } else if (type === "lesson") {
        setLessonTitle(item.title);
        setLessonContent(item.content);
        setLessonDay(item.day.toString());
        setLessonType(item.type);
        setLessonOrder(item.order.toString());
        setLessonImages(item.images || []);
        setLessonAttachments(item.attachments || []);
      }
    } else {
      resetForm();
    }

    setDialogOpen(true);
  };

  const resetForm = () => {
    setCourseName("");
    setCourseDesc("");
    setCourseIcon("Briefcase");
    setCourseColor("#4299E1");
    setCourseImage("");
    setCourseImageBusy(false);
    setTopicName("");
    setTopicDesc("");
    setTopicIcon("FileText");
    setTopicColor("#4299E1");
    setTopicImage("");
    setTopicImageBusy(false);
    setTopicOrder("1");
    setLessonTitle("");
    setLessonContent("");
    setLessonDay("1");
    setLessonType("teaching");
    setLessonOrder("1");
    setLessonImages([]);
    setLessonAttachments([]);
  };

  const handleSave = async () => {
    try {
      if (dialogType === "course") {
        if (editingItem) {
          await updateCourse(editingItem.id, {
            name: courseName,
            description: courseDesc,
            icon: courseIcon,
            color: courseColor,
            image: courseImage,
          });
          toast.success("Course updated successfully");
        } else {
          await createCourse({
            name: courseName,
            description: courseDesc,
            icon: courseIcon,
            color: courseColor,
            image: courseImage,
          });
          toast.success("Course added successfully");
        }
      } else if (dialogType === "topic") {
        if (editingItem) {
          await updateTopic(editingItem.id, {
            name: topicName,
            description: topicDesc,
            icon: topicIcon,
            color: topicColor,
            image: topicImage,
            order: parseInt(topicOrder, 10),
          });
          toast.success("Topic updated successfully");
        } else {
          await createTopic({
            courseId: parentId,
            name: topicName,
            description: topicDesc,
            icon: topicIcon,
            color: topicColor,
            image: topicImage,
            order: parseInt(topicOrder, 10),
          });
          toast.success("Topic added successfully");
        }
      } else if (dialogType === "lesson") {
        if (!lessonTitle.trim()) {
          toast.error("Lesson title is required.");
          return;
        }
        if (editingItem) {
          await updateLesson(editingItem.id, {
            title: lessonTitle,
            content: lessonContent,
            day: parseInt(lessonDay, 10),
            type: lessonType,
            order: parseInt(lessonOrder, 10),
            images: lessonImages,
            attachments: lessonAttachments,
          });
          toast.success("Lesson updated successfully");
        } else {
          await createLesson({
            topicId: parentId,
            title: lessonTitle,
            content: lessonContent,
            day: parseInt(lessonDay, 10),
            type: lessonType,
            order: parseInt(lessonOrder, 10),
            images: lessonImages,
            attachments: lessonAttachments,
          });
          toast.success("Lesson added successfully");
        }
      }

      setDialogOpen(false);
      resetForm();
      await refreshData({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    try {
      if (deleteItem.type === "course") {
        await deleteCourse(deleteItem.id);
        toast.success("Course deleted successfully");
      } else if (deleteItem.type === "topic") {
        await deleteTopic(deleteItem.id);
        toast.success("Topic deleted successfully");
      } else if (deleteItem.type === "lesson") {
        await deleteLesson(deleteItem.id);
        toast.success("Lesson deleted successfully");
      }

      setDeleteDialogOpen(false);
      setDeleteItem(null);
      await refreshData({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const iconOptions = [
    "Briefcase",
    "Code",
    "Palette",
    "FileText",
    "Sheet",
    "Presentation",
    "Layout",
    "Braces",
    "Database",
    "Globe",
    "Smartphone",
    "Camera",
    "Book",
    "GraduationCap",
    "Users",
    "Zap",
    "Settings",
    "Heart",
    "Star",
    "Lightbulb",
    "Puzzle",
    "Target",
    "Rocket",
    "Shield",
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
        Loading catalog…
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-20 bg-gray-50">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <h1>Manage Courses</h1>
            <p className="text-gray-600">
              Add, edit, or delete courses, topics, and lessons
            </p>
          </div>
          <Button onClick={() => openDialog("course")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Course
          </Button>
        </div>

        {/* Courses List */}
        <div className="space-y-4">
          {courses.map((course) => {
            const topics = topicsForCourse(course.id);
            const isExpanded = expandedCourses.has(course.id);

            return (
              <div
                key={course.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200"
              >
                {/* Course Header */}
                <div className="p-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleCourse(course.id)}
                    className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md px-2 py-1 text-left outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-expanded={isExpanded}
                    aria-label={
                      isExpanded
                        ? `Collapse ${course.name}`
                        : `Expand ${course.name}`
                    }
                  >
                    <span className="text-gray-400 transition-colors group-hover:text-gray-600">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </span>
                    <div
                      className="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: course.color }}
                    >
                      {course.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{course.name}</h3>
                      <p className="truncate text-sm text-gray-600">
                        {course.description}
                      </p>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDialog("topic", course.id);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Topic
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDialog("course", undefined, course);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteItem({ type: "course", id: course.id });
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>

                {/* Topics */}
                {isExpanded && topics.length > 0 && (
                  <div className="border-t border-gray-200 p-4 pl-12 space-y-3">
                    {topics.map((topic) => {
                      const lessons = lessonsForTopic(topic.id);
                      const isTopicExpanded = expandedTopics.has(topic.id);

                      return (
                        <div
                          key={topic.id}
                          className="border-l-2 border-gray-300 pl-4"
                        >
                          {/* Topic Header */}
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <button
                              type="button"
                              onClick={() => toggleTopic(topic.id)}
                              className="group flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-500"
                              aria-expanded={isTopicExpanded}
                              aria-label={
                                isTopicExpanded
                                  ? `Collapse ${topic.name}`
                                  : `Expand ${topic.name}`
                              }
                            >
                              <span className="text-gray-400 transition-colors group-hover:text-gray-600">
                                {isTopicExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </span>
                              <div className="min-w-0">
                                <h4 className="truncate font-medium">
                                  {topic.name}
                                </h4>
                                <p className="truncate text-sm text-gray-600">
                                  {topic.description}
                                </p>
                              </div>
                            </button>
                            <div className="flex shrink-0 items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDialog("lesson", topic.id);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Lesson
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDialog("topic", undefined, topic);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteItem({
                                    type: "topic",
                                    id: topic.id,
                                  });
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-3 w-3 text-red-600" />
                              </Button>
                            </div>
                          </div>

                          {/* Lessons */}
                          {isTopicExpanded && lessons.length > 0 && (
                            <div className="ml-6 space-y-2">
                              {lessons.map((lesson) => (
                                <div
                                  key={lesson.id}
                                  className="flex flex-col gap-2 p-2 bg-gray-50 rounded sm:flex-row sm:items-start sm:justify-between"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-xs font-medium text-gray-500">
                                        Day {lesson.day}
                                      </span>
                                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                        {lesson.type}
                                      </span>
                                      {lesson.images &&
                                        lesson.images.length > 0 && (
                                          <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 inline-flex items-center gap-1">
                                            <ImageIcon
                                              className="h-3 w-3"
                                              aria-hidden
                                            />
                                            {lesson.images.length} image
                                            {lesson.images.length !== 1
                                              ? "s"
                                              : ""}
                                          </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium">
                                      {lesson.title}
                                    </p>
                                    {lesson.images &&
                                      lesson.images.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                          {lesson.images.map((src, imgIdx) => (
                                            <button
                                              key={`${lesson.id}-${imgIdx}-${src}`}
                                              type="button"
                                              className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm ring-offset-1 transition hover:ring-2 hover:ring-blue-400"
                                              onClick={() =>
                                                setImageLightbox({
                                                  urls: lesson.images!,
                                                  index: imgIdx,
                                                })
                                              }
                                              title="View image"
                                            >
                                              <img
                                                src={resolveMediaUrl(src)}
                                                alt=""
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                              />
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        openDialog("lesson", undefined, lesson)
                                      }
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setDeleteItem({
                                          type: "lesson",
                                          id: lesson.id,
                                        });
                                        setDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3 text-red-600" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {isTopicExpanded && lessons.length === 0 && (
                            <p className="ml-6 text-sm text-gray-500">
                              No lessons yet
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {isExpanded && topics.length === 0 && (
                  <div className="border-t border-gray-200 p-4 pl-12">
                    <p className="text-sm text-gray-500">No topics yet</p>
                  </div>
                )}
              </div>
            );
          })}

          {courses.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500 mb-4">
                No courses yet. Create your first course to get started.
              </p>
              <Button onClick={() => openDialog("course")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Course
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onOpenAutoFocus={(e) => {
            if (dialogType === "lesson") e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit" : "Add"}{" "}
              {dialogType === "course"
                ? "Course"
                : dialogType === "topic"
                  ? "Topic"
                  : "Lesson"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the details below"
                : "Fill in the details below"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {dialogType === "course" && (
              <>
                <div>
                  <Label htmlFor="courseName">Course Name</Label>
                  <Input
                    id="courseName"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="e.g., Microsoft Office"
                  />
                </div>
                <div>
                  <Label htmlFor="courseDesc">Description</Label>
                  <Textarea
                    id="courseDesc"
                    value={courseDesc}
                    onChange={(e) => setCourseDesc(e.target.value)}
                    placeholder="Brief description of the course"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="courseIcon">Icon</Label>
                  <Select value={courseIcon} onValueChange={setCourseIcon}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          {icon}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="courseColor">Color</Label>
                  <Input
                    id="courseColor"
                    type="color"
                    value={courseColor}
                    onChange={(e) => setCourseColor(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Course Banner / Image (Optional)</Label>
                  <div className="mt-2 space-y-3">
                    {courseImage && (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={resolveMediaUrl(courseImage)}
                          alt="Course banner"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setCourseImage("")}
                          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-sm"
                          title="Remove image"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full relative"
                        disabled={courseImageBusy}
                      >
                        {courseImageBusy ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            {courseImage ? "Change Image" : "Upload Image"}
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
                              setCourseImageBusy(true);
                              const url = await uploadLessonImage(file);
                              setCourseImage(url);
                              toast.success("Image uploaded");
                            } catch (err) {
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : "Upload failed",
                              );
                            } finally {
                              setCourseImageBusy(false);
                            }
                          }}
                        />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {dialogType === "topic" && (
              <>
                <div>
                  <Label htmlFor="topicName">Topic Name</Label>
                  <Input
                    id="topicName"
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                    placeholder="e.g., MS Word"
                  />
                </div>
                <div>
                  <Label htmlFor="topicDesc">Description</Label>
                  <Textarea
                    id="topicDesc"
                    value={topicDesc}
                    onChange={(e) => setTopicDesc(e.target.value)}
                    placeholder="Brief description of the topic"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="topicIcon">Icon</Label>
                  <Select value={topicIcon} onValueChange={setTopicIcon}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          {icon}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="topicColor">Color</Label>
                  <Input
                    id="topicColor"
                    type="color"
                    value={topicColor}
                    onChange={(e) => setTopicColor(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="topicOrder">Order</Label>
                  <Input
                    id="topicOrder"
                    type="number"
                    value={topicOrder}
                    onChange={(e) => setTopicOrder(e.target.value)}
                    min="1"
                  />
                </div>
                <div>
                  <Label>Topic Banner / Image (Optional)</Label>
                  <div className="mt-2 space-y-3">
                    {topicImage && (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={resolveMediaUrl(topicImage)}
                          alt="Topic banner"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setTopicImage("")}
                          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-sm"
                          title="Remove image"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full relative"
                        disabled={topicImageBusy}
                      >
                        {topicImageBusy ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            {topicImage ? "Change Image" : "Upload Image"}
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
                              setTopicImageBusy(true);
                              const url = await uploadLessonImage(file);
                              setTopicImage(url);
                              toast.success("Image uploaded");
                            } catch (err) {
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : "Upload failed",
                              );
                            } finally {
                              setTopicImageBusy(false);
                            }
                          }}
                        />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {dialogType === "lesson" && (
              <>
                <div>
                  <Label htmlFor="lessonTitle">Lesson Title</Label>
                  <Input
                    id="lessonTitle"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="e.g., Introduction to MS Word"
                  />
                </div>
                <div>
                  <Label htmlFor="lessonContent">Content</Label>
                  <Textarea
                    id="lessonContent"
                    value={lessonContent}
                    onChange={(e) => setLessonContent(e.target.value)}
                    placeholder="Detailed lesson content"
                    rows={5}
                  />
                </div>
                <div>
                  <Label htmlFor="lessonDay">Day</Label>
                  <Input
                    id="lessonDay"
                    type="number"
                    value={lessonDay}
                    onChange={(e) => setLessonDay(e.target.value)}
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="lessonType">Type</Label>
                  <Select
                    value={lessonType}
                    onValueChange={(value: any) => setLessonType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teaching">Teaching</SelectItem>
                      <SelectItem value="practice">Practice</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="lessonOrder">Order</Label>
                  <Input
                    id="lessonOrder"
                    type="number"
                    value={lessonOrder}
                    onChange={(e) => setLessonOrder(e.target.value)}
                    min="1"
                  />
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Lesson Media & Images
                  </h4>
                  <LessonPracticeImagesField
                    images={lessonImages}
                    onImagesChange={setLessonImages}
                    attachments={lessonAttachments}
                    onAttachmentsChange={setLessonAttachments}
                    persistLessonId={editingItem?.id ?? null}
                    onAfterServerSync={() => refreshData({ silent: true })}
                    onBusyChange={setPracticeImagesBusy}
                    onOpenLightbox={(urls, index) =>
                      setImageLightbox({ urls, index })
                    }
                  />
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Additional Files & Attachments
                  </h4>
                  <LessonAttachmentsField
                    attachments={lessonAttachments}
                    onAttachmentsChange={setLessonAttachments}
                    persistLessonId={editingItem?.id ?? null}
                    onAfterServerSync={() => refreshData({ silent: true })}
                    onBusyChange={setAttachmentsBusy}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                dialogType === "lesson" &&
                (practiceImagesBusy || attachmentsBusy)
              }
              onClick={() => void handleSave()}
            >
              {editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the{" "}
              {deleteItem?.type}
              {deleteItem?.type === "course" &&
                " and all its topics and lessons"}
              {deleteItem?.type === "topic" && " and all its lessons"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImageLightboxDialog
        open={imageLightbox !== null}
        onOpenChange={(open) => {
          if (!open) setImageLightbox(null);
        }}
        images={imageLightbox?.urls ?? []}
        initialIndex={imageLightbox?.index ?? 0}
        title="Lesson image"
      />
    </div>
  );
}
