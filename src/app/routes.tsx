import { createBrowserRouter, Outlet } from 'react-router';
import { Navigation } from './components/Navigation';
import { AdminProtectedLayout } from './components/AdminProtectedLayout';
import Landing from './pages/Landing';
import CoursesPage from './pages/CoursesPage';
import CourseDetailsPage from './pages/CourseDetailsPage';
import TopicDetailsPage from './pages/TopicDetailsPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminCoursesPage from './pages/AdminCoursesPage';
import AdminLoginPage from './pages/AdminLoginPage';
import NotFound from './pages/NotFound';
import { Toaster } from './components/ui/sonner';

function Root() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <Outlet />
      <Toaster />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Landing },
      { path: 'courses', Component: CoursesPage },
      { path: 'courses/:courseId', Component: CourseDetailsPage },
      { path: 'courses/:courseId/:topicId', Component: TopicDetailsPage },
      { path: 'admin/login', Component: AdminLoginPage },
      {
        path: 'admin',
        Component: AdminProtectedLayout,
        children: [
          { index: true, Component: AdminDashboard },
          { path: 'courses', Component: AdminCoursesPage },
        ],
      },
      { path: '*', Component: NotFound },
    ],
  },
]);