import React, { useState, useEffect, useCallback } from "react";
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
  uploadLessonImage,
  uploadLessonFile,
  addCourseAttachment,
  removeCourseAttachment,
  addTopicAttachment,
  removeTopicAttachment,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "../components/ui/sheet";
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
  BookOpen,
  Lightbulb,
  Hammer,
  FileText,
  Layers,
  Upload,
  GripVertical,
  X,
} from "lucide-react";
import { ImageLightboxDialog } from "../components/ImageLightboxDialog";
import { LessonPracticeImagesField } from "../components/LessonPracticeImagesField";
import { LessonAttachmentsField } from "../components/LessonAttachmentsField";
import { defaultLessonContent, lessonTemplate } from "../utils/editorUtils";
import { toast } from "sonner";

type DialogType = "course" | "topic" | "lesson" | null;

interface LessonPointData {
  heading: string;
  content: string;
  images: string[];
  attachments: string[];
}

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

  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [parsedSections, setParsedSections] = useState<
    Array<{ day: number; title: string; html: string }>
  >([]);

  // Form states
  const [courseName, setCourseName] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseIcon, setCourseIcon] = useState("Briefcase");
  const [courseColor, setCourseColor] = useState("#4299E1");
  const [courseImage, setCourseImage] = useState("");
  const [courseImageBusy, setCourseImageBusy] = useState(false);
  const [courseOrder, setCourseOrder] = useState("1");
  const [courseAttachments, setCourseAttachments] = useState<string[]>([]);
  const [courseAttachmentsBusy, setCourseAttachmentsBusy] = useState(false);

  const [topicName, setTopicName] = useState("");
  const [topicDesc, setTopicDesc] = useState("");
  const [topicIcon, setTopicIcon] = useState("FileText");
  const [topicColor, setTopicColor] = useState("#4299E1");
  const [topicImage, setTopicImage] = useState("");
  const [topicImageBusy, setTopicImageBusy] = useState(false);
  const [topicOrder, setTopicOrder] = useState("1");
  const [topicAttachments, setTopicAttachments] = useState<string[]>([]);
  const [topicAttachmentsBusy, setTopicAttachmentsBusy] = useState(false);

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
  const [lessonPoints, setLessonPoints] = useState<LessonPointData[]>([
    { heading: "", content: "", images: [], attachments: [] },
  ]);
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

  // For new lessons, auto-insert a Day heading and type line when title/day/type change
  useEffect(() => {
    if (editingItem) return; // don't overwrite existing lesson content
    const next = defaultLessonContent(
      lessonDay,
      lessonTitle || "New Lesson",
      lessonType,
    );
    if (
      !lessonContent ||
      /^\s*<h1[\s\S]*?>[\s\S]*?<\/h1>/i.test(lessonContent)
    ) {
      setLessonContent(next);
    }
  }, [lessonDay, lessonTitle, lessonType, editingItem]);

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
        setCourseOrder(item.order ? item.order.toString() : "1");
        setCourseAttachments(item.attachments || []);
      } else if (type === "topic") {
        setTopicName(item.name);
        setTopicDesc(item.description);
        setTopicIcon(item.icon);
        setTopicColor(item.color);
        setTopicImage(item.image || "");
        setTopicOrder(item.order.toString());
        setTopicAttachments(item.attachments || []);
      } else if (type === "lesson") {
        setLessonTitle(item.title);
        setLessonContent(item.content);
        setLessonDay(item.day.toString());
        setLessonType(item.type);
        setLessonOrder(item.order.toString());
        setLessonImages(item.images || []);
        setLessonAttachments(item.attachments || []);
        // Show the FULL content as-is in the editor; heading is just the title
        setLessonPoints([
          {
            heading: item.title || "",
            content: item.content,
            images: item.images || [],
            attachments: item.attachments || [],
          },
        ]);
      }
    } else {
      resetForm();
      // If opening a new Lesson dialog, default the Day to the next available day
      if (type === "lesson" && parent) {
        const topicLessons = allLessons.filter((l) => l.topicId === parent);
        const maxDay = topicLessons.reduce(
          (m, l) => Math.max(m, l.day || 0),
          0,
        );
        setLessonDay((maxDay + 1).toString());
        // Prepare first point with default content
        const idx = maxDay + 1;
        setLessonPoints([
          {
            heading: "",
            content: "",
            images: [],
            attachments: [],
          },
        ]);
      }
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
    setCourseOrder("1");
    setCourseAttachments([]);
    setCourseAttachmentsBusy(false);
    setTopicName("");
    setTopicDesc("");
    setTopicIcon("FileText");
    setTopicColor("#4299E1");
    setTopicImage("");
    setTopicImageBusy(false);
    setTopicOrder("1");
    setTopicAttachments([]);
    setTopicAttachmentsBusy(false);
    setLessonTitle("");
    setLessonContent(defaultLessonContent(1, ""));
    setLessonDay("1");
    setLessonType("teaching");
    setLessonOrder("1");
    setLessonImages([]);
    setLessonAttachments([]);
    setLessonPoints([{ heading: "", content: "", images: [], attachments: [] }]);
  };

  const handleSave = async () => {
    try {
      if (dialogType === "course") {
        // Validate required fields
        if (!courseName.trim()) {
          toast.error("Course name is required.");
          return;
        }
        // Validate icon is from allowed options
        if (!iconOptions.includes(courseIcon)) {
          toast.error("Invalid icon selection.");
          return;
        }
        // Validate color format
        if (!/^#[0-9A-Fa-f]{6}$/.test(courseColor)) {
          toast.error("Invalid color format.");
          return;
        }
        // Validate order is a positive number
        const order = parseInt(courseOrder, 10);
        if (isNaN(order) || order < 1) {
          toast.error("Order must be a positive number.");
          return;
        }

        let courseId: string;
        if (editingItem) {
          await updateCourse(editingItem.id, {
            name: courseName,
            description: courseDesc,
            icon: courseIcon,
            color: courseColor,
            image: courseImage,
            order: order,
          });
          courseId = editingItem.id;
          toast.success("Course updated successfully");
        } else {
          const newCourse = await createCourse({
            name: courseName,
            description: courseDesc,
            icon: courseIcon,
            color: courseColor,
            image: courseImage,
            order: order,
          });
          courseId = newCourse.id;
          toast.success("Course added successfully");
        }

        // Sync attachments
        const oldAttachments = editingItem?.attachments || [];
        const newAttachments = courseAttachments;
        const toAdd = newAttachments.filter((a) => !oldAttachments.includes(a));
        const toRemove = oldAttachments.filter(
          (a) => !newAttachments.includes(a),
        );

        for (const url of toAdd) {
          await addCourseAttachment(courseId, url);
        }
        for (const url of toRemove) {
          await removeCourseAttachment(courseId, url);
        }
      } else if (dialogType === "topic") {
        // Validate required fields
        if (!topicName.trim()) {
          toast.error("Topic name is required.");
          return;
        }
        // Validate icon is from allowed options
        if (!iconOptions.includes(topicIcon)) {
          toast.error("Invalid icon selection.");
          return;
        }
        // Validate color format
        if (!/^#[0-9A-Fa-f]{6}$/.test(topicColor)) {
          toast.error("Invalid color format.");
          return;
        }
        // Validate order is a positive number
        const topicOrderNum = parseInt(topicOrder, 10);
        if (isNaN(topicOrderNum) || topicOrderNum < 1) {
          toast.error("Order must be a positive number.");
          return;
        }

        let topicId: string;
        if (editingItem) {
          await updateTopic(editingItem.id, {
            name: topicName,
            description: topicDesc,
            icon: topicIcon,
            color: topicColor,
            image: topicImage,
            order: topicOrderNum,
          });
          topicId = editingItem.id;
          toast.success("Topic updated successfully");
        } else {
          const newTopic = await createTopic({
            courseId: parentId,
            name: topicName,
            description: topicDesc,
            icon: topicIcon,
            color: topicColor,
            image: topicImage,
            order: topicOrderNum,
          });
          topicId = newTopic.id;
          toast.success("Topic added successfully");
        }

        // Sync attachments
        const oldAttachments = editingItem?.attachments || [];
        const newAttachments = topicAttachments;
        const toAdd = newAttachments.filter((a) => !oldAttachments.includes(a));
        const toRemove = oldAttachments.filter(
          (a) => !newAttachments.includes(a),
        );

        for (const url of toAdd) {
          await addTopicAttachment(topicId, url);
        }
        for (const url of toRemove) {
          await removeTopicAttachment(topicId, url);
        }
      } else if (dialogType === "lesson") {
        // Validate lesson type is from allowed options
        const allowedTypes = ["teaching", "practice", "project"];
        if (!allowedTypes.includes(lessonType)) {
          toast.error("Invalid lesson type.");
          return;
        }
        // Validate day and order are positive numbers
        const day = parseInt(lessonDay, 10);
        const order = parseInt(lessonOrder, 10);
        if (isNaN(day) || day < 1) {
          toast.error("Day must be a positive number.");
          return;
        }
        if (isNaN(order) || order < 1) {
          toast.error("Order must be a positive number.");
          return;
        }

        if (editingItem) {
          const pt = lessonPoints[0];
          // Preserve content but strip h1/div to keep stored HTML clean
          const finalTitle = pt?.heading?.trim() || lessonTitle;
          const contentToSave = buildLessonHtml(finalTitle, pt?.content || "");
          await updateLesson(editingItem.id, {
            title: finalTitle,
            content: contentToSave,
            day: day,
            type: lessonType,
            duration: editingItem.duration || 1,
            order: order,
            images: pt?.images || lessonImages,
            attachments: pt?.attachments || lessonAttachments,
          });
          toast.success("Lesson updated successfully");
        } else {
          const validPoints = lessonPoints.filter((p) => p.heading.trim() || p.content.trim());
          if (validPoints.length === 0) {
            toast.error("At least one section with content is required.");
            return;
          }
          for (let i = 0; i < validPoints.length; i++) {
            const pt = validPoints[i];
            const hText = pt.heading?.trim() || "";
            const heading = hText || `Day ${day + i} — Lesson`;
            const contentToSave = buildLessonHtml(heading, pt.content || "");

            const dayMatch = heading.match(/Day\s*(\d+)\s*[-—]\s*(.+)/i);
            const finalTitle = dayMatch
              ? dayMatch[2].trim()
              : hText || "Lesson";
            const secDay = dayMatch ? parseInt(dayMatch[1], 10) || day + i : day + i;

            await createLesson({
              topicId: parentId,
              title: finalTitle,
              content: contentToSave,
              day: secDay,
              type: lessonType,
              duration: 1,
              order: order + i,
              images: pt.images,
              attachments: pt.attachments,
            });
          }
          toast.success(
            `Added ${validPoints.length} lesson${validPoints.length > 1 ? "s" : ""}`,
          );
        }
      }

      setDialogOpen(false);
      resetForm();
      await refreshData({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  // Preview split sections from editor content without creating lessons
  const handlePreviewSplit = () => {
    const contentToParse = lessonContent;
    const sectionRegex =
      /<h1[^>]*>([\s\S]*?)<\/h1>([\s\S]*?)(?=(?:<h1[^>]*>)|$)/gi;
    const sections: Array<{ day: number; title: string; html: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = sectionRegex.exec(contentToParse)) !== null) {
      const heading = (m[1] || "").replace(/<[^>]+>/g, "").trim();
      const body = (m[2] || "").trim();
      let dayNum = parseInt(lessonDay || "1", 10) || 1;
      let titleText = heading || lessonTitle || "Untitled";
      const hMatch = heading.match(/Day\s*(\d+)\s*[-—]\s*(.+)/i);
      if (hMatch) {
        dayNum = parseInt(hMatch[1], 10) || dayNum;
        titleText = hMatch[2].trim() || titleText;
      }
      sections.push({
        day: dayNum,
        title: titleText,
        html: `<h1>${m[1]}</h1>\n${body}`,
      });
    }

    if (sections.length === 0) {
      // fallback: single section
      sections.push({
        day: parseInt(lessonDay || "1", 10) || 1,
        title: lessonTitle || "Lesson",
        html: lessonContent || "",
      });
    }

    setParsedSections(sections);
    setPreviewDialogOpen(true);
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
                      <h3 className="truncate font-semibold flex items-center gap-2">
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded tabular-nums">
                          #{course.order}
                        </span>
                        {course.name}
                        {(course.attachments?.length ?? 0) > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            📎 {course.attachments?.length ?? 0}
                          </span>
                        )}
                      </h3>
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
                  <div className="border-t border-gray-200 p-4 pl-12 space-y-3 max-h-[300px] overflow-y-auto">
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
                                <h4 className="truncate font-medium flex items-center gap-2">
                                  {topic.name}
                                  {(topic.attachments?.length ?? 0) > 0 && (
                                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded whitespace-nowrap">
                                      📎 {topic.attachments?.length ?? 0}
                                    </span>
                                  )}
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

      {/* Lesson Sheet — slide from right */}
      <Sheet open={dialogOpen && dialogType === "lesson"} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 gap-0 flex flex-col bg-gray-50/80">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-5 py-4 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-gray-900 text-base font-semibold">{editingItem ? "Edit Lesson" : "Create New Lesson"}</SheetTitle>
                <p className="text-gray-500 text-xs mt-0.5">Each point below becomes one lesson</p>
              </div>
              <div className="flex items-center gap-2">
                <SheetClose className="h-7 px-3 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  Cancel
                </SheetClose>
                <Button size="sm" className="h-7 px-4 text-xs" onClick={() => void handleSave()}>
                  {editingItem ? "Update" : "Create Lessons"}
                </Button>
              </div>
            </div>
            {/* Meta row */}
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5 bg-gray-100 rounded-md px-2.5 py-1">
                <Select value={lessonType} onValueChange={(v: any) => setLessonType(v)}>
                  <SelectTrigger className="h-6 text-[11px] w-20 border-0 bg-transparent text-gray-700 [&>svg]:text-gray-500"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teaching">Teaching</SelectItem>
                    <SelectItem value="practice">Practice</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-gray-300">|</span>
                <label className="flex items-center gap-1 text-[11px] text-gray-600">
                  Day <Input type="number" value={lessonDay} onChange={(e) => setLessonDay(e.target.value)} min="1" className="h-6 text-[11px] w-12 text-center bg-white border border-gray-200 text-gray-700" />
                </label>
                <span className="text-gray-300">|</span>
                <label className="flex items-center gap-1 text-[11px] text-gray-600">
                  # <Input type="number" value={lessonOrder} onChange={(e) => setLessonOrder(e.target.value)} min="1" className="h-6 text-[11px] w-12 text-center bg-white border border-gray-200 text-gray-700" />
                </label>
              </div>
            </div>
          </div>

          {/* Content sections */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {lessonPoints.map((point, idx) => {
              const pointDay = parseInt(lessonDay || "1", 10) + idx;
              return (
                <div key={idx} className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Section header — with left accent bar */}
                  <div className="flex items-center gap-2.5 px-4 py-2 border-b border-gray-100">
                    <span className="flex items-center justify-center w-7 h-7 rounded-md bg-white border border-gray-200 text-xs font-bold text-gray-500 shadow-sm">
                      {pointDay}
                    </span>
                    <span className="text-xs font-medium text-gray-600">Section {idx + 1}</span>
                    <span className="text-[10px] text-gray-300">|</span>
                    <span className="text-[10px] text-gray-400">Day {pointDay}</span>
                    {lessonPoints.length > 1 && (
                      <button
                        type="button"
                        onClick={() => { setLessonPoints(prev => prev.filter((_, i) => i !== idx)); }}
                        className="ml-auto p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Remove section"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Heading input */}
                  <div className="px-4 pt-3">
                    <input
                      type="text"
                      value={point.heading}
                      onChange={(e) => {
                        setLessonPoints(prev =>
                          prev.map((p, i) => (i === idx ? { ...p, heading: e.target.value } : p)),
                        );
                      }}
                      placeholder="Lesson title"
                      className="w-full text-sm font-semibold text-gray-800 bg-transparent border-0 border-b-2 border-transparent focus:border-indigo-300 focus:ring-0 outline-none pb-1.5 placeholder-gray-300 transition-colors"
                    />
                  </div>

                  {/* Editor — uncontrolled, CSS placeholder */}
                  <div className="px-3 pt-2">
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      data-placeholder="Write your lesson content here…"
                      ref={(el) => {
                        if (el && !el.dataset.ceInit) {
                          el.innerHTML = point.content || "";
                          el.dataset.ceInit = "true";
                        }
                      }}
                      onInput={(e) => {
                        const html = e.currentTarget.innerHTML;
                        setLessonPoints(prev => prev.map((p, i) => i === idx ? { ...p, content: html } : p));
                      }}
                      onBlur={(e) => {
                        const html = e.currentTarget.innerHTML;
                        setLessonPoints(prev => prev.map((p, i) => i === idx ? { ...p, content: html } : p));
                      }}
                      className="min-h-[90px] text-sm leading-relaxed text-gray-700 outline-none focus:bg-gray-50/50 rounded p-3 -m-2 transition-colors empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 empty:before:pointer-events-none empty:before:cursor-text empty:before:block empty:before:select-none [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-gray-800 [&_h1]:border-l-3 [&_h1]:border-gray-300 [&_h1]:pl-2.5 [&_h1]:py-0.5 [&_h2]:text-sm [&_h2]:font-medium [&_h2]:text-gray-600"
                    />
                  </div>

                  {/* Image + Doc upload row */}
                  <div className="flex items-stretch gap-3 px-4 py-2.5 bg-gray-50/70 border-t border-gray-100">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {point.images.map((img, imgIdx) => (
                          <div key={imgIdx} className="relative group h-9 w-9 rounded-md border border-gray-200 bg-white overflow-hidden shrink-0 shadow-sm">
                            <img src={img.startsWith("http") ? img : resolveMediaUrl(img)} alt="" className="h-full w-full object-cover" loading="lazy" />
                            <button type="button" onClick={() => { setLessonPoints(prev => prev.map((p, i) => i === idx ? { ...p, images: p.images.filter((_, j) => j !== imgIdx) } : p)); }} className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3 text-white" /></button>
                          </div>
                        ))}
                        <label className="flex items-center justify-center h-9 w-9 rounded-md border border-dashed border-gray-300 text-gray-400 cursor-pointer hover:border-gray-400 hover:text-gray-500 hover:bg-white transition-colors shrink-0">
                          <ImageIcon className="h-4 w-4" />
                          <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                            const files = e.target.files;
                            if (!files || files.length === 0) return;
                            try {
                              const urls: string[] = [];
                              for (let f = 0; f < files.length; f++) { urls.push(await uploadLessonImage(files[f])); }
                              setLessonPoints(prev => prev.map((p, i) => i === idx ? { ...p, images: [...p.images, ...urls] } : p));
                              toast.success(`Uploaded ${files.length} image${files.length > 1 ? "s" : ""}`);
                            } catch { toast.error("Image upload failed"); }
                            e.target.value = "";
                          }} />
                        </label>
                      </div>
                    </div>
                    <div className="w-px bg-gray-200" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {point.attachments.map((doc, docIdx) => (
                          <span key={docIdx} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-gray-200 text-[11px] text-gray-500 shadow-sm max-w-[130px]">
                            <span className="truncate">{doc.split("/").pop() || "file"}</span>
                            <button type="button" onClick={() => { setLessonPoints(prev => prev.map((p, i) => i === idx ? { ...p, attachments: p.attachments.filter((_, j) => j !== docIdx) } : p)); }} className="text-gray-300 hover:text-red-500 shrink-0"><X className="h-3 w-3" /></button>
                          </span>
                        ))}
                        <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-dashed border-gray-300 text-[11px] text-gray-400 cursor-pointer hover:border-gray-400 hover:text-gray-500 hover:bg-white transition-colors shrink-0 whitespace-nowrap">
                          <Upload className="h-3 w-3" /> Document
                          <input type="file" multiple className="hidden" onChange={async (e) => {
                            const files = e.target.files;
                            if (!files || files.length === 0) return;
                            try {
                              const urls: string[] = [];
                              for (let f = 0; f < files.length; f++) { urls.push(await uploadLessonFile(files[f])); }
                              setLessonPoints(prev => prev.map((p, i) => i === idx ? { ...p, attachments: [...p.attachments, ...urls] } : p));
                              toast.success(`Uploaded ${files.length} file${files.length > 1 ? "s" : ""}`);
                            } catch { toast.error("File upload failed"); }
                            e.target.value = "";
                          }} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* File import + Add Section row */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const nextDay = parseInt(lessonDay || "1", 10) + lessonPoints.length;
                  setLessonPoints(prev => [...prev, { heading: "", content: "", images: [], attachments: [] }]);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all font-medium"
              >
                <Plus className="h-4 w-4" />
                Add New Section
              </button>
              <label className="flex items-center justify-center gap-2 py-3 px-5 rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-400 cursor-pointer hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all shrink-0 font-medium">
                <Upload className="h-4 w-4" />
                Import File
                <input type="file" accept=".txt,.docx,.doc,.md" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    // Convert markdown headings → HTML headings before wrapping in <p>
                    const mdHtml = text
                      .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
                      .replace(/^##\s+(.+)$/gm, "<h2>$1</h2>")
                      .replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");
                    const html = mdHtml
                      .split(/\n{2,}/)
                      .map((block) => {
                        const b = block.trim();
                        if (!b) return "";
                        // Don't double-wrap heading tags in <p>
                        if (/^<h[1-3]>/.test(b)) return b;
                        return `<p>${b.replace(/\n/g, "<br>")}</p>`;
                      })
                      .join("\n");
                    const sectionRegex = /<h1[^>]*>([\s\S]*?)<\/h1>([\s\S]*?)(?=(?:<h1[^>]*>)|$)/gi;
                    const imported: Array<{ heading: string; body: string }> = [];
                    let m: RegExpExecArray | null;
                    while ((m = sectionRegex.exec(html)) !== null) {
                      const h = (m[1] || "").replace(/<[^>]+>/g, "").trim();
                      imported.push({ heading: h, body: (m[2] || "").trim() });
                    }
                    if (imported.length > 0) {
                      setLessonPoints(prev => [
                        ...prev,
                        ...imported.map(p => ({
                          heading: p.heading,
                          content: p.body,
                          images: [] as string[],
                          attachments: [] as string[],
                        })),
                      ]);
                      toast.success(`Imported "${file.name}" — ${imported.length} section${imported.length > 1 ? "s" : ""}`);
                    } else {
                      setLessonPoints(prev => [...prev, { heading: "", content: html, images: [], attachments: [] }]);
                      toast.success(`Imported "${file.name}"`);
                    }
                  } catch { toast.error("Failed to read file"); }
                  e.target.value = "";
                }} />
              </label>
            </div>
          </div>

          {/* Footer: summary bar */}
          <div className="shrink-0 border-t border-gray-200 bg-gray-50/50 px-5 py-2 flex items-center justify-between text-[11px] text-gray-400">
            <span>{lessonPoints.length} section{lessonPoints.length !== 1 ? "s" : ""}</span>
            <span className="flex items-center gap-1">
              <span>Day {lessonDay}</span>
              <span>→</span>
              <span>Day {parseInt(lessonDay || "1", 10) + lessonPoints.length - 1}</span>
            </span>
          </div>
        </SheetContent>
      </Sheet>

      {/* Regular Dialog for Course / Topic */}
      <Dialog open={dialogOpen && dialogType !== "lesson"} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
          <>
            <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
              <DialogTitle>
                {editingItem ? "Edit" : "Add"}{" "}
                {dialogType === "course" ? "Course" : "Topic"}
              </DialogTitle>
              <DialogDescription>
                {editingItem ? "Update the details below" : "Fill in the details below"}
              </DialogDescription>
            </DialogHeader>

              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
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
                  <Label htmlFor="courseOrder">Order</Label>
                  <Input
                    id="courseOrder"
                    type="number"
                    value={courseOrder}
                    onChange={(e) => setCourseOrder(e.target.value)}
                    min="1"
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
                <div>
                  <Label>Course Materials & Attachments</Label>
                  <p className="text-xs text-gray-500 mb-3">
                    Upload PDFs, documents, and other course-level resources
                  </p>
                  <LessonAttachmentsField
                    attachments={courseAttachments}
                    onAttachmentsChange={setCourseAttachments}
                    onBusyChange={setCourseAttachmentsBusy}
                    disabled={courseAttachmentsBusy}
                  />
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
                <div>
                  <Label>Section/Topic Materials & Attachments</Label>
                  <p className="text-xs text-gray-500 mb-3">
                    Upload PDFs, documents, and other resources for this section
                  </p>
                  <LessonAttachmentsField
                    attachments={topicAttachments}
                    onAttachmentsChange={setTopicAttachments}
                    onBusyChange={setTopicAttachmentsBusy}
                    disabled={topicAttachmentsBusy}
                  />
                </div>
              </>
            )}
          </div>

            <DialogFooter className="px-6 pb-6 pt-2 shrink-0">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => void handleSave()}>{editingItem ? "Update" : "Create"}</Button>
            </DialogFooter>
          </>
        </DialogContent>
      </Dialog>

      {/* Simple split confirmation dialog (fallback when needed) */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create multiple lessons?</DialogTitle>
            <DialogDescription>
              {parsedSections.length} sections found — one lesson per H1 heading.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  for (let i = 0; i < parsedSections.length; i++) {
                    const s = parsedSections[i];
                    await createLesson({
                      topicId: parentId,
                      title: s.title,
                      content: s.html,
                      day: s.day,
                      type: lessonType,
                      duration: 1,
                      order: parseInt(lessonOrder || "1", 10) + i,
                      images: lessonImages,
                      attachments: lessonAttachments,
                    });
                  }
                  toast.success(`Added ${parsedSections.length} lessons`);
                  setPreviewDialogOpen(false);
                  setDialogOpen(false);
                  resetForm();
                  await refreshData({ silent: true });
                } catch (err) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : "Failed to create lessons",
                  );
                }
              }}
            >
              Create {parsedSections.length} Lessons
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

