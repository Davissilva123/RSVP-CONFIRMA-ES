-- ==============================================================================
-- SISTEMA DE CONFIRMAÇÃO DE PRESENÇA (RSVP) - ESTRUTURA DO BANCO DE DADOS SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase
-- ==============================================================================

-- Habilitar extensão para geração de UUIDs (se ainda não estiver ativa)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TABELA: profiles (Perfil do Administrador)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    system_name TEXT DEFAULT 'RSVP Eventos',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger para atualizar profiles automaticamente ao criar um novo usuário no auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparador no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ------------------------------------------------------------------------------
-- 2. TABELA: events (Eventos Cadastrados)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'Geral', -- Casamento, Aniversário, 15 Anos, Formatura, etc.
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME WITHOUT TIME ZONE,
    location TEXT NOT NULL,
    address TEXT,
    host_name TEXT,
    phone TEXT,
    email TEXT,
    cover_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#4F46E5', -- Hex Color
    secondary_color VARCHAR(7) DEFAULT '#EC4899', -- Hex Color
    welcome_message TEXT DEFAULT 'Seja bem-vindo! Por favor, confirme sua presença preenchendo o formulário abaixo.',
    confirmation_message TEXT DEFAULT 'Presença confirmada com sucesso! Estamos ansiosos para celebrar este momento com você.',
    rejection_message TEXT DEFAULT 'Sua resposta foi registrada. Sentiremos sua falta!',
    confirmation_deadline TIMESTAMP WITH TIME ZONE,
    max_guests INTEGER DEFAULT NULL, -- Limite global opcional
    max_guests_per_invite INTEGER DEFAULT 4,
    allow_response_edit BOOLEAN DEFAULT TRUE,
    require_invitation_code BOOLEAN DEFAULT FALSE,
    countdown_enabled BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ícones e índices para buscas frequentes em eventos
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);


-- ------------------------------------------------------------------------------
-- 3. TABELA: form_fields (Campos Personalizados do Formulário por Evento)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.form_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    field_name TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'number', 'phone', 'email', 'date', 'time', 'checkbox', 'radio', 'select')),
    placeholder TEXT,
    help_text TEXT,
    required BOOLEAN DEFAULT FALSE,
    position INTEGER DEFAULT 0,
    options JSONB DEFAULT '[]'::jsonb, -- Ex: ["Opção 1", "Opção 2"]
    conditional_field_id UUID DEFAULT NULL, -- ID de outro campo para exibir condicionalmente
    conditional_value TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_form_fields_event_id ON public.form_fields(event_id);


-- ------------------------------------------------------------------------------
-- 4. TABELA: guest_list (Lista Prévia de Convidados / Códigos de Convite)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guest_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    invitation_code TEXT NOT NULL,
    max_companions INTEGER DEFAULT 0,
    group_name TEXT, -- Família Silva, Empresa X
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(event_id, invitation_code)
);

CREATE INDEX IF NOT EXISTS idx_guest_list_event_code ON public.guest_list(event_id, invitation_code);


-- ------------------------------------------------------------------------------
-- 5. TABELA: confirmations (Respostas / Confirmações de Presença)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    guest_id UUID REFERENCES public.guest_list(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    attendance_status TEXT NOT NULL CHECK (attendance_status IN ('confirmed', 'declined', 'pending')),
    adults INTEGER DEFAULT 1,
    children INTEGER DEFAULT 0,
    companions INTEGER DEFAULT 0,
    total_people INTEGER GENERATED ALWAYS AS (adults + children + companions) STORED,
    invitation_code TEXT,
    internal_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_confirmations_event_id ON public.confirmations(event_id);
CREATE INDEX IF NOT EXISTS idx_confirmations_attendance_status ON public.confirmations(attendance_status);
CREATE INDEX IF NOT EXISTS idx_confirmations_email ON public.confirmations(email);
CREATE INDEX IF NOT EXISTS idx_confirmations_phone ON public.confirmations(phone);


-- ------------------------------------------------------------------------------
-- 6. TABELA: confirmation_answers (Respostas dos Campos Personalizados)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.confirmation_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    confirmation_id UUID NOT NULL REFERENCES public.confirmations(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES public.form_fields(id) ON DELETE CASCADE,
    field_label TEXT NOT NULL,
    answer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_answers_confirmation_id ON public.confirmation_answers(confirmation_id);


-- ------------------------------------------------------------------------------
-- 7. TRIGGERS PARA UPDATED_AT
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE TRIGGER update_confirmations_updated_at BEFORE UPDATE ON public.confirmations FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();


-- ------------------------------------------------------------------------------
-- 8. POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ------------------------------------------------------------------------------

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmation_answers ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: PROFILES
CREATE POLICY "Admins podem visualizar seu proprio perfil"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins podem atualizar seu proprio perfil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- POLÍTICAS: EVENTS
CREATE POLICY "Admins possuem controle total dos seus eventos"
    ON public.events FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Publico pode visualizar eventos ativos/encerrados"
    ON public.events FOR SELECT
    USING (status IN ('active', 'closed'));

-- POLÍTICAS: FORM_FIELDS
CREATE POLICY "Admins gerenciam campos dos seus eventos"
    ON public.form_fields FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = form_fields.event_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Publico pode ler campos dos eventos ativos"
    ON public.form_fields FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = form_fields.event_id
            AND events.status IN ('active', 'closed')
        )
    );

-- POLÍTICAS: GUEST_LIST
CREATE POLICY "Admins gerenciam lista de convidados dos seus eventos"
    ON public.guest_list FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = guest_list.event_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Publico pode validar codigo na lista de convidados"
    ON public.guest_list FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = guest_list.event_id
            AND events.status = 'active'
        )
    );

-- POLÍTICAS: CONFIRMATIONS
CREATE POLICY "Admins possuem controle total das confirmacoes dos seus eventos"
    ON public.confirmations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = confirmations.event_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Publico pode inserir confirmacao em eventos ativos"
    ON public.confirmations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_id
            AND events.status = 'active'
            AND (events.confirmation_deadline IS NULL OR events.confirmation_deadline >= now())
        )
    );

CREATE POLICY "Publico pode atualizar sua propria resposta se o evento permitir"
    ON public.confirmations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_id
            AND events.status = 'active'
            AND events.allow_response_edit = TRUE
        )
    );

-- POLÍTICAS: CONFIRMATION_ANSWERS
CREATE POLICY "Admins possuem controle total das respostas dos seus eventos"
    ON public.confirmation_answers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.confirmations
            JOIN public.events ON events.id = confirmations.event_id
            WHERE confirmations.id = confirmation_answers.confirmation_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Publico pode inserir respostas personalizadas"
    ON public.confirmation_answers FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.confirmations
            JOIN public.events ON events.id = confirmations.event_id
            WHERE confirmations.id = confirmation_id
            AND events.status = 'active'
        )
    );


-- ------------------------------------------------------------------------------
-- 9. CONFIGURAÇÃO DE TEMPO REAL (REALTIME)
-- ------------------------------------------------------------------------------
-- Adiciona a tabela de confirmações ao canal de publicação em tempo real do Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.confirmations;

-- ==============================================================================
-- FIM DO SCRIPT SQL
-- ==============================================================================
