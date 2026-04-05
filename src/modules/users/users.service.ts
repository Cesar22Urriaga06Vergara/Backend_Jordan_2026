import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../../database/entities';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
  ) {}

  async create(dto: CreateUserDto) {
    const existing = await this.usuarioRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException('Email ya está en uso');
    }

    const usuario = this.usuarioRepository.create({
      nombre: dto.nombre,
      email: dto.email,
      password: await bcrypt.hash(dto.password, 10),
      rol: dto.rol ?? 'ADMIN',
      estado: dto.estado ?? 'ACTIVO',
    });

    const saved = await this.usuarioRepository.save(usuario);

    return {
      id: saved.id,
      nombre: saved.nombre,
      email: saved.email,
      rol: saved.rol,
      estado: saved.estado,
      fechaCreacion: saved.fechaCreacion,
    };
  }

  async findAll(page = 1, limit = 10) {
    const [usuarios, total] = await this.usuarioRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      select: ['id', 'nombre', 'email', 'rol', 'estado', 'fechaCreacion'],
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: usuarios,
      items: usuarios,
      total,
      page,
      limit,
      pages: totalPages,
      totalPages,
    };
  }

  async findById(id: number) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id },
      select: ['id', 'nombre', 'email', 'rol', 'estado', 'fechaCreacion'],
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return usuario;
  }

  async changePassword(id: number, currentPassword: string, newPassword: string) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Validar contraseña actual
    const isPasswordValid = await bcrypt.compare(currentPassword, usuario.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Contraseña actual incorrecta');
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    usuario.password = hashedPassword;

    await this.usuarioRepository.save(usuario);

    return {
      message: 'Contraseña actualizada correctamente',
    };
  }

  async updateProfile(id: number, updateData: { nombre?: string; email?: string }) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Validar que email no esté en uso
    if (updateData.email && updateData.email !== usuario.email) {
      const existing = await this.usuarioRepository.findOne({
        where: { email: updateData.email },
      });
      if (existing) {
        throw new BadRequestException('Email ya está en uso');
      }
    }

    if (updateData.nombre) usuario.nombre = updateData.nombre;
    if (updateData.email) usuario.email = updateData.email;

    await this.usuarioRepository.save(usuario);

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    };
  }
}
