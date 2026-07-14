import { RegisterClient } from "@/components/RegisterClient";
import {
  AuthInfoCard,
  AuthNetworkOptions,
  AuthPageLayout,
} from "@/components/auth/AuthPageLayout";

export default function RegisterPage() {
  return (
    <AuthPageLayout>
      <RegisterClient />
      <AuthNetworkOptions />
      <AuthInfoCard eyebrow="Conta" title="Conta Paranoid">
        <ul className="grid gap-2 sm:grid-cols-2">
          <li>Guarda eventos e recebe recomendações.</li>
          <li>Segue artistas, espaços e organizadores.</li>
          <li className="sm:col-span-2">
            Gere a tua presença na plataforma quando aplicável.
          </li>
        </ul>
      </AuthInfoCard>
    </AuthPageLayout>
  );
}
