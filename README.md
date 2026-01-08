# ERP Ligero - Sistema de Gestión Empresarial

Sistema ERP completo con funcionalidades de CRM, Inventarios y Business Intelligence, construido con Next.js y Supabase.

## Características Implementadas

### Autenticación
- Sistema de login y registro con Supabase Auth
- Protección de rutas con autenticación requerida
- Gestión de sesiones automática

### Dashboard Overview
- Ventas del día y del mes
- Progreso hacia objetivo mensual
- Métricas de leads y stock
- Ventas por canal con visualización
- Top 5 productos más vendidos
- Alertas de stock bajo

### Módulo de Ventas
- Crear ventas manuales
- Asociar leads a ventas
- Seleccionar múltiples productos
- Descuento automático de inventario mediante triggers
- Generación automática de número de orden
- Filtros por canal y búsqueda
- Tabla completa con todas las ventas

### Módulo de Leads (CRM)
- Crear y gestionar leads
- Búsqueda por ID, nombre, email o teléfono
- Filtros por canal de contacto
- Asociar producto de interés
- Estadísticas de leads

### Módulo de Inventario
- CRUD completo de productos
- Alertas visuales de stock bajo
- Activar/desactivar productos
- Búsqueda y filtros
- Valor total del inventario
- Gestión de SKU único

### Módulo de Objetivos
- Crear objetivos mensuales por canal
- Visualización de progreso en tiempo real
- Comparación con ventas reales
- Resumen del mes actual
- Historial de objetivos

## Stack Tecnológico

- **Frontend**: Next.js 13 (App Router), React
- **UI**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **TypeScript**: Tipado completo

## Base de Datos

### Tablas Implementadas

1. **products**: Catálogo de productos con SKU, precio y stock
2. **leads**: CRM con canal de contacto y producto de interés
3. **sales**: Registro de ventas con lead y canal asociados
4. **sale_items**: Detalle de productos en cada venta
5. **inventory_movements**: Historial de movimientos de inventario
6. **goals**: Objetivos mensuales por canal

### Características de la Base de Datos

- Todas las relaciones definidas con foreign keys
- Índices optimizados para búsquedas
- Trigger automático para descontar inventario en ventas
- Row Level Security (RLS) habilitado en todas las tablas
- Políticas de acceso para usuarios autenticados

## Datos de Ejemplo

El sistema incluye datos de ejemplo precargados:
- 8 productos de tecnología
- 6 leads de diferentes canales
- 5 ventas de ejemplo
- Objetivos para enero 2026

## Cómo Usar

### 1. Crear una Cuenta

Navega a `/auth/signup` y crea tu cuenta con email y contraseña.

### 2. Iniciar Sesión

Ingresa con tus credenciales en `/auth/login`.

### 3. Explorar el Dashboard

El dashboard principal muestra:
- KPIs en tiempo real
- Progreso de objetivos
- Ventas por canal
- Productos más vendidos

### 4. Gestionar Leads

En la sección "Leads (CRM)":
- Crea nuevos contactos potenciales
- Busca por ID, nombre, email o teléfono
- Filtra por canal de contacto

### 5. Registrar Ventas

En la sección "Ventas":
- Crea nuevas ventas
- Asocia un lead (opcional)
- Selecciona productos
- El inventario se descuenta automáticamente

### 6. Controlar Inventario

En la sección "Inventario":
- Agrega nuevos productos
- Edita precios y stock
- Monitorea alertas de stock bajo
- Activa/desactiva productos

### 7. Definir Objetivos

En la sección "Objetivos":
- Crea metas mensuales
- Define por canal específico o global
- Monitorea progreso en tiempo real

## Funcionalidades Destacadas

### Descuento Automático de Inventario

Cuando se crea una venta con productos, el sistema automáticamente:
1. Descuenta el stock de cada producto
2. Registra el movimiento en la tabla `inventory_movements`
3. Valida que haya stock suficiente antes de crear la venta

### Búsqueda y Filtros Avanzados

Todas las tablas incluyen:
- Búsqueda en tiempo real
- Filtros por múltiples criterios
- Ordenamiento de columnas

### Métricas en Tiempo Real

Los KPIs se calculan dinámicamente:
- Ventas del día
- Ventas del mes
- Progreso de objetivos
- Stock bajo

## Arquitectura

### Estructura del Proyecto

```
/app
  /auth                 # Páginas de autenticación
  /dashboard           # Panel principal
    /overview          # Dashboard con KPIs
    /sales             # Módulo de ventas
    /leads             # CRM
    /inventory         # Gestión de inventario
    /goals             # Objetivos
/components
  /dashboard           # Componentes del dashboard
  /ui                  # Componentes de shadcn/ui
/lib
  supabase.ts          # Cliente de Supabase
  auth-context.tsx     # Contexto de autenticación
```

### Seguridad

- Autenticación requerida en todas las rutas del dashboard
- RLS habilitado en todas las tablas
- Políticas de acceso restrictivas
- Validación de datos en frontend y backend

## Próximos Pasos Sugeridos

1. Integración con Meta Ads para importar leads
2. Exportación de datos a Excel/CSV
3. Reportes avanzados con gráficos
4. Notificaciones por email
5. Sistema de roles y permisos
6. API para integraciones externas
7. Sincronización con Kommo CRM

## Notas Técnicas

- El sistema usa Server Components y Client Components de Next.js 13
- Las consultas a Supabase se realizan directamente desde componentes
- El trigger de inventario garantiza consistencia de datos
- Los datos de ejemplo permiten probar todas las funcionalidades inmediatamente
