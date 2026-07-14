import { LoginClient } from "@/components/LoginClient";
import {
  AuthInfoCard,
  AuthPageLayout,
} from "@/components/auth/AuthPageLayout";

export default function LoginPage() {
  return (
    <AuthPageLayout>
      <LoginClient />
      <AuthInfoCard eyebrow="Conta" title="O que ganhas">
        <ul className="grid gap-2 sm:grid-cols-2">
          <li>Guarda eventos.</li>
          <li>Segue artistas e espaços.</li>
          <li>Recebe recomendações.</li>
          <li>Gere eventos ou o teu perfil profissional.</li>
        </ul>
      </AuthInfoCard>
      <AuthInfoCard eyebrow="Rede" title="Paranoid">
        <p>A rede da cultura independente em Portugal.</p>
      </AuthInfoCard>
    </AuthPageLayout>
  );
}
