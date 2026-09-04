/* ==============================================================================
   SUPABASE CONFIGURATION & SYSTEM CONSTANTS
   ==============================================================================
   Insira abaixo as credenciais obtidas no seu Painel Supabase:
   Project Settings -> API -> Project URL & Project API keys (anon public)
   ============================================================================== */

const SUPABASE_CONFIG = {
  // Exemplo: 'https://xyzcompany.supabase.co'
  URL: 'https://fblbunhjxjxmfbwpqgtn.supabase.co',

  // Exemplo: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZibGJ1bmhqeGp4bWZid3BxZ3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NzI2MzYsImV4cCI6MjEwNDA0ODYzNn0.fhNMuSwClIVrN2X5QTM69yL46CRbIUkwg6jGJH3J3CQ',

  // Nome do sistema exibido na interface
  SYSTEM_NAME: 'RSVP Eventos'
};

// Exportar globalmente
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
