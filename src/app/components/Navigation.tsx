import { Link, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import type { Course } from "../types/course";
import { fetchCourses } from "../utils/courseService";
import { useAdminAuth } from "../contexts/AdminAuthContext";
import { Button } from "./ui/button";
import { BrandLogo } from "./BrandLogo";
import { cn } from "./ui/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "./ui/dropdown-menu";
import { BookOpen, GraduationCap, ArrowRight } from "lucide-react";

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCoursesOpen, setMobileCoursesOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const navigate = useNavigate();
  const { adminEmail, signOut } = useAdminAuth();

  useEffect(() => {
    fetchCourses()
      .then(setCourses)
      .catch(() => setCourses([]));
  }, []);

  function handleStaffSignOut() {
    signOut();
    navigate("/");
    setMobileMenuOpen(false);
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="group flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-blue-50/60"
          >
            <BrandLogo className="transition-transform duration-200 group-hover:scale-[1.02]" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className="text-sm font-medium hover:text-blue-600 transition-colors"
            >
              Home
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-all cursor-pointer group outline-none">
                Courses
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300 group-data-[state=open]:rotate-180 text-gray-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start" 
                className="w-[400px] p-4 bg-white/95 backdrop-blur-xl border-gray-100 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200" 
                sideOffset={12}
              >
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Explore</span>
                      <Link 
                        to="/courses" 
                        onClick={() => navigate("/courses")}
                        className="text-[11px] font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                      >
                        View all
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-1 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                      {courses.length > 0 ? (
                        courses.map((course) => (
                          <DropdownMenuItem
                            key={course.id}
                            onClick={() => navigate(`/courses/${course.id}`)}
                            className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50/80 rounded-xl transition-all group border border-transparent hover:border-gray-100/50"
                          >
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all border border-gray-100/50">
                              <BookOpen className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">{course.name}</span>
                              {course.description && (
                                <span className="text-xs text-gray-400 line-clamp-1 group-hover:text-gray-500 font-normal">
                                  {course.description}
                                </span>
                              )}
                            </div>
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <div className="px-3 py-8 text-center">
                          <p className="text-sm text-gray-400 italic">No courses published yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {adminEmail ? (
              <>
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden />
                  Dashboard
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-gray-600"
                  onClick={handleStaffSignOut}
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Sign out
                </Button>
              </>
            ) : (
              <Link
                to="/admin/login"
                className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
              >
                Staff sign in
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t space-y-1 animate-in slide-in-from-top-4 duration-200">
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2 text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            
            <div className="space-y-1">
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors"
                onClick={() => setMobileCoursesOpen(!mobileCoursesOpen)}
              >
                <div className="flex items-center gap-3">
                  Courses
                </div>
                <ChevronDown className={cn("h-5 w-5 transition-transform duration-200", mobileCoursesOpen && "rotate-180")} />
              </button>
              
              {mobileCoursesOpen && (
                <div className="pl-4 pr-2 pb-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Link
                    to="/courses"
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50/50 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BookOpen className="h-4 w-4" />
                    All Courses
                  </Link>
                  {courses.map((course) => (
                    <Link
                      key={course.id}
                      to={`/courses/${course.id}`}
                      className="flex flex-col px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors border-l-2 border-transparent hover:border-blue-200 ml-1"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="font-medium">{course.name}</span>
                      {course.description && (
                        <span className="text-xs text-gray-400 line-clamp-1">{course.description}</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-gray-100">
              {adminEmail ? (
                <>
                  <Link
                    to="/admin"
                    className="flex items-center gap-3 px-3 py-2 text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    onClick={handleStaffSignOut}
                  >
                    <LogOut className="h-5 w-5" />
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  to="/admin/login"
                  className="flex items-center gap-3 px-3 py-2 text-base font-medium text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Staff sign in
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
