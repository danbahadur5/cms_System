import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { ShieldAlert, LogIn, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { loginAdmin, verifyAdminSession } from '../utils/auth';
import { checkApiHealth } from '../utils/api';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { refresh } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  const runHealthCheck = useCallback(async () => {
    setChecking(true);
    try {
      const ok = await checkApiHealth();
      setApiOk(ok);
      return ok;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void runHealthCheck();
  }, [runHealthCheck]);

  useEffect(() => {
    verifyAdminSession().then((ok) => {
      if (ok) navigate('/admin', { replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await loginAdmin(email, password);
      if (!result.ok) {
        toast.error(result.reason);
        return;
      }
      await refresh();
      toast.success('Signed in');
      navigate('/admin', { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-50 to-gray-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <LogIn className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Staff sign in</h1>
              <p className="text-sm text-gray-500">Admin dashboard (API + MongoDB)</p>
            </div>
          </div>

          {apiOk === false && (
            <div
              className="mt-6 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
              role="alert"
            >
              <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-medium">Cannot reach the API</p>
                <p className="mt-1 text-amber-800/90">
                  Start the API in a <strong>second terminal</strong> from the project folder:{' '}
                  <code className="rounded bg-amber-100/80 px-1">npm run server</code>
                  . Wait until you see <code className="rounded bg-amber-100/80 px-1">listening</code>, then
                  click <strong>Check again</strong>. Your <code className="rounded bg-amber-100/80 px-1">PORT</code>{' '}
                  in <code className="rounded bg-amber-100/80 px-1">.env</code> must match the Vite proxy (same{' '}
                  <code className="rounded bg-amber-100/80 px-1">PORT</code> is loaded for both).
                </p>
                <p className="mt-2 text-amber-800/90">
                  You can put <code className="rounded bg-amber-100/80 px-1">MONGODB_URI</code>,{' '}
                  <code className="rounded bg-amber-100/80 px-1">ADMIN_EMAIL</code>,{' '}
                  <code className="rounded bg-amber-100/80 px-1">ADMIN_PASSWORD</code>, and{' '}
                  <code className="rounded bg-amber-100/80 px-1">JWT_SECRET</code> in the <strong>project root</strong>{' '}
                  <code className="rounded bg-amber-100/80 px-1">.env</code> — the server loads that file automatically.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-2 border-amber-300 bg-white text-amber-950 hover:bg-amber-100/50"
                  disabled={checking}
                  onClick={() => void runHealthCheck().then((ok) => ok && toast.success('API is reachable'))}
                >
                  <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} aria-hidden />
                  Check again
                </Button>
              </div>
            </div>
          )}

          {checking && (
            <p className="mt-6 text-sm text-gray-500">Checking API connection…</p>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link to="/" className="text-blue-600 hover:underline">
              Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
