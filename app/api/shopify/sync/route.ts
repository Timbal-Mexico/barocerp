import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    
    const options: any = {};
    if (authHeader) {
      options.global = {
        headers: {
          Authorization: authHeader,
        },
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey, options);

    // Get Config
    const { data: integration, error: intError } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', 'shopify')
      .single();

    if (intError || !integration) {
      return NextResponse.json({ error: 'Shopify integration not configured' }, { status: 400 });
    }

    const config = integration.config as any;
    if (!config.shop_url || !config.access_token) {
      return NextResponse.json({ error: 'Missing Shopify credentials' }, { status: 400 });
    }

    // Fetch Orders from Shopify
    // Ensure URL doesn't have protocol and ends with myshopify.com if not present
    let shopDomain = config.shop_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!shopDomain.includes('.')) {
      shopDomain += '.myshopify.com';
    }
    
    // Check if token looks like an access token
    if (!config.access_token.startsWith('shpat_') && !config.access_token.startsWith('shpca_')) {
      console.warn('Warning: Token does not start with shpat_ or shpca_. It might be an API Key instead of Access Token.');
    }

    const response = await fetch(`https://${shopDomain}/admin/api/2024-01/orders.json?status=any&limit=50`, {
      headers: {
        'X-Shopify-Access-Token': config.access_token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `Shopify Error: ${text}` }, { status: response.status });
    }

    const { orders } = await response.json();
    let syncedCount = 0;

    // Process Orders
    for (const order of orders) {
      // 1. Upsert Lead (Customer)
      let leadId = null;
      if (order.customer) {
        const { data: lead } = await supabase
          .from('leads')
          .select('id')
          .eq('email', order.customer.email)
          .single();

        if (lead) {
          leadId = lead.id;
        } else {
          const { data: newLead } = await supabase
            .from('leads')
            .insert({
              name: `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || order.customer.email,
              email: order.customer.email,
              phone: order.customer.phone,
              contact_channel: 'web',
            })
            .select()
            .single();
          if (newLead) leadId = newLead.id;
        }
      }

      // 2. Upsert Sale
      const { data: existingSale } = await supabase
        .from('sales')
        .select('id')
        .eq('external_id', String(order.id))
        .single();

      if (!existingSale) {
        const { data: sale, error: saleError } = await supabase
          .from('sales')
          .insert({
            order_number: order.name,
            external_id: String(order.id),
            lead_id: leadId,
            channel: 'shopify',
            total_amount: order.total_price,
            created_at: order.created_at,
            source: 'shopify',
            delivery_city: order.shipping_address?.city || null,
          })
          .select()
          .single();

        if (sale && !saleError) {
          syncedCount++;
          // 3. Upsert Items
          for (const item of order.line_items) {
             if (item.sku) {
               const { data: product } = await supabase
                 .from('products')
                 .select('id')
                 .eq('sku', item.sku)
                 .single();
               
               if (product) {
                 await supabase.from('sale_items').insert({
                   sale_id: sale.id,
                   product_id: product.id,
                   quantity: item.quantity,
                   price: item.price
                 });
               }
             }
          }
        }
      }
    }

    return NextResponse.json({ message: `Sincronización completada. ${syncedCount} pedidos nuevos.` });

  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
