export function checkAdminPin(request: Request): boolean {
  const pin = import.meta.env.ADMIN_PIN;
  if (!pin) return false;
  return request.headers.get('x-admin-pin') === pin;
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: 'No autorizado' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
