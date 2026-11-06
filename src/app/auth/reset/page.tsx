import { Suspense } from 'react';
import { ResetForm } from '@/app/auth/reset/_components/reset-form';

export default function ResetPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <Suspense>
        <ResetForm />
      </Suspense>
    </div>
  );
}
