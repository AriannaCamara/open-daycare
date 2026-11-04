# panel-access Specification

## Purpose

Particiona las rutas de la app por rol y controla el acceso al panel de staff y al de familia en el proxy, de modo que cada rol solo pueda entrar a su árbol de páginas.

## Requirements

### Requirement: Árboles de rutas por rol
La app SHALL exponer las páginas del panel de staff bajo `/staff/*` y las del panel de familia bajo `/family/*`, con `/login` y `/activate-account` compartidos. Las rutas antiguas sin prefijo (`/`, `/kids`, `/kids/[id]`) SHALL dejar de existir.

#### Scenario: Feed staff accesible en su nueva URL
- **WHEN** un usuario con rol `staff` o `admin` navega a `/staff`
- **THEN** ve el feed del staff

#### Scenario: Directorio de niños en el árbol staff
- **WHEN** un usuario con rol `staff` o `admin` navega a `/staff/kids`
- **THEN** ve el directorio de niños

#### Scenario: Feed de familia en su nueva URL
- **WHEN** un usuario con rol `parent` navega a `/family`
- **THEN** ve el feed del panel de familia

#### Scenario: Rutas antiguas ya no responden
- **WHEN** un usuario autenticado navega a `/kids` o `/kids/[id]`
- **THEN** la petición no resuelve esas rutas (ya no existen en el árbol de la app)

### Requirement: Guard de acceso por prefijo en el proxy
El proxy SHALL evaluar el rol de la sesión antes de renderizar: `/staff/*` requiere rol `staff` o `admin`, `/family/*` requiere rol `parent`. Si el rol no corresponde al prefijo, el proxy SHALL redirigir al usuario a su panel correcto.

#### Scenario: Familia bloqueada en rutas staff
- **WHEN** un usuario con rol `parent` solicita `/staff/kids`
- **THEN** el proxy lo redirige a `/family` sin renderizar la página staff

#### Scenario: Staff bloqueado en rutas familia
- **WHEN** un usuario con rol `staff` solicita `/family`
- **THEN** el proxy lo redirige a `/staff` sin renderizar la página de familia

#### Scenario: Staff y admin pueden entrar al panel staff
- **WHEN** un usuario con rol `admin` solicita `/staff`
- **THEN** el proxy permite el renderizado de la página

### Requirement: Redirección de la raíz según rol
El proxy SHALL redirigir `/` al panel que corresponda al rol de la sesión: `staff`/`admin` → `/staff`, `parent` → `/family`.

#### Scenario: Staff entra a la raíz
- **WHEN** un usuario con rol `staff` navega a `/`
- **THEN** el proxy lo redirige a `/staff`

#### Scenario: Familia entra a la raíz
- **WHEN** un usuario con rol `parent` navega a `/`
- **THEN** el proxy lo redirige a `/family`

### Requirement: Redirección tras iniciar sesión según rol
Después de un login exitoso, el sistema SHALL llevar al usuario a su panel: `staff`/`admin` → `/staff`, `parent` → `/family`.

#### Scenario: Login de staff
- **WHEN** un usuario con credenciales de staff completa el login
- **THEN** queda en `/staff`

#### Scenario: Login de familia
- **WHEN** un usuario con credenciales de familia completa el login
- **THEN** queda en `/family`

### Requirement: Sesión inválida sigue yendo a login
Las rutas protegidas de ambos paneles SHALL exigir sesión válida; sin sesión el usuario SHALL ser redirigido a `/login`, igual que antes del cambio.

#### Scenario: Sin sesión en una ruta staff
- **WHEN** un usuario sin sesión solicita `/staff/kids`
- **THEN** el proxy lo redirige a `/login`
