export interface ChatMessage {
  id: string;
  sender: 'visitor' | 'bot' | 'admin' | 'system';
  text: string;
  timestamp: string;
  senderName?: string;
  imageUrl?: string;
}

export interface ChatThread {
  id: string;
  visitorName: string;
  visitorEmail?: string;
  visitorPhone?: string;
  status: 'active' | 'archived';
  mode: 'bot' | 'human';
  needsHumanAttention: boolean;
  unreadByAdmin: number;
  unreadByVisitor: number;
  createdAt: string;
  updatedAt: string;
  currentRoute?: string;
  messages: ChatMessage[];
}

import { saveChatThreadToCloud, fetchChatThreadsFromCloud, deleteChatThreadFromCloud } from './supabase';

const THREADS_KEY = 'digimemories_chat_threads_v3';
const CURRENT_VISITOR_KEY = 'digimemories_current_visitor_id';

// Initial background sync
if (typeof window !== 'undefined') {
  fetchChatThreadsFromCloud().then(cloudThreads => {
    if (cloudThreads && cloudThreads.length > 0) {
      const local = getChatThreads();
      const map = new Map<string, ChatThread>();
      local.forEach(t => map.set(t.id, t));
      cloudThreads.forEach(t => map.set(t.id, t));
      const merged = Array.from(map.values());
      localStorage.setItem(THREADS_KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('digimemories_chat_sync'));
    }
  });
}

const DEMO_SEEDS: ChatThread[] = [
  {
    id: 'demo-thread-1',
    visitorName: 'Sofía Munguía (Boda 1991)',
    visitorEmail: 'sofia.m@gmail.com',
    status: 'active',
    mode: 'human',
    needsHumanAttention: true,
    unreadByAdmin: 1,
    unreadByVisitor: 0,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 120000).toISOString(),
    currentRoute: '/contact',
    messages: [
      {
        id: 'm-1',
        sender: 'visitor',
        text: 'Hola, tengo 4 cintas VHS que se ven algo empolvadas. ¿Se pueden recuperar?',
        timestamp: '11:42 AM',
        senderName: 'Sofía'
      },
      {
        id: 'm-2',
        sender: 'bot',
        text: '¡Hola Sofía! Con gusto. En DigiMemories realizamos inspección previa y limpieza para remover polvo y moho sin dañar la película. ¿Gustas cotizarlas ahora mismo?',
        timestamp: '11:45 AM',
        senderName: 'Guillermo (Bot)'
      },
      {
        id: 'm-3',
        sender: 'visitor',
        text: '¿Pueden cotizarme un paquete especial con entrega a domicilio hoy mismo?',
        timestamp: '11:48 AM',
        senderName: 'Sofía'
      },
      {
        id: 'm-4',
        sender: 'bot',
        text: '⚠️ He notificado a nuestro Administrador para que te prepare una propuesta personalizada de entrega a domicilio. En breve un operador humano tomará el control del chat.',
        timestamp: '11:49 AM',
        senderName: 'Sistema'
      }
    ]
  },
  {
    id: 'demo-thread-2',
    visitorName: 'Carlos Gómez (10 Cintas Hi8)',
    visitorEmail: 'carlos.gomez@outlook.com',
    status: 'active',
    mode: 'bot',
    needsHumanAttention: false,
    unreadByAdmin: 0,
    unreadByVisitor: 0,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 3000000).toISOString(),
    currentRoute: '/track',
    messages: [
      {
        id: 'm-201',
        sender: 'visitor',
        text: '¿Cuánto tiempo tarda la digitalización de 10 cintas?',
        timestamp: '10:15 AM',
        senderName: 'Carlos'
      },
      {
        id: 'm-202',
        sender: 'bot',
        text: '¡Hola Carlos! Para 10 cintas nuestro tiempo estándar es de 3 a 5 días hábiles, garantizando captura 1:1 en tiempo real.',
        timestamp: '10:16 AM',
        senderName: 'Guillermo'
      }
    ]
  }
];

export const getChatThreads = (): ChatThread[] => {
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    if (!raw) {
      localStorage.setItem(THREADS_KEY, JSON.stringify(DEMO_SEEDS));
      return DEMO_SEEDS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load chat threads', err);
    return DEMO_SEEDS;
  }
};

export const saveChatThreads = (threads: ChatThread[], threadToSync?: ChatThread) => {
  try {
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
    window.dispatchEvent(new CustomEvent('digimemories_chat_sync'));

    // 1. Persist explicitly modified thread to cloud
    if (threadToSync) {
      saveChatThreadToCloud(threadToSync);
    }

    // 2. Persist active visitor thread to cloud for multi-device admin
    const visitorId = getVisitorThreadId();
    const currentVisitorThread = threads.find(t => t.id === visitorId);
    if (currentVisitorThread && currentVisitorThread.id !== threadToSync?.id) {
      saveChatThreadToCloud(currentVisitorThread);
    }
  } catch (err) {
    console.error('Failed to save chat threads', err);
  }
};

