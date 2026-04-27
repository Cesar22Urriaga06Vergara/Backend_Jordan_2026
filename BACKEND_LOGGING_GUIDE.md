# Backend: Validation, Logging & Auditing

## Subfase 4.2 — Implementación

### Nuevos Servicios Creados

#### 1. **AppLoggerService** (`common/services/logger.service.ts`)

Logger centralizado para toda la aplicación con múltiples niveles:

```typescript
import { AppLoggerService } from '@/common/services/logger.service';

constructor(@Inject(AppLoggerService) private logger: AppLoggerService) {}

// Log operaciones de negocio
this.logger.logOperation('CREATE', 'Cliente', clienteId, {
  userId: 123,
  username: 'juan@example.com',
  ip: '192.168.1.1',
  method: 'POST',
  path: '/catalogos/clientes',
  statusCode: 201,
  duration: 150,
});

// Log cambios auditables
this.logger.logAuditEvent(
  'ACTUALIZAR_CLIENTE',
  'Cliente',
  clienteId,
  { nombre: { antes: 'Old', despues: 'New' } },
  { userId: 123, username: 'admin' }
);

// Log errores críticos
this.logger.logCriticalError('Database connection failed', error, {
  userId: 123,
  ip: '192.168.1.1'
});

// Log de performance
this.logger.logPerformance('List clientes', 1200); // Alertará si > 1000ms
```

#### 2. **AuditService** (`common/services/audit.service.ts`)

Servicio para registrar cambios en la base de datos:

```typescript
import { AuditService } from '@/common/services/audit.service';

constructor(private auditService: AuditService) {}

// Registrar un cambio
await this.auditService.registrarCambio({
  usuarioId: 123,
  entidad: 'Cliente',
  registroId: 5,
  campo: 'nombre',
  valorAnterior: 'Juan García',
  valorNuevo: 'Juan García González',
  razonCambio: 'Error ortográfico'
});

// Registrar múltiples cambios
await this.auditService.registrarCambios([
  { usuarioId: 123, entidad: 'Cliente', registroId: 5, campo: 'nombre', valorAnterior: 'Juan', valorNuevo: 'Juan G' },
  { usuarioId: 123, entidad: 'Cliente', registroId: 5, campo: 'telefono', valorAnterior: '300123456', valorNuevo: '300987654' },
]);

// Detectar cambios automáticamente
const cambios = this.auditService.detectarCambios(
  { nombre: 'Juan', telefono: '3001234' },
  { nombre: 'Juan García', telefono: '3001234', direccion: 'Calle 5' }
);
// Resultado: { nombre: { antes: 'Juan', despues: 'Juan García' }, direccion: { antes: undefined, despues: 'Calle 5' } }

// Obtener historial
const historial = await this.auditService.obtenerHistorial('Cliente', 5);
// Retorna todos los cambios realizados a cliente con id 5

// Obtener actividad de usuario
const actividades = await this.auditService.obtenerActividadUsuario(123, 7); // últimos 7 días
```

### Mecanismos Globales

#### **GlobalExceptionFilter** (Automático)

Captura TODOS los errores y los formatea de forma consistente:

```typescript
// Error Automático HTTP 400 (Bad Request)
{
  "success": false,
  "statusCode": 400,
  "message": "Error de validación",
  "errors": {
    "nombre": ["El nombre es requerido"],
    "codigo": ["El código debe ser único"]
  },
  "timestamp": "2026-04-05T10:30:00.000Z",
  "method": "POST",
  "path": "/catalogos/clientes",
  "requestId": "abc123-def456"
}

// Error Automático HTTP 500 (Server Error)
// Se loguea automáticamente en AppLoggerService
```

#### **LoggingInterceptor** (Global)

Registra automáticamente TODAS las requests/responses HTTP:

```
→ POST /catalogos/clientes (User: juan@example.com)
← 201 POST /catalogos/clientes (145ms)
```

#### **ValidationPipe** (Global)

Valida DTOs automáticamente usando `class-validator`:

```typescript
// En DTO
export class CreateClienteDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @IsUnique('Cliente', 'codigo') // Custom validator
  codigo: string;

  @IsEnum(['TIENDA', 'NEGOCIO'])
  tipo: string;
}

// El pipe valida automáticamente antes de que llegue al controller
// Si hay errores, retorna 400 con mensajes descriptivos
```

---

