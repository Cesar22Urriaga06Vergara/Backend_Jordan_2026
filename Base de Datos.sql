-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Versión del servidor:         10.4.32-MariaDB - mariadb.org binary distribution
-- SO del servidor:              Win64
-- HeidiSQL Versión:             12.14.0.7169
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Volcando estructura de base de datos para jordan
CREATE DATABASE IF NOT EXISTS `jordan` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;
USE `jordan`;

-- Volcando estructura para tabla jordan.abono_deuda
CREATE TABLE IF NOT EXISTS `abono_deuda` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `anticipoPrestamoId` int(11) NOT NULL,
  `trabajadorId` int(11) NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `fecha` datetime NOT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `IDX_2b66a0d781d0d14ae0c25a18fe` (`fecha`),
  KEY `IDX_d9c22bf2c367afdaf326177929` (`trabajadorId`),
  KEY `IDX_f4ab2bfb67205b577a9af1d048` (`anticipoPrestamoId`),
  CONSTRAINT `FK_d9c22bf2c367afdaf326177929a` FOREIGN KEY (`trabajadorId`) REFERENCES `trabajadores` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `FK_f4ab2bfb67205b577a9af1d0481` FOREIGN KEY (`anticipoPrestamoId`) REFERENCES `anticipo_prestamo` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.abono_deuda: ~1 rows (aproximadamente)
INSERT INTO `abono_deuda` (`id`, `anticipoPrestamoId`, `trabajadorId`, `monto`, `fecha`, `observaciones`, `createdAt`, `updatedAt`) VALUES
	(1, 1, 1, 30000.00, '2026-04-03 17:00:00', 'Abono manual decidido por trabajador al momento de pago', '2026-04-03 05:37:57.221050', '2026-04-03 05:37:57.221050');

-- Volcando estructura para tabla jordan.anticipo_prestamo
CREATE TABLE IF NOT EXISTS `anticipo_prestamo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero` varchar(255) NOT NULL,
  `trabajadorId` int(11) NOT NULL,
  `tipo` enum('ANTICIPO','PRESTAMO') NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `estado` enum('ACTIVO','PAGADO_PARCIALMENTE','PAGADO_COMPLETAMENTE','CANCELADO') NOT NULL DEFAULT 'ACTIVO',
  `fecha` datetime NOT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_e72054a4fb0e3ab785802f859c` (`numero`),
  KEY `IDX_15f5f9d22a021c6a100ad1a020` (`tipo`),
  KEY `IDX_fb54a4551e9470da3743fb5d46` (`estado`),
  KEY `IDX_aa1bbd0a5e9157b10f2902e389` (`trabajadorId`),
  CONSTRAINT `FK_aa1bbd0a5e9157b10f2902e3895` FOREIGN KEY (`trabajadorId`) REFERENCES `trabajadores` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.anticipo_prestamo: ~1 rows (aproximadamente)
INSERT INTO `anticipo_prestamo` (`id`, `numero`, `trabajadorId`, `tipo`, `monto`, `estado`, `fecha`, `motivo`, `observaciones`, `createdAt`, `updatedAt`) VALUES
	(1, 'PREST-20260403-001', 1, 'PRESTAMO', 150000.00, 'PAGADO_PARCIALMENTE', '2026-04-03 11:30:00', 'Prestamo personal registrado por administrador', 'No se descuenta automaticamente', '2026-04-03 05:37:57.216133', '2026-04-03 05:37:57.216133');

-- Volcando estructura para tabla jordan.apertura_diaria
CREATE TABLE IF NOT EXISTS `apertura_diaria` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha` datetime NOT NULL,
  `usuarioId` int(11) NOT NULL,
  `saldoInicial` decimal(12,2) NOT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_c6480f46cf6b0cf1780f84bbe6` (`fecha`),
  KEY `IDX_91150b5f8d08b9545eda8e03a9` (`usuarioId`),
  CONSTRAINT `FK_91150b5f8d08b9545eda8e03a98` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`id`) ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.apertura_diaria: ~1 rows (aproximadamente)
INSERT INTO `apertura_diaria` (`id`, `fecha`, `usuarioId`, `saldoInicial`, `observaciones`, `createdAt`, `updatedAt`) VALUES
	(1, '2026-04-03 06:00:00', 1, 250000.00, 'Apertura del dia con saldo inicial y stock base', '2026-04-03 05:37:56.924976', '2026-04-03 05:37:56.924976');

-- Volcando estructura para tabla jordan.cambio_auditoria
CREATE TABLE IF NOT EXISTS `cambio_auditoria` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuarioId` int(11) NOT NULL,
  `entidad` varchar(255) NOT NULL,
  `registroId` int(11) NOT NULL,
  `campo` varchar(255) NOT NULL,
  `valorAnterior` varchar(255) DEFAULT NULL,
  `valorNuevo` varchar(255) DEFAULT NULL,
  `razonCambio` varchar(255) DEFAULT NULL,
  `fecha` datetime NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `IDX_ccdf7a126c25cbec27ac808ca7` (`fecha`),
  KEY `IDX_4953d59ee18a92a95e4d5a9690` (`registroId`),
  KEY `IDX_85167866ccfd1723da4877d100` (`entidad`),
  KEY `IDX_56ee74a9d0d460e8f0f8ec1d71` (`usuarioId`),
  CONSTRAINT `FK_56ee74a9d0d460e8f0f8ec1d71a` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`id`) ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.cambio_auditoria: ~0 rows (aproximadamente)

-- Volcando estructura para tabla jordan.cartera
CREATE TABLE IF NOT EXISTS `cartera` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clienteId` int(11) NOT NULL,
  `ventaId` int(11) NOT NULL,
  `saldoPendiente` decimal(12,2) NOT NULL,
  `diasMora` int(11) NOT NULL DEFAULT 0,
  `ultimoMovimiento` datetime NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_7ec586d1fc76e9dc2210db6471` (`ventaId`),
  KEY `IDX_a4a859e2df6fd95b643bb82b65` (`saldoPendiente`),
  KEY `IDX_c90a60714a186f1acc2541ba9f` (`clienteId`),
  CONSTRAINT `FK_c90a60714a186f1acc2541ba9f0` FOREIGN KEY (`clienteId`) REFERENCES `clientes` (`id`) ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.cartera: ~1 rows (aproximadamente)
INSERT INTO `cartera` (`id`, `clienteId`, `ventaId`, `saldoPendiente`, `diasMora`, `ultimoMovimiento`, `createdAt`, `updatedAt`) VALUES
	(1, 3, 3, 30000.00, 0, '2026-04-03 14:00:00', '2026-04-03 05:37:57.143646', '2026-04-03 05:37:57.143646');

-- Volcando estructura para tabla jordan.cierre_caja
CREATE TABLE IF NOT EXISTS `cierre_caja` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha` datetime NOT NULL,
  `totalEfectivo` decimal(12,2) NOT NULL,
  `totalTransferencias` decimal(12,2) NOT NULL,
  `totalEgresos` decimal(12,2) NOT NULL,
  `saldoCalculado` decimal(12,2) NOT NULL,
  `saldoContado` decimal(12,2) NOT NULL,
  `diferencia` decimal(12,2) NOT NULL,
  `diferenciasInventario` text DEFAULT NULL,
  `rutas` text DEFAULT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_f1600d7a1614699d2311d1f2f9` (`fecha`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.cierre_caja: ~0 rows (aproximadamente)
INSERT INTO `cierre_caja` (`id`, `fecha`, `totalEfectivo`, `totalTransferencias`, `totalEgresos`, `saldoCalculado`, `saldoContado`, `diferencia`, `diferenciasInventario`, `rutas`, `observaciones`, `createdAt`, `updatedAt`) VALUES
	(1, '2026-04-03 18:30:00', 170000.00, 120000.00, 275000.00, 145000.00, 145000.00, 0.00, '[]', '[{"numero":"RUTA-20260403-001","estado":"LIQUIDADA"}]', 'Cierre de caja validado', '2026-04-03 05:37:57.243290', '2026-04-03 05:37:57.243290');

-- Volcando estructura para tabla jordan.cierre_diario
CREATE TABLE IF NOT EXISTS `cierre_diario` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha` datetime NOT NULL,
  `usuarioId` int(11) NOT NULL,
  `cierreCajaId` int(11) NOT NULL,
  `rutasLiquidadas` tinyint(4) NOT NULL DEFAULT 0,
  `pedidosFinalizados` tinyint(4) NOT NULL DEFAULT 0,
  `inventarioContado` tinyint(4) NOT NULL DEFAULT 0,
  `cajaCuadrada` tinyint(4) NOT NULL DEFAULT 0,
  `trabajadoresPagados` tinyint(4) NOT NULL DEFAULT 0,
  `observaciones` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_dbbe044e811542f202bf2b921d` (`fecha`),
  UNIQUE KEY `IDX_01f028373ab24b64e36baf3197` (`cierreCajaId`),
  KEY `IDX_e4524872cb27f4473d3e13f248` (`usuarioId`),
  CONSTRAINT `FK_e4524872cb27f4473d3e13f248d` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`id`) ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.cierre_diario: ~0 rows (aproximadamente)
