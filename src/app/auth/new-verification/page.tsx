import { Suspense } from 'react';
import { NewVerificationForm } from '@/app/auth/new-verification/_components/verification-form';

export default function NewVerificationPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <Suspense>
        <NewVerificationForm />
      </Suspense>
    </div>
  );
}