## Ejemplo de Integración: Servicio de Clientes Mejorado

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from '@/database/entities';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { AppLoggerService } from '@/common/services/logger.service';
import { AuditService } from '@/common/services/audit.service';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private clienteRepo: Repository<Cliente>,
    @Inject(AppLoggerService)
    private logger: AppLoggerService,
    private auditService: AuditService,
  ) {}

  async findAll(page = 1, limit = 10, search?: string) {
    try {
      const [data, total] = await this.clienteRepo.findAndCount({
        skip: (page - 1) * limit,
        take: limit,
        order: { nombre: 'ASC' },
        where: search ? { nombre: Like(`%${search}%`) } : {},
      });

      this.logger.logOperation('READ', 'Cliente', 0, {
        method: 'GET',
        path: '/catalogos/clientes',
        statusCode: 200,
        query: { page, limit, search },
      });

      return { data, total, page, limit };
    } catch (error) {
      this.logger.logCriticalError('Error fetching clientes', error);
      throw error;
    }
  }

  async findOne(id: number) {
    const cliente = await this.clienteRepo.findOne({ where: { id } });
    if (!cliente) {
      throw new NotFoundException(`Cliente ${id} no encontrado`);
    }

    this.logger.logOperation('READ', 'Cliente', id, {
      statusCode: 200,
      method: 'GET',
      path: `/catalogos/clientes/${id}`,
    });

    return cliente;
  }

  async create(dto: CreateClienteDto, usuarioId: number) {
    // ValidationPipe ya validó el DTO
    const cliente = this.clienteRepo.create(dto);
    const resultado = await this.clienteRepo.save(cliente);

    // Log de operación
    this.logger.logOperation('CREATE', 'Cliente', resultado.id, {
      userId: usuarioId,
      statusCode: 201,
      method: 'POST',
      path: '/catalogos/clientes',
      body: dto,
    });

    // Log de auditoría
    await this.auditService.registrarActividad({
      usuarioId,
      accion: 'CREAR_CLIENTE',
      descripcion: `Creó cliente ${resultado.codigo}: ${resultado.nombre}`,
    });

    return resultado;
  }

  async update(id: number, dto: UpdateClienteDto, usuarioId: number) {
    const clienteAnterior = await this.findOne(id);

    // Detectar qué cambió
    const cambios = this.auditService.detectarCambios(clienteAnterior, dto);

    if (Object.keys(cambios).length === 0) {
      this.logger.log('No changes detected for cliente', 'ClientesService');
      return clienteAnterior;
    }

    // Actualizar cliente
    Object.assign(clienteAnterior, dto);
    const resultado = await this.clienteRepo.save(clienteAnterior);

    // Registrar cada cambio en auditoría
    for (const [campo, { antes, despues }] of Object.entries(cambios)) {
      await this.auditService.registrarCambio({
        usuarioId,
        entidad: 'Cliente',
        registroId: id,
        campo,
        valorAnterior: antes,
        valorNuevo: despues,
        razonCambio: dto.razonCambio, // si está en el DTO
      });
    }

    // Log de operación
    this.logger.logOperation('UPDATE', 'Cliente', id, {
      userId: usuarioId,
      statusCode: 200,
      method: 'PUT',
      path: `/catalogos/clientes/${id}`,
      body: dto,
    });

    return resultado;
  }

  async delete(id: number, usuarioId: number) {
    const cliente = await this.findOne(id);
    await this.clienteRepo.remove(cliente);

    this.logger.logOperation('DELETE', 'Cliente', id, {
      userId: usuarioId,
      statusCode: 204,
      method: 'DELETE',
      path: `/catalogos/clientes/${id}`,
    });

    await this.auditService.registrarActividad({
      usuarioId,
      accion: 'ELIMINAR_CLIENTE',
      descripcion: `Eliminó cliente ${cliente.codigo}: ${cliente.nombre}`,
    });

    return { message: 'Cliente eliminado' };
  }
}
```

---

## Integración con Controladores

```typescript
import { Controller, Post, Get, Put, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@Controller('catalogos/clientes')
@UseGuards(JwtAuthGuard) // Los guards ya son globales, esto es redundante pero clarifica
export class ClientesController {
  constructor(private clientesService: ClientesService) {}

  @Get()
  async findAll(@Query('page') page = 1, @Query('limit') limit = 10, @Query('search') search?: string) {
    return this.clientesService.findAll(page, limit, search);
    // ValidationPipe valida automáticamente page, limit (deben ser numbers)
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.clientesService.findOne(id);
    // ValidationPipe convierte id string a number automáticamente
  }

  @Post()
  async create(@Body() dto: CreateClienteDto, @Req() req: any) {
    // ValidationPipe valida automáticamente:
    // - nombre: IsString(), IsNotEmpty()
    // - codigo: IsString(), IsNotEmpty(), IsUnique()
    // - tipo: IsEnum(['TIENDA', 'NEGOCIO'])
    // Si hay error, retorna 400 automáticamente
    
    return this.clientesService.create(dto, req.user.id);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() dto: UpdateClienteDto, @Req() req: any) {
    return this.clientesService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: number, @Req() req: any) {
    return this.clientesService.delete(id, req.user.id);
  }
}
```

---

## Flujo de Logging Automático

### Ejemplo: POST /catalogos/clientes

```
1. Request llega a Controller
   ↓
2. LoggingInterceptor registra:
   "→ POST /catalogos/clientes (User: juan@example.com)"
   ↓
3. ValidationPipe valida CreateClienteDto
   - Si hay error → retorna 400 + error formateado
   - AppLoggerService.logValidationError() registra el error
   ↓
4. Controller llama ClientesService.create()
   ↓
5. ClientesService:
   - Crea cliente en BD
   - Registra cambio en CambioAuditoria
   - Registra actividad en LogActividad
   - Loguea operación en AppLoggerService
   ↓
6. Response retorna al cliente (201 Created)
   ↓
7. LoggingInterceptor registra:
   "← 201 POST /catalogos/clientes (145ms)"
```

---

## Base de Datos de Auditoría

### Tabla: cambio_auditoria
```sql
SELECT * FROM cambio_auditoria
WHERE entidad = 'Cliente' AND registroId = 5
ORDER BY fecha DESC;

# Resultado:
id | usuarioId | entidad | registroId | campo     | valorAnterior | valorNuevo           | razonCambio        | fecha
1  | 123       | Cliente | 5          | nombre    | Juan García   | Juan García González | Error ortográfico  | 2026-04-05 10:30:00
2  | 123       | Cliente | 5          | telefono  | 300123456     | 300987654            | Número actualizado  | 2026-04-05 10:25:00
```

### Tabla: log_actividad
```sql
SELECT * FROM log_actividad
WHERE usuarioId = 123
ORDER BY fecha DESC
LIMIT 10;

# Resultado:
id | usuarioId | accion          | descripcion                              | ip           | fecha
10 | 123       | CREAR_CLIENTE   | Creó cliente C001: Juan García           | 192.168.1.1  | 2026-04-05 10:15:00
9  | 123       | ACTUALIZAR_CLIENTE | Actualizó cliente C001 (nombre)      | 192.168.1.1  | 2026-04-05 10:10:00
8  | 123       | CREAR_PRODUCTO  | Creó producto P001: Purificador 500L    | 192.168.1.1  | 2026-04-05 09:50:00
```

---

## Checklist de Adopción

Para cada servicio existente (ClientesService, ProductosService, etc.):

- [ ] Importar AppLoggerService y AuditService
- [ ] Ag regar @Inject() en constructor
- [ ] Envolver try-catch con logCriticalError()
- [ ] Agregar logOperation() en métodos CRUD
- [ ] Agregar registrarCambio() en update()
- [ ] Agregar registrarActividad() en create/update/delete
- [ ] Usar detectarCambios() para encontrar qué cambió
- [ ] Probar en local antes de hacer deploy

---

## Performance

- **AppLoggerService**: ~1-2ms por operación (async-safe)
- **AuditService**: ~10-20ms por cambio (INSERT en tabla cambio_auditoria)
- **Interceptores**: Negligible (~0.1ms overhead)
- **Pipes**: ~5-10ms por validación

Total overhead estimado: **20-40ms por request** en operaciones CRUD (aceptable para transacciones)

---

## Próximos Pasos

1. Aplicar a servicios principales:
   - ClientesService ✓ (arriba)
   - ProductosService (similar)
   - TrabajadoresService (similar)
   - Pedidos, Ventas, Rutas (más complejos)

2. Agregar DTOs con @IsUnique validators

3. Crear reportes de auditoría:
   - "Cambios de usuario X en rango de fechas"
   - "Cambios en entidad Y últimos 30 días"
   - "Usuarios con más operaciones"

4. Dashboard de monit oring (FASE 4.3)
