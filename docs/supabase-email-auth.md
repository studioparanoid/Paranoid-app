# Email de confirmação Supabase

O registo da aplicação confirma o email com um código de seis dígitos através de `verifyOtp` e permite pedir outro código com `resend`. A configuração seguinte é feita no painel do projeto Supabase e no fornecedor de email.

## Remetente SMTP

Em **Project Settings > Authentication > SMTP Settings**, ativar SMTP personalizado e configurar os dados fornecidos pelo serviço de email:

- Sender name: `Paranoid`
- Sender email: `info@paranoid.pt`
- Host, port, username e password: valores do fornecedor SMTP

O remetente apresentado deve ficar como `Paranoid <info@paranoid.pt>`.

## Template de registo

Em **Authentication > Email Templates > Confirm signup**:

- Subject: `Confirma a tua conta Paranoid`
- O corpo deve apresentar `{{ .Token }}` como código de confirmação.
- Não usar `{{ .ConfirmationURL }}` como ação principal, porque a interface espera o código de seis dígitos.

Exemplo de corpo HTML:

```html
<h2>Confirma a tua conta Paranoid</h2>
<p>Introduz este código na Paranoid para confirmares o teu email:</p>
<p style="font-size: 28px; font-weight: 700;">{{ .Token }}</p>
<p>Se não criaste esta conta, ignora este email.</p>
```

## Entregabilidade

No DNS de `paranoid.pt`, publicar os registos indicados pelo fornecedor SMTP:

- SPF autorizando o serviço de envio;
- DKIM com a chave fornecida;
- DMARC, começando com uma política monitorizada e reforçando-a depois de validar os relatórios.

Confirmar no fornecedor que o domínio e `info@paranoid.pt` estão verificados antes de ativar o envio em produção. Testar também entrega, spam e reenvio para pelo menos dois fornecedores de caixa de correio.
