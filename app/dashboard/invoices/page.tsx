'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilePlus2, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import jsPDF from 'jspdf';

type Invoice = {
  id: string;
  sale_id: string;
  invoice_number: string;
  issue_date: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  billing_name: string | null;
  billing_address: string | null;
  tax_id: string | null;
  sales: {
    order_number: string;
    total_amount: number;
    created_at: string;
  } | null;
};

type SaleOption = {
  id: string;
  order_number: string;
  total_amount: number;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sales, setSales] = useState<SaleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [billingName, setBillingName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('*, sales:sale_id(order_number, total_amount, created_at)')
        .order('issue_date', { ascending: false });

      if (error) throw error;
      setInvoices(data as any || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSales = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('id, order_number, total_amount')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error loading sales for invoices:', error);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
    loadSales();
  }, [loadInvoices, loadSales]);

  useEffect(() => {
    const saleId = searchParams.get('saleId');
    const billingNameParam = searchParams.get('billingName');
    if (saleId) {
      setSelectedSaleId(saleId);
      setShowCreateDialog(true);
    }
    if (billingNameParam) {
      setBillingName(billingNameParam);
    }
  }, [searchParams]);

  function generateInvoiceNumber() {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `FAC-${y}${m}${d}-${random}`;
  }

  async function handleCreateInvoice() {
    if (!selectedSaleId) {
      alert('Selecciona una venta para crear la factura.');
      return;
    }
    if (!user) {
      alert('Debes iniciar sesión para crear facturas.');
      return;
    }

    try {
      setCreating(true);
      const selectedSale = sales.find((s) => s.id === selectedSaleId);
      if (!selectedSale) throw new Error('Venta no encontrada');

      const invoiceNumber = generateInvoiceNumber();
      const subtotal = selectedSale.total_amount;
      const tax = subtotal * 0.16;
      const total = subtotal + tax;

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          sale_id: selectedSaleId,
          invoice_number: invoiceNumber,
          subtotal,
          tax,
          total,
          currency: 'MXN',
          billing_name: billingName || null,
          billing_address: billingAddress || null,
          tax_id: taxId || null,
          created_by: user.id,
        })
        .select('*, sales:sale_id(order_number, total_amount, created_at)')
        .single();

      if (error) throw error;
      setInvoices((prev) => [data as any, ...prev]);
      setSelectedSaleId('');
      setBillingName('');
      setBillingAddress('');
      setTaxId('');
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      alert('Error al crear factura: ' + error.message);
    } finally {
      setCreating(false);
    }
  }

  function buildInvoicePdf(invoice: Invoice) {
    const doc = new jsPDF();
    const yStart = 20;

    doc.setFontSize(16);
    doc.text('Factura', 20, yStart);

    doc.setFontSize(10);
    doc.text(`Folio: ${invoice.invoice_number}`, 20, yStart + 10);
    doc.text(
      `Fecha: ${new Date(invoice.issue_date).toLocaleString('es-MX')}`,
      20,
      yStart + 16
    );

    if (invoice.sales) {
      doc.text(
        `Venta: ${invoice.sales.order_number} - $${invoice.sales.total_amount.toFixed(2)}`,
        20,
        yStart + 24
      );
    }

    if (invoice.billing_name) {
      doc.text(`Cliente: ${invoice.billing_name}`, 20, yStart + 32);
    }
    if (invoice.tax_id) {
      doc.text(`RFC: ${invoice.tax_id}`, 20, yStart + 38);
    }
    if (invoice.billing_address) {
      doc.text('Dirección:', 20, yStart + 46);
      doc.text(invoice.billing_address, 20, yStart + 52, { maxWidth: 170 });
    }

    const yTotals = yStart + 70;
    doc.text(`Subtotal: $${invoice.total - (invoice.tax || 0)}`, 20, yTotals);
    doc.text(`Impuestos: $${(invoice.tax || 0).toFixed(2)}`, 20, yTotals + 6);
    doc.text(`Total: $${invoice.total.toFixed(2)} ${invoice.currency}`, 20, yTotals + 12);

    return doc;
  }

  function handleDownloadPdf(invoice: Invoice) {
    const doc = buildInvoicePdf(invoice);
    doc.save(`${invoice.invoice_number}.pdf`);
  }

  async function handleSavePdfToFiles(invoice: Invoice) {
    if (!user) {
      alert('Debes iniciar sesión para guardar archivos.');
      return;
    }

    try {
      const doc = buildInvoicePdf(invoice);
      const blob = doc.output('blob');
      const filePath = `invoices/${user.id}/${invoice.invoice_number}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('erpcommerce_files')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('files').insert({
        user_id: user.id,
        name: `${invoice.invoice_number}.pdf`,
        bucket: 'erpcommerce_files',
        path: filePath,
        mime_type: 'application/pdf',
        size: blob.size,
      });

      if (insertError) throw insertError;

      alert('Factura guardada en Archivos del ERP.');
    } catch (error: any) {
      console.error('Error guardando factura en archivos:', error);
      alert('Error al guardar la factura en archivos: ' + error.message);
    }
  }

  if (loading) {
    return <div>Cargando facturas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturas</h1>
          <p className="text-slate-500 mt-1">
            Genera y gestiona facturas ligadas a tus ventas
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <FilePlus2 className="h-4 w-4 mr-2" />
          Crear factura
        </Button>
      </div>

      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Nueva factura</DialogTitle>
            <DialogDescription>
              Completa los datos para generar la factura de una venta existente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Venta
                </label>
                <Select
                  value={selectedSaleId}
                  onValueChange={setSelectedSaleId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar venta" />
                  </SelectTrigger>
                  <SelectContent>
                    {sales.map((sale) => (
                      <SelectItem key={sale.id} value={sale.id}>
                        {sale.order_number} - ${sale.total_amount.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Nombre / Razón social
                </label>
                <Input
                  value={billingName}
                  onChange={(e) => setBillingName(e.target.value)}
                  placeholder="Nombre del cliente"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  RFC / Tax ID
                </label>
                <Input
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="RFC"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Dirección
                </label>
                <Input
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Dirección fiscal"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleCreateInvoice}
                disabled={creating || !selectedSaleId}
              >
                <FilePlus2 className="h-4 w-4 mr-2" />
                {creating ? 'Creando...' : 'Crear factura'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Listado de facturas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2 pr-4">Folio</th>
                  <th className="py-2 pr-4">Venta</th>
                  <th className="py-2 pr-4">Cliente</th>
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4 text-right">Total</th>
                  <th className="py-2 pr-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      No hay facturas todavía.
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b">
                      <td className="py-2 pr-4">{invoice.invoice_number}</td>
                      <td className="py-2 pr-4">
                        {invoice.sales
                          ? invoice.sales.order_number
                          : invoice.sale_id}
                      </td>
                      <td className="py-2 pr-4">
                        {invoice.billing_name || '-'}
                      </td>
                      <td className="py-2 pr-4">
                        {new Date(invoice.issue_date).toLocaleString('es-MX')}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        ${invoice.total.toFixed(2)} {invoice.currency}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDownloadPdf(invoice)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleSavePdfToFiles(invoice)}
                          >
                            <FilePlus2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
