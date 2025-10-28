import { CognitoLoginForm } from '@/components/auth/cognito-login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <CognitoLoginForm />
    </div>
  );
}
