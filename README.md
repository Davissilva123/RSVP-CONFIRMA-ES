# SISTEMA COMPLETO DE CONFIRMAÇÃO DE PRESENÇA (RSVP) PARA EVENTOS

Um sistema web completo, moderno e profissional de **Confirmação de Presença (RSVP)** desenvolvido com **HTML5, CSS3 puro e JavaScript**, integrado ao **Supabase (Database PostgreSQL, Authentication e Realtime)**.

---

## 📁 ESTRUTURA COMPLETA DE PASTAS DO PROJETO

```
SISTEMA CONFIRMAÇÃO DE PRESENÇA/
├── index.html                  # Landing page inicial com atalhos e redirecionamento
├── login.html                  # Tela de Login Administrativo, recuperação de senha e autenticação
├── dashboard.html              # Painel de controle principal com métricas, gráficos e realtime
├── eventos.html                # Gestão completa de eventos (Lista, criar, editar, duplicar, status)
├── evento-form-builder.html    # Construtor visual interativo de formulário e campos personalizados
├── confirmacoes.html           # Gestão de confirmações recebidas, busca, filtros avançados, detalhes e CSV
├── convidados-lista.html       # Lista prévia de convidados e gestão de códigos de convite
├── relatorios.html             # Relatórios analíticos, taxas de conversão e impressão
├── configuracoes.html          # Configurações de perfil do administrador e preferências
├── confirmacao.html            # Página pública de RSVP para os convidados (otimizada para celular)
├── 404.html                    # Página de erro 404
├── css/
│   ├── global.css              # Design system, variáveis CSS, temas Claro/Escuro, botões, modais, toasts
│   ├── auth.css                # Estilização da tela de login e formulários de acesso
│   ├── dashboard.css           # Layout do painel SaaS, sidebar, topbar, cards, tabelas e gráficos
│   ├── public-rsvp.css         # Estilização visual da página pública do evento e temas personalizados
│   └── responsive.css          # Regras de responsividade, menu hambúrguer e tabela adaptada no mobile
├── js/
│   ├── config.js               # Configuração das credenciais Supabase (URL e ANON_KEY)
│   ├── supabase-client.js      # Conexão Supabase com fallback gracioso para Modo Demo (LocalStorage)
│   ├── auth.js                 # Autenticação, login, logout, recuperação de senha e guard de páginas
│   ├── theme.js                # Alternador de tema Claro/Escuro (localStorage + SO)
│   ├── utils.js                # Toasts, modais, máscaras (telefone, CPF, data), formatadores, exportador CSV
│   ├── dashboard.js            # Estatísticas do dashboard, Chart.js e atualizações em tempo real
│   ├── events.js               # CRUD de eventos, duplicação, toggle de status, link e QR Code
│   ├── form-builder.js         # Editor de campos personalizados (reordenar, tipos, preview modal)
│   ├── confirmations.js        # Tabela de respostas, busca, filtros, modal de detalhes e exportação CSV
│   ├── guest-list.js           # Gerenciador da lista prévia de convidados e códigos individuais
│   ├── reports.js              # Relatórios analíticos e taxas de confirmação
│   ├── settings.js             # Gestão de dados de perfil do admin
│   └── public-confirmation.js  # Carregador público do RSVP, campos dinâmicos, contagem regressiva e submissão
├── supabase-schema.sql         # Script SQL completo (Tabelas, RLS, Triggers, Realtime)
└── README.md                   # Instruções completas de instalação, configuração e uso
```

---

## 🚀 INSTRUÇÕES DE CONFIGURAÇÃO DO SUPABASE

