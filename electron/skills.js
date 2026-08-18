const SKILLS = [
  {
    id: 'code_review',
    name: 'Code Review Profundo',
    category: 'Calidad',
    description: 'Revisa el código como un ingeniero senior: bugs, seguridad, rendimiento y mantenibilidad, organizado por severidad.',
    keywords: ['revisa', 'revisión', 'review', 'code review', 'audita el código', 'calidad del código'],
    instructions: `1. Identifica los archivos clave del proyecto (list_files, read_file) y prioriza los que tienen más lógica.
2. Revisa cada archivo buscando: bugs y errores de lógica, vulnerabilidades (inyección, datos sensibles, input sin validar), problemas de rendimiento (bucles, N+1, renders), malas prácticas (código duplicado, funciones largas, falta de manejo de errores).
3. Organiza los hallazgos por severidad: CRÍTICO (rompe o compromete), ALTO, MEDIO, BAJO.
4. Para cada hallazgo indica archivo, línea aproximada, por qué es un problema y la corrección concreta (escribe el código corregido con write_file si el usuario lo pide).
5. Termina con un veredicto general: estado del código, top 3 problemas y prioridad de acción.`
  },
  {
    id: 'security_audit',
    name: 'Auditoría de Seguridad',
    category: 'Seguridad',
    description: 'Auditoría OWASP completa del proyecto: dependencias, secretos, inyección, autenticación y configuración.',
    keywords: ['seguridad', 'seguro', 'auditoría de seguridad', 'vulnerabilidades', 'owasp', 'hack'],
    instructions: `1. Revisa dependencias: ejecuta el gestor de paquetes del proyecto (npm audit, pip list, etc.) y reporta vulnerabilidades conocidas.
2. Busca secretos filtrados: claves API, tokens, contraseñas, URLs con credenciales (revisa .env*, configs y archivos subidos a git).
3. Revisa entrada de usuario: validación, sanitización, riesgo de inyección (SQL, shell, XSS), deserialización insegura.
4. Revisa autenticación/autorización si existe: hashing de contraseñas, sesiones, tokens, control de acceso.
5. Revisa configuración: CORS, headers de seguridad, HTTPS, permisos de archivos, dependencias desactualizadas.
6. Entrega un informe por severidad (CRÍTICO/ALTO/MEDIO/BAJO) con archivo, línea, explotación posible y fix concreto. Si el usuario lo pide, aplica los fixes con write_file y verifica con run_command.`
  },
  {
    id: 'generate_tests',
    name: 'Generador de Pruebas',
    category: 'Calidad',
    description: 'Crea suites de pruebas unitarias, de integración y E2E con el objetivo de superar 90% de cobertura.',
    keywords: ['pruebas', 'tests', 'test', 'testing', 'cobertura', 'unit tests'],
    instructions: `1. Detecta el framework de pruebas del proyecto (list_files + read_file de package.json o config) y usa el que ya esté instalado; si no hay, propón e instala uno adecuado (Vitest/Jest/Pytest, etc.).
2. Prioriza las funciones de mayor riesgo: lógica de negocio, parseo, cálculo, manejo de errores.
3. Escribe pruebas unitarias para cada función clave cubriendo: caso normal, casos límite (vacíos, extremos), errores y excepciones.
4. Añade pruebas de integración para los flujos principales (API, base de datos) y E2E si el proyecto lo permite.
5. Ejecuta las pruebas con run_command, corrige los fallos (incluidos los fallos en el código, no solo en los tests) y repite hasta que todo pase.
6. Reporta cobertura final con el comando del framework (--coverage).`
  },
  {
    id: 'build_verify',
    name: 'Build y Verificación',
    category: 'Entrega',
    description: 'Compila el proyecto, corrige todos los errores y deja el build en verde.',
    keywords: ['build', 'compila', 'compilación', 'compilar', 'error de build', 'se rompe', 'no compila'],
    instructions: `1. Ejecuta el comando de build del proyecto (npm run build, etc.) y guarda la salida completa.
2. Lee los errores y busca la causa raíz en el código (read_file de los archivos implicados).
3. Corrige los errores uno a uno con write_file, del primero al último, sin saltarte ninguno.
4. Tras cada tanda de correcciones, vuelve a ejecutar el build hasta que quede limpio (sin errores; los warnings puedes reportarlos pero no bloquean).
5. Si el proyecto tiene lint, ejecútalo también y corrige los errores.
6. Termina ejecutando las pruebas si existen y reporta el estado final con el comando y su salida.`
  },
  {
    id: 'debugging',
    name: 'Depuración Sistemática',
    category: 'Debug',
    description: 'Encuentra la causa raíz de un bug con método: reproducir, hipótesis, bisect y verificación.',
    keywords: ['debug', 'bug', 'error raro', 'no funciona', 'falla', 'se cae', 'crash', 'no carga'],
    instructions: `1. Reproduce el problema: identifica qué comando o acción lo dispara y ejecútalo (run_command).
2. Reúne la evidencia: logs, stack traces, salidas de error, estado de variables.
3. Lee el código de la ruta del error (read_file) y formula hipótesis ordenadas por probabilidad.
4. Para cada hipótesis, confírmala con una prueba mínima (añade logs temporales con write_file o ejecuta fragmentos aislados) antes de tocar código.
5. Aplica el fix mínimo necesario y vuelve a ejecutar el caso original para confirmar que se resolvió.
6. Comprueba que no hayas roto nada (ejecuta pruebas/build) y documenta brevemente causa y solución en tu respuesta final.`
  },
  {
    id: 'refactor',
    name: 'Refactorización Segura',
    category: 'Refactor',
    description: 'Aplica principios SOLID y elimina code smells manteniendo el comportamiento idéntico.',
    keywords: ['refactor', 'refactoriza', 'limpiar código', 'deuda técnica', 'código feo', 'mejorar el código', 'solid'],
    instructions: `1. Analiza el estado actual: lista los archivos, lee los más grandes y anota los code smells (funciones largas, duplicación, acoplamiento, nombres confusos, mutación de estado).
2. Antes de tocar nada, verifica que hay una red de seguridad: ejecuta las pruebas existentes y el build (si fallan, arréglalos primero o avisa).
3. Refactoriza en pasos pequeños e independientes; tras cada paso ejecuta las pruebas/build para confirmar que nada se rompió.
4. Aplica: extracción de funciones/clases, eliminación de duplicación, nombres expresivos, separación de responsabilidades, inyección de dependencias.
5. NO cambies el comportamiento público ni las APIs; si un cambio puede romper algo, avísalo explícitamente.
6. Termina con un resumen: qué refactorizaste, qué patrones aplicaste y el estado de pruebas/build final.`
  },
  {
    id: 'git_workflow',
    name: 'Flujo Git y Commits',
    category: 'Entrega',
    description: 'Analiza git, escribe commits convencionales y prepara PRs/changelogs limpios.',
    keywords: ['git', 'commit', 'commits', 'push', 'pull request', 'pr', 'repositorio', 'conventional'],
    instructions: `1. Comienza con git status, git diff y git log --oneline -10 para entender el estado del repo.
2. Si el usuario pide commits: agrupa los cambios por intención, escribe mensajes en formato Conventional Commits (feat:, fix:, refactor:, docs:, chore:, test:, perf:) con descripción en el idioma del usuario y sin incluir archivos no relacionados.
3. Si hay conflictos o archivos sin seguimiento, identifícalos y propón el tratamiento correcto.
4. Para un PR: resume qué cambia, por qué, cómo se probó y si hay breaking changes.
5. Para un changelog: revisa git log entre versiones y genera entradas agrupadas por categoría.
6. Nunca ejecutes comandos destructivos (push --force, reset hard, rebase) sin confirmación del usuario.`
  },
  {
    id: 'readme_docs',
    name: 'Documentación Completa',
    category: 'Docs',
    description: 'Genera README, documentación de arquitectura y guías de uso profesionales escaneando el proyecto.',
    keywords: ['documentación', 'docs', 'readme', 'documenta', 'guía', 'manual', 'explica el proyecto'],
    instructions: `1. Escanea el proyecto (list_files + read_file de package.json, configs, código principal) y extrae: propósito, stack, estructura de carpetas, comandos, configuración, API expuesta.
2. Genera README.md con: título y descripción, captura de lo que hace, tabla de requisitos, instalación paso a paso, configuración (variables), uso con ejemplos, estructura del proyecto, comandos útiles (dev/build/test), solución de problemas comunes y licencia.
3. Si hay una API: documenta cada endpoint con método, ruta, parámetros, body, respuesta y ejemplos reales.
4. Si hay arquitectura: crea docs/ARCHITECTURE.md explicando componentes, flujo de datos y decisiones.
5. Escribe todo en el idioma del usuario y guarda los archivos con write_file.`
  },
  {
    id: 'api_design',
    name: 'Diseño de API',
    category: 'Arquitectura',
    description: 'Diseña o revisa APIs REST siguiendo las mejores prácticas (versionado, errores, paginación, OpenAPI).',
    keywords: ['api', 'rest', 'endpoint', 'backend', 'servidor', 'openapi', 'swagger'],
    instructions: `1. Si es una API existente, lee los endpoints actuales (rutas, controladores, modelos) y evalúa: convenciones REST, códigos de estado correctos, manejo de errores consistente, validación, paginación, autenticación.
2. Si es diseño nuevo: define recursos, rutas (sustantivos plurales, jerarquías), métodos y contratos de datos.
3. Especifica un esquema de error uniforme (código, mensaje, detalle) y las respuestas de éxito con sus códigos.
4. Documenta el resultado en formato OpenAPI/Swagger o en un archivo API.md con ejemplos de petición y respuesta reales.
5. Si el proyecto tiene backend, implementa los endpoints con write_file y verifica con run_command (servidor, curl o pruebas).`
  },
  {
    id: 'performance',
    name: 'Optimización de Rendimiento',
    category: 'Calidad',
    description: 'Mide primero, optimiza después: perfiles, cuellos de botella y mejoras verificables.',
    keywords: ['rendimiento', 'performance', 'lento', 'lentitud', 'optimiza', 'optimización', 'carga rápido', 'tarda'],
    instructions: `1. NUNCA optimices a ciegas: primero mide. Ejecuta el proyecto y usa herramientas disponibles (tiempos de respuesta, comando time, logs de duración, perfiles del framework).
2. Identifica los 3-5 puntos más lentos con evidencia numérica y ordénalos por impacto.
3. Para cada uno: lee el código implicado (read_file), encuentra la causa (bucles innecesarios, consultas N+1, operaciones síncronas bloqueantes, carga de datos excesivos, re-renders, assets pesados) y aplica la optimización concreta (write_file).
4. Después de cada cambio, vuelve a medir y confirma la mejora; si no hay mejora medible, revierte el cambio.
5. Reporta con números: antes vs después (tiempos, tamaño, peticiones) y el resumen de cambios.`
  },
  {
    id: 'dependency_upgrade',
    name: 'Actualización de Dependencias',
    category: 'Entrega',
    description: 'Actualiza librerías de forma segura manejando breaking changes y regresiones.',
    keywords: ['actualiza', 'actualizar', 'dependencias', 'upgrade', 'update', 'npm update', 'outdated'],
    instructions: `1. Ejecuta el comando de diagnóstico del gestor de paquetes (npm outdated, pip list --outdated, etc.) y lista las dependencias desactualizadas.
2. Prioriza: primero las de seguridad (vulnerabilidades críticas), luego major versions, después menores y patches.
3. Actualiza de una en una o en grupos pequeños; tras cada actualización ejecuta build y pruebas (run_command).
4. Si una actualización trae breaking changes, lee el changelog/migración (usa web_search si es necesario) y adapta el código con write_file.
5. Actualiza también las versiones en package.json/requirements con write_file y ejecuta la instalación.
6. Termina con el estado final: versiones actualizadas, pruebas en verde y problemas resueltos.`
  },
  {
    id: 'db_migration',
    name: 'Migraciones de Base de Datos',
    category: 'Arquitectura',
    description: 'Planifica y ejecuta cambios de esquema sin perder datos y con rollback seguro.',
    keywords: ['base de datos', 'migración', 'migrate', 'schema', 'tabla', 'sql', 'datos', 'backup'],
    instructions: `1. Identifica el sistema de migraciones del proyecto (list_files + read_file de config) o propón uno si no existe.
2. Antes de cualquier cambio destructivo, verifica que exista backup o genera uno.
3. Diseña la migración con: qué cambia (tablas, columnas, índices, datos), cómo se transforman los datos existentes y cómo revertir (rollback).
4. Escribe la migración y ejecútala con run_command; verifica el esquema resultante.
5. Prueba la migración hacia adelante y hacia atrás si es posible.
6. Si hay datos que transformar, escribe el script de transformación con write_file y pruébalo con un subset antes de aplicarlo completo.`
  },
  {
    id: 'docker_ops',
    name: 'Docker y Contenedores',
    category: 'DevOps',
    description: 'Crea y depura Dockerfiles y docker-compose correctos, ligeros y reproducibles.',
    keywords: ['docker', 'contenedor', 'contenedores', 'dockerfile', 'docker-compose', 'compose', 'imagen'],
    instructions: `1. Lee el proyecto para entender sus requisitos (lenguaje, puertos, variables, build steps).
2. Escribe el Dockerfile con buenas prácticas: imagen base oficial y con tag, multi-stage si compila, .dockerignore, capas eficientes (orden de dependencias estables primero), usuario no root, healthcheck si procede.
3. Si hay varios servicios, crea docker-compose.yml con redes, volúmenes, dependencias y healthchecks.
4. Verifica con run_command: docker build y docker compose config.
5. Documenta los comandos de uso y solución de problemas comunes (puertos ocupados, volúmenes, caché).`
  },
  {
    id: 'ci_cd',
    name: 'Pipeline CI/CD',
    category: 'DevOps',
    description: 'Crea pipelines de integración continua y despliegue (GitHub Actions u otros) con validaciones automáticas.',
    keywords: ['ci', 'cd', 'pipeline', 'github actions', 'github-actions', 'despliegue', 'deploy', 'integración continua', 'workflow'],
    instructions: `1. Detecta el stack del proyecto (lenguaje, gestor de paquetes, framework) para elegir las actions/scripts correctos.
2. Diseña el flujo: checkouts → instalación de dependencias con caché → lint → pruebas → build → artefactos → (opcional) deploy.
3. Escribe el workflow (ej. .github/workflows/ci.yml) con write_file: triggers (push/PR), matriz de versiones si aplica, caché de dependencias, pasos con nombres claros y timeouts.
4. Incluye un job de seguridad ligero (audit de dependencias) si el gestor lo permite.
5. Valida sintaxis YAML con run_command (node + yaml parser o la CLI disponible) y documenta cómo se activa.`
  },
  {
    id: 'scaffolding',
    name: 'Proyecto desde Cero',
    category: 'Construcción',
    description: 'Crea proyectos completos desde cero: estructura, configuración, código funcional y verificación.',
    keywords: ['crea un proyecto', 'desde cero', 'nuevo proyecto', 'inicializa', 'scaffold', 'crear app', 'crea una app', 'crear una aplicación'],
    instructions: `1. Pregunta o deduce los requisitos: tipo de app, stack, funcionalidades principales, público.
2. Decide el stack moderno adecuado (elige opciones populares y mantenidas: ej. Vite+React, Next.js, FastAPI, Express) y explícalo brevemente.
3. Crea la estructura completa con write_file: configs (package.json, tsconfig, etc.), entrada principal, separación por módulos/capas, variables de entorno con .env.example, scripts útiles.
4. Implementa las funcionalidades principales funcionando, no esqueletos: rutas, lógica, estilos básicos, manejo de errores.
5. Instala dependencias y ejecuta build + pruebas con run_command hasta que todo funcione.
6. Entrega un README con cómo arrancarlo y un resumen de arquitectura y decisiones.`
  },
  {
    id: 'error_diagnosis',
    name: 'Diagnóstico de Errores',
    category: 'Debug',
    description: 'Analiza logs, stack traces y errores de ejecución para encontrar la causa raíz con precisión.',
    keywords: ['stack trace', 'logs', 'log', 'error de ejecución', 'excepción', 'traceback', 'se queja', 'mensaje de error'],
    instructions: `1. Obtén el error completo: pide/ejecuta el comando que lo genera y captura la salida íntegra (run_command).
2. Identifica en el stack trace el archivo, línea y tipo de error; distingue causa (tu código) de efecto (errores en cascada).
3. Lee el código implicado (read_file) y los logs previos para reconstruir el estado antes del fallo.
4. Formula la causa más probable y valídala con una prueba mínima antes de tocar nada.
5. Aplica el fix, re-ejecuta el comando original y confirma. Verifica que las pruebas siguen pasando.`
  },
  {
    id: 'git_history',
    name: 'Historial de Git',
    category: 'Entrega',
    description: 'Investiga el historial del repo: blame, commits, regresiones y qué cambio rompió algo.',
    keywords: ['historial', 'blame', 'git log', 'quién cambió', 'regresión', 'se rompió con', 'cuándo'],
    instructions: `1. Usa git log --oneline -20 para ver el historial reciente y git status para el estado actual.
2. Para localizar una regresión: git log -p -- <archivo> sobre los archivos implicados o git log -S"<texto>" para encontrar cuándo apareció un cambio concreto.
3. Usa git blame -L <rango> en los archivos problemáticos para ver quién/cuándo introdujo cada línea.
4. Si puedes, identifica el commit exacto que introdujo el problema (git bisect o inspección manual).
5. Reporta: línea temporal de cambios relevantes, commit culpable (hash, autor, fecha, mensaje) y recomendación de corrección.`
  },
  {
    id: 'monorepo',
    name: 'Navegación de Monorepos',
    category: 'Construcción',
    description: 'Se mueve con soltura por repositorios grandes: workspaces, dependencias entre paquetes y builds selectivos.',
    keywords: ['monorepo', 'workspace', 'workspaces', 'paquetes', 'paquete', 'lerna', 'turbo', 'nx', 'repo grande'],
    instructions: `1. Detecta la estructura: list_files de la raíz y lee configs (workspaces de package.json/pnpm-workspace, turbo.json, nx.json, go.work).
2. Mapea los paquetes y sus dependencias entre sí (lee sus package.json) antes de tocar nada.
3. Cuando modifiques código, identifica qué paquetes dependen del modificado y pruébalos también.
4. Usa los comandos del monorepo (turbo run build, pnpm -r test, etc.) para verificar en vez de builds individuales.
5. Respeta los límites de paquetes: no importes de paquetes que no estén declarados como dependencia.`
  },
  {
    id: 'secrets_scan',
    name: 'Detección de Secretos',
    category: 'Seguridad',
    description: 'Busca claves API, tokens y contraseñas filtradas en el código y el historial de git.',
    keywords: ['secreto', 'secretos', 'clave api', 'api key', 'token', 'contraseña', 'password', 'filtrado', 'leak'],
    instructions: `1. Busca patrones de secretos en el código: tokens largos, claves base64, .env subidos, configs con credenciales (usa grep sobre los archivos del proyecto).
2. Revisa .gitignore y verifica si archivos de secretos están rastreados: git ls-files | grep env.
3. Si hay secretos en el historial de git, identifícalos con git log -p y avisa claramente de que deben rotarse (cambiar la clave), además de eliminarse del historial.
4. Para cada hallazgo reporta: ubicación, tipo de secreto (sin mostrarlo completo), riesgo y acción recomendada.
5. Si el proyecto usa variables de entorno, verifica que el código las lea bien (process.env, os.environ) y que .env.example documente todas sin valores reales.`
  },
  {
    id: 'frontend_design',
    name: 'Diseño Frontend de Calidad',
    category: 'Construcción',
    description: 'Crea interfaces con estética cuidada: jerarquía visual, consistencia, responsive y micro-interacciones.',
    keywords: ['diseño', 'frontend', 'interfaz', 'estilos', 'css', 'look', 'bonito', 'página', 'componente visual', 'visual'],
    instructions: `1. Detecta el stack visual (React, CSS, Tailwind, etc.) y respeta sus convenciones.
2. Antes de escribir, define: paleta (máximo 3 colores de acento + neutros), tipografía (1-2 familias con jerarquía), espaciado consistente (escala de 4/8px), esquinas y sombras.
3. Evita el aspecto genérico de IA: usa gradientes sutiles, bordes con definición, estados hover/focus/active, transiciones de 150-250ms.
4. Hazlo responsive: móvil primero, rejillas fluidas, texto que no se desborde.
5. Implementa con write_file y verifica visualmente los puntos clave; si el proyecto tiene build o lint, pásalos.
6. Reporta qué decisiones de diseño tomaste y por qué (breve).`
  },
  {
    id: 'data_analysis',
    name: 'Análisis de Datos',
    category: 'Datos',
    description: 'Analiza archivos de datos (CSV, JSON, logs) y produce estadísticas, insights y visualizaciones.',
    keywords: ['datos', 'csv', 'análisis de datos', 'estadísticas', 'visualización', 'gráficas', 'dataset', 'json data', 'informe de datos'],
    instructions: `1. Localiza los archivos de datos (list_files) y examina su estructura (primeras líneas, columnas, tipos).
2. Escribe un script (write_file) para cargar y analizar los datos: tamaño, nulos, distribución, valores atípicos, correlaciones básicas y métricas relevantes.
3. Ejecútalo con run_command y guarda la salida; si faltan librerías, instálalas.
4. Responde preguntas concretas sobre los datos con números y ejemplos reales, no con generalidades.
5. Si es útil, genera una visualización o un informe en Markdown con hallazgos, tablas y recomendaciones.`
  },
  {
    id: 'stack_migration',
    name: 'Migración de Stack',
    category: 'Refactor',
    description: 'Migra entre lenguajes, frameworks o versiones mayores con un plan, compatibilidad y verificación continua.',
    keywords: ['migración', 'migra', 'migrar', 'pasar de', 'portar', 'porting', 'reescribir en', 'v2', 'nueva versión'],
    instructions: `1. Inventaría el estado actual: archivos, dependencias, funcionalidades y características del stack de origen.
2. Define el plan de migración por fases con criterios de "hecho" medibles en cada fase.
3. Migra progresivamente: traduce módulos por orden de dependencia (modelos/datos → lógica → presentación/API), manteniendo el comportamiento idéntico.
4. Tras cada fase, ejecuta build/pruebas para detectar incompatibilidades pronto.
5. Para versiones mayores de un framework, lee las guías de migración oficiales (usa web_search) y aplica los cambios de API.
6. Entrega un informe final: qué se migró, qué queda pendiente, y las incompatibilidades encontradas y resueltas.`
  },
  {
    id: 'architecture_plan',
    name: 'Plan de Arquitectura',
    category: 'Arquitectura',
    description: 'Diseña o evalúa la arquitectura de un sistema: capas, módulos, datos, flujos y decisiones justificadas.',
    keywords: ['arquitectura', 'diseño del sistema', 'system design', 'estructura del proyecto', 'plan técnico', 'diagrama'],
    instructions: `1. Entiende los requisitos: lee el código/proyecto actual y el objetivo pedido.
2. Define los componentes: módulos/capas (presentación, aplicación, dominio, infraestructura), sus responsabilidades y dependencias (respetando la regla de dependencias hacia dentro).
3. Diseña el modelo de datos: entidades, relaciones, claves, índices.
4. Define los flujos principales (request→respuesta, eventos, tareas en segundo plano) y cómo se manejan los errores.
5. Evalúa requisitos no funcionales: rendimiento, seguridad, escalabilidad, testabilidad.
6. Entrega el plan en un documento (write_file docs/ARCHITECTURE.md): diagrama en texto/ASCII, decisiones y alternativas consideradas, y pasos de implementación ordenados.`
  },
  {
    id: 'release_prep',
    name: 'Preparación de Release',
    category: 'Entrega',
    description: 'Prepara un release completo: changelog, versión, pruebas finales y checklist de publicación.',
    keywords: ['release', 'lanzamiento', 'versión nueva', 'publicar', 'changelog', 'release notes', 'v1', 'tag'],
    instructions: `1. Revisa git log entre la última versión y ahora y clasifica los cambios (feat, fix, breaking, refactor, docs).
2. Genera el changelog con el formato habitual del proyecto, señalando breaking changes claramente.
3. Propone el número de versión según semver (major para breaking, minor para funcionalidades, patch para fixes).
4. Ejecuta el checklist final: build limpio, pruebas en verde, lint, sin secretos en los cambios (git diff), README/versión actualizados.
5. Si el usuario lo confirma, actualiza la versión en los archivos, crea el commit y el tag (nunca hagas push sin permiso).
6. Entrega las release notes listas para publicar.`
  },
  {
    id: 'prompt_engineer',
    name: 'Ingeniería de Prompts',
    category: 'Datos',
    description: 'Escribe prompts y guías de IA de alta calidad: estructurados, con ejemplos y evaluación.',
    keywords: ['prompt', 'prompts', 'ingeniería de prompts', 'system prompt', 'instrucciones para ia', 'mejor prompt'],
    instructions: `1. Entiende el objetivo del prompt: tarea, audiencia, formato de salida, restricciones.
2. Escribe el prompt estructurado: rol claro, contexto relevante, instrucciones paso a paso, formato de salida explícito, restricciones y ejemplos (few-shot) de buena calidad.
3. Incluye un apartado de evaluación: criterios para saber si la salida es buena (exactitud, formato, estilo).
4. Si se pide un system prompt: escribe instrucciones directas, sin ambigüedad, con prioridades claras.
5. Entrega el prompt final en un bloque de código listo para copiar y una breve nota de cómo mejorarlo.`
  }
]

const CATEGORIES = ['Calidad', 'Seguridad', 'Debug', 'Refactor', 'Entrega', 'Docs', 'Arquitectura', 'DevOps', 'Construcción', 'Datos']

function listSkills() {
  return SKILLS.map(({ id, name, category, description }) => ({ id, name, category, description }))
}

function findRelevantSkills(prompt, enabledIds) {
  const text = String(prompt || '').toLowerCase()
  const enabled = enabledIds ? new Set(enabledIds) : null
  return SKILLS
    .filter((s) => (!enabled || enabled.has(s.id)) && s.keywords.some((k) => text.includes(k.toLowerCase())))
    .map(({ id, name, instructions }) => ({ id, name, instructions }))
}

module.exports = { listSkills, findRelevantSkills, CATEGORIES }