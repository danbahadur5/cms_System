import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Lock } from 'lucide-react';
import { getApiBase } from '../utils/api';
import { cn } from './ui/utils';

interface PasswordGateProps {
  children: React.ReactNode;
}

const PasswordGate: React.FC<PasswordGateProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const siteToken = sessionStorage.getItem('site-access-token');
    const authFlag = sessionStorage.getItem('site-authenticated');
    if (siteToken || authFlag === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${getApiBase()}/api/auth/verify-site`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.token) {
          sessionStorage.setItem('site-access-token', data.token);
        } else {
          sessionStorage.setItem('site-authenticated', 'true');
        }
        setIsAuthenticated(true);
      } else {
        setError(data.error || 'Incorrect password. Please try again.');
      }
    } catch (err) {
      setError('Failed to verify password. Please check your connection.');
      console.error('Password verification error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <Dialog open={true}>
      <DialogContent 
        className="sm:max-w-md" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Lock className="w-6 h-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl font-bold">Secure Access</DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            Welcome! This platform is part of a private learning environment. Please enter your access key to explore our courses and resources.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Enter your access key"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={error ? 'border-destructive focus-visible:ring-destructive/20 ring-2 ring-destructive/20' : ''}
              autoFocus
              disabled={isSubmitting}
            />
          </div>
          <Button type="submit" className="w-full font-semibold py-6" disabled={isSubmitting || !password.trim()}>
            {isSubmitting ? 'Verifying...' : 'Access'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordGate;
