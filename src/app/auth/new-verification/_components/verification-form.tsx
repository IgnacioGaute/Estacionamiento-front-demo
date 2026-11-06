'use client';

import { newVerificationAction } from '@/actions/auth/new-verification.action';
import { CardWrapper } from '@/components/auth/card-wrapper';
import { FormError } from '@/components/form-error';
import { FormSuccess } from '@/components/form-success';
import { Loader } from '@/components/ui/loader';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export function NewVerificationForm() {
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  const useSearchParam = useSearchParams();
  const token = useSearchParam.get('token');

  const onSubmit = useCallback(async () => {
    if (success || error) return;

    if (!token) {
      setError('No se encontró el token');
      return;
    }
    newVerificationAction(token)
      .then((response) => {
        if ('error' in response) {
          setError(response.error);
        } else {
          setSuccess(response.success);
        }
      })
      .catch(() => {
        setError('Algo salió mal. Por favor intenta de nuevo.');
      });
  }, [error, success, token]);

  useEffect(() => {
    onSubmit();
  }, [onSubmit]);

  return (
    <CardWrapper
      title="Confirmá tu email"
      backButtonHref="/auth/login"
      backButtonLabel="Volver al inicio de sesión"
    >
      <div className="flex items-center w-full justify-center">
        {!success && !error && <Loader />}
        <FormSuccess message={success} />
        {!success && <FormError message={error} />}
      </div>
    </CardWrapper>
  );
}