INSERT INTO `cierre_diario` (`id`, `fecha`, `usuarioId`, `cierreCajaId`, `rutasLiquidadas`, `pedidosFinalizados`, `inventarioContado`, `cajaCuadrada`, `trabajadoresPagados`, `observaciones`, `createdAt`, `updatedAt`) VALUES
	(1, '2026-04-03 18:30:00', 1, 1, 1, 1, 1, 1, 1, 'Cierre diario con datos operativos reales', '2026-04-03 05:37:57.248142', '2026-04-03 05:37:57.248142');

-- Volcando estructura para tabla jordan.cierre_inventario
CREATE TABLE IF NOT EXISTS `cierre_inventario` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `productoId` int(11) NOT NULL,
  `cierreDiarioId` int(11) NOT NULL,
  `cantidadInicial` int(11) NOT NULL,
  `cantidadProducida` int(11) NOT NULL DEFAULT 0,
  `cantidadSalida` int(11) NOT NULL DEFAULT 0,
  `cantidadDevoluciones` int(11) NOT NULL DEFAULT 0,
  `cantidadEsperada` int(11) NOT NULL,
  `cantidadContada` int(11) NOT NULL,
  `diferencia` int(11) NOT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_ba6ac46c4ac2a9b6aac12b371d` (`productoId`,`cierreDiarioId`),
  KEY `IDX_3b3627ea67d2993c6c847b5925` (`cierreDiarioId`),
  KEY `IDX_53279e7abb0c6227b3fade9c30` (`productoId`),
  CONSTRAINT `FK_3b3627ea67d2993c6c847b59259` FOREIGN KEY (`cierreDiarioId`) REFERENCES `cierre_diario` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `FK_53279e7abb0c6227b3fade9c305` FOREIGN KEY (`productoId`) REFERENCES `productos` (`id`) ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.cierre_inventario: ~5 rows (aproximadamente)
INSERT INTO `cierre_inventario` (`id`, `productoId`, `cierreDiarioId`, `cantidadInicial`, `cantidadProducida`, `cantidadSalida`, `cantidadDevoluciones`, `cantidadEsperada`, `cantidadContada`, `diferencia`, `observaciones`, `createdAt`, `updatedAt`) VALUES
	(1, 1, 1, 50, 15, 5, 0, 60, 60, 0, 'Sin diferencias', '2026-04-03 05:37:57.253304', '2026-04-03 05:37:57.253304'),
	(2, 2, 1, 60, 20, 8, 4, 76, 76, 0, 'Incluye devolucion de pedido reprogramado', '2026-04-03 05:37:57.256239', '2026-04-03 05:37:57.256239'),
	(3, 3, 1, 40, 10, 3, 0, 47, 47, 0, 'Sin diferencias', '2026-04-03 05:37:57.259447', '2026-04-03 05:37:57.259447'),
	(4, 6, 1, 100, 30, 6, 0, 124, 124, 0, 'Sin diferencias', '2026-04-03 05:37:57.260619', '2026-04-03 05:37:57.260619'),
	(5, 7, 1, 80, 20, 5, 0, 95, 95, 0, 'Sin diferencias', '2026-04-03 05:37:57.261702', '2026-04-03 05:37:57.261702');

-- Volcando estructura para tabla jordan.clientes
CREATE TABLE IF NOT EXISTS `clientes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `tipo` enum('TIENDA','NEGOCIO','DIRECTO','VEREDA','FRECUENTE') NOT NULL,
  `cedula` varchar(255) DEFAULT NULL,
  `nit` varchar(255) DEFAULT NULL,
  `telefono` varchar(255) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `vereda` varchar(255) DEFAULT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_38777c5bca00ee20f9b57bc4b3` (`codigo`),
  KEY `IDX_fa1e326586a05f459771ac6ba8` (`nombre`),
  KEY `IDX_5961eaa08c41734c7bd7feb73d` (`tipo`),
  KEY `IDX_05b9b00fd246cc79b1fbf37e20` (`activo`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.clientes: ~3 rows (aproximadamente)
INSERT INTO `clientes` (`id`, `codigo`, `nombre`, `tipo`, `cedula`, `nit`, `telefono`, `direccion`, `vereda`, `observaciones`, `activo`, `createdAt`, `updatedAt`) VALUES
	(1, 'CLI-0001', 'La Esperanza', 'TIENDA', NULL, NULL, '3001234567', 'Calle Principal 123', 'Centro', 'Cliente de tienda con precio especial', 1, '2026-04-03 05:37:56.762727', '2026-04-03 05:37:56.762727'),
	(2, 'CLI-0002', 'El Parador', 'NEGOCIO', NULL, '900123456-1', '3007654321', 'Avenida Comercial 10', 'Centro', 'Negocio con pedidos por ruta', 1, '2026-04-03 05:37:56.766474', '2026-04-03 05:37:56.766474'),
	(3, 'CLI-0003', 'Cristal', 'DIRECTO', '1111111111', NULL, '3015550101', 'Planta Jordan', 'Planta', 'Cliente directo en purificadora', 1, '2026-04-03 05:37:56.768599', '2026-04-03 05:37:56.768599'),
	(4, 'C770384', 'Cliente Test 1775212770384', 'TIENDA', NULL, '1234567890', NULL, NULL, NULL, NULL, 1, '2026-04-03 05:39:30.392847', '2026-04-03 05:39:30.392847');

-- Volcando estructura para tabla jordan.detalle_pedido
CREATE TABLE IF NOT EXISTS `detalle_pedido` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pedidoId` int(11) NOT NULL,
  `productoId` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `precioUnitario` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `IDX_aa6bb17cb0e47d62ace803293e` (`productoId`),
  KEY `IDX_4d39e79d693b68f9f35cf4238e` (`pedidoId`),
  CONSTRAINT `FK_4d39e79d693b68f9f35cf4238e1` FOREIGN KEY (`pedidoId`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `FK_aa6bb17cb0e47d62ace803293eb` FOREIGN KEY (`productoId`) REFERENCES `productos` (`id`) ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.detalle_pedido: ~9 rows (aproximadamente)
INSERT INTO `detalle_pedido` (`id`, `pedidoId`, `productoId`, `cantidad`, `precioUnitario`, `subtotal`, `createdAt`, `updatedAt`) VALUES
	(1, 1, 2, 4, 16000.00, 64000.00, '2026-04-03 05:37:57.014490', '2026-04-03 05:37:57.014490'),
	(2, 1, 6, 6, 6000.00, 36000.00, '2026-04-03 05:37:57.019580', '2026-04-03 05:37:57.019580'),
	(3, 2, 3, 3, 24000.00, 72000.00, '2026-04-03 05:37:57.029630', '2026-04-03 05:37:57.029630'),
	(4, 2, 5, 6, 8000.00, 48000.00, '2026-04-03 05:37:57.035676', '2026-04-03 05:37:57.035676'),
	(5, 3, 1, 5, 14000.00, 70000.00, '2026-04-03 05:37:57.039555', '2026-04-03 05:37:57.039555'),
	(6, 3, 7, 5, 6000.00, 30000.00, '2026-04-03 05:37:57.047923', '2026-04-03 05:37:57.047923'),
	(7, 4, 4, 5, 7000.00, 35000.00, '2026-04-03 05:37:57.053737', '2026-04-03 05:37:57.053737'),
	(8, 4, 6, 5, 6000.00, 30000.00, '2026-04-03 05:37:57.057445', '2026-04-03 05:37:57.057445'),
	(9, 5, 2, 4, 16500.00, 66000.00, '2026-04-03 05:37:57.074800', '2026-04-03 05:37:57.074800');

-- Volcando estructura para tabla jordan.detalle_venta
CREATE TABLE IF NOT EXISTS `detalle_venta` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ventaId` int(11) NOT NULL,
  `productoId` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `precioUnitario` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `IDX_78594dc095d33f11673cef98da` (`productoId`),
  KEY `IDX_8c7cdd27dfaecb574ad82c10ac` (`ventaId`),
  CONSTRAINT `FK_78594dc095d33f11673cef98da2` FOREIGN KEY (`productoId`) REFERENCES `productos` (`id`) ON UPDATE NO ACTION,
  CONSTRAINT `FK_8c7cdd27dfaecb574ad82c10ac5` FOREIGN KEY (`ventaId`) REFERENCES `ventas` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.detalle_venta: ~6 rows (aproximadamente)
INSERT INTO `detalle_venta` (`id`, `ventaId`, `productoId`, `cantidad`, `precioUnitario`, `subtotal`, `createdAt`, `updatedAt`) VALUES
	(1, 1, 2, 4, 16000.00, 64000.00, '2026-04-03 05:37:57.121516', '2026-04-03 05:37:57.121516'),
	(2, 1, 6, 6, 6000.00, 36000.00, '2026-04-03 05:37:57.123986', '2026-04-03 05:37:57.123986'),
	(3, 2, 3, 3, 24000.00, 72000.00, '2026-04-03 05:37:57.127111', '2026-04-03 05:37:57.127111'),
	(4, 2, 5, 6, 8000.00, 48000.00, '2026-04-03 05:37:57.128322', '2026-04-03 05:37:57.128322'),
	(5, 3, 1, 5, 14000.00, 70000.00, '2026-04-03 05:37:57.129604', '2026-04-03 05:37:57.129604'),
	(6, 3, 7, 5, 6000.00, 30000.00, '2026-04-03 05:37:57.131814', '2026-04-03 05:37:57.131814');

-- Volcando estructura para tabla jordan.intento_entrega
CREATE TABLE IF NOT EXISTS `intento_entrega` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `rutaId` int(11) NOT NULL,
  `pedidoId` int(11) NOT NULL,
  `numero` int(11) NOT NULL,
  `fecha` datetime NOT NULL,
  `estado` enum('COMPLETADO','NO_COMPLETADO','CANCELADO') NOT NULL,
  `razon` varchar(255) DEFAULT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `IDX_cc8c4829925c05ac0f6dfb9fa2` (`estado`),
  KEY `IDX_62ae7a697026175cd27f28ca1c` (`fecha`),
  KEY `IDX_54257d08de9079e54692fd69ae` (`pedidoId`),
  KEY `IDX_dc437809e030e9f607b3cedcce` (`rutaId`),
  CONSTRAINT `FK_54257d08de9079e54692fd69ae3` FOREIGN KEY (`pedidoId`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `FK_dc437809e030e9f607b3cedccec` FOREIGN KEY (`rutaId`) REFERENCES `rutas` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.intento_entrega: ~5 rows (aproximadamente)
INSERT INTO `intento_entrega` (`id`, `rutaId`, `pedidoId`, `numero`, `fecha`, `estado`, `razon`, `observaciones`, `createdAt`, `updatedAt`) VALUES
	(1, 1, 1, 1, '2026-04-03 10:00:00', 'COMPLETADO', NULL, 'Entrega completada', '2026-04-03 05:37:57.096248', '2026-04-03 05:37:57.096248'),
	(2, 1, 2, 1, '2026-04-03 10:30:00', 'COMPLETADO', NULL, 'Entrega completada', '2026-04-03 05:37:57.100547', '2026-04-03 05:37:57.100547'),
	(3, 1, 3, 1, '2026-04-03 11:00:00', 'COMPLETADO', NULL, 'Entrega con pago parcial', '2026-04-03 05:37:57.102486', '2026-04-03 05:37:57.102486'),
	(4, 1, 5, 1, '2026-04-03 11:20:00', 'NO_COMPLETADO', 'Cliente ausente', 'No recibido en primer intento', '2026-04-03 05:37:57.106122', '2026-04-03 05:37:57.106122'),
	(5, 1, 5, 2, '2026-04-03 12:00:00', 'NO_COMPLETADO', 'Devuelto a planta', 'Se reprograma para siguiente ruta', '2026-04-03 05:37:57.107740', '2026-04-03 05:37:57.107740');

-- Volcando estructura para tabla jordan.inventario_inicial
CREATE TABLE IF NOT EXISTS `inventario_inicial` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `productoId` int(11) NOT NULL,
  `aperturaDiariaId` int(11) NOT NULL,
  `cantidadInicial` int(11) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_19a4a7adf5d45bcdda5201c917` (`productoId`,`aperturaDiariaId`),
  KEY `IDX_a2092dde99b6aedd6c783a1415` (`aperturaDiariaId`),
  KEY `IDX_fbc067a19300e818ad2f0721df` (`productoId`),
  CONSTRAINT `FK_a2092dde99b6aedd6c783a14155` FOREIGN KEY (`aperturaDiariaId`) REFERENCES `apertura_diaria` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `FK_fbc067a19300e818ad2f0721dfc` FOREIGN KEY (`productoId`) REFERENCES `productos` (`id`) ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.inventario_inicial: ~11 rows (aproximadamente)
INSERT INTO `inventario_inicial` (`id`, `productoId`, `aperturaDiariaId`, `cantidadInicial`, `createdAt`, `updatedAt`) VALUES
	(1, 1, 1, 50, '2026-04-03 05:37:56.929981', '2026-04-03 05:37:56.929981'),
	(2, 2, 1, 60, '2026-04-03 05:37:56.934587', '2026-04-03 05:37:56.934587'),
	(3, 3, 1, 40, '2026-04-03 05:37:56.938158', '2026-04-03 05:37:56.938158'),
	(4, 4, 1, 30, '2026-04-03 05:37:56.940567', '2026-04-03 05:37:56.940567'),
	(5, 5, 1, 30, '2026-04-03 05:37:56.944207', '2026-04-03 05:37:56.944207'),
	(6, 6, 1, 100, '2026-04-03 05:37:56.948752', '2026-04-03 05:37:56.948752'),
	(7, 7, 1, 80, '2026-04-03 05:37:56.952162', '2026-04-03 05:37:56.952162'),
	(8, 8, 1, 2000, '2026-04-03 05:37:56.954504', '2026-04-03 05:37:56.954504'),
	(9, 9, 1, 2000, '2026-04-03 05:37:56.957081', '2026-04-03 05:37:56.957081'),
	(10, 10, 1, 2000, '2026-04-03 05:37:56.959934', '2026-04-03 05:37:56.959934'),
	(11, 11, 1, 2000, '2026-04-03 05:37:56.962802', '2026-04-03 05:37:56.962802');

-- Volcando estructura para tabla jordan.item_ruta
CREATE TABLE IF NOT EXISTS `item_ruta` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `rutaId` int(11) NOT NULL,
  `pedidoId` int(11) NOT NULL,
  `ordenEntrega` int(11) NOT NULL,
  `estado` enum('PENDIENTE','CARGADO_EN_RUTA','ENTREGADO','NO_ENTREGADO','DEVUELTO','REPROGRAMADO','CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_46f48ea5489c85e3a3b72331e3` (`rutaId`,`pedidoId`),
  KEY `IDX_9b6a31679501be9a19ff7e9d6b` (`pedidoId`),
  KEY `IDX_dbdc4bf627b7e11d3106d7c8af` (`rutaId`),
  CONSTRAINT `FK_9b6a31679501be9a19ff7e9d6b2` FOREIGN KEY (`pedidoId`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `FK_dbdc4bf627b7e11d3106d7c8aff` FOREIGN KEY (`rutaId`) REFERENCES `rutas` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.item_ruta: ~4 rows (aproximadamente)
INSERT INTO `item_ruta` (`id`, `rutaId`, `pedidoId`, `ordenEntrega`, `estado`, `createdAt`, `updatedAt`) VALUES
	(1, 1, 2, 1, 'ENTREGADO', '2026-04-03 05:37:57.079855', '2026-04-03 05:37:57.079855'),
	(2, 1, 1, 2, 'ENTREGADO', '2026-04-03 05:37:57.087256', '2026-04-03 05:37:57.087256'),
	(3, 1, 3, 3, 'ENTREGADO', '2026-04-03 05:37:57.088708', '2026-04-03 05:37:57.088708'),
	(4, 1, 5, 4, 'REPROGRAMADO', '2026-04-03 05:37:57.093184', '2026-04-03 05:37:57.093184');

-- Volcando estructura para tabla jordan.labor_tarifa
CREATE TABLE IF NOT EXISTS `labor_tarifa` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trabajadorId` int(11) NOT NULL,
  `laborTipoId` int(11) NOT NULL,
  `tarifa` decimal(12,2) NOT NULL,
  `horas` int(11) DEFAULT NULL,
  `unidad` varchar(255) DEFAULT NULL,
  `vigenciaDesde` datetime DEFAULT NULL,
  `vigenciaHasta` datetime DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_0ab55256aff8fcf09f0bc16059` (`trabajadorId`,`laborTipoId`),
  KEY `IDX_aac434f2e774984a8138a16aed` (`activo`),
  KEY `IDX_e557010bff26592464e4e32b22` (`laborTipoId`),
  KEY `IDX_29bb18ac2caf1e9a98d6c79fd7` (`trabajadorId`),
  CONSTRAINT `FK_29bb18ac2caf1e9a98d6c79fd72` FOREIGN KEY (`trabajadorId`) REFERENCES `trabajadores` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `FK_e557010bff26592464e4e32b229` FOREIGN KEY (`laborTipoId`) REFERENCES `labor_tipo` (`id`) ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.labor_tarifa: ~4 rows (aproximadamente)
INSERT INTO `labor_tarifa` (`id`, `trabajadorId`, `laborTipoId`, `tarifa`, `horas`, `unidad`, `vigenciaDesde`, `vigenciaHasta`, `activo`, `createdAt`, `updatedAt`) VALUES
	(1, 2, 1, 35000.00, 8, 'JORNADA', NULL, NULL, 1, '2026-04-03 05:37:56.911293', '2026-04-03 05:37:56.911293'),
	(2, 1, 2, 35000.00, 8, 'HORA_PROPORCIONAL', NULL, NULL, 1, '2026-04-03 05:37:56.913511', '2026-04-03 05:37:56.913511'),
	(3, 3, 3, 500.00, NULL, 'PACA', NULL, NULL, 1, '2026-04-03 05:37:56.917527', '2026-04-03 05:37:56.917527'),
	(4, 4, 3, 500.00, NULL, 'PACA', NULL, NULL, 1, '2026-04-03 05:37:56.919491', '2026-04-03 05:37:56.919491');

-- Volcando estructura para tabla jordan.labor_tipo
CREATE TABLE IF NOT EXISTS `labor_tipo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `tipo` enum('POR_JORNADA','POR_HORA','POR_PACA','MANUAL','MIXTO') NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_039a2fb3b6dbc8e14341f9cc22` (`nombre`),
  KEY `IDX_d6547b67eddc3dfa99feba9241` (`activo`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.labor_tipo: ~4 rows (aproximadamente)
INSERT INTO `labor_tipo` (`id`, `nombre`, `tipo`, `descripcion`, `activo`, `createdAt`, `updatedAt`) VALUES
	(1, 'Domiciliario Jornada', 'POR_JORNADA', 'Pago por jornada completa', 1, '2026-04-03 05:37:56.895998', '2026-04-03 05:37:56.895998'),
	(2, 'Produccion Horas', 'POR_HORA', 'Pago proporcional por horas', 1, '2026-04-03 05:37:56.900570', '2026-04-03 05:37:56.900570'),
	(3, 'Preventista Por Paca', 'POR_PACA', 'Pago por paca vendida/entregada', 1, '2026-04-03 05:37:56.905340', '2026-04-03 05:37:56.905340'),
	(4, 'Apoyo Manual', 'MANUAL', 'Pago manual por acuerdo', 1, '2026-04-03 05:37:56.907001', '2026-04-03 05:37:56.907001');

-- Volcando estructura para tabla jordan.liquidacion_ruta
CREATE TABLE IF NOT EXISTS `liquidacion_ruta` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `rutaId` int(11) NOT NULL,
  `fecha` datetime NOT NULL,
  `totalEntregado` decimal(12,2) NOT NULL,
  `totalRecaudado` decimal(12,2) NOT NULL,
  `totalCartera` decimal(12,2) NOT NULL,
  `diferencia` decimal(12,2) NOT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_783d7df60fa16f63019225addf` (`rutaId`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.liquidacion_ruta: ~0 rows (aproximadamente)
INSERT INTO `liquidacion_ruta` (`id`, `rutaId`, `fecha`, `totalEntregado`, `totalRecaudado`, `totalCartera`, `diferencia`, `observaciones`, `createdAt`, `updatedAt`) VALUES
	(1, 1, '2026-04-03 15:00:00', 320000.00, 290000.00, 30000.00, 0.00, 'Ruta liquidada con un pedido reprogramado y pago parcial', '2026-04-03 05:37:57.180070', '2026-04-03 05:37:57.180070');

-- Volcando estructura para tabla jordan.log_actividad
CREATE TABLE IF NOT EXISTS `log_actividad` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuarioId` int(11) DEFAULT NULL,
  `accion` varchar(255) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `ip` varchar(255) DEFAULT NULL,
  `fecha` datetime NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `IDX_2edcbe15361b0e3efe2a17b003` (`fecha`),
  KEY `IDX_9ec4535cabdc06687133ff3ff3` (`accion`),
  KEY `IDX_a9d399f06dec392603ea60233d` (`usuarioId`),
  CONSTRAINT `FK_a9d399f06dec392603ea60233d4` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.log_actividad: ~0 rows (aproximadamente)

-- Volcando estructura para tabla jordan.movimiento_caja
CREATE TABLE IF NOT EXISTS `movimiento_caja` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero` varchar(255) NOT NULL,
  `tipo` enum('INGRESO_VENTA_EFECTIVO','INGRESO_VENTA_TRANSFERENCIA','INGRESO_CARTERA_EFECTIVO','INGRESO_CARTERA_TRANSFERENCIA','PAGO_TRABAJADOR','ANTICIPOS','PRESTAMOS','OTROS_EGRESOS','OTROS_INGRESOS') NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `medioPago` enum('EFECTIVO','TRANSFERENCIA','PENDIENTE') DEFAULT NULL,
  `fecha` datetime NOT NULL,
  `pagoId` int(11) DEFAULT NULL,
  `clienteId` int(11) DEFAULT NULL,
  `trabajadorId` int(11) DEFAULT NULL,
  `concepto` varchar(255) NOT NULL,
  `referencia` varchar(255) DEFAULT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `cierreCajaId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_9bec92bd19d4ffbf8438eeaa56` (`numero`),
  KEY `IDX_bb241dafd6a7eacfcaac5c18d5` (`trabajadorId`),
  KEY `IDX_e62ae0863bf8adaa194c976447` (`clienteId`),
  KEY `IDX_2e87a8ad3ab3731db5167911d4` (`pagoId`),
  KEY `IDX_be18b1485b9bdbe660620dd5a8` (`fecha`),
  KEY `IDX_7e0a0185829d153fb499c68c59` (`tipo`),
  KEY `FK_4098e76f47ea1752002997522c4` (`cierreCajaId`),
  CONSTRAINT `FK_4098e76f47ea1752002997522c4` FOREIGN KEY (`cierreCajaId`) REFERENCES `cierre_caja` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT `FK_bb241dafd6a7eacfcaac5c18d5b` FOREIGN KEY (`trabajadorId`) REFERENCES `trabajadores` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT `FK_e62ae0863bf8adaa194c9764477` FOREIGN KEY (`clienteId`) REFERENCES `clientes` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.movimiento_caja: ~7 rows (aproximadamente)
INSERT INTO `movimiento_caja` (`id`, `numero`, `tipo`, `monto`, `medioPago`, `fecha`, `pagoId`, `clienteId`, `trabajadorId`, `concepto`, `referencia`, `observaciones`, `createdAt`, `updatedAt`, `cierreCajaId`) VALUES
	(1, 'MC-20260403-001', 'INGRESO_VENTA_EFECTIVO', 100000.00, 'EFECTIVO', '2026-04-03 13:35:00', 1, 1, NULL, 'Ingreso por venta en efectivo', NULL, NULL, '2026-04-03 05:37:57.150201', '2026-04-03 05:37:57.150201', NULL),
	(2, 'MC-20260403-002', 'INGRESO_VENTA_TRANSFERENCIA', 120000.00, 'TRANSFERENCIA', '2026-04-03 13:45:00', 2, 2, NULL, 'Ingreso por venta en transferencia', NULL, NULL, '2026-04-03 05:37:57.157278', '2026-04-03 05:37:57.157278', NULL),
	(3, 'MC-20260403-003', 'INGRESO_VENTA_EFECTIVO', 70000.00, 'EFECTIVO', '2026-04-03 13:55:00', 3, 3, NULL, 'Ingreso por pago parcial de venta', NULL, NULL, '2026-04-03 05:37:57.161722', '2026-04-03 05:37:57.161722', NULL),
	(4, 'MC-20260403-010', 'PRESTAMOS', 150000.00, NULL, '2026-04-03 11:31:00', NULL, NULL, 1, 'Prestamo entregado a trabajador', NULL, NULL, '2026-04-03 05:37:57.235983', '2026-04-03 05:37:57.235983', NULL),
	(5, 'MC-20260403-011', 'PAGO_TRABAJADOR', 50000.00, NULL, '2026-04-03 17:06:00', NULL, NULL, 1, 'Pago en mano trabajador permanente', NULL, NULL, '2026-04-03 05:37:57.237612', '2026-04-03 05:37:57.237612', NULL),
	(6, 'MC-20260403-012', 'PAGO_TRABAJADOR', 35000.00, NULL, '2026-04-03 17:11:00', NULL, NULL, 2, 'Pago jornada domiciliario', NULL, NULL, '2026-04-03 05:37:57.239223', '2026-04-03 05:37:57.239223', NULL),
	(7, 'MC-20260403-013', 'PAGO_TRABAJADOR', 40000.00, NULL, '2026-04-03 17:16:00', NULL, NULL, 3, 'Pago preventista por paca', NULL, NULL, '2026-04-03 05:37:57.240468', '2026-04-03 05:37:57.240468', NULL);

-- Volcando estructura para tabla jordan.movimiento_inventario
CREATE TABLE IF NOT EXISTS `movimiento_inventario` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `productoId` int(11) NOT NULL,
  `tipo` enum('DESPACHO_ENTREGA','DESPACHO_VENTA_DIRECTA','DEVOLUCION','AJUSTE','PRODUCCION','OTROS') NOT NULL,
  `cantidad` int(11) NOT NULL,
  `fecha` datetime NOT NULL,
  `ventaId` int(11) DEFAULT NULL,
  `rutaId` int(11) DEFAULT NULL,
  `produccionId` int(11) DEFAULT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `IDX_e8fab33f4f1a1912429a4f6266` (`fecha`),
  KEY `IDX_0962aa3b586f59a34c1bf4cc3e` (`tipo`),
  KEY `IDX_0be7bd15ae193c74ad7caae38b` (`productoId`),
  KEY `FK_f9e39bce2a1d14fc01fea3da121` (`produccionId`),
  CONSTRAINT `FK_0be7bd15ae193c74ad7caae38b8` FOREIGN KEY (`productoId`) REFERENCES `productos` (`id`) ON UPDATE NO ACTION,
  CONSTRAINT `FK_f9e39bce2a1d14fc01fea3da121` FOREIGN KEY (`produccionId`) REFERENCES `produccion_diaria` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.movimiento_inventario: ~12 rows (aproximadamente)
INSERT INTO `movimiento_inventario` (`id`, `productoId`, `tipo`, `cantidad`, `fecha`, `ventaId`, `rutaId`, `produccionId`, `observaciones`, `createdAt`, `updatedAt`) VALUES
	(1, 1, 'PRODUCCION', 15, '2026-04-03 08:00:00', NULL, NULL, 1, 'Ingreso por produccion diaria', '2026-04-03 05:37:56.978354', '2026-04-03 05:37:56.978354'),
	(2, 2, 'PRODUCCION', 20, '2026-04-03 08:00:00', NULL, NULL, 2, 'Ingreso por produccion diaria', '2026-04-03 05:37:56.983391', '2026-04-03 05:37:56.983391'),
	(3, 3, 'PRODUCCION', 10, '2026-04-03 08:00:00', NULL, NULL, 3, 'Ingreso por produccion diaria', '2026-04-03 05:37:56.987834', '2026-04-03 05:37:56.987834'),
	(4, 6, 'PRODUCCION', 30, '2026-04-03 08:00:00', NULL, NULL, 4, 'Ingreso por produccion diaria', '2026-04-03 05:37:56.990807', '2026-04-03 05:37:56.990807'),
	(5, 7, 'PRODUCCION', 20, '2026-04-03 08:00:00', NULL, NULL, 5, 'Ingreso por produccion diaria', '2026-04-03 05:37:56.992935', '2026-04-03 05:37:56.992935'),
	(6, 2, 'DESPACHO_ENTREGA', 8, '2026-04-03 12:30:00', NULL, 1, NULL, 'Despacho en ruta (incluye devuelto)', '2026-04-03 05:37:57.165942', '2026-04-03 05:37:57.165942'),
	(7, 6, 'DESPACHO_ENTREGA', 6, '2026-04-03 12:35:00', NULL, 1, NULL, 'Despacho entregado', '2026-04-03 05:37:57.167776', '2026-04-03 05:37:57.167776'),
	(8, 3, 'DESPACHO_ENTREGA', 3, '2026-04-03 12:40:00', NULL, 1, NULL, 'Despacho entregado', '2026-04-03 05:37:57.171602', '2026-04-03 05:37:57.171602'),
	(9, 5, 'DESPACHO_ENTREGA', 6, '2026-04-03 12:45:00', NULL, 1, NULL, 'Despacho entregado', '2026-04-03 05:37:57.173038', '2026-04-03 05:37:57.173038'),
	(10, 1, 'DESPACHO_ENTREGA', 5, '2026-04-03 12:50:00', NULL, 1, NULL, 'Despacho entregado', '2026-04-03 05:37:57.174378', '2026-04-03 05:37:57.174378'),
	(11, 7, 'DESPACHO_ENTREGA', 5, '2026-04-03 12:55:00', NULL, 1, NULL, 'Despacho entregado', '2026-04-03 05:37:57.175694', '2026-04-03 05:37:57.175694'),
	(12, 2, 'DEVOLUCION', 4, '2026-04-03 14:10:00', NULL, 1, NULL, 'Devolucion por pedido reprogramado', '2026-04-03 05:37:57.177055', '2026-04-03 05:37:57.177055');

-- Volcando estructura para tabla jordan.pago_trabajador
CREATE TABLE IF NOT EXISTS `pago_trabajador` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero` varchar(255) NOT NULL,
  `trabajadorId` int(11) NOT NULL,
  `usuarioId` int(11) NOT NULL,
  `fecha` datetime NOT NULL,
  `montoBase` decimal(12,2) NOT NULL,
  `descuentosAplicados` decimal(12,2) NOT NULL DEFAULT 0.00,
  `abonoADeuda` decimal(12,2) NOT NULL DEFAULT 0.00,
  `montoEntregado` decimal(12,2) NOT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_8281cb21a01e2e27a43063287c` (`numero`),
  KEY `IDX_241f7a5faddba3141908a0c748` (`fecha`),
  KEY `IDX_0f33939434d2451394dc3af1c9` (`usuarioId`),
  KEY `IDX_8dccbb6d8acb136685b8c6ab87` (`trabajadorId`),
  CONSTRAINT `FK_0f33939434d2451394dc3af1c9d` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`id`) ON UPDATE NO ACTION,
  CONSTRAINT `FK_8dccbb6d8acb136685b8c6ab87d` FOREIGN KEY (`trabajadorId`) REFERENCES `trabajadores` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.pago_trabajador: ~3 rows (aproximadamente)
INSERT INTO `pago_trabajador` (`id`, `numero`, `trabajadorId`, `usuarioId`, `fecha`, `montoBase`, `descuentosAplicados`, `abonoADeuda`, `montoEntregado`, `observaciones`, `createdAt`, `updatedAt`) VALUES
	(1, 'PT-20260403-001', 1, 1, '2026-04-03 17:05:00', 80000.00, 0.00, 30000.00, 50000.00, 'Pago mixto: parte en mano y parte a deuda', '2026-04-03 05:37:57.225135', '2026-04-03 05:37:57.225135'),
	(2, 'PT-20260403-002', 2, 1, '2026-04-03 17:10:00', 35000.00, 0.00, 0.00, 35000.00, 'Pago de jornada domiciliario', '2026-04-03 05:37:57.228331', '2026-04-03 05:37:57.228331'),
	(3, 'PT-20260403-003', 3, 1, '2026-04-03 17:15:00', 40000.00, 0.00, 0.00, 40000.00, 'Liquidacion preventista por paca', '2026-04-03 05:37:57.232300', '2026-04-03 05:37:57.232300');

-- Volcando estructura para tabla jordan.pagos
CREATE TABLE IF NOT EXISTS `pagos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero` varchar(255) NOT NULL,
  `ventaId` int(11) NOT NULL,
  `clienteId` int(11) NOT NULL,
  `tipo` enum('EFECTIVO','TRANSFERENCIA','PENDIENTE') NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `fecha` datetime NOT NULL,
  `referencia` varchar(255) DEFAULT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_8f671b426d446549d860654927` (`numero`),
  KEY `IDX_107e2809e31d7d04db9629608e` (`fecha`),
  KEY `IDX_30083f28dacf6893e455373bca` (`tipo`),
  KEY `IDX_fb47de64de1680202893119163` (`clienteId`),
  KEY `IDX_f2caa62513831918888a78e291` (`ventaId`),
  CONSTRAINT `FK_f2caa62513831918888a78e291c` FOREIGN KEY (`ventaId`) REFERENCES `ventas` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `FK_fb47de64de16802028931191639` FOREIGN KEY (`clienteId`) REFERENCES `clientes` (`id`) ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.pagos: ~3 rows (aproximadamente)
INSERT INTO `pagos` (`id`, `numero`, `ventaId`, `clienteId`, `tipo`, `monto`, `fecha`, `referencia`, `observaciones`, `createdAt`, `updatedAt`) VALUES
	(1, 'PAG-20260403-001', 1, 1, 'EFECTIVO', 100000.00, '2026-04-03 13:30:00', 'EFECTIVO-001', 'Pago total en efectivo', '2026-04-03 05:37:57.135968', '2026-04-03 05:37:57.135968'),
	(2, 'PAG-20260403-002', 2, 2, 'TRANSFERENCIA', 120000.00, '2026-04-03 13:40:00', 'TRX-001', 'Pago total por transferencia', '2026-04-03 05:37:57.138986', '2026-04-03 05:37:57.138986'),
	(3, 'PAG-20260403-003', 3, 3, 'EFECTIVO', 70000.00, '2026-04-03 13:50:00', 'EFECTIVO-002', 'Pago parcial', '2026-04-03 05:37:57.140169', '2026-04-03 05:37:57.140169');

-- Volcando estructura para tabla jordan.pedidos
CREATE TABLE IF NOT EXISTS `pedidos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero` varchar(255) NOT NULL,
  `clienteId` int(11) NOT NULL,
  `fecha` datetime NOT NULL,
  `estado` enum('PENDIENTE','CARGADO_EN_RUTA','ENTREGADO','NO_ENTREGADO','DEVUELTO','REPROGRAMADO','CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
  `observaciones` varchar(255) DEFAULT NULL,
  `razonCancelacion` varchar(255) DEFAULT NULL,
  `razonReprogramacion` varchar(255) DEFAULT NULL,
  `fechaReprogramacion` datetime DEFAULT NULL,
  `esDeRuta` tinyint(4) NOT NULL DEFAULT 0,
  `rutaId` int(11) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_341dbc8863402d56f8c8440d30` (`numero`),
  KEY `IDX_2657462873cbb4f3029bd03310` (`rutaId`),
  KEY `IDX_b88e1be9218b7913cc9a70ac5f` (`fecha`),
  KEY `IDX_668fe658cebb5b8d3a7d7c7fb5` (`estado`),
  KEY `IDX_485346a40b61bb8ae3a98f5400` (`clienteId`),
  CONSTRAINT `FK_2657462873cbb4f3029bd033100` FOREIGN KEY (`rutaId`) REFERENCES `rutas` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT `FK_485346a40b61bb8ae3a98f5400c` FOREIGN KEY (`clienteId`) REFERENCES `clientes` (`id`) ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.pedidos: ~5 rows (aproximadamente)
INSERT INTO `pedidos` (`id`, `numero`, `clienteId`, `fecha`, `estado`, `observaciones`, `razonCancelacion`, `razonReprogramacion`, `fechaReprogramacion`, `esDeRuta`, `rutaId`, `createdAt`, `updatedAt`) VALUES
	(1, 'PED-20260403-001', 1, '2026-04-03 07:15:00', 'ENTREGADO', 'Pedido entregado y pagado en efectivo', NULL, NULL, NULL, 1, 1, '2026-04-03 05:37:57.001548', '2026-04-03 05:37:57.001548'),
	(2, 'PED-20260403-002', 2, '2026-04-03 07:30:00', 'ENTREGADO', 'Pedido entregado y pagado por transferencia', NULL, NULL, NULL, 1, 1, '2026-04-03 05:37:57.003515', '2026-04-03 05:37:57.003515'),
	(3, 'PED-20260403-003', 3, '2026-04-03 08:00:00', 'ENTREGADO', 'Pedido entregado con pago parcial', NULL, NULL, NULL, 1, 1, '2026-04-03 05:37:57.006843', '2026-04-03 05:37:57.006843'),
	(4, 'PED-20260404-001', 1, '2026-04-04 09:30:00', 'PENDIENTE', 'Pedido pendiente para el siguiente dia', NULL, NULL, NULL, 0, NULL, '2026-04-03 05:37:57.008188', '2026-04-03 05:37:57.008188'),
	(5, 'PED-20260404-002', 2, '2026-04-04 10:00:00', 'REPROGRAMADO', 'Pedido no entregado y reprogramado', NULL, 'Cliente ausente, reprogramado para proxima ruta', '2026-04-04 15:00:00', 1, 1, '2026-04-03 05:37:57.010009', '2026-04-03 05:37:57.010009');

-- Volcando estructura para tabla jordan.precios_cliente
CREATE TABLE IF NOT EXISTS `precios_cliente` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clienteId` int(11) NOT NULL,
  `productoId` int(11) NOT NULL,
  `precioUnitario` decimal(12,2) NOT NULL,
  `vigenciaDesde` datetime DEFAULT NULL,
  `vigenciaHasta` datetime DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_eb03b397ef2b12dddc5383af7c` (`clienteId`,`productoId`),
  KEY `IDX_60747899b7b79a4d985419f5c1` (`activo`),
  KEY `IDX_8d1bb71f73b6346856050621d6` (`productoId`),
  KEY `IDX_9e7cf854116f6d925754179102` (`clienteId`),
  CONSTRAINT `FK_8d1bb71f73b6346856050621d6e` FOREIGN KEY (`productoId`) REFERENCES `productos` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `FK_9e7cf854116f6d9257541791028` FOREIGN KEY (`clienteId`) REFERENCES `clientes` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.precios_cliente: ~33 rows (aproximadamente)
INSERT INTO `precios_cliente` (`id`, `clienteId`, `productoId`, `precioUnitario`, `vigenciaDesde`, `vigenciaHasta`, `activo`, `createdAt`, `updatedAt`) VALUES
	(1, 1, 1, 14000.00, NULL, NULL, 1, '2026-04-03 05:37:56.773756', '2026-04-03 05:37:56.773756'),
	(2, 1, 2, 16000.00, NULL, NULL, 1, '2026-04-03 05:37:56.779219', '2026-04-03 05:37:56.779219'),
	(3, 1, 3, 23000.00, NULL, NULL, 1, '2026-04-03 05:37:56.786767', '2026-04-03 05:37:56.786767'),
	(4, 1, 4, 7000.00, NULL, NULL, 1, '2026-04-03 05:37:56.790235', '2026-04-03 05:37:56.790235'),
	(5, 1, 5, 8000.00, NULL, NULL, 1, '2026-04-03 05:37:56.792941', '2026-04-03 05:37:56.792941'),
	(6, 1, 6, 6000.00, NULL, NULL, 1, '2026-04-03 05:37:56.795925', '2026-04-03 05:37:56.795925'),
	(7, 1, 7, 6500.00, NULL, NULL, 1, '2026-04-03 05:37:56.800119', '2026-04-03 05:37:56.800119'),
	(8, 1, 8, 2000.00, NULL, NULL, 1, '2026-04-03 05:37:56.803319', '2026-04-03 05:37:56.803319'),
	(9, 1, 9, 3000.00, NULL, NULL, 1, '2026-04-03 05:37:56.806405', '2026-04-03 05:37:56.806405'),
	(10, 1, 10, 4000.00, NULL, NULL, 1, '2026-04-03 05:37:56.809044', '2026-04-03 05:37:56.809044'),
	(11, 1, 11, 5000.00, NULL, NULL, 1, '2026-04-03 05:37:56.811800', '2026-04-03 05:37:56.811800'),
	(12, 2, 1, 14500.00, NULL, NULL, 1, '2026-04-03 05:37:56.816137', '2026-04-03 05:37:56.816137'),
	(13, 2, 2, 16500.00, NULL, NULL, 1, '2026-04-03 05:37:56.819858', '2026-04-03 05:37:56.819858'),
	(14, 2, 3, 24000.00, NULL, NULL, 1, '2026-04-03 05:37:56.823137', '2026-04-03 05:37:56.823137'),
	(15, 2, 4, 7300.00, NULL, NULL, 1, '2026-04-03 05:37:56.826149', '2026-04-03 05:37:56.826149'),
	(16, 2, 5, 8000.00, NULL, NULL, 1, '2026-04-03 05:37:56.828853', '2026-04-03 05:37:56.828853'),
	(17, 2, 6, 6200.00, NULL, NULL, 1, '2026-04-03 05:37:56.832571', '2026-04-03 05:37:56.832571'),
	(18, 2, 7, 6700.00, NULL, NULL, 1, '2026-04-03 05:37:56.836269', '2026-04-03 05:37:56.836269'),
	(19, 2, 8, 2100.00, NULL, NULL, 1, '2026-04-03 05:37:56.839507', '2026-04-03 05:37:56.839507'),
	(20, 2, 9, 3100.00, NULL, NULL, 1, '2026-04-03 05:37:56.842713', '2026-04-03 05:37:56.842713'),
	(21, 2, 10, 4100.00, NULL, NULL, 1, '2026-04-03 05:37:56.845662', '2026-04-03 05:37:56.845662'),
	(22, 2, 11, 5100.00, NULL, NULL, 1, '2026-04-03 05:37:56.849670', '2026-04-03 05:37:56.849670'),
	(23, 3, 1, 14000.00, NULL, NULL, 1, '2026-04-03 05:37:56.852729', '2026-04-03 05:37:56.852729'),
	(24, 3, 2, 17000.00, NULL, NULL, 1, '2026-04-03 05:37:56.855525', '2026-04-03 05:37:56.855525'),
	(25, 3, 3, 25000.00, NULL, NULL, 1, '2026-04-03 05:37:56.857620', '2026-04-03 05:37:56.857620'),
	(26, 3, 4, 7500.00, NULL, NULL, 1, '2026-04-03 05:37:56.861080', '2026-04-03 05:37:56.861080'),
	(27, 3, 5, 8200.00, NULL, NULL, 1, '2026-04-03 05:37:56.864781', '2026-04-03 05:37:56.864781'),
	(28, 3, 6, 6100.00, NULL, NULL, 1, '2026-04-03 05:37:56.869023', '2026-04-03 05:37:56.869023'),
	(29, 3, 7, 6000.00, NULL, NULL, 1, '2026-04-03 05:37:56.872304', '2026-04-03 05:37:56.872304'),
	(30, 3, 8, 2200.00, NULL, NULL, 1, '2026-04-03 05:37:56.875499', '2026-04-03 05:37:56.875499'),
	(31, 3, 9, 3200.00, NULL, NULL, 1, '2026-04-03 05:37:56.878047', '2026-04-03 05:37:56.878047'),
	(32, 3, 10, 4200.00, NULL, NULL, 1, '2026-04-03 05:37:56.881008', '2026-04-03 05:37:56.881008'),
	(33, 3, 11, 5200.00, NULL, NULL, 1, '2026-04-03 05:37:56.885193', '2026-04-03 05:37:56.885193');

-- Volcando estructura para tabla jordan.produccion_diaria
CREATE TABLE IF NOT EXISTS `produccion_diaria` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `productoId` int(11) NOT NULL,
  `aperturaDiariaId` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_f6f42a411bf79f76e2f2af8bb0` (`productoId`,`aperturaDiariaId`),
  KEY `IDX_7dc55188c1a053c983550b69d9` (`aperturaDiariaId`),
  KEY `IDX_452dfc5a5413afffdab101e492` (`productoId`),
  CONSTRAINT `FK_452dfc5a5413afffdab101e4925` FOREIGN KEY (`productoId`) REFERENCES `productos` (`id`) ON UPDATE NO ACTION,
  CONSTRAINT `FK_7dc55188c1a053c983550b69d9c` FOREIGN KEY (`aperturaDiariaId`) REFERENCES `apertura_diaria` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.produccion_diaria: ~5 rows (aproximadamente)
INSERT INTO `produccion_diaria` (`id`, `productoId`, `aperturaDiariaId`, `cantidad`, `observaciones`, `createdAt`, `updatedAt`) VALUES
	(1, 1, 1, 15, 'Produccion manana', '2026-04-03 05:37:56.967438', '2026-04-03 05:37:56.967438'),
	(2, 2, 1, 20, 'Produccion manana', '2026-04-03 05:37:56.969658', '2026-04-03 05:37:56.969658'),
	(3, 3, 1, 10, 'Produccion manana', '2026-04-03 05:37:56.972398', '2026-04-03 05:37:56.972398'),
	(4, 6, 1, 30, 'Recarga planta', '2026-04-03 05:37:56.973832', '2026-04-03 05:37:56.973832'),
	(5, 7, 1, 20, 'Recarga planta', '2026-04-03 05:37:56.975151', '2026-04-03 05:37:56.975151');

-- Volcando estructura para tabla jordan.productos
CREATE TABLE IF NOT EXISTS `productos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `categoria` varchar(255) NOT NULL,
  `unidad` varchar(255) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_2da210b34325c2319d784a32d4` (`codigo`),
  KEY `IDX_bc615edbbc3d598723bd6b090d` (`categoria`),
  KEY `IDX_218e277815277a9081a997ad82` (`activo`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.productos: ~11 rows (aproximadamente)
INSERT INTO `productos` (`id`, `codigo`, `nombre`, `descripcion`, `categoria`, `unidad`, `activo`, `createdAt`, `updatedAt`) VALUES
	(1, 'PACA-125', 'Paca 125 ml', 'Picadillo', 'PACA', 'PACA', 1, '2026-04-03 05:37:56.737384', '2026-04-03 05:37:56.737384'),
	(2, 'PACA-250', 'Paca 250 ml', 'Normal', 'PACA', 'PACA', 1, '2026-04-03 05:37:56.739527', '2026-04-03 05:37:56.739527'),
	(3, 'PACA-600', 'Paca 600 ml', 'Hielo', 'PACA', 'PACA', 1, '2026-04-03 05:37:56.742850', '2026-04-03 05:37:56.742850'),
	(4, 'BOTELLON-5L', 'Botellon 5 L', 'Botellon 5 litros', 'BOTELLON', 'UNIDAD', 1, '2026-04-03 05:37:56.744713', '2026-04-03 05:37:56.744713'),
	(5, 'BOTELLON-6L', 'Botellon 6 L', 'Botellon 6 litros', 'BOTELLON', 'UNIDAD', 1, '2026-04-03 05:37:56.746555', '2026-04-03 05:37:56.746555'),
	(6, 'RECARGA-5L', 'Recarga 5 L', 'Recarga botellon 5 litros', 'RECARGA', 'UNIDAD', 1, '2026-04-03 05:37:56.749363', '2026-04-03 05:37:56.749363'),
	(7, 'RECARGA-6L', 'Recarga 6 L', 'Recarga botellon 6 litros', 'RECARGA', 'UNIDAD', 1, '2026-04-03 05:37:56.751672', '2026-04-03 05:37:56.751672'),
	(8, 'GRANEL-2000', 'Agua a granel 2000', 'Agua a granel', 'GRANEL', 'LITRO', 1, '2026-04-03 05:37:56.753264', '2026-04-03 05:37:56.753264'),
	(9, 'GRANEL-3000', 'Agua a granel 3000', 'Agua a granel', 'GRANEL', 'LITRO', 1, '2026-04-03 05:37:56.755081', '2026-04-03 05:37:56.755081'),
	(10, 'GRANEL-4000', 'Agua a granel 4000', 'Agua a granel', 'GRANEL', 'LITRO', 1, '2026-04-03 05:37:56.756908', '2026-04-03 05:37:56.756908'),
	(11, 'GRANEL-5000', 'Agua a granel 5000', 'Agua a granel', 'GRANEL', 'LITRO', 1, '2026-04-03 05:37:56.758771', '2026-04-03 05:37:56.758771'),
	(12, 'P770363', 'Producto Test 1775212770363', NULL, 'Normal', 'Paca', 1, '2026-04-03 05:39:30.376807', '2026-04-03 05:39:30.376807');

-- Volcando estructura para tabla jordan.rutas
CREATE TABLE IF NOT EXISTS `rutas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero` varchar(255) NOT NULL,
  `fecha` datetime NOT NULL,
  `estado` enum('CREADA','CARGADA','EN_ENTREGA','EN_LIQUIDACION','LIQUIDADA','ANULADA') NOT NULL DEFAULT 'CREADA',
  `domiciliarioId` int(11) DEFAULT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_df34c8a5a5f9f9804576ff7baa` (`numero`),
  KEY `IDX_6b3070912c4e02044663a4cd1b` (`domiciliarioId`),
  KEY `IDX_3c1f1d7d2f684d9c4582f398b0` (`fecha`),
  KEY `IDX_5beb92a7d905a9fe4d7da69fbc` (`estado`),
  CONSTRAINT `FK_6b3070912c4e02044663a4cd1bf` FOREIGN KEY (`domiciliarioId`) REFERENCES `trabajadores` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.rutas: ~0 rows (aproximadamente)
INSERT INTO `rutas` (`id`, `numero`, `fecha`, `estado`, `domiciliarioId`, `observaciones`, `createdAt`, `updatedAt`) VALUES
	(1, 'RUTA-20260403-001', '2026-04-03 09:00:00', 'LIQUIDADA', 2, 'Ruta con orden manual de entrega', '2026-04-03 05:37:56.995839', '2026-04-03 05:37:56.995839');

-- Volcando estructura para tabla jordan.trabajador_labor
CREATE TABLE IF NOT EXISTS `trabajador_labor` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trabajadorId` int(11) NOT NULL,
  `laborTarifaId` int(11) NOT NULL,
  `fecha` datetime NOT NULL,
  `cantidadRealizado` int(11) DEFAULT NULL,
  `montoAPagar` decimal(12,2) NOT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `IDX_a20e7f77fc0b41683b42f08ff9` (`fecha`),
  KEY `IDX_d1272a6ae80371c46873a27ec9` (`laborTarifaId`),
  KEY `IDX_62090bc32a1c0cfcd3ac67b049` (`trabajadorId`),
  CONSTRAINT `FK_62090bc32a1c0cfcd3ac67b0491` FOREIGN KEY (`trabajadorId`) REFERENCES `trabajadores` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `FK_d1272a6ae80371c46873a27ec9a` FOREIGN KEY (`laborTarifaId`) REFERENCES `labor_tarifa` (`id`) ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.trabajador_labor: ~3 rows (aproximadamente)
INSERT INTO `trabajador_labor` (`id`, `trabajadorId`, `laborTarifaId`, `fecha`, `cantidadRealizado`, `montoAPagar`, `observaciones`, `createdAt`, `updatedAt`) VALUES
	(1, 2, 1, '2026-04-03 16:00:00', 1, 35000.00, 'Jornada completa de ruta', '2026-04-03 05:37:57.203316', '2026-04-03 05:37:57.203316'),
	(2, 1, 2, '2026-04-03 16:10:00', 2, 8750.00, 'Pago proporcional por 2 horas de produccion', '2026-04-03 05:37:57.207449', '2026-04-03 05:37:57.207449'),
	(3, 3, 3, '2026-04-03 16:20:00', 80, 40000.00, 'Preventista liquidado por paca entregada', '2026-04-03 05:37:57.212224', '2026-04-03 05:37:57.212224');

-- Volcando estructura para tabla jordan.trabajadores
CREATE TABLE IF NOT EXISTS `trabajadores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `cedula` varchar(255) NOT NULL,
  `telefono` varchar(255) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `tipoTrabajador` enum('PERMANENTE','TEMPORAL','PREVENTISTA','DOMICILIARIO','MIXTO') NOT NULL DEFAULT 'PERMANENTE',
  `saldoTotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_6df3beb5b00bdd2582f17fd450` (`codigo`),
  UNIQUE KEY `IDX_63703df3512a16cc80627afbbf` (`cedula`),
  KEY `IDX_15da7108c40482c401afe2fa44` (`tipoTrabajador`),
  KEY `IDX_790c8dc39a05f658bd24e2ac7b` (`activo`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.trabajadores: ~4 rows (aproximadamente)
INSERT INTO `trabajadores` (`id`, `codigo`, `nombre`, `cedula`, `telefono`, `direccion`, `tipoTrabajador`, `saldoTotal`, `activo`, `createdAt`, `updatedAt`) VALUES
	(1, 'TRAB-0001', 'Sebastian', '1098765432', '3101234567', 'Calle 10 #20-30', 'PERMANENTE', 120000.00, 1, '2026-04-03 05:37:56.888527', '2026-04-03 05:37:56.888527'),
	(2, 'TRAB-0002', 'Carlos Domiciliario', '1087654321', '3102345678', 'Barrio Central', 'DOMICILIARIO', 0.00, 1, '2026-04-03 05:37:56.890775', '2026-04-03 05:37:56.890775'),
	(3, 'TRAB-0003', 'Roberto Preventista', '1076543210', '3103456789', 'Vereda San Antonio', 'PREVENTISTA', 0.00, 1, '2026-04-03 05:37:56.891959', '2026-04-03 05:37:56.891959'),
	(4, 'TRAB-0004', 'Luis Preventista', '1065432109', '3104567890', 'Vereda El Carmen', 'PREVENTISTA', 0.00, 1, '2026-04-03 05:37:56.893016', '2026-04-03 05:37:56.893016');

-- Volcando estructura para tabla jordan.usuarios
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `estado` varchar(255) NOT NULL DEFAULT 'ACTIVO',
  `rol` varchar(255) NOT NULL DEFAULT 'ADMIN',
  `fechaCreacion` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_446adfc18b35418aac32ae0b7b` (`email`),
  KEY `IDX_8cb3659544480763ef2f765458` (`estado`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.usuarios: ~0 rows (aproximadamente)
INSERT INTO `usuarios` (`id`, `email`, `nombre`, `password`, `estado`, `rol`, `fechaCreacion`, `fechaActualizacion`) VALUES
	(1, 'admin@jordan.local', 'Administrador JORDAN', '$2b$10$U8VZ2X19Wb7PInC2t1BNde24ro2qsc9KYUa5uzUvpKmlJGtT9uP5W', 'ACTIVO', 'ADMIN', '2026-04-03 05:37:56.725764', '2026-04-03 05:37:56.725764');

-- Volcando estructura para tabla jordan.ventas
CREATE TABLE IF NOT EXISTS `ventas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero` varchar(255) NOT NULL,
  `clienteId` int(11) NOT NULL,
  `pedidoId` int(11) DEFAULT NULL,
  `liquidacionRutaId` int(11) DEFAULT NULL,
  `fecha` datetime NOT NULL,
  `estado` enum('COMPLETADA','PARCIAL','PENDIENTE','CANCELADA') NOT NULL,
  `totalVenta` decimal(12,2) NOT NULL,
  `totalPagado` decimal(12,2) NOT NULL,
  `saldoPendiente` decimal(12,2) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_b9d768d3a9c1c08bcd073ee16c` (`numero`),
  KEY `IDX_0c3fb03461e5ed3aee046fbdb6` (`pedidoId`),
  KEY `IDX_4db7514cff921e78d93fe1284f` (`fecha`),
  KEY `IDX_e6dd7c58469563493fb7be8888` (`estado`),
  KEY `IDX_771620ab33741414f8248217fc` (`clienteId`),
  CONSTRAINT `FK_0c3fb03461e5ed3aee046fbdb66` FOREIGN KEY (`pedidoId`) REFERENCES `pedidos` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT `FK_771620ab33741414f8248217fc3` FOREIGN KEY (`clienteId`) REFERENCES `clientes` (`id`) ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla jordan.ventas: ~3 rows (aproximadamente)
INSERT INTO `ventas` (`id`, `numero`, `clienteId`, `pedidoId`, `liquidacionRutaId`, `fecha`, `estado`, `totalVenta`, `totalPagado`, `saldoPendiente`, `createdAt`, `updatedAt`) VALUES
	(1, 'VTA-20260403-001', 1, 1, 1, '2026-04-03 13:00:00', 'COMPLETADA', 100000.00, 100000.00, 0.00, '2026-04-03 05:37:57.110989', '2026-04-03 05:37:57.000000'),
	(2, 'VTA-20260403-002', 2, 2, 1, '2026-04-03 13:10:00', 'COMPLETADA', 120000.00, 120000.00, 0.00, '2026-04-03 05:37:57.113329', '2026-04-03 05:37:57.000000'),
	(3, 'VTA-20260403-003', 3, 3, 1, '2026-04-03 13:20:00', 'PARCIAL', 100000.00, 70000.00, 30000.00, '2026-04-03 05:37:57.117850', '2026-04-03 05:37:57.000000');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
