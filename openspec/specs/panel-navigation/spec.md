# panel-navigation Specification

## Purpose

Define la navegación (sidebar) de cada panel: qué items ve cada rol, si aparece el CTA de publicación y qué subtítulo identifica al panel.

## Requirements

### Requirement: Sidebar del panel staff
La sidebar SHALL mostrar, para usuarios `staff`/`admin`, los items Feed (`/staff`) y Niños (`/staff/kids`), el botón "Nueva publicación" y el subtítulo con el nombre de sala.

#### Scenario: Staff ve su navegación
- **WHEN** un usuario con rol `staff` está logueado en `/staff`
- **THEN** la sidebar muestra los items Feed y Niños, el CTA "Nueva publicación" y el subtítulo de sala

#### Scenario: Item activo según la URL
- **WHEN** un usuario staff navega a `/staff/kids`
- **THEN** el item "Niños" aparece resaltado como activo

### Requirement: Sidebar del panel familia
La sidebar SHALL mostrar, para usuarios `parent`, el item Feed (`/family`) como única sección de navegación, sin botón de publicación, y el subtítulo "Familia" en lugar del nombre de sala.

#### Scenario: Familia ve su navegación
- **WHEN** un usuario con rol `parent` está logueado en `/family`
- **THEN** la sidebar muestra solo el item Feed, sin CTA "Nueva publicación" y con subtítulo "Familia"

#### Scenario: Familia no tiene acceso visible a Niños
- **WHEN** un usuario con rol `parent` revisa la sidebar
- **THEN** no aparece el item Niños ni ningún enlace a `/staff/*`

### Requirement: La navegación se deriva del rol de la sesión
La sidebar SHALL renderizar según el rol de la sesión en cada request, de modo que un usuario nunca vea la navegación del otro panel.

#### Scenario: Mismo componente, distinta salida
- **WHEN** dos usuarios (uno `staff`, uno `parent`) abren su respectivo panel
- **THEN** cada uno recibe la navegación de su rol sin importar la URL exacta dentro de su panel
