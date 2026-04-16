import { useEffect, useState, useMemo } from "react";
import { fetchCourses } from "../utils/courseService";
import type { Course } from "../types/course";
import { FolderCard } from "../components/FolderCard";
import { BookOpen, Search, Filter } from "lucide-react";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("order");

  useEffect(() => {
    fetchCourses()
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredCourses = useMemo(() => {
    let result = [...courses];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query)
      );
    }

    // Sort
    if (sortBy === "alphabetical") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "newest") {
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sortBy === "order") {
      result.sort((a, b) => a.order - b.order);
    }

    return result;
  }, [courses, searchQuery, sortBy]);

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-20  bg-gray-50">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold">All Courses</h1>
            </div>
            <p className="text-gray-600">
              Select a course to explore topics and lessons.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search courses..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-48">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="Sort by" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">Default Order</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-center py-12 text-gray-500">Loading courses…</p>
        ) : filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <FolderCard
                key={course.id}
                title={course.name}
                description={course.description}
                icon={course.icon}
                color={course.color}
                image={course.image}
                to={`/courses/${course.id}`}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchQuery
                ? `No courses matching "${searchQuery}"`
                : "No courses available yet. Sign in as staff to add courses in the admin panel."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
