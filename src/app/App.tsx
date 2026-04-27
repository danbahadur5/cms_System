import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { router } from './routes';

export default function App() {
  // Keyboard shortcut prevention for content protection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+S (Save), Ctrl+P (Print), Ctrl+Shift+I/I (DevTools), F12 (DevTools)
      if (
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.key === 'p') ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j')) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        return false;
      }
      
      // Prevent Ctrl+Shift+C (Inspect element)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AdminAuthProvider>
      <RouterProvider router={router} />
    </AdminAuthProvider>
  );
}