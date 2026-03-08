# SCTS (PWA) — Site que instala como App (offline)

Este projeto é uma versão **PWA** do SCTS:
- Abre no **Chrome** e pode **Adicionar à tela inicial**
- Funciona **offline** (os dados ficam no aparelho via IndexedDB)
- Importa **Excel .xlsx** (lê todas as abas)
- Foto **obrigatória**
- Alerta de documento duplicado no dia
- Exporta CSV (Excel)

## Requisitos no PC
- Node.js 18+

## Rodar local
```bash
npm install
npm run dev
```
Acesse no celular na mesma rede: o Vite mostra o IP (ou use `npm run preview -- --host`).

## Build (para colocar em um servidor)
```bash
npm run build
npm run preview --host
```

### Hospedagem grátis (opções)
- GitHub Pages (com ajustes)
- Netlify / Vercel (fácil)
- Um PC/servidor interno da empresa (Nginx/IIS)

## Como instalar como App (Android)
1) Abra o link no Chrome
2) Menu (⋮) → **Adicionar à tela inicial**
3) Vai aparecer como app “SCTS”

## Formato do Excel
Colunas (em qualquer ordem, nomes parecidos também funcionam):
- NOME
- DOCUMENTO (CPF ou documento internacional)
- EMPRESA
- EMBARCACAO
- TIPO (EMBARQUE / DESEMBARQUE / SAIDA PONTUAL)
- DATA (dd/MM/yyyy ou yyyy-MM-dd)

O sistema lê **todas as abas**.

## Segurança / Observações
- Este MVP salva tudo **no próprio aparelho**.
- Para operação multi-aparelho com dashboard centralizado, o próximo passo é sincronizar com um backend (ex: Firebase/Supabase).


## v3 (melhorias)
- Exportar CSV por LISTA e por DIA (filtros)
- Resumo do registro (modal) + opção de apagar registro
- Filtros avançados em Registros (tipo, dia, lista)
- Dashboard com seletor de dia


## Nuvem (Supabase)
- Configure `.env` usando `.env.example`
- Crie as tabelas e bucket `photos`
- No app: clique em **Nuvem** e faça login
- Clique em **Sincronizar agora**
