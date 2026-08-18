export const PROMPT_CATEGORIES = ['Arquitectura', 'Construcción', 'Calidad', 'Refactor', 'Documentación', 'Entrega y DevOps', 'Datos y Investigación']

export const PROMPTS = [
  {
    id: 'arch_plan',
    category: 'Arquitectura',
    title: 'Plan de arquitectura completo',
    description: 'Diseña la arquitectura completa del sistema: módulos, datos, flujos, decisiones y plan de implementación.',
    prompt: `Quiero que diseñes la arquitectura completa de este proyecto como un arquitecto de software senior.

PROCESO:
1. Explora primero el proyecto (list_files, lee package.json, README y los archivos principales) para entender qué existe hoy.
2. Diseña la arquitectura objetivo con: módulos/capas y sus responsabilidades, reglas de dependencia entre módulos, modelo de datos (entidades y relaciones), flujos principales (peticiones, tareas en segundo plano, eventos), y manejo de errores.
3. Evalúa requisitos no funcionales: rendimiento, seguridad, escalabilidad, testabilidad, mantenibilidad.
4. Documenta todo en docs/ARCHITECTURE.md (write_file) con: diagrama ASCII de la estructura, decisiones tomadas y alternativas descartadas con su motivo, y un plan de implementación por fases con criterios de "hecho".
5. Si hay incoherencias entre la arquitectura actual y la propuesta, señálalas con impacto y costo de migración.

FORMATO DE SALIDA: resumen ejecutivo de 10 líneas + enlace al documento generado + lista de decisiones clave.`
  },
  {
    id: 'app_full',
    category: 'Construcción',
    title: 'App completa desde cero',
    description: 'Crea una aplicación completa y funcional con arquitectura limpia, sin esqueletos vacíos.',
    prompt: `Crea una aplicación COMPLETA y FUNCIONAL en la carpeta del proyecto, como si fuera para producción.

REQUISITOS:
- Stack moderno y popular, justificado en tu respuesta (elige según el tipo de app).
- Estructura profesional: configuración, separación por capas/módulos, variables de entorno (.env.example), scripts útiles.
- TODAS las funcionalidades principales implementadas y funcionando, no placeholders ni "TODO".
- Manejo de errores y estados de carga en la interfaz o API.
- Diseño visual cuidado: paleta coherente, jerarquía, responsive, micro-interacciones.
- README.md con instalación, configuración y uso.

PROCESO:
1. Antes de escribir código, define el plan: funcionalidades, estructura de archivos, modelo de datos.
2. Implementa por módulos y verifica con run_command (build y arranque) tras cada módulo.
3. Instala las dependencias necesarias.
4. Ejecuta el build y las pruebas hasta que todo funcione sin errores.

ENTREGA: resumen de lo creado, cómo ejecutarlo y decisiones de diseño.`
  },
  {
    id: 'api_complete',
    category: 'Construcción',
    title: 'API REST completa',
    description: 'Backend completo: endpoints, validación, errores consistentes, autenticación y documentación OpenAPI.',
    prompt: `Construye una API REST COMPLETA y profesional para este proyecto.

REQUISITOS:
- Endpoints REST con convenciones correctas (sustantivos plurales, métodos HTTP, códigos de estado).
- Validación de entrada en todos los endpoints, con mensajes de error claros.
- Esquema de errores uniforme: { error: { code, message, details } }.
- Autenticación y autorización (JWT o sesiones) con protección de rutas.
- Paginación y filtros en las colecciones.
- Manejo de errores global (no try/catch repetidos).
- Documentación OpenAPI/Swagger o API.md con ejemplos reales de cada endpoint.

PROCESO:
1. Define el modelo de datos y las rutas antes de implementar.
2. Implementa capa por capa: modelos, servicios, rutas, middleware.
3. Verifica con run_command: arranca el servidor y prueba los endpoints clave (curl o peticiones).
4. Corre las pruebas y el build hasta dejarlo en verde.

ENTREGA: lista de endpoints con métodos, resumen de decisiones y estado de verificación.`
  },
  {
    id: 'security_full',
    category: 'Calidad',
    title: 'Auditoría de seguridad completa',
    description: 'Auditoría OWASP exhaustiva con informe detallado y fixes aplicados.',
    prompt: `Realiza una AUDITORÍA DE SEGURIDAD COMPLETA de este proyecto siguiendo la metodología OWASP.

ÁREAS A AUDITAR:
1. Dependencias: vulnerabilidades conocidas (npm audit / gestor correspondiente) y versiones desactualizadas.
2. Secretos: claves, tokens y contraseñas en código o en el historial de git.
3. Entrada de usuario: validación, inyección (SQL, shell, XSS, path traversal), deserialización insegura.
4. Autenticación/autorización: hashing, sesiones, tokens, control de acceso, fuerza bruta.
5. Configuración: headers de seguridad, CORS, HTTPS, exposición de info sensible, depuración en producción.
6. Datos: cifrado en reposo/tránsito, exposición en respuestas, logs que filtren datos.

PROCESO:
1. Recopila evidencia con comandos (run_command) y lectura de archivos (read_file).
2. Clasifica cada hallazgo: CRÍTICO / ALTO / MEDIO / BAJO con archivo, línea, cómo explotarlo y cómo corregirlo.
3. APLICA las correcciones de severidad crítica y alta directamente (write_file).
4. Verifica con build/pruebas que nada se rompió.
5. Guarda el informe en docs/SECURITY.md.

ENTREGA: resumen ejecutivo con número de hallazgos por severidad, qué corregiste y qué queda para revisión manual.`
  },
  {
    id: 'perf_full',
    category: 'Calidad',
    title: 'Optimización de rendimiento completa',
    description: 'Mide, identifica cuellos de botella y optimiza con mejoras numéricamente verificables.',
    prompt: `Optimiza el rendimiento de este proyecto de forma CIENTÍFICA: nada de cambios a ciegas.

PROCESO:
1. ESTABLECE UNA LÍNEA BASE: ejecuta el proyecto y mide los puntos clave (tiempos de arranque, respuestas, tamaños de bundle, queries) con herramientas disponibles. Guarda los números.
2. Identifica los 5 cuellos de botella más importantes con evidencia, ordenados por impacto.
3. Para cada uno: lee el código implicado, diagnostica la causa (bucles, N+1, bloqueos síncronos, carga excesiva, re-renders, assets) y aplica la optimización.
4. DESPUÉS DE CADA CAMBIO: vuelve a medir el mismo punto. Si no hay mejora medible, revierte el cambio y prueba otra cosa.
5. Al final, ejecuta build y pruebas para asegurar que todo sigue funcionando.
6. Guarda un informe en docs/PERFORMANCE.md con tabla "antes vs después".

ENTREGA: tabla de métricas antes/después, lista de cambios aplicados y revertidos (con por qué), y recomendaciones futuras.`
  },
  {
    id: 'tests_exhaustive',
    category: 'Calidad',
    title: 'Suite de pruebas exhaustiva',
    description: 'Cobertura 90%+: unitarias, integración y E2E con reporte final de cobertura.',
    prompt: `Construye una SUITE DE PRUEBAS EXHAUSTIVA para este proyecto con el objetivo de superar el 90% de cobertura.

REQUISITOS:
- Usa el framework de pruebas del proyecto; si no hay, instala el estándar del stack (Vitest/Jest/Pytest...).
- Pruebas unitarias: casos normales, casos límite (vacíos, extremos, nulos), errores y excepciones, para TODA la lógica de negocio.
- Pruebas de integración: flujos completos (API-base de datos-respuesta, componentes-estado).
- Pruebas E2E de los flujos críticos si la tecnología lo permite.
- Sin pruebas "de relleno": cada test debe verificar comportamiento real (evita snapshots gigantes y asserts triviales).

PROCESO:
1. Analiza la estructura del código y prioriza módulos por riesgo.
2. Escribe las pruebas por módulo (write_file).
3. Ejecuta con run_command el test runner con cobertura (--coverage) y repite hasta pasar 90%+.
4. Corrige TODOS los fallos, incluidos los del código de producción que los tests descubran.
5. Si hay partes difíciles de probar, refactoriza ligeramente para hacerlas testables (sin cambiar comportamiento).

ENTREGA: porcentaje final de cobertura, nº de pruebas, módulos con más riesgo y cómo ejecutarlas.`
  },
  {
    id: 'refactor_total',
    category: 'Refactor',
    title: 'Refactorización total',
    description: 'Transforma el código a estándares de producción (SOLID, limpieza) con verificación constante.',
    prompt: `Refactoriza TODO este proyecto a estándares de producción. El objetivo es que el código sea legible, mantenible y correcto, SIN cambiar su comportamiento.

PRINCIPIOS:
- SOLID: separación de responsabilidades, dependencias hacia dentro, interfaces claras.
- Elimina: duplicación, funciones largas, parámetros en cascada, mutación de estado oculta, nombres confusos, código muerto.
- Patrones: extracción de funciones/clases, composición sobre herencia, manejo de errores centralizado, constantes con nombre.
- Convenciones: mismo estilo de formato en todo el proyecto (usa el linter existente o define uno).

PROCESO:
1. Inventario: lista los archivos con sus problemas (lee los principales).
2. Verifica la red de seguridad: pruebas y build deben estar en verde ANTES de empezar (arréglalos si no).
3. Refactoriza en pasos pequeños e independientes. DESPUÉS DE CADA PASO: ejecuta pruebas/build.
4. Si un cambio puede alterar comportamiento, aíslalo y avísame antes de aplicarlo.
5. Al terminar, ejecuta todo el check final: lint + tests + build en verde.

ENTREGA: qué archivos refactorizaste, patrones aplicados, estado final de verificación y sugerencias restantes.`
  },
  {
    id: 'monolith_split',
    category: 'Refactor',
    title: 'Dividir el monolito',
    description: 'Descompón archivos/funciones gigantes en módulos cohesivos y testables.',
    prompt: `Este proyecto tiene código "monolítico": archivos y funciones demasiado grandes que mezclan responsabilidades. Quiero que los dividas en módulos cohesivos y testables.

OBJETIVO:
- Cada archivo con UNA responsabilidad clara (nombrada por lo que hace).
- Funciones de menos de 50 líneas, sin efectos ocultos, con parámetros explícitos.
- Dependencias explícitas entre módulos (imports claros, sin estado global compartido).
- El comportamiento externo NO debe cambiar.

PROCESO:
1. Encuentra los archivos más grandes y las funciones más largas (usa herramientas/lectura).
2. Identifica los "conceptos" mezclados dentro de cada uno (ej. validación + persistencia + UI).
3. Extrae cada concepto a su propio archivo con una API pública mínima y limpia.
4. Tras cada extracción: ejecuta pruebas y build para confirmar que nada cambió.
5. Al final, añade al menos una prueba unitaria por módulo nuevo clave.

ENTREGA: mapa de "antes a después" (archivo original a módulos creados), estado de verificación y consejos de mantenimiento.`
  },
  {
    id: 'docs_full',
    category: 'Documentación',
    title: 'Documentación completa del proyecto',
    description: 'README profesional, guía de arquitectura, API docs y guía de contribución.',
    prompt: `Genera la documentación COMPLETA y profesional de este proyecto, lista para publicar.

ENTREGABLES (todos con write_file):
1. README.md: descripción clara del propósito, captura de pantalla en texto/ASCII de lo que hace, tabla de contenido, requisitos, instalación paso a paso, configuración (cada variable de entorno explicada), uso con ejemplos reales, estructura del proyecto, comandos útiles, solución de problemas comunes (FAQ breve), licencia.
2. docs/ARCHITECTURE.md: cómo está organizado el código, flujo de datos, decisiones de diseño.
3. docs/API.md (si hay API): cada endpoint con método, ruta, parámetros, body, respuestas (éxito y error) y ejemplos.
4. docs/CONTRIBUTING.md: cómo clonar, ramas, estándares de código, cómo ejecutar pruebas, cómo hacer PR.

PROCESO:
1. Explora a fondo el proyecto antes de escribir (no inventes nada: verifica cada comando ejecutándolo).
2. Todos los comandos documentados deben funcionar de verdad (pruébalos con run_command).
3. Escribe en el idioma del usuario, con tono claro y profesional.

ENTREGA: lista de archivos creados y resumen del proyecto en 5 líneas.`
  },
  {
    id: 'ci_cd_full',
    category: 'Entrega y DevOps',
    title: 'Pipeline CI/CD completo',
    description: 'GitHub Actions con lint, tests, build, audit de seguridad y deploy opcional.',
    prompt: `Crea un PIPELINE CI/CD completo para este proyecto.

REQUISITOS:
- .github/workflows/ci.yml con: triggers (push a main + pull requests), checkout, instalación de dependencias CON CACHÉ, lint, pruebas, build, y auditoría de dependencias.
- Jobs separados por responsabilidad y dependencias entre ellos (ej. tests, build, artefacto).
- Matriz de versiones de Node/Python si el proyecto lo soporta.
- Timeouts en todos los pasos.
- (Opcional) workflow de deploy: documenta el target (Vercel/Netlify/Docker/SSH) con variables de entorno indicadas, SIN credenciales reales.

PROCESO:
1. Lee el proyecto para extraer los comandos reales (lint, test, build) y verifícalos localmente con run_command.
2. Escribe los workflows con write_file.
3. Valida la sintaxis YAML con una herramienta local.
4. Documenta en README cómo se activa y qué variables de entorno de CI se necesitan.

ENTREGA: contenido de los workflows creados y lista de secretos/variables requeridos.`
  },
  {
    id: 'db_migration_full',
    category: 'Entrega y DevOps',
    title: 'Migración de base de datos segura',
    description: 'Cambia el esquema sin perder datos: migraciones, transformación de datos y rollback.',
    prompt: `Planifica y ejecuta los cambios de base de datos que necesite este proyecto de forma SEGURA (sin perder datos).

REQUISITOS:
- Sistema de migraciones versionadas (usa el del proyecto o instala uno estándar).
- Toda migración con: qué cambia (tablas/columnas/índices), transformación de datos existentes, y rollback.
- Los cambios destructivos (DROP, borrado de columnas) van en una migración separada y claramente señalada.
- Scripts de transformación de datos que se puedan probar con un subset primero.

PROCESO:
1. Analiza el esquema actual y qué necesita cambiar.
2. Escribe las migraciones (write_file).
3. Ejecútalas con run_command y verifica el esquema resultante.
4. Prueba el rollback.
5. Verifica que la app sigue funcionando (build/pruebas).

ENTREGA: lista de migraciones creadas, estado del esquema y comandos para aplicarlas/revertirlas.`
  },
  {
    id: 'docker_full',
    category: 'Entrega y DevOps',
    title: 'Dockerización profesional',
    description: 'Dockerfiles multi-stage ligeros, compose para servicios y healthchecks.',
    prompt: `Dockeriza este proyecto como lo haría un equipo de plataforma profesional.

REQUISITOS:
- Dockerfile con: imagen base oficial y con tag exacto, multi-stage si hay compilación, capas eficientes (dependencias estables antes que el código), .dockerignore, usuario no root, healthcheck.
- docker-compose.yml si hay varios servicios (app + db + cache...) con redes, volúmenes, dependencias y healthchecks.
- Variables de entorno con valores por defecto sensatos para desarrollo.
- Documentación de los comandos de uso (dev y producción).

PROCESO:
1. Lee el proyecto para entender sus requisitos reales.
2. Escribe los archivos (write_file).
3. Verifica con run_command: docker build y docker compose config.
4. Si Docker está disponible, arranca los servicios y comprueba que responden (healthcheck).

ENTREGA: archivos creados, tamaño de imagen si se pudo construir, y comandos de uso.`
  },
  {
    id: 'data_project',
    category: 'Datos y Investigación',
    title: 'Análisis de datos con informe',
    description: 'Analiza los datos del proyecto, genera estadísticas, visualizaciones y un informe ejecutivo.',
    prompt: `Realiza un ANALISIS DE DATOS COMPLETO con los datos disponibles en este proyecto y entrega un informe profesional.

PROCESO:
1. Localiza los datos (list_files): CSV, JSON, logs, bases de datos. Examina su estructura: columnas, tipos, tamaño, calidad (nulos, duplicados, valores atípicos).
2. Escribe un script de análisis (write_file) que calcule: estadísticas descriptivas, distribuciones, correlaciones relevantes, tendencias y outliers.
3. Ejecútalo con run_command e instala las librerías que falten (pandas, etc.).
4. Genera visualizaciones si es posible (gráficas en archivos) y un informe en docs/DATA_REPORT.md con: resumen ejecutivo, hallazgos clave con números reales, tablas y recomendaciones accionables.
5. Si el usuario hace preguntas específicas sobre los datos, respóndelas con evidencia numérica.

ENTREGA: hallazgos principales en 10 líneas, informe guardado y scripts creados.`
  },
  {
    id: 'tech_research',
    category: 'Datos y Investigación',
    title: 'Investigación técnica con fuentes',
    description: 'Investiga un tema con fuentes web actualizadas y entrega un informe con veredicto.',
    prompt: `Investiga a fondo el siguiente tema y entrega un informe técnico con fuentes reales y verificación de hechos.

PASO 1: Definición y búsqueda
- Define el tema en 3 subtemas investigables.
- Usa web_search varias veces con consultas distintas (en español e inglés) para cubrir: estado actual, mejores prácticas, comparativas y riesgos.

PASO 2: Verificación
- Cruza la información entre fuentes; marca los puntos donde las fuentes discrepan.
- Indica la fecha de la información y su nivel de confianza.

PASO 3: Informe
- Escribe docs/RESEARCH.md con: resumen ejecutivo, hallazgos clave con fuentes citadas (nombre, fecha, URL), comparativas en tablas, recomendación con justificación, y riesgos/limitaciones.

PASO 4: Aplicación al proyecto
- Relaciona las conclusiones con este proyecto: qué implicaría adoptarlo y primeros pasos concretos.

ENTREGA: veredicto claro en 5 líneas + informe guardado + lista de fuentes.`
  },
  {
    id: 'stack_migration_full',
    category: 'Refactor',
    title: 'Migrar de stack o framework',
    description: 'Plan y ejecución de una migración completa con compatibilidad verificada en cada fase.',
    prompt: `Migra este proyecto al stack/framework que te indique (o al que recomiendes justificadamente) con un plan profesional.

PROCESO:
1. INVENTARIO: documenta el estado actual (archivos, dependencias, funcionalidades, datos) y qué debe conservarse idéntico.
2. PLAN: define fases ordenadas por dependencia (datos/modelos primero, luego lógica, luego UI/API), cada una con criterios de "hecho" verificables.
3. COMPATIBILIDAD: en cada fase, el sistema debe seguir funcionando (build/pruebas en verde) antes de pasar a la siguiente.
4. Investigación: usa web_search para las guías de migración oficiales del framework destino.
5. Traducción: migra módulo a módulo con write_file respetando las convenciones del stack nuevo.
6. Limpieza final: elimina el código muerto del stack antiguo solo al final, cuando el nuevo esté verificado.
7. Documenta la migración en docs/MIGRATION.md con lo migrado, lo pendiente y cómo revertir si hiciera falta.

ENTREGA: estado por fase (completada/pendiente), incompatibilidades encontradas y resueltas, y estado final build+pruebas.`
  },
  {
    id: 'monorepo_setup',
    category: 'Arquitectura',
    title: 'Convertir en monorepo',
    description: 'Organiza el proyecto en un monorepo con workspaces, dependencias claras y builds eficientes.',
    prompt: `Convierte este proyecto en un MONOREPO bien organizado (workspaces) o mejora el existente.

REQUISITOS:
- Workspaces configurados correctamente (npm/pnpm/yarn workspaces, o tooling tipo Turbo/Nx si el tamaño lo justifica).
- Paquetes con responsabilidades claras y nombres coherentes (packages/*).
- Dependencias entre paquetes explícitas y correctamente declaradas (sin imports cruzados ilegales).
- Scripts raíz para todo: build, test, lint, dev (que funcionen desde la raíz).
- Configuración compartida centralizada cuando aplique (TS config, eslint, prettier).

PROCESO:
1. Analiza la estructura actual y decide la división en paquetes.
2. Configura los workspaces y mueve el código con write_file.
3. Declara las dependencias entre paquetes correctamente.
4. Ejecuta desde la raíz: instalación limpia, build y pruebas; corrige hasta que estén en verde.
5. Documenta en README cómo se trabaja con el monorepo (comandos, paquetes, reglas).

ENTREGA: estructura final del monorepo, comandos disponibles y estado de verificación.`
  },
  {
    id: 'code_review_expert',
    category: 'Calidad',
    title: 'Code review de experto',
    description: 'Revisión senior del proyecto completo con hallazgos por severidad y fixes.',
    prompt: `Haz una REVISION DE CODIGO DE EXPERTO de este proyecto, como la haría un senior en una PR crítica antes de mergear.

REVISA POR:
1. Correctitud: bugs, casos límite no manejados, condiciones invertidas, off-by-one, estados inconsistentes.
2. Seguridad: input sin validar, inyección, secretos, autenticación débil.
3. Rendimiento: algoritmos ineficientes, N+1, bloqueos, carga innecesaria.
4. Mantenibilidad: duplicación, funciones largas, nombres, acoplamiento, comentarios engañosos.
5. Estilo: consistencia con las convenciones del proyecto.

PROCESO:
1. Recorre los archivos clave (prioriza los de mayor lógica).
2. Documenta cada hallazgo: archivo, línea, severidad (CRITICO/ALTO/MEDIO/BAJO), explicación y corrección concreta.
3. APLICA las correcciones de severidad CRITICA y ALTA directamente.
4. Verifica con build y pruebas.
5. Guarda el informe completo en docs/CODE_REVIEW.md.

ENTREGA: resumen con nº de hallazgos por severidad, top 3 problemas del proyecto y qué corregiste.`
  },
  {
    id: 'debug_crash',
    category: 'Construcción',
    title: 'Investigar un error/crash',
    description: 'Localiza la causa raíz de un error, aplica el fix y previene regresiones.',
    prompt: `Investiga a fondo el error que ocurre en este proyecto y resuélvelo de raíz.

PROCESO:
1. REPRODUCE el problema: ejecuta lo que lo provoca (run_command) y captura el error completo (stack trace, mensaje, código de salida).
2. Analiza la causa raíz: lee el código de la ruta del error (read_file) y distingue causa real de errores en cascada. Usa logs y estado de datos si es relevante.
3. FORMULA hipótesis ordenadas por probabilidad y valida la más probable con una prueba mínima antes de tocar código.
4. APLICA el fix mínimo y correcto (write_file). No parchees el síntoma: corrige la causa.
5. VERIFICA: vuelve a ejecutar el caso original (debe funcionar), ejecuta pruebas y build.
6. PREVIENE regresiones: si el bug era fácil de reintroducir, añade una prueba que lo capture.

ENTREGA: causa raíz explicada en 5 líneas, fix aplicado, verificación realizada y prueba añadida (si aplica).`
  },
  {
    id: 'dependency_upgrade_all',
    category: 'Entrega y DevOps',
    title: 'Actualizar todas las dependencias',
    description: 'Pone al día todo el stack con breaking changes resueltos y sin regresiones.',
    prompt: `Actualiza TODAS las dependencias de este proyecto a sus versiones más recientes de forma segura.

PROCESO:
1. Diagnostica el estado: ejecuta el comando de outdated del gestor (npm outdated, pip list --outdated, etc.) y haz un inventario completo.
2. Prioriza: primero las de seguridad (críticas), luego majors, después menores/patches.
3. Actualiza en grupos pequeños. TRAS CADA GRUPO: ejecuta build y pruebas (run_command).
4. Para cada breaking change: lee el changelog o guía de migración oficial (usa web_search si hace falta) y adapta el código con write_file.
5. Actualiza los archivos de manifiesto (package.json, requirements, etc.) con write_file y ejecuta la instalación.
6. Si una dependencia queda obsoleta o en desuso, propón una alternativa y migra si es razonable.
7. Repite hasta que todo el stack esté en la última versión con build y pruebas en verde.

ENTREGA: tabla de dependencias (antes/después), breaking changes resueltos y estado final de verificación.`
  },
  {
    id: 'release_prep_full',
    category: 'Entrega y DevOps',
    title: 'Preparar un release 1.0',
    description: 'Changelog, semver, checklist de calidad y notas de publicación listas.',
    prompt: `Prepara el próximo RELEASE de este proyecto como lo haría un release manager.

PROCESO:
1. Revisa git log entre la última versión (o el principio) y ahora; clasifica cada cambio: feat, fix, refactor, docs, chore, perf, breaking.
2. Determina el número de versión según SEMVER (major si hay breaking changes, minor para funcionalidades nuevas, patch para fixes).
3. Actualiza la versión en todos los lugares necesarios (package.json, configs, headers).
4. Escribe el CHANGELOG con el formato habitual del proyecto, marcando claramente los breaking changes y cómo migrar.
5. Ejecuta el CHECKLIST FINAL de calidad: build limpio, todas las pruebas en verde, lint sin errores, sin secretos en los cambios (revisa git diff), documentación/README coherentes.
6. Si el usuario lo confirma: crea el commit del release y el tag correspondiente (git tag). NUNCA hagas push sin permiso.
7. Genera las release notes listas para publicar (formato Markdown).

ENTREGA: versión propuesta y aplicada, changelog completo, resultados del checklist y release notes finales.`
  },
  {
    id: 'frontend_polish',
    category: 'Construcción',
    title: 'Elevar el diseño del frontend',
    description: 'Transforma la interfaz a un nivel profesional: paleta, jerarquía, responsive y micro-interacciones.',
    prompt: `ELEVA el diseño de la interfaz de este proyecto a nivel profesional, sin romper funcionalidad.

DIRECTRICES DE DISEÑO:
- Define un sistema visual coherente: paleta (neutros + máx. 2-3 acentos), tipografía con jerarquía clara, espaciado en escala de 4/8px, radios y sombras consistentes.
- Evita el aspecto genérico de plantilla: estados hover/focus/active en TODO elemento interactivo, transiciones de 150-250ms, bordes con definición, profundidad sutil.
- Jerarquía visual: elementos importantes destacados, secundarios atenuados, nada compite por atención.
- Responsive real: móvil primero, sin desbordes, textos legibles, rejillas fluidas.
- Micro-interacciones: feedback en envíos (loading/spinner), estados vacíos con mensajes útiles, animaciones de entrada sutiles.
- Accesibilidad básica: contraste suficiente, foco visible, etiquetas en inputs.

PROCESO:
1. Identifica los componentes de UI actuales (lee los archivos de estilos/componentes).
2. Define el sistema visual y aplícalo con write_file (CSS variables o design tokens primero).
3. Refactoriza los componentes principales para usar el sistema.
4. Verifica con build/pruebas que nada se rompió.

ENTREGA: resumen del sistema visual definido, componentes rediseñados y verificación.`
  },
  {
    id: 'security_hardening',
    category: 'Seguridad',
    title: 'Endurecimiento de seguridad',
    description: 'Aplica capas de protección: headers, auth, validación, secretos y dependencias.',
    prompt: `ENDURECE la seguridad de este proyecto aplicando capas de protección concretas.

APLICA (con write_file):
1. Cabeceras de seguridad HTTP (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, HSTS) en el framework/servidor del proyecto.
2. Validación estricta de TODA entrada de usuario (esquemas de validación, tipos, límites).
3. Sanitización para XSS en cualquier salida dinámica.
4. Protección contra fuerza bruta si hay autenticación (rate limiting, bloqueo temporal).
5. Gestión segura de secretos: variables de entorno (nunca en código), .env.example sin valores reales, gitignore correcto.
6. Verificación de dependencias: ejecuta el audit del gestor y corrige vulnerabilidades críticas/altas (con sus upgrades).
7. Manejo de errores que no filtre internals (stack traces, rutas, versiones) al cliente.

VERIFICA: build y pruebas en verde al final.

ENTREGA: lista de protecciones aplicadas, vulnerabilidades de dependencias resueltas y verificación final.`
  },
  {
    id: 'ai_features',
    category: 'Construcción',
    title: 'Integrar funciones de IA',
    description: 'Añade IA al proyecto: chat, resúmenes, embeddings o RAG con buenas prácticas.',
    prompt: `Añade funcionalidades de INTELIGENCIA ARTIFICIAL a este proyecto de forma profesional.

OPCIONES (implementa la que pida el usuario o elige la más útil justificándola):
1. Chat/asistente con la API que prefieras (OpenAI, Claude, DeepSeek, Ollama local...).
2. Resúmenes automáticos de contenido.
3. Busqueda semántica con embeddings + RAG sobre documentos del proyecto.
4. Clasificación o extracción de datos con prompts estructurados.

REQUISITOS:
- Configuración de la API key por variables de entorno (nunca hardcodeada).
- Manejo de errores de API (rate limits, timeouts) con mensajes claros.
- Streaming si es chat.
- Interfaz o endpoints documentados.
- Costes controlados: límites de tokens y prompts eficientes.

PROCESO:
1. Diseña la arquitectura de la funcionalidad (dónde vive, cómo se llama, qué modelo).
2. Implementa con write_file, instala dependencias con run_command.
3. Prueba con una llamada real (run_command) y corrige.
4. Ejecuta build/pruebas finales.

ENTREGA: qué se implementó, cómo configurarlo (variables), ejemplo de uso y verificación.`
  },
  {
    id: 'project_health',
    category: 'Calidad',
    title: 'Auditoría de salud del proyecto',
    description: 'Diagnóstico completo: calidad, deuda, riesgos, dependencias y recomendaciones priorizadas.',
    prompt: `Haz una AUDITORIA DE SALUD COMPLETA de este proyecto y entrega un plan de acción priorizado.

AREAS:
1. Calidad de código: complejidad, duplicación, cobertura de pruebas, estilos inconsistentes.
2. Dependencias: desactualizadas, vulnerables, innecesarias, duplicadas.
3. Deuda técnica: TODOs, hacks, workarounds, código muerto, funciones gigantes.
4. Riesgos: datos sensibles, configuración frágil, falta de backups/rollback, procesos manuales.
5. Documentación: README, arquitectura, API docs, guías de contribución.
6. Pruebas: cobertura real, pruebas que no verifican nada, flakiness.
7. Despliegue: build reproducible, CI/CD, entornos.

PROCESO:
1. Recopila evidencia con comandos y lectura (no opiniones: datos).
2. Clasifica cada hallazgo: severidad, esfuerzo estimado (S/M/L) e impacto.
3. Prioriza con la matriz impacto/esfuerzo.
4. Guarda el informe en docs/HEALTH.md con el plan de acción ordenado por prioridad, cada item con: problema, evidencia, acción, esfuerzo.

ENTREGA: score general (0-100) por área, top 10 acciones prioritarias y el informe guardado.`
  },
  {
    id: 'git_history_clean',
    category: 'Entrega y DevOps',
    title: 'Limpiar el historial de git',
    description: 'Historial limpio y entendible: commits convencionales, sin secretos ni artefactos.',
    prompt: `Limpia y organiza el historial de git de este proyecto dejándolo profesional y seguro.

PROCESO:
1. Diagnostica: git log --oneline -30, git status, ramas (git branch -a), y busca secretos/artefactos rastreados (git ls-files con .env, builds, node_modules).
2. Detecta problemas: mensajes de commit poco descriptivos, commits de "wip/fix", secretos en el historial, archivos generados versionados.
3. Si hay secretos en el historial: avísame SIEMPRE primero (deben rotarse, no solo borrarse); si me das permiso, elimínalos del historial.
4. Reorganiza commits si me confirmas que es seguro (solo local, SIN push): squashing de commits de trabajo, mensajes Conventional Commits.
5. Mejora el .gitignore para evitar artefactos futuros (write_file).
6. NUNCA ejecutes push --force, rebase sobre ramas compartidas o reset hard sin confirmación explícita del usuario.

ENTREGA: diagnóstico del historial, acciones realizadas (y cuáles requieren confirmación), y estado final.`
  },
  {
    id: 'ai_course_generate',
    category: 'Datos y Investigación',
    title: 'Generar curso/guía desde el proyecto',
    description: 'Convierte el código en material educativo completo: tutoriales, ejercicios y quiz.',
    prompt: `Convierte este proyecto en MATERIAL EDUCATIVO COMPLETO para aprender a programar con él.

ENTREGABLES (con write_file en docs/course/):
1. docs/course/00-INTRO.md: qué es el proyecto, qué se aprende, prerrequisitos y rutas de aprendizaje (3 niveles: básico, medio, avanzado).
2. Lecciones (01, 02, ...): cada una con objetivo, explicación del concepto apoyada en el CODIGO REAL del proyecto (cita archivos y líneas), ejemplos, y un ejercicio práctico con solución esperada.
3. docs/course/EXERCISES.md: 10+ ejercicios graduales con pistas y soluciones explicadas.
4. docs/course/QUIZ.md: 15+ preguntas de opción múltiple con respuestas y explicación.
5. docs/course/PROJECT.md: un proyecto final que combine todo lo aprendido.

PROCESO:
1. Analiza a fondo el código real (no inventes ejemplos que no existan).
2. Escribe las lecciones en orden pedagógico, cada una apoyada en archivos reales.
3. Verifica que todos los comandos que enseñes funcionan (pruébalos con run_command).

ENTREGA: lista de archivos creados, ruta de aprendizaje propuesta y cómo usar el material.`
  }
]