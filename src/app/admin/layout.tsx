import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminStatus = await isAdmin();

  if (!adminStatus) {
    redirect('/');
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Admin Warning Banner */}
      <div className="bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-900/30">
        <div className="container mx-auto px-4 py-3">
          <Alert variant="danger" className="border-0 bg-transparent p-0">
            <AlertTitle className="text-base">Admin Panel</AlertTitle>
            <AlertDescription>
              You have administrative access. Use caution when making changes.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {children}
    </div>
  );
}
