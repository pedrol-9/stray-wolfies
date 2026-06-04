/**
 * @file db-util.js
 * @description Script unificado de utilidades de administración y base de datos para Stray-Wolfies (Callejeros).
 *
 * Comandos soportados:
 *  - node db-util.js audit     -> Auditoría de consistencia y estadísticas.
 *  - node db-util.js reset     -> Restablecimiento a cero de la base de datos (pedidos, turnos, transacciones).
 *  - node db-util.js orphans   -> Limpia registros huérfanos en la base de datos.
 *  - node db-util.js report    -> Genera un informe detallado e histórico de ventas, caja y tienda.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Obtener __dirname en ES Modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cargar variables de entorno de .env.local o .env
function loadEnv() {
  const env = {};
  const paths = [
    path.join(__dirname, '.env.local'),
    path.join(__dirname, '.env')
  ];

  let loaded = false;
  for (const envPath of paths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        // Ignorar líneas vacías o comentarios
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          let value = match[2] || '';
          if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
          }
          env[match[1]] = value.trim();
        }
      });
      loaded = true;
    }
  }

  if (!loaded) {
    console.warn("⚠️ Advertencia: No se encontró ningún archivo .env.local o .env en la raíz.");
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env['SUPABASE_URL'] || env['PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Error: Faltan variables de conexión de Supabase en los archivos de entorno.");
  console.error("Asegúrate de configurar SUPABASE_URL (o PUBLIC_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

// Configurar el cliente de Supabase con el service role para evadir políticas RLS en tareas administrativas
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ── COMANDO: AUDIT ──────────────────────────────────────────────────────────
async function audit() {
  console.log("\n🔍 =========================================================");
  console.log("🔍 === INICIANDO AUDITORÍA DE BASE DE DATOS (STRAY-WOLFIES) ===");
  console.log("🔍 =========================================================\n");

  try {
    console.log("1. Obteniendo registros de las tablas...");
    const { data: settings, error: sErr } = await supabase.from('shop_settings').select('*');
    if (sErr) throw sErr;

    const { data: orders, error: oErr } = await supabase.from('orders').select('id, code, status');
    if (oErr) throw oErr;

    const { data: orderLines, error: olErr } = await supabase.from('order_lines').select('id, order_id');
    if (olErr) throw olErr;

    const { data: shifts, error: shErr } = await supabase.from('shifts').select('id, status');
    if (shErr) throw shErr;

    const { data: txs, error: txErr } = await supabase.from('cash_transactions').select('id, shift_id, order_id');
    if (txErr) throw txErr;

    console.log(`   ✅ Conexión establecida.`);
    console.log(`   📊 Registros actuales:`);
    console.log(`      - Ajustes de Tienda: ${settings.length}`);
    console.log(`      - Pedidos (orders): ${orders.length}`);
    console.log(`      - Líneas de Pedido (order_lines): ${orderLines.length}`);
    console.log(`      - Turnos (shifts): ${shifts.length}`);
    console.log(`      - Transacciones de Caja (cash_transactions): ${txs.length}\n`);

    console.log("2. Analizando integridad referencial...");
    const orderIds = new Set(orders.map(o => o.id));
    const shiftIds = new Set(shifts.map(s => s.id));

    // Huérfanos
    const orphanLines = orderLines.filter(ol => !orderIds.has(ol.order_id));
    const txOrphanShifts = txs.filter(tx => !shiftIds.has(tx.shift_id));
    const txOrphanOrders = txs.filter(tx => tx.order_id && !orderIds.has(tx.order_id));

    let isClean = true;

    if (orphanLines.length > 0) {
      console.warn(`   ⚠️ Se encontraron ${orphanLines.length} líneas de pedido (order_lines) huérfanas (sin pedido).`);
      isClean = false;
    }
    if (txOrphanShifts.length > 0) {
      console.warn(`   ⚠️ Se encontraron ${txOrphanShifts.length} transacciones de caja (cash_transactions) sin turno (shift_id) válido.`);
      isClean = false;
    }
    if (txOrphanOrders.length > 0) {
      console.warn(`   ⚠️ Se encontraron ${txOrphanOrders.length} transacciones de caja vinculadas a pedidos (order_id) inexistentes.`);
      isClean = false;
    }

    if (isClean) {
      console.log("   ✅ Base de datos completamente saneada. Sin registros huérfanos.");
    } else {
      console.log("\n   💡 Consejo: Ejecuta 'node db-util.js orphans' para reparar estas discrepancias.");
    }
  } catch (err) {
    console.error("❌ Error durante la auditoría:", err.message);
  }
}

// ── COMANDO: RESET ──────────────────────────────────────────────────────────
async function reset() {
  console.log("\n⚠️  =========================================================");
  console.log("⚠️  === RESTABLECIMIENTO TOTAL DE LA BASE DE DATOS ========");
  console.log("⚠️  =========================================================");
  console.log("¡CUIDADO! Se eliminarán todos los pedidos, turnos e historial de transacciones.");
  console.log("La tienda (shop_settings) se cerrará por defecto.\n");

  try {
    // 1. Cerrar la tienda
    console.log("🔌 Cerrando la tienda en shop_settings...");
    const { error: settingsErr } = await supabase
      .from('shop_settings')
      .update({ is_open: false })
      .eq('id', 1);

    if (settingsErr) {
      console.warn("   ⚠️ No se pudo actualizar shop_settings. Intentando insertar registro inicial...");
      await supabase.from('shop_settings').upsert({ id: 1, is_open: false });
    } else {
      console.log("   ✅ Tienda configurada como CERRADA.");
    }

    // 2. Eliminar transacciones de caja
    console.log("💸 Eliminando todas las transacciones de caja (cash_transactions)...");
    const { count: txCount, error: txDelErr } = await supabase
      .from('cash_transactions')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (txDelErr) throw txDelErr;
    console.log(`   ✅ ${txCount || 0} transacciones eliminadas.`);

    // 3. Eliminar turnos
    console.log("🕒 Eliminando todos los turnos (shifts)...");
    const { count: shiftCount, error: shiftDelErr } = await supabase
      .from('shifts')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (shiftDelErr) throw shiftDelErr;
    console.log(`   ✅ ${shiftCount || 0} turnos eliminados.`);

    // 4. Eliminar líneas de pedidos
    console.log("📦 Eliminando líneas de pedido (order_lines)...");
    const { count: lineCount, error: lineDelErr } = await supabase
      .from('order_lines')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (lineDelErr) throw lineDelErr;
    console.log(`   ✅ ${lineCount || 0} líneas de pedido eliminadas.`);

    // 5. Eliminar pedidos
    console.log("📝 Eliminando todos los pedidos (orders)...");
    const { count: orderCount, error: orderDelErr } = await supabase
      .from('orders')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (orderDelErr) throw orderDelErr;
    console.log(`   ✅ ${orderCount || 0} pedidos eliminados.`);

    console.log("\n✨ Base de datos restablecida a cero exitosamente.");
  } catch (err) {
    console.error("❌ Error crítico en el restablecimiento:", err.message);
  }
}

// ── COMANDO: ORPHANS ────────────────────────────────────────────────────────
async function cleanOrphans() {
  console.log("\n🧹 =========================================================");
  console.log("🧹 === SANEAMIENTO Y LIMPIEZA DE HUÉRFANOS DE LA DB ========");
  console.log("🧹 =========================================================\n");

  try {
    const { data: orders, error: oErr } = await supabase.from('orders').select('id');
    if (oErr) throw oErr;
    const { data: shifts, error: sErr } = await supabase.from('shifts').select('id');
    if (sErr) throw sErr;

    const orderIds = new Set(orders.map(o => o.id));
    const shiftIds = new Set(shifts.map(s => s.id));

    // 1. Limpiar cash_transactions con shift_id inexistente
    console.log("1. Analizando transacciones sin turno válido...");
    const { data: txs, error: txErr } = await supabase.from('cash_transactions').select('id, shift_id, order_id');
    if (txErr) throw txErr;

    const orphanShiftsTxs = txs.filter(tx => !shiftIds.has(tx.shift_id));
    if (orphanShiftsTxs.length > 0) {
      console.log(`   ⚠️ Eliminando ${orphanShiftsTxs.length} transacciones de caja sin turno válido...`);
      const idsToDelete = orphanShiftsTxs.map(t => t.id);
      const { error: delErr } = await supabase
        .from('cash_transactions')
        .delete()
        .in('id', idsToDelete);
      if (delErr) throw delErr;
      console.log("   ✅ Transacciones huérfanas eliminadas.");
    } else {
      console.log("   ✅ No hay transacciones huérfanas de turno.");
    }

    // 2. Limpiar cash_transactions con order_id inexistente (desvincular la referencia)
    console.log("\n2. Analizando transacciones que referencian pedidos inexistentes...");
    const orphanOrderTxs = txs.filter(tx => tx.order_id && !orderIds.has(tx.order_id));
    if (orphanOrderTxs.length > 0) {
      console.log(`   ⚠️ Saneando ${orphanOrderTxs.length} transacciones desvinculándolas del pedido (order_id = null)...`);
      let successCount = 0;
      for (const tx of orphanOrderTxs) {
        const { error: updErr } = await supabase
          .from('cash_transactions')
          .update({ order_id: null })
          .eq('id', tx.id);
        if (!updErr) successCount++;
      }
      console.log(`   ✅ Saneadas ${successCount} transacciones de caja.`);
    } else {
      console.log("   ✅ No hay transacciones referenciando pedidos inexistentes.");
    }

    // 3. Limpiar order_lines huérfanos
    console.log("\n3. Analizando líneas de pedido huérfanas...");
    const { data: lines, error: lErr } = await supabase.from('order_lines').select('id, order_id');
    if (lErr) throw lErr;

    const orphanLines = lines.filter(l => !orderIds.has(l.order_id));
    if (orphanLines.length > 0) {
      console.log(`   ⚠️ Eliminando ${orphanLines.length} líneas de pedido huérfanas...`);
      const idsToDelete = orphanLines.map(l => l.id);
      const { error: delErr } = await supabase
        .from('order_lines')
        .delete()
        .in('id', idsToDelete);
      if (delErr) throw delErr;
      console.log("   ✅ Líneas de pedido huérfanas eliminadas.");
    } else {
      console.log("   ✅ No hay líneas de pedido huérfanas.");
    }

    console.log("\n✨ Limpieza de registros huérfanos completada.");
  } catch (err) {
    console.error("❌ Error durante la limpieza de huérfanos:", err.message);
  }
}

// ── COMANDO: REPORT ──────────────────────────────────────────────────────────
async function report() {
  console.log("\n📊 =========================================================");
  console.log("📊 === INFORME GENERAL DE LA BASE DE DATOS (STRAY-WOLFIES) ===");
  console.log("📊 =========================================================\n");

  try {
    // 1. Estado de la tienda
    const { data: settings } = await supabase.from('shop_settings').select('*');
    const isOpen = settings && settings.length > 0 ? settings[0].is_open : false;
    console.log(`🏫 ESTADO DE LA TIENDA: ${isOpen ? '🟢 ABIERTA' : '🔴 CERRADA'}`);
    console.log("---------------------------------------------------------");

    // 2. Información del Turno Activo
    const { data: openShifts } = await supabase
      .from('shifts')
      .select('*')
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1);

    const activeShift = openShifts && openShifts.length > 0 ? openShifts[0] : null;

    if (activeShift) {
      console.log("\n🕒 TURNO ACTUAL ABIERTO:");
      console.log(`   - ID: ${activeShift.id}`);
      console.log(`   - Abierto por: ${activeShift.opened_by || 'Sistema / Local'}`);
      console.log(`   - Abierto el: ${new Date(activeShift.opened_at).toLocaleString()}`);
      console.log(`   - Monto inicial de caja: $${activeShift.base_amount.toLocaleString()}`);

      // Obtener transacciones del turno activo
      const { data: activeTxs } = await supabase
        .from('cash_transactions')
        .select('*')
        .eq('shift_id', activeShift.id);

      const totals = (activeTxs || []).reduce(
        (acc, t) => {
          if (t.type === 'base') acc.base += t.amount || 0;
          if (t.type === 'income') acc.income += t.amount || 0;
          if (t.type === 'expense') acc.expense += t.amount || 0;
          return acc;
        },
        { base: 0, income: 0, expense: 0 }
      );

      const expectedCash = totals.base + totals.income - totals.expense;
      console.log(`   - Transacciones en este turno: ${(activeTxs || []).length}`);
      console.log(`     └─ Monto base acumulado: $${totals.base.toLocaleString()}`);
      console.log(`     └─ Ingresos por ventas:  $${totals.income.toLocaleString()}`);
      console.log(`     └─ Egresos / Gastos:    $${totals.expense.toLocaleString()}`);
      console.log(`   - 💵 Dinero esperado en caja: $${expectedCash.toLocaleString()}`);
    } else {
      console.log("\n🕒 TURNO ACTUAL: 🔴 No hay turnos abiertos en este momento.");
    }
    console.log("---------------------------------------------------------");

    // 3. Histórico de Pedidos
    const { data: orders, error: oErr } = await supabase.from('orders').select('*');
    if (oErr) throw oErr;

    console.log("\n📦 ESTADÍSTICAS HISTÓRICAS DE PEDIDOS:");
    console.log(`   - Total pedidos registrados: ${orders.length}`);

    if (orders.length > 0) {
      const stats = orders.reduce(
        (acc, o) => {
          acc.subtotalSum += o.subtotal || 0;
          acc.totalSum += o.total || 0;
          acc.status[o.status] = (acc.status[o.status] || 0) + 1;
          acc.fulfillment[o.fulfillment] = (acc.fulfillment[o.fulfillment] || 0) + 1;
          return acc;
        },
        { subtotalSum: 0, totalSum: 0, status: {}, fulfillment: {} }
      );

      const avgOrder = stats.totalSum / orders.length;

      console.log(`   - Facturación bruta total (subtotal): $${stats.subtotalSum.toLocaleString()}`);
      console.log(`   - Facturación neta total (con domicilios): $${stats.totalSum.toLocaleString()}`);
      console.log(`   - 🎫 Ticket promedio de compra: $${Math.round(avgOrder).toLocaleString()}`);

      console.log("\n   📊 Desglose por Estado del Pedido:");
      Object.entries(stats.status).forEach(([status, count]) => {
        const percentage = Math.round((count / orders.length) * 100);
        console.log(`      └─ ${status.padEnd(12)}: ${count} (${percentage}%)`);
      });

      console.log("\n   🛵 Desglose por Método de Entrega:");
      Object.entries(stats.fulfillment).forEach(([method, count]) => {
        const percentage = Math.round((count / orders.length) * 100);
        console.log(`      └─ ${method.padEnd(12)}: ${count} (${percentage}%)`);
      });
    } else {
      console.log("   (No hay pedidos registrados para calcular estadísticas)");
    }
    console.log("---------------------------------------------------------");

    // 4. Histórico de Transacciones de Caja
    const { data: allTxs } = await supabase.from('cash_transactions').select('*');
    console.log("\n💸 RESUMEN GENERAL DE TRANSACCIONES DE CAJA (HISTÓRICO):");
    console.log(`   - Total transacciones: ${(allTxs || []).length}`);

    if (allTxs && allTxs.length > 0) {
      const txStats = allTxs.reduce(
        (acc, t) => {
          acc[t.type] = (acc[t.type] || 0) + t.amount;
          return acc;
        },
        { base: 0, income: 0, expense: 0 }
      );
      console.log(`   - Base Inicial Acumulada: $${txStats.base.toLocaleString()}`);
      console.log(`   - Ingresos Acumulados:   $${txStats.income.toLocaleString()}`);
      console.log(`   - Egresos Acumulados:    $${txStats.expense.toLocaleString()}`);
      console.log(`   - Balance Neto Histórico: $${(txStats.base + txStats.income - txStats.expense).toLocaleString()}`);
    } else {
      console.log("   (No hay transacciones registradas)");
    }
    console.log("=========================================================\n");

  } catch (err) {
    console.error("❌ Error al generar el informe:", err.message);
  }
}

// ── ENTRADA PRINCIPAL ────────────────────────────────────────────────────────
async function main() {
  const command = process.argv[2];
  switch (command) {
    case 'audit':
      await audit();
      break;
    case 'reset':
      await reset();
      break;
    case 'orphans':
      await cleanOrphans();
      break;
    case 'report':
      await report();
      break;
    default:
      console.log("=========================================================");
      console.log("   Utilidades de Base de Datos - Stray-Wolfies (Callejeros)");
      console.log("=========================================================");
      console.log("Uso:");
      console.log("  node db-util.js [comando]");
      console.log("\nComandos:");
      console.log("  audit   -> Ejecuta una auditoría de consistencia de la base de datos.");
      console.log("  reset   -> Elimina pedidos, turnos y transacciones (vacía base de datos).");
      console.log("  orphans -> Limpia registros o referencias huérfanas.");
      console.log("  report  -> Genera un reporte general de ventas, caja y estado de la tienda.");
      console.log("=========================================================");
  }
}

main().catch(err => console.error("❌ Error crítico del sistema:", err.message));
