import { Link, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { Menu, X, ChevronDown, LayoutDashboard, LogOut } from 'lucide-react';
import type { Course } from '../types/course';
import { fetchCourses } from '../utils/courseService';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { Button } from './ui/button';
import { BrandLogo } from './BrandLogo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const navigate = useNavigate();
  const { adminEmail, signOut } = useAdminAuth();

  useEffect(() => {
    fetchCourses().then(setCourses).catch(() => setCourses([]));
  }, []);

  function handleStaffSignOut() {
    signOut();
    navigate('/');
    setMobileMenuOpen(false);
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="group flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-blue-50/60">
            <BrandLogo className="transition-transform duration-200 group-hover:scale-[1.02]" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium hover:text-blue-600 transition-colors">
              Home
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium hover:text-blue-600 transition-colors">
                Courses
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => navigate('/courses')}>
                  <span className="font-medium">All Courses</span>
                </DropdownMenuItem>
                {courses.map((course) => (
                  <DropdownMenuItem
                    key={course.id}
                    onClick={() => navigate(`/courses/${course.id}`)}
                  >
                    {course.name}
                  </DropdownMenuItem>
                ))}
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
                <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600" onClick={handleStaffSignOut}>
                  <LogOut className="h-4 w-4" aria-hidden />
                  Sign out
                </Button>
              </>
            ) : (
              <Link to="/admin/login" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                Staff sign in
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-4">
              <Link
                to="/"
                className="text-sm font-medium hover:text-blue-600 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/courses"
                className="text-sm font-medium hover:text-blue-600 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                All Courses
              </Link>
              {courses.map((course) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="text-sm pl-4 text-gray-600 hover:text-blue-600 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {course.name}
                </Link>
              ))}
              {adminEmail ? (
                <>
                  <Link
                    to="/admin"
                    className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    className="text-left text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
                    onClick={handleStaffSignOut}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  to="/admin/login"
                  className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
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
