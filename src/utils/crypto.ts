import CryptoJS from 'crypto-js';
import React from 'react';

// IMPORTANTE: VITE_CRYPTO_KEY vai embutida em texto claro no bundle público (é uma env var
// de cliente, `import.meta.env`) — qualquer pessoa pode extraí-la do JS servido. Isso NÃO é
// confidencialidade real: quem já tem acesso à linha em `usuarios` (o próprio morador, o
// lojista do condomínio, o master admin — todos via RLS) consegue decifrar o WhatsApp
// trivialmente. A proteção de quem pode LER o campo é feita pelo RLS do banco, não por isto.
// Isto só evita que o número apareça em texto puro numa olhada casual (ex: painel do Supabase),
// não é uma barreira de segurança contra alguém com acesso legítimo à linha.
const SECRET_KEY = import.meta.env.VITE_CRYPTO_KEY;

// ─────────────────────────────────────────────
//  Ofuscação AES do WhatsApp (não é uma barreira de segurança — ver nota acima)
// ─────────────────────────────────────────────

export const encryptData = (text: string): string => {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

export const decryptData = (ciphertext: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return '';
  }
};

// ─────────────────────────────────────────────
//  Máscara de telefone (descriptografa + mascara)
// ─────────────────────────────────────────────

export const maskPhone = (encryptedPhone: string): string | React.ReactElement => {
  if (!encryptedPhone) return 'Não informado';

  try {
    const decrypted = decryptData(encryptedPhone);

    if (!decrypted || decrypted === 'Número inválido') {
      return React.createElement(
        'span',
        { className: 'text-red-500 font-bold' },
        'Número inválido'
      );
    }

    // Formata (19) 99999-9999 → (19) *****-9999
    const clean = decrypted.replace(/\D/g, '');
    if (clean.length >= 10) {
      const ddd = clean.substring(0, 2);
      const last4 = clean.substring(clean.length - 4);
      return `(${ddd}) *****-${last4}`;
    }

    return decrypted;
  } catch (error) {
    console.error('Erro ao processar maskPhone:', error);
    return React.createElement(
      'span',
      { className: 'text-red-500 font-bold' },
      'Erro de leitura'
    );
  }
};