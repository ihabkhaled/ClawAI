import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { PASSWORD_GENERATOR_LENGTH } from '@/constants/password-generator.constants';
import { UserRole } from '@/enums';
import {
  adminCreateUserSchema,
  type AdminCreateUserFormValues,
} from '@/lib/validation/admin-create-user.schema';
import type { AdminCreateUserRequest, UseCreateUserFormReturn } from '@/types';
import { evaluatePasswordStrength, generatePassword } from '@/utilities';

const EMPTY_FORM: AdminCreateUserFormValues = {
  email: '',
  username: '',
  firstName: '',
  lastName: '',
  password: '',
  role: UserRole.USER,
};

export function useCreateUserForm(
  onCreate: (data: AdminCreateUserRequest) => void,
): UseCreateUserFormReturn {
  const form = useForm<AdminCreateUserFormValues>({
    resolver: zodResolver(adminCreateUserSchema),
    mode: 'onChange',
    defaultValues: EMPTY_FORM,
  });

  const password = form.watch('password');

  return {
    form,
    strength: evaluatePasswordStrength(password),
    // Generated straight into the field rather than held aside, so the
    // administrator can see it, copy it, and edit it if they want to.
    // `shouldValidate` clears the error the empty field was showing a moment ago.
    generate: () => {
      form.setValue('password', generatePassword(PASSWORD_GENERATOR_LENGTH), {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    reset: () => {
      form.reset(EMPTY_FORM);
    },
    submit: form.handleSubmit((values) => {
      onCreate({
        email: values.email,
        username: values.username,
        firstName: values.firstName || undefined,
        lastName: values.lastName || undefined,
        password: values.password,
        role: values.role,
      });
    }),
  };
}
