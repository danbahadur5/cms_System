import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { FolderOpen, BookOpen, FileText, Settings, LogOut } from 'lucide-react';
import { fetchAdminTree } from '../utils/courseService';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { Button } from '../components/ui/button';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { adminEmail, signOut } = useAdminAuth();
  const [courseCount, setCourseCount] = useState(0);
  const [topicCount, setTopicCount] = useState(0);
  const [lessonCount, setLessonCount] = useState(0);

  useEffect(() => {
    fetchAdminTree()
      .then((tree) => {
        setCourseCount(tree.courses.length);
        setTopicCount(tree.topics.length);
        setLessonCount(tree.lessons.length);
      })
      .catch(() => {
        setCourseCount(0);
        setTopicCount(0);
        setLessonCount(0);
      });
  }, []);

  const stats = [
    {
      title: 'Total Courses',
      value: courseCount,
      icon: FolderOpen,
      color: 'bg-blue-500',
      link: '/admin/courses',
    },
    {
      title: 'Total Topics',
      value: topicCount,
      icon: BookOpen,
      color: 'bg-green-500',
      link: '/admin/courses',
    },
    {
      title: 'Total Lessons',
      value: lessonCount,
      icon: FileText,
      color: 'bg-purple-500',
      link: '/admin/courses',
    },
  ];

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <Settings className="h-8 w-8 shrink-0 text-blue-600" />
              <div>
                <h1>Admin Dashboard</h1>
                {adminEmail && (
                  <p className="mt-1 text-sm text-gray-500">Signed in as {adminEmail}</p>
                )}
                <p className="mt-2 text-gray-600">
                  Manage your courses, topics, and lessons. Add, edit, or delete content as needed.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 gap-2"
              onClick={() => {
                signOut();
                navigate('/admin/login', { replace: true });
              }}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <Link
              key={stat.title}
              to={stat.link}
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
            >
              <div className="flex items-center gap-4">
                <div className={`${stat.color} p-3 rounded-lg text-white`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              to="/admin/courses"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <FolderOpen className="h-8 w-8 text-blue-600 mb-2" />
              <h3 className="font-semibold mb-1">Manage Courses</h3>
              <p className="text-sm text-gray-600">Create, edit, or delete courses</p>
            </Link>

            <Link
              to="/admin/courses"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
            >
              <BookOpen className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-semibold mb-1">Manage Topics</h3>
              <p className="text-sm text-gray-600">Add topics to courses</p>
            </Link>

            <Link
              to="/admin/courses"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
            >
              <FileText className="h-8 w-8 text-purple-600 mb-2" />
              <h3 className="font-semibold mb-1">Manage Lessons</h3>
              <p className="text-sm text-gray-600">Create day-wise lessons</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