/** Strip <h1> tags and convert <div> to <p> to preserve line breaks. */
function stripH1AndDiv(html: string): string {
  return html
    .replace(/<\/?h1[^>]*>/gi, "")      // remove <h1> and </h1>
    .replace(/<div([^>]*)>/gi, "<p$1>") // convert <div> → <p>
    .replace(/<\/div>/gi, "</p>")       // convert </div> → </p>
    .trim();
}

/** Combine heading + body into stored lesson HTML (no H1/div tags). */
function buildLessonHtml(_heading: string, body: string): string {
  const b = body.trim();
  if (!b) return "";
  return stripH1AndDiv(b);
}

/** Live preview showing how H1 headings become day-wise lesson sections. */
function SectionPreview({
  content,
  defaultDay,
  defaultTitle,
}: {
  content: string;
  defaultDay: number;
  defaultTitle: string;
}) {
  const sections = React.useMemo(() => {
    const sectionRegex =
      /<h1[^>]*>([\s\S]*?)<\/h1>([\s\S]*?)(?=(?:<h1[^>]*>)|$)/gi;
    const result: Array<{ day: number; title: string; body: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = sectionRegex.exec(content)) !== null) {
      const heading = (m[1] || "").replace(/<[^>]+>/g, "").trim();
      const body = (m[2] || "").trim();
      let dayNum = defaultDay;
      let titleText = heading || defaultTitle || "Untitled";
      const hMatch = heading.match(/Day\s*(\d+)\s*[-—]\s*(.+)/i);
      if (hMatch) {
        dayNum = parseInt(hMatch[1], 10) || dayNum;
        titleText = hMatch[2].trim() || titleText;
      }
      result.push({ day: dayNum, title: titleText, body });
    }
    return result;
  }, [content, defaultDay, defaultTitle]);

  if (!content || sections.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white/50 border-b border-indigo-100">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600">
          <Layers className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-semibold text-indigo-700">
          {sections.length} section{sections.length > 1 ? "s" : ""} detected
        </span>
        {sections.length > 1 && <span className="text-[11px] text-indigo-400 ml-1">— each H1 = one lesson</span>}
      </div>
      <div className="divide-y divide-indigo-100/60">
        {sections.map((s, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/40 transition-colors">
            <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold text-xs shadow-sm">
              {s.day}
            </span>
            <span className="text-sm font-medium text-gray-800">{s.title}</span>
            {s.body && (
              <span className="text-xs text-gray-400 hidden sm:block truncate max-w-[200px]">
                {s.body.replace(/<[^>]+>/g, "").slice(0, 60)}
                {(s.body.replace(/<[^>]+>/g, "").length > 60 ? "…" : "")}
              </span>
            )}
            <span className="ml-auto text-[10px] text-indigo-400 font-medium uppercase tracking-wider">
              Lesson {i + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
