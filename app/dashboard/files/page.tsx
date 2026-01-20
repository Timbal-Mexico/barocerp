'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Upload,
  Trash2,
  Eye,
  Download,
  Pencil,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  File,
  MoreHorizontal,
} from 'lucide-react';

type FileRow = {
  id: string;
  name: string;
  bucket: string;
  path: string;
  mime_type: string | null;
  size: number | null;
  created_at: string;
};

export default function FilesPage() {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileRow | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [renamingFile, setRenamingFile] = useState<FileRow | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    try {
      if (!user) {
        setFiles([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const uploadFile = useCallback(async (file: File) => {
    if (!user) return;

    try {
      setUploading(true);
      const filePath = `files/${user.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('erpcommerce_files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('files').insert({
        user_id: user.id,
        name: file.name,
        bucket: 'erpcommerce_files',
        path: filePath,
        mime_type: file.type || null,
        size: file.size,
      });

      if (insertError) throw insertError;

      loadFiles();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert('Error al subir archivo: ' + error.message);
    } finally {
      setUploading(false);
    }
  }, [user, loadFiles]);

  const handleUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
    event.target.value = '';
  }, [uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // Handle multiple files if needed, currently just taking the first one
      // to match existing single-file logic, or we could loop.
      // Let's stick to single file for now as per current UI/logic
      await uploadFile(files[0]);
    }
  }, [uploadFile]);

  async function handleDelete(file: FileRow) {
    if (!confirm(`¿Eliminar el archivo "${file.name}"?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from(file.bucket)
        .remove([file.path]);

      if (storageError) throw storageError;

      const { error } = await supabase.from('files').delete().eq('id', file.id);
      if (error) throw error;

      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (error: any) {
      console.error('Error deleting file:', error);
      alert('Error al eliminar archivo: ' + error.message);
    }
  }

  async function handleDownload(file: FileRow) {
    try {
      const { data, error } = await supabase.storage
        .from(file.bucket)
        .download(file.path);

      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      alert('Error al descargar archivo: ' + error.message);
    }
  }

  async function handleRenameSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!renamingFile) return;
    const trimmed = newFileName.trim();
    if (!trimmed) return;

    try {
      setRenaming(true);
      const { error } = await supabase
        .from('files')
        .update({ name: trimmed, updated_at: new Date().toISOString() })
        .eq('id', renamingFile.id);

      if (error) throw error;

      setFiles((prev) =>
        prev.map((file) =>
          file.id === renamingFile.id ? { ...file, name: trimmed } : file
        )
      );
      setRenamingFile(null);
      setNewFileName('');
    } catch (error: any) {
      console.error('Error renombrando archivo:', error);
      alert('Error al renombrar archivo: ' + error.message);
    } finally {
      setRenaming(false);
    }
  }

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function getFileExtension(file: FileRow) {
    const parts = file.name.split('.');
    if (parts.length < 2) return '';
    return parts[parts.length - 1].toLowerCase();
  }

  function getFileUrl(file: FileRow) {
    return supabase.storage.from(file.bucket).getPublicUrl(file.path).data.publicUrl;
  }

  function handlePrintOrDownload(file: FileRow) {
    const mime = file.mime_type || '';
    const url = getFileUrl(file);
    if (mime === 'application/pdf') {
      const win = window.open(url, '_blank');
      if (win) {
        win.focus();
        win.print();
      }
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }

  function renderPreviewContent(file: FileRow) {
    const mime = file.mime_type || '';
    const url = getFileUrl(file);
    const lowerName = file.name.toLowerCase();

    if (mime.startsWith('image/')) {
      return (
        <div className="flex justify-center">
          <img
            src={url}
            alt={file.name}
            style={{ transform: `scale(${imageZoom})` }}
            className="max-h-[70vh] w-auto object-contain transition-transform"
          />
        </div>
      );
    }
    if (mime === 'application/pdf' || lowerName.endsWith('.pdf')) {
      return (
        <iframe
          src={url}
          className="w-full h-[70vh] border rounded-md"
        />
      );
    }

    const isWord =
      mime.includes('word') ||
      lowerName.endsWith('.doc') ||
      lowerName.endsWith('.docx');
    const isExcel =
      mime.includes('spreadsheet') ||
      mime.includes('excel') ||
      mime.includes('csv') ||
      lowerName.endsWith('.xls') ||
      lowerName.endsWith('.xlsx') ||
      lowerName.endsWith('.csv');

    if (isWord || isExcel) {
      const viewerUrl =
        'https://view.officeapps.live.com/op/view.aspx?src=' +
        encodeURIComponent(url);
      return (
        <iframe
          src={viewerUrl}
          className="w-full h-[70vh] border rounded-md"
        />
      );
    }
    return (
      <div className="text-sm text-slate-600 flex flex-col items-center gap-2">
        <div>
          No hay vista previa disponible para este tipo de archivo en el navegador.
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handlePrintOrDownload(file)}
        >
          Abrir en nueva pestaña
        </Button>
      </div>
    );
  }

  function getFileIcon(file: FileRow) {
    const mime = file.mime_type || '';
    const ext = getFileExtension(file);
    if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return <FileImage className="h-4 w-4 text-blue-500" />;
    }
    if (mime === 'application/pdf' || ext === 'pdf') {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    if (
      mime.includes('spreadsheet') ||
      mime.includes('excel') ||
      mime.includes('csv') ||
      ['xls', 'xlsx', 'csv'].includes(ext)
    ) {
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FileArchive className="h-4 w-4 text-orange-500" />;
    }
    return <File className="h-4 w-4 text-slate-500" />;
  }

  if (loading) {
    return <div>Cargando archivos...</div>;
  }

  function getReadableType(mime: string | null, ext: string): string {
    if (mime === 'application/pdf' || ext === 'pdf') return 'Documento PDF';
    if (
      mime?.includes('spreadsheet') ||
      mime?.includes('excel') ||
      ['xls', 'xlsx', 'csv'].includes(ext)
    )
      return 'Hoja de cálculo';
    if (
      mime?.includes('word') ||
      mime?.includes('document') ||
      ['doc', 'docx'].includes(ext)
    )
      return 'Documento Word';
    if (mime?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext))
      return `Imagen ${ext.toUpperCase()}`;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'Archivo comprimido';
    if (mime === 'text/plain' || ext === 'txt') return 'Documento de texto';
    
    return mime || 'Archivo desconocido';
  }

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-200px)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Archivos</h1>
          <p className="text-slate-500 mt-1">
            Sube y gestiona documentos, imágenes y otros archivos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,image/*"
            className="hidden"
            id="file-upload-input"
          />
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <span>{uploading ? 'Subiendo...' : 'Subir archivo'}</span>
            </div>
          </Button>
        </div>
      </div>

      <div
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer ${
          isDragging ? 'border-primary bg-primary/5' : 'border-slate-300'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="h-6 w-6 mb-2 text-primary" />
        <p className="font-medium text-sm">Arrastra y suelta archivos aquí</p>
        <p className="text-xs text-slate-500">o haz clic para seleccionar desde tu equipo</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de archivos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Input
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <div className="text-sm text-slate-500">
              {filteredFiles.length} archivos
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2 pr-4">Nombre</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Tamaño</th>
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No hay archivos aún. Sube tu primer archivo para comenzar.
                    </td>
                  </tr>
                ) : (
                  filteredFiles.map((file) => (
                    <tr
                      key={file.id}
                      className="border-b hover:bg-slate-50 group cursor-pointer transition-colors"
                      onDoubleClick={() => setPreviewFile(file)}
                    >
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          {getFileIcon(file)}
                          <span>{file.name}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        {getReadableType(file.mime_type, getFileExtension(file))}
                      </td>
                      <td className="py-2 pr-4">
                        {file.size != null
                          ? `${(file.size / 1024).toFixed(1)} KB`
                          : '-'}
                      </td>
                      <td className="py-2 pr-4">
                        {new Date(file.created_at).toLocaleString('es-MX')}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex justify-end items-center gap-2">
                          <div className="hidden md:flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewFile(file);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(file);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingFile(file);
                              setNewFileName(file.name);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(file);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewFile(file);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Ver
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(file);
                                }}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Descargar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenamingFile(file);
                                  setNewFileName(file.name);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Renombrar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(file);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <Dialog
        open={!!renamingFile}
        onOpenChange={(open) => {
          if (!open) {
            setRenamingFile(null);
            setNewFileName('');
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Renombrar archivo</DialogTitle>
            <DialogDescription>
              Cambia el nombre visible del archivo
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameSubmit} className="space-y-4">
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRenamingFile(null);
                  setNewFileName('');
                }}
                disabled={renaming}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={renaming || !newFileName.trim()}>
                {renaming ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!previewFile}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewFile(null);
            setImageZoom(1);
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          {previewFile && (
            <>
              <DialogHeader>
                <DialogTitle>{previewFile.name}</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {previewFile.mime_type && previewFile.mime_type.startsWith('image/') && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setImageZoom((z) => Math.max(0.5, parseFloat((z - 0.25).toFixed(2))))
                        }
                      >
                        -
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setImageZoom((z) => Math.min(3, parseFloat((z + 0.25).toFixed(2))))
                        }
                      >
                        +
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setImageZoom(1)}
                      >
                        100%
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => previewFile && handlePrintOrDownload(previewFile)}
                  >
                    Imprimir
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setPreviewFile(null);
                      setImageZoom(1);
                    }}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
              <div>{renderPreviewContent(previewFile)}</div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
