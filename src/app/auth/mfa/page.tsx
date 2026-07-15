import { AuthPageLayout } from "@/components/auth/AuthPageLayout";
import { MfaChallengeClient } from "@/components/auth/MfaChallengeClient";

export default function MfaPage() {
  return <AuthPageLayout><MfaChallengeClient /></AuthPageLayout>;
}
