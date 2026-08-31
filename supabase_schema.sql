-- ==============================================================================
-- DigiMemories: Esquema de Base de Datos PostgreSQL en Supabase
-- Copia y pega todo este código en: Supabase > SQL Editor > New query > Run
-- ==============================================================================

-- 1. TABLA DE ÓRDENES Y COTIZACIONES
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    estimated_total NUMERIC DEFAULT 0,
    deposit_paid BOOLEAN DEFAULT FALSE,
    pin TEXT,
    status TEXT DEFAULT 'pendiente',
    completed_at TIMESTAMPTZ,
    completion_email_sent BOOLEAN DEFAULT FALSE,
    items JSONB DEFAULT '[]'::jsonb,
    add_audio_video_enhancement BOOLEAN DEFAULT FALSE,
    general_notes TEXT DEFAULT ''
);

-- 2. TABLA DE CONVERSACIONES DE CHAT EN VIVO
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id TEXT PRIMARY KEY,
    visitor_name TEXT NOT NULL,
    visitor_email TEXT,
    visitor_phone TEXT,
    status TEXT DEFAULT 'active',
    mode TEXT DEFAULT 'bot',
    needs_human_attention BOOLEAN DEFAULT FALSE,
    unread_by_admin INTEGER DEFAULT 0,
    unread_by_visitor INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    current_route TEXT DEFAULT '/',
    messages JSONB DEFAULT '[]'::jsonb
);

-- 3. TABLA DE REGISTRO DE CORREOS Y OUTBOX
CREATE TABLE IF NOT EXISTS public.email_logs (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    to_email TEXT NOT NULL,
    to_name TEXT,
    subject TEXT NOT NULL,
    snippet TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    type TEXT,
    body_html TEXT
);

-- ==============================================================================
-- POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- Permite lectura y escritura segura desde la aplicación web pública
-- ==============================================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para Orders
DROP POLICY IF EXISTS "Public Full Access Orders" ON public.orders;
CREATE POLICY "Public Full Access Orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

-- Políticas para Chat Threads
DROP POLICY IF EXISTS "Public Full Access Chat Threads" ON public.chat_threads;
CREATE POLICY "Public Full Access Chat Threads" ON public.chat_threads FOR ALL USING (true) WITH CHECK (true);

-- Políticas para Email Logs
DROP POLICY IF EXISTS "Public Full Access Email Logs" ON public.email_logs;
CREATE POLICY "Public Full Access Email Logs" ON public.email_logs FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- HABILITAR REALTIME (Sincronización en vivo instantánea)
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_logs;
