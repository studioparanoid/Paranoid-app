import { AuthPageLayout } from "@/components/auth/AuthPageLayout";
import { MfaEmailChallengeClient } from "@/components/auth/MfaEmailChallengeClient";

export default function MfaEmailPage() {
  return <AuthPageLayout><MfaEmailChallengeClient /></AuthPageLayout>;
}
