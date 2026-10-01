import * as React from 'react'

import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from '@react-email/components'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl, token }: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de verificação: {token ?? ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Trapiche Pescados</Text>
        <Heading style={h1}>Confirme seu e-mail</Heading>
        <Text style={text}>
          Olá! Recebemos o cadastro de <strong>{recipient}</strong> no portal{' '}
          <Link href={siteUrl} style={link}>{siteName}</Link>. Digite o código abaixo na tela de cadastro para ativar sua conta:
        </Text>
        <Section style={codeBox}>
          <Text style={code}>{token || '------'}</Text>
        </Section>
        <Text style={small}>
          O código expira em breve. Se preferir, você também pode{' '}
          <Link href={confirmationUrl} style={link}>confirmar por este link</Link>.
        </Text>
        <Text style={footer}>Se você não fez este cadastro, ignore este e-mail.</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '520px' }
const brand = { fontSize: '13px', fontWeight: 'bold' as const, color: '#0e9aa7', letterSpacing: '1px', textTransform: 'uppercase' as const, margin: '0 0 8px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0b2545', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#44505f', lineHeight: '1.6', margin: '0 0 20px' }
const codeBox = { backgroundColor: '#eef7f8', border: '1px solid #0e9aa7', borderRadius: '10px', padding: '8px', textAlign: 'center' as const, margin: '0 0 20px' }
const code = { fontSize: '32px', fontWeight: 'bold' as const, letterSpacing: '8px', color: '#0b2545', margin: '8px 0', fontFamily: 'Courier New, monospace' }
const link = { color: '#0e9aa7', textDecoration: 'underline' }
const small = { fontSize: '12px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 16px' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
