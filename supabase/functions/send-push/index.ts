import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { messageId } = await req.json();
    if (!messageId) throw new Error('messageId is required');
    const url = Deno.env.get('SUPABASE_URL')!;
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const pub = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const priv = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const mail = Deno.env.get('VAPID_SUBJECT') || 'mailto:shop@example.com';
    webpush.setVapidDetails(mail, pub, priv);
    const admin = createClient(url, key);
    const { data: msg, error: me } = await admin.from('messages').select('id,body,sender_id,conversation_id').eq('id', messageId).single();
    if (me || !msg) throw me || new Error('Message not found');
    const { data: conv, error: ce } = await admin.from('conversations').select('customer_id,product_name,subject').eq('id', msg.conversation_id).single();
    if (ce || !conv) throw ce || new Error('Conversation not found');
    const { data: senderProfile } = await admin.from('profiles').select('role').eq('id', msg.sender_id).maybeSingle();
    let recipientIds: string[] = [];
    if (senderProfile?.role === 'admin') recipientIds = [conv.customer_id];
    else {
      const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin');
      recipientIds = (admins || []).map((x: {id:string}) => x.id);
    }
    if (!recipientIds.length) return new Response(JSON.stringify({ sent: 0, reason: 'No recipient accounts' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    const { data: subs } = await admin.from('push_subscriptions').select('id,user_id,subscription').in('user_id', recipientIds);
    let sent = 0;
    for (const sub of subs || []) {
      try {
        await webpush.sendNotification(sub.subscription, JSON.stringify({ title: 'Старинная Коллекция', body: String(msg.body).slice(0, 150), url: './#lk', tag: `message-${msg.id}` }));
        sent++;
      } catch (e) {
        if ((e as {statusCode?:number})?.statusCode === 404 || (e as {statusCode?:number})?.statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', sub.id);
      }
    }
    return new Response(JSON.stringify({ sent }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
