import { Suspense } from 'react';
import { NewPasswordForm } from '@/app/auth/new-password/_components/new-password-form';

export default function NewPasswordPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <Suspense>
        <NewPasswordForm />
      </Suspense>
    </div>
  );
}