### Passo 1: Executar o Script SQL no Supabase
1. Acesse o seu painel do Supabase ([https://supabase.com](https://supabase.com)).
2. Crie ou selecione o seu projeto.
3. No menu lateral esquerdo, vá em **SQL Editor**.
4. Clique em **New query**.
5. Abra o arquivo `supabase-schema.sql` deste projeto, copie todo o seu conteúdo e cole no SQL Editor do Supabase.
6. Clique no botão **Run** para executar o script.

*Este script criará todas as tabelas (`profiles`, `events`, `form_fields`, `guest_list`, `confirmations`, `confirmation_answers`), triggers de atualização, índices de busca, políticas de segurança Row Level Security (RLS) e ativará a publicação de dados em Tempo Real (Realtime).*

---

### Passo 2: Inserir `SUPABASE_URL` e `SUPABASE_ANON_KEY`
1. No painel do seu projeto Supabase, vá em **Project Settings** (ícone de engrenagem) -> **API**.
2. Copie os valores dos seguintes campos:
   - **Project URL**: Cole no arquivo `js/config.js` no campo `URL`.
   - **Project API keys (anon public)**: Cole no arquivo `js/config.js` no campo `ANON_KEY`.

Exemplo no arquivo `js/config.js`:
```javascript
const SUPABASE_CONFIG = {
  URL: 'https://sua-empresa.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  SYSTEM_NAME: 'RSVP Eventos'
};
```

---

### Passo 3: Criar o Primeiro Usuário Administrador
1. No seu painel do Supabase, vá no menu lateral em **Authentication** -> **Users**.
2. Clique em **Add User** -> **Create User**.
3. Digite o E-mail e a Senha que deseja utilizar para acessar o painel administrativo.
4. Agora você pode fazer login na página `login.html` da sua aplicação com estas credenciais!

---

## 💡 MODO DEMO AUTOMÁTICO (SEM SUPABASE CONFIGURADO)

Se você abrir a aplicação antes de preencher as chaves no `js/config.js`, o sistema ativará automaticamente o **Modo Demo (LocalStorage)**. Você pode testar todas as telas, criar eventos, personalizar formulários e simular confirmações de convidados imediatamente no seu navegador sem qualquer erro!

---

## 💻 COMO EXECUTAR O PROJETO LOCALMENTE

### Opção 1: Abrir diretamente no Navegador
1. Dê um duplo clique em `index.html` ou `login.html` no seu navegador de preferência (Google Chrome, Edge, Firefox, Safari).

### Opção 2: Utilizando um Servidor Local de Desenvolvimento (Recomendado)
Para testar como em produção, você pode usar uma extensão como o **Live Server** (VS Code) ou rodar via Node.js/Python:

Via Python 3:
```bash
python -m http.server 8000
```
Depois acesse `http://localhost:8000` no seu navegador.

---

## 🔑 PRINCIPAIS RECURSOS DO SISTEMA

1. **Login Administrativo Protegido**: Autenticação via Supabase Auth com persistência de sessão e redirecionamento de segurança.
2. **Dashboard em Tempo Real**: Métricas consolidadas (Eventos, Convidados, Confirmações, Pessoas confirmadas, Recusadas, Pendentes, Recebidas Hoje) e gráficos visuais com Chart.js.
3. **Gerenciador de Eventos**: Permite criar, editar, excluir, duplicar (mantendo formulários sem copiar respostas anteriores), encerrar e reabrir confirmações.
4. **Link Exclusivo & QR Code**: Geração automática de link público (`confirmacao.html?slug=meu-evento`), cópia com um clique, botão para compartilhamento direto no WhatsApp e gerador de QR Code em tempo real.
5. **Construtor de Formulários Personalizados**: Permite adicionar perguntas com vários tipos de campos (Texto, Texto longo, Select, Radio, Checkbox, Número, Telefone, E-mail, Data, Hora), definir obrigatoriedade e pré-visualizar o formulário antes de divulgar.
6. **Gestão de Confirmações & Modal Completo**: Tabela com ordenação, busca instantânea, filtros por evento/status/quantidade de pessoas, modal para visualizar TODAS as respostas personalizadas enviadas pelo convidado, edição e campo de "Observações Internas" do administrador.
7. **Exportação de Dados (CSV)**: Exportação com suporte a acentuação UTF-8 (compatível com Excel) contendo dados dos convidados e respostas aos campos personalizados.
8. **Página Pública do Convidado**: Design minimalista e elegante, responsivo para smartphones, com tema de cores personalizável pelo evento, contagem regressiva, prevenção de confirmação duplicada e telas finais com animação de confirmação.
9. **Modo Claro e Escuro (Dark Mode)**: Botão de alternância com persistência em `localStorage` e suporte ao tema nativo do sistema operacional.
