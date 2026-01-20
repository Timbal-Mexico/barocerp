'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Plus } from 'lucide-react';

type Ticket = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  created_by: string | null;
  assigned_to: string | null;
  related_sale_id: string | null;
  created_at: string;
};

type TicketMessage = {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  message: string;
  created_at: string;
};

export default function TicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [creatorProfile, setCreatorProfile] = useState<{ id: string; full_name: string | null; email: string | null } | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');

  const loadTickets = useCallback(async () => {
    try {
      setLoadingTickets(true);
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  async function updateTicketStatus(ticketId: string, newStatus: string, assignToCurrentUser?: boolean) {
    try {
      const updateData: any = { status: newStatus };
      if (assignToCurrentUser) {
        updateData.assigned_to = user?.id || null;
      }
      if (newStatus === 'open') {
        updateData.assigned_to = null;
      }

      const { data, error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId)
        .select('*')
        .single();

      if (error) throw error;

      setTickets((prev) => prev.map((t) => (t.id === ticketId ? (data as any) : t)));
      setSelectedTicket((prev) => (prev && prev.id === ticketId ? (data as any) : prev));
    } catch (error: any) {
      console.error('Error updating ticket status:', error);
      alert('Error al actualizar el ticket: ' + error.message);
    }
  }

  const loadMessages = useCallback(
    async (ticketId: string) => {
      try {
        setLoadingMessages(true);
        const { data, error } = await supabase
          .from('ticket_messages')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error('Error loading ticket messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    },
    []
  );

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!selectedTicket) return;

    loadMessages(selectedTicket.id);

    if (selectedTicket.created_by) {
      const loadCreator = async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', selectedTicket.created_by)
            .single();
          if (data) {
            setCreatorProfile(data as any);
          } else {
            setCreatorProfile(null);
          }
        } catch {
          setCreatorProfile(null);
        }
      };
      loadCreator();
    } else {
      setCreatorProfile(null);
    }

    const channel = supabase
      .channel(`ticket-messages-${selectedTicket.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${selectedTicket.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new as any]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket, loadMessages]);

  async function handleCreateTicket() {
    if (!newTitle) return;

    try {
      setCreatingTicket(true);
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          title: newTitle,
          description: newDescription || null,
          priority: newPriority,
          status: 'open',
          created_by: user?.id || null,
        })
        .select('*')
        .single();

      if (error) throw error;
      setTickets((prev) => [data as any, ...prev]);
      setNewTitle('');
      setNewDescription('');
      setNewPriority('medium');
      setSelectedTicket(data as any);
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      alert('Error al crear ticket: ' + error.message);
    } finally {
      setCreatingTicket(false);
    }
  }

  async function handleSendMessage() {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user?.id || null,
          message: newMessage.trim(),
        })
        .select('*')
        .single();

      if (error) throw error;
      setMessages((prev) => [...prev, data as any]);
      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      alert('Error al enviar mensaje: ' + error.message);
    }
  }

  const filteredTickets =
    statusFilter === 'all'
      ? tickets
      : tickets.filter((t) => t.status === statusFilter);

  if (loadingTickets) {
    return <div>Cargando tickets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets y Chat</h1>
          <p className="text-slate-500 mt-1">
            Crea tickets y conversa en tiempo real con tu equipo
          </p>
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Tickets</TabsTrigger>
          <TabsTrigger value="new">Nuevo Ticket</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Tickets</CardTitle>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as typeof statusFilter)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Abiertos</SelectItem>
                  <SelectItem value="in_progress">En progreso</SelectItem>
                  <SelectItem value="resolved">Resueltos</SelectItem>
                  <SelectItem value="closed">Cerrados</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredTickets.length === 0 ? (
                  <div className="text-sm text-slate-500">
                    No hay tickets aún.
                  </div>
                ) : (
                  filteredTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`w-full text-left rounded-md border px-3 py-2 text-sm ${
                        selectedTicket?.id === ticket.id
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium line-clamp-1">{ticket.title}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {ticket.status === 'open'
                              ? 'Abierto'
                              : ticket.status === 'in_progress'
                              ? 'En progreso'
                              : ticket.status === 'resolved'
                              ? 'Resuelto'
                              : 'Cerrado'}
                          </Badge>
                          <Badge
                            className={`text-[10px] uppercase ${
                              ticket.priority === 'urgent'
                                ? 'bg-red-600 text-white'
                                : ticket.priority === 'high'
                                ? 'bg-orange-500 text-white'
                                : ticket.priority === 'medium'
                                ? 'bg-amber-400 text-slate-900'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {ticket.priority}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {new Date(ticket.created_at).toLocaleString('es-MX')}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Chat del ticket
                </CardTitle>
                {selectedTicket && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectedTicket.status === 'open'}
                      onClick={() => updateTicketStatus(selectedTicket.id, 'open')}
                    >
                      Abrir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectedTicket.status === 'in_progress'}
                      onClick={() => updateTicketStatus(selectedTicket.id, 'in_progress', true)}
                    >
                      Tomar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'}
                      onClick={() => updateTicketStatus(selectedTicket.id, 'resolved')}
                    >
                      Resolver
                    </Button>
                  </div>
                )}
              </div>
              {selectedTicket && (
                <div className="mt-2 text-xs text-slate-500 space-y-1">
                  <div>
                    Ticket ID: <span className="font-mono">{selectedTicket.id}</span>
                  </div>
                  {creatorProfile && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span>Cliente:</span>
                      <span className="font-medium">
                        {creatorProfile.full_name || 'Sin nombre'}
                      </span>
                      <span className="text-slate-400">|</span>
                      <span>{creatorProfile.email}</span>
                      <span className="text-slate-400">|</span>
                      <span className="font-mono text-[10px]">
                        ID: {creatorProfile.id}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="flex flex-col h-[520px]">
              {!selectedTicket ? (
                <div className="text-sm text-slate-500">
                  Selecciona un ticket para ver la conversación.
                </div>
              ) : (
                <>
                  <div className="mb-2 text-sm">
                    <div className="font-medium">{selectedTicket.title}</div>
                    {selectedTicket.description && (
                      <div className="text-slate-500">
                        {selectedTicket.description}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 border rounded-md p-3 mb-2 overflow-y-auto bg-slate-50">
                    {loadingMessages ? (
                      <div className="text-sm text-slate-500">
                        Cargando mensajes...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-sm text-slate-500">
                        No hay mensajes aún. Escribe el primero.
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`mb-2 flex ${
                            msg.sender_id === user?.id
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >
                          <div
                            className={`rounded-lg px-3 py-2 text-sm max-w-[70%] ${
                              msg.sender_id === user?.id
                                ? 'bg-slate-900 text-white'
                                : 'bg-white border border-slate-200'
                            }`}
                          >
                            <div className="text-xs text-slate-400 mb-1">
                              {new Date(msg.created_at).toLocaleTimeString('es-MX', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <div>{msg.message}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Escribe un mensaje..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      Enviar
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nuevo ticket
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Título
                </label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Problema o solicitud"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Descripción
                </label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe el detalle del ticket"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Prioridad
                </label>
                <Select
                  value={newPriority}
                  onValueChange={setNewPriority}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateTicket} disabled={creatingTicket || !newTitle}>
                {creatingTicket ? 'Creando...' : 'Crear ticket'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
