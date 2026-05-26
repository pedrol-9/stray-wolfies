Plan: Monto base para la caja y registro de gastos

Resumen
- Agregar funcionalidad en el panel de administración para administrar el estado de la tienda (Abrir/Cerrar) con un toggle elegante.
- Al abrir la tienda, permitir definir un "monto base" para la caja del turno.
- Registrar gastos sencillos (monto + descripción) que se sumen a los gastos del turno.
- Registrar ingresos automáticamente al despachar una orden (crear transacción 'income').
- Al cerrar turno, liquidar balance, generar reporte y permitir envío por correo (To: socios, BCC: psanabria999@gmail.com).

Alcance
1. DB: agregar tablas 'shifts' y 'cash_transactions'.
2. API: endpoints para abrir/cerrar turno, registrar gasto, consultar balance y enviar reporte.
3. Frontend: componente Balance en AdminPanel con toggle, input de monto base y formulario de gastos.
4. Email: endpoint que arme y envíe el reporte con BCC oculto.

Esquema propuesto (resumen)
- shifts(id, opened_at, closed_at, opened_by, closed_by, base_amount, status)
- cash_transactions(id, shift_id, type('base'|'income'|'expense'), amount, description, order_id, created_at, created_by)

Flujo clave
- Abrir tienda: crear shift + transacción 'base'.
- Despachar orden: backend crea transacción 'income' asociada al shift activo.
- Registrar gasto: POST /api/admin/expenses crea transacción 'expense'.
- Cerrar turno: calcular totales, generar reporte y enviar por email con BCC.

Seguridad y validaciones
- Requerir autenticación admin/PIN.
- Validar montos positivos y descripción para gastos.
- RLS en Supabase para que solo admins escriban en tablas.

Siguientes pasos inmediatos
- Crear tablas en supabase/schema.sql (DONE)
- Implementar endpoints server-side (shifts: DONE, expenses: DONE, report: DONE)
- Actualizar AdminPanel UI (DONE)
- Implementar envío de correo (DONE — via SendGrid)
- Pruebas manuales (PENDING)

Contacto
- Ingresos creados automáticamente al despachar (opción 1 seleccionada).