export const getVisitorThreadId = (): string => {
  let id = localStorage.getItem(CURRENT_VISITOR_KEY);
  if (!id) {
    id = `visitor-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    localStorage.setItem(CURRENT_VISITOR_KEY, id);
  }
  return id;
};

export const getOrCreateVisitorThread = (visitorName = 'Visitante Web', route = '/'): ChatThread => {
  const visitorId = getVisitorThreadId();
  const threads = getChatThreads();
  let thread = threads.find(t => t.id === visitorId);

  if (!thread) {
    thread = {
      id: visitorId,
      visitorName: `${visitorName} #${visitorId.replace('visitor-', '')}`,
      status: 'active',
      mode: 'bot',
      needsHumanAttention: false,
      unreadByAdmin: 0,
      unreadByVisitor: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentRoute: route,
      messages: [
        {
          id: `init-${Date.now()}`,
          sender: 'bot',
          senderName: 'Guillermo (Asistente)',
          text: '¡Hola! 👋 Soy Guillermo, especialista en preservación analógica de DigiMemories. ¿Tienes dudas sobre cómo rescatar tus cintas VHS, fotos o discos? También puedes enviarme una foto de tus cassettes aquí mismo para identificarlos.',
          timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };
    threads.unshift(thread);
    saveChatThreads(threads, thread);
  }

  return thread;
};

export const addMessageToThread = (
  threadId: string, 
  sender: 'visitor' | 'bot' | 'admin' | 'system', 
  text: string, 
  senderName?: string,
  imageUrl?: string
): ChatThread | undefined => {
  const threads = getChatThreads();
  const thread = threads.find(t => t.id === threadId);
  if (!thread) return undefined;

  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    sender,
    text,
    senderName: senderName || (sender === 'admin' ? 'Operador de Laboratorio' : sender === 'bot' ? 'Guillermo' : thread.visitorName),
    timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    imageUrl
  };

  thread.messages.push(newMsg);
  thread.updatedAt = new Date().toISOString();

  if (sender === 'visitor') {
    thread.unreadByAdmin += 1;
  } else if (sender === 'admin') {
    thread.unreadByVisitor += 1;
    thread.mode = 'human';
    thread.needsHumanAttention = false;
  }

  saveChatThreads(threads, thread);
  return thread;
};

export const triggerHumanEscalation = (threadId: string, _reason?: string) => {
  const threads = getChatThreads();
  const thread = threads.find(t => t.id === threadId);
  if (thread) {
    thread.mode = 'human';
    thread.needsHumanAttention = true;
    thread.unreadByAdmin += 1;

    const escalationMsg: ChatMessage = {
      id: `esc-${Date.now()}`,
      sender: 'bot',
      senderName: 'Sistema DigiMemories',
      text: '🤖 *No cuento con la respuesta exacta para este caso particular.* He transferido esta conversación a nuestro **Administrador en Vivo** para que te atienda personalmente. Por favor, aguarda un momento.',
      timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    };
    thread.messages.push(escalationMsg);
    thread.updatedAt = new Date().toISOString();

    saveChatThreads(threads, thread);
  }
};

export const archiveChatThread = (threadId: string, closedBy: 'admin' | 'visitor' = 'admin') => {
  const threads = getChatThreads();
  const thread = threads.find(t => t.id === threadId);
  if (thread) {
    thread.status = 'archived';
    thread.needsHumanAttention = false;
    
    const closeMsg: ChatMessage = {
      id: `sys-${Date.now()}`,
      sender: 'system',
      senderName: 'Sistema',
      text: `🔒 Conversación finalizada por el ${closedBy === 'admin' ? 'Administrador' : 'Cliente'}. Gracias por comunicarte con DigiMemories.`,
      timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    };
    thread.messages.push(closeMsg);
    thread.updatedAt = new Date().toISOString();

    saveChatThreads(threads, thread);
  }
};

export const setThreadMode = (threadId: string, mode: 'bot' | 'human') => {
  const threads = getChatThreads();
  const thread = threads.find(t => t.id === threadId);
  if (thread) {
    thread.mode = mode;
    if (mode === 'human') thread.needsHumanAttention = false;
    saveChatThreads(threads, thread);
  }
};

export const markThreadAsReadByAdmin = (threadId: string) => {
  const threads = getChatThreads();
  const thread = threads.find(t => t.id === threadId);
  if (thread) {
    thread.unreadByAdmin = 0;
    saveChatThreads(threads, thread);
    saveChatThreadToCloud(thread);
  }
};

export const markThreadAsReadByVisitor = (threadId: string) => {
  const threads = getChatThreads();
  const thread = threads.find(t => t.id === threadId);
  if (thread) {
    thread.unreadByVisitor = 0;
    saveChatThreads(threads, thread);
    saveChatThreadToCloud(thread);
  }
};

export const deleteChatThread = async (threadId: string): Promise<boolean> => {
  try {
    const threads = getChatThreads();
    const filtered = threads.filter(t => t.id !== threadId);
    localStorage.setItem(THREADS_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('digimemories_chat_sync'));
    await deleteChatThreadFromCloud(threadId);
    return true;
  } catch (err) {
    console.error('Failed to delete chat thread', err);
    return false;
  }
};
