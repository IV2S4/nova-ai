module.exports = {
  entries: {
    '2.2.0': [
      '🤖 AGENTE AL NIVEL DE CLAUDE CODE / CURSOR: el agente ya puede lanzar SUBAGENTES EN PARALELO (hasta 4) para analizar varios archivos o tareas a la vez, y busca en TODO el código del proyecto con la nueva herramienta search_codebase (como @codebase): localiza funciones, variables o conceptos al instante sin leer archivo por archivo',
      '🖥️ TERMINAL INTEGRADA: pestaña Terminal en el panel del agente para ejecutar comandos en tu proyecto con salida en tiempo real (npm run build, git status, tests…)',
      '📝 EDITOR DE ARCHIVOS con diff en línea: pestaña Editor para abrir cualquier archivo del proyecto, editarlo y guardarlo — verás exactamente qué cambiaste antes de guardar',
      '⏱️ VERIFICACIÓN POST-CAMBIO: al aplicar propuestas (modo plan) el agente ejecuta automáticamente el build o los tests del proyecto y te dice si todo sigue funcionando (botón "Verificar cambios" manual también)',
      '🔧 FIX AUTOMÁTICO: activa "Fix auto" y cuando una herramienta falle el agente lo corregirá solo (hasta 2 intentos) sin que tengas que pedirlo',
      '✅ /RESUME COMPLETO: al cargar una sesión anterior ahora hay botón "Continuar tarea" que retoma exactamente donde se quedó',
      '💵 CONTADOR DE TOKENS Y COSTE: el agente muestra en tiempo real los tokens de salida estimados y el coste aproximado en $ por sesión',
      '⌨️ AUTOCOMPLETADO TAB: mientras escribes una instrucción el agente sugiere la continuación (estilo Cursor) — pulsa Tab para aceptarla',
      'Corrección: el visor de diffs (DiffView) usaba useMemo sin importarlo (fallo latente que se corregía solo en algunas compilaciones)'
    ],
    '2.1.0': [
      '🌍 IDIOMA: Nova AI ahora habla español e inglés. Cambia el idioma en Ajustes → General → Idioma de la interfaz (toda la interfaz se traduce al instante)',
      '⬇️ ACTUALIZACIONES AUTOMÁTICAS: "Buscar actualizaciones" ahora descarga e instala la nueva versión desde la propia app (solo en la versión instalada). También avisa al arrancar si hay una versión nueva y cuando la descarga termina',
      '🎬 Pantalla de inicio con el logo de Nova mientras carga la app',
      '📄 NUEVAS HERRAMIENTAS DEL AGENTE: lee PDFs del proyecto (documentación, manuales, informes) y ejecuta los tests automáticamente (npm test, pytest, go test, cargo test…)',
      '⚙️ AJUSTES POR PROVEEDOR: temperatura y máx. tokens por respuesta para cada IA desde Ajustes (afecta al chat y al agente)',
      '📌 PLANTILLAS PERSONALIZADAS: crea tus propias plantillas de mensajes en Ajustes y aparecen en la pantalla de inicio con un clic',
      '💾 Exporta la sesión del agente a Markdown con un botón (incluye herramientas ejecutadas y propuestas)',
      '⌨️ Atajos nuevos: Ctrl+1 (chat), Ctrl+2 (comparador), Ctrl+3 (agente)',
      'Corrección: las herramientas de servidores MCP ya aparecen en la primera ejecución del agente (antes solo en las siguientes)'
    ],
    '2.0.0': [
      '🤖 SERVERS MCP (Model Context Protocol): conecta herramientas externas al agente (editores, navegadores, bases de datos…) desde Ajustes → MCP, con botón para probar cada servidor',
      '🗂️ PROYECTOS DE CONOCIMIENTO: crea proyectos con archivos (PDF, docs, código…), Nova los indexa en fragmentos y el agente los consulta con búsqueda por relevancia — respuestas basadas en TU documentación',
      '📝 MODO PLAN del agente: investiga y propone cambios sin tocar tu código — cada propuesta llega como diff con botones Aplicar / Aplicar todo / Revertir, hunk a hunk',
      '💾 CHECKPOINTS: antes de aplicar propuestas se crea una instantánea de tus archivos y puedes restaurarla con un clic si algo sale mal',
      '🔀 PANEL GIT integrado: estado de archivos, staging/unstage, diff, historial de commits, commit con mensaje generado por IA y rama actual',
      '🧠 MENCIONA ARCHIVOS con @: escribe @ y elige archivos o carpetas del proyecto para dárselos de contexto al agente (también puedes copiar su ruta)',
      '📌 Reglas de proyecto (.novarules): un archivo en tu carpeta que el agente obedece siempre (estilo de código, convenciones…), editable desde el panel del agente',
      '⌨️ Paleta de comandos con Ctrl+K: cambia de conversación, ve al comparador/agente, exporta o abre ajustes sin tocar el ratón',
      '🗜️ Sesiones largas ya no explotan: si el contexto de una tarea anterior supera el límite, se comprime automáticamente con IA antes de retomarla',
      '💭 Razonamiento en vivo: los modelos que emiten "thinking" (Anthropic, Gemini y compatible OpenAI) lo muestran en la tarjeta de la tarea',
      '⏱️ Timeouts de 5 min por llamada del agente y mensajes de error claros cuando el proveedor tarda demasiado',
      '🔍 Búsqueda grep en el agente: encuentra patrones en todo el proyecto ignorando node_modules, dist, build y .git',
      '🌐 Errores de Git traducidos al español con consejos (identidad de git, conflictos, repos no inicializados…)'
    ],
    '1.9.0': [
      '🎨 GENERADOR DE IMÁGENES EN EL CHAT (como ChatGPT y Gemini): selecciona un modelo de imagen (GPT-Image 2/1, DALL·E 3, o Nano Banana de Gemini: gemini-3.1-flash-image, gemini-3.1-flash-lite-image, gemini-3-pro-image) y pídele lo que quieras',
      'Genera fotos desde texto: describe la escena y Nova dibuja la imagen directamente en la conversación',
      'EDITA y transforma tus fotos: adjunta una imagen y pide cambios ("cámbiale el fondo", "ponle gafas de sol"…) o deja activado "Editar la anterior" para seguir retocando la última imagen generada en el chat',
      'Controles de imagen: formato Cuadrado / Ancho / Alto y cantidad (1 a 4 imágenes) con GPT-Image',
      'Cada imagen generada tiene botones: DESCARGAR y EDITAR (la adjunta al chat para retocarla)',
      'El historial de conversación guarda las imágenes: puedes volver a un chat antiguo y seguir editando tus creaciones',
      'El comparador y el agente omiten los modelos de imagen (son exclusivos del chat)'
    ],
    '1.8.1': [
      'AGENTE ARREGLADO: las sesiones del agente ya se guardan y aparecen en el historial (antes se perdían al terminar la tarea)',
      'Detener el agente ahora guarda la sesión parcial con su estado para poder retomarla',
      'La búsqueda web del agente usa tu clave de Tavily de Ajustes (antes no llegaba a usarla)',
      'Arreglado un fallo que mezclaba los resultados de comandos entre herramientas del agente (estado compartido)',
      'No puedes cambiar de pestaña (Chat/Comparador/Agente) mientras una IA está respondiendo: avisa para que la detengas primero',
      'El checkbox "Responder en voz" de la barra del chat ahora se marca/desmarca al instante',
      'La búsqueda web del chat ya no se queda "buscando" si el proveedor falla: muestra el aviso correcto',
      'El guardado de conversaciones ya no puede romper la app si el disco falla (errores capturados)',
      'Botones "Probar" y "Arrancar servidor" de Ajustes con errores controlados (nunca se quedan cargando para siempre)',
      'Comandos del agente: el temporizador de 120 s se limpia bien al detener y no se reportan errores dobles'
    ],
    '1.8.0': [
      'CARPETAS de conversaciones: organiza tus chats por temas (botón de carpeta en cada conversación, "Nueva carpeta…" y quitar carpeta)',
      'Pantalla inicial renovada: estadísticas (conversaciones, mensajes, IA conectadas), accesos directos a Comparador y Agente, y 10 plantillas de mensajes con un clic',
      'Exporta tus conversaciones a PDF (con formato, vía printToPDF) y a Word (.docx real abierto por Word) además de Markdown y HTML',
      'Auditoría: verificación de todos los modelos de OpenAI, Mistral, Anthropic y xAI contra sus APIs (IDs obsoletos corregidos)',
      'Publicado el proyecto en GitHub (IV2S4/nova-ai) con release automático del instalador: "Buscar actualizaciones" ya funciona de verdad',
      'Limpiado el entorno: eliminado un package.json suelto de la carpeta de usuario que rompía electron-builder'
    ],
    '1.7.0': [
      'NUEVO LOGO e instalador profesional: Nova AI ahora tiene icono propio (gradiente púrpura-cyan con la N) y genera un instalador .exe completo con acceso directo en escritorio',
      'Pega imágenes directamente con Ctrl+V en el chat y arrastra archivos a la ventana para adjuntarlos',
      'El auto-scroll ya no te molesta: si subes a leer un mensaje viejo mientras la IA responde, la vista se queda quieta (botón para volver al final)',
      'Búsqueda dentro de la conversación con Ctrl+F (navega entre resultados con Enter/Shift+Enter)',
      'Atajos nuevos: Esc detiene la respuesta o cierra la búsqueda, Ctrl+L enfoca el campo de texto',
      'Matemáticas con LaTeX: las fórmulas $$…$$ y $…$ se renderizan con KaTeX en las respuestas',
      'Contador aproximado de tokens por conversación (visible junto a los botones del chat)',
      'Tema automático: nueva opción en Ajustes para seguir el modo claro/oscuro de Windows',
      'Botón "Buscar actualizaciones" en Ajustes: avisa cuando haya una versión nueva (configura tu repositorio en electron/updater.js)',
      'Modo "Siempre encima": mantén Nova AI flotando sobre cualquier ventana (botón en la barra lateral)',
      'Comparador: avisa si un proveedor no tiene API key configurada en lugar de fallar al comparar',
      'Agente IA: al detenerlo se matan también los comandos en ejecución (taskkill por árbol de procesos en Windows)',
      'Restaurar copia de seguridad ahora REEMPLAZA el historial actual (con confirmación) en vez de duplicar conversaciones',
      'Botón "Reintentar" en mensajes con error para reenviar sin reescribir nada',
      'Conversaciones agrupadas por Fijadas / Hoy / Ayer / Últimos 7 días / Más antiguas',
      'Corrección de modelos: eliminados los de Gemini y Groq que Google/Groq retiraron (gemini-2.5-pro, gemini-2.5-flash-lite, llama-4, llama-3.3, llama-3.1…) y añadidos los actuales (gemini-3.7-flash, gemini-3.6-flash, gemini-3-flash-preview, groq/compound…)',
      'Errores de saldo mejor detectados: ahora Claude (Anthropic), xAI y DeepSeek muestran el mensaje correcto en español con consejos por proveedor',
      'El aviso de proveedor saturado ahora incluye un consejo específico (p. ej. con Gemini prueba gemini-3.7-flash o gemini-3.6-flash, que suelen estar libres)'
    ],
    '1.6.0': [
      'Títulos automáticos: tras la primera respuesta, Nova genera un título corto para cada conversación (puedes desactivarlo en Ajustes)',
      'Fija tus conversaciones favoritas con el pin en la barra lateral: quedan arriba de la lista',
      'Borrado fino: ahora puedes borrar SOLO un mensaje o borrarlo con todos los siguientes (menú al pasar el ratón sobre el mensaje)',
      'Exporta tus conversaciones a HTML (formato bonito, listo para compartir) además de Markdown, y copia la conversación completa al portapapeles',
      'Rendimiento: las respuestas en streaming se dibujan ahora hasta 10 veces más fluidas en chats largos y en el comparador',
      'Correcciones: el historial ya no reaparece al borrarlo, los streams detenidos se limpian correctamente, y no puedes cambiar de chat por accidente mientras una IA responde',
      'Motor actualizado: Electron 43, React 19, Vite 8 y las últimas versiones de todas las librerías'
    ],
    '1.0.0': [
      'Lanzamiento de Nova AI: cliente de escritorio con 10 proveedores de IA (Claude, GPT, Gemini, OpenRouter, DeepSeek, Groq, Mistral, xAI, Ollama y LM Studio)',
      'Chat con respuestas en streaming y historial guardado localmente',
      'Comparador de modelos: misma pregunta a 4 IA a la vez, lado a lado',
      'Búsqueda web integrada (Tavily o DuckDuckGo sin clave)',
      'Adjuntar imágenes, PDF y archivos de texto para que la IA los analice',
      'Dictado por voz (Whisper) y respuestas leídas en voz alta',
      'Ajustes con test de conexión para cada proveedor'
    ],
    '1.5.7': [
      'Nuevo proveedor "Servidor OpenAI (local)": conecta la app con CUALQUIER servidor de IA local con API OpenAI-compatible — Jan (puerto 1337), GPT4All (4891), llama.cpp, llamafile, LocalAI, vLLM y más — escribiendo su URL en Ajustes',
      'La app detecta automáticamente los modelos cargados en tu servidor y los añade al selector de modelos'
    ],
    '1.5.6': [
      'Nuevo botón "Iniciar servidor" en Ajustes para LM Studio y Ollama: arranca el servidor local automáticamente con un clic (sin tocar nada fuera de la app)',
      'Si el servidor ya está en marcha, lo detecta y te lo dice; si no puede arrancarlo, te explica exactamente qué falta'
    ],
    '1.5.5': [
      'Corregido el error "fetch failed (ECONNREFUSED)" con LM Studio y Ollama: ahora la app te dice exactamente qué hacer (activar el servidor local en LM Studio → Developer → Start Server, o arrancar Ollama)',
      'El botón "Probar" de Ajustes también explica ahora cómo arrancar cada servidor local'
    ],
    '1.5.4': [
      'Etiqueta "GRATIS" corregida: ahora marca también los modelos gratuitos de Groq, los de Mistral con free tier y todos los locales (Ollama y LM Studio), no solo Gemini Flash y los :free de OpenRouter'
    ],
    '1.5.3': [
      'Detectado el error de "saldo insuficiente / sin créditos / cuota agotada": ahora la app te lo explica en español y te dice exactamente dónde recargar o qué modelo gratuito usar en su lugar',
      'Los modelos gratuitos ahora llevan una etiqueta verde "GRATIS" en el selector de modelos (chat, comparador y agente): Gemini Flash y los de OpenRouter que terminan en :free',
      'Consejos personalizados según el proveedor: si tu cuenta no tiene saldo, te sugiere alternativas gratuitas (Groq, Gemini Flash, DeepSeek, OpenRouter :free u Ollama local)'
    ],
    '1.5.2': [
      'Cuando un proveedor está saturado («high demand», «overloaded», error 429) la app ahora reintenta automáticamente la petición hasta 3 veces antes de rendirse',
      'Si aun así falla, verás un mensaje claro en español explicando que el modelo está saturado y qué puedes hacer (esperar o cambiar de modelo)',
      'Se aplica tanto al chat como al Agente IA'
    ],
    '1.5.1': [
      'MEMORIA: la app aprende de tus conversaciones tu idioma y tu estilo de trabajo (directo, detallado, breve, rápido…) y lo aplica automáticamente en cada chat y en el Agente IA',
      'Recuerdos: escribe «recuerda que…» en cualquier chat y se guardará como recuerdo permanente; también puedes añadir o borrar recuerdos manualmente desde Ajustes → Memoria',
      'Chats largos: cuando una conversación crece, la app la compacta automáticamente (resumen de la parte anterior) para que puedas continuar sin perder el hilo ni gastar tokens de más',
      'Puedes desactivar la memoria cuando quieras desde Ajustes → Memoria'
    ],
    '1.5.0': [
      'Sesiones del Agente IA guardadas automáticamente: cada trabajo queda en el panel "Sesiones" y puedes verlo, continuarlo (retoma el contexto de la sesión anterior) o borrarlo',
      'Explorador de archivos integrado en el Agente IA: navega por tu proyecto y abre archivos o carpetas en VS Code (o en el Explorador de Windows) con un clic',
      'Comandos en tiempo real: ahora la salida de cada comando se muestra EN VIVO mientras se ejecuta, y puedes detener un comando concreto con su botón X',
      'Nueva herramienta edit_file: ediciones quirúrgicas en archivos grandes (el agente ya no necesita reescribir el archivo entero)',
      'Gemini ahora también puede usar el Agente IA (con herramientas y comandos)',
      'Tema claro: actívalo desde Ajustes si prefieres el modo claro',
      'Copia de seguridad: exporta todos tus ajustes y conversaciones a un archivo JSON, y restáuralos cuando quieras',
      'Mejoras de estabilidad y rendimiento'
    ],
    '1.4.0': [
      'Nuevo sistema de SKILLS (estándar de la industria, estilo Claude Code/Cursor): 24 skills de experto que el agente activa automáticamente según tu petición (code review, auditoría de seguridad, generación de tests, refactor SOLID, debugging, Docker, CI/CD, migraciones de BD, análisis de datos y muchas más). Puedes activarlas/desactivarlas desde el botón "Skills"',
      'Nueva biblioteca de 26 PROMPTS AVANZADOS listos para usar: arquitectura completa, app desde cero, API REST, auditoría OWASP, optimización de rendimiento, suite de pruebas 90%+, refactor total, monorepo, release 1.0, análisis de datos y más. Botón "Prompts" en el Agente IA'
    ],
    '1.3.0': [
      'Nuevo Agente IA (estilo Claude Code / Cursor): elige la carpeta de tu proyecto y el agente podrá ejecutar comandos (npm run build, pruebas, git…), leer y editar archivos, listar carpetas y buscar en internet',
      'El agente muestra en pantalla cada herramienta que usa y su resultado, y puedes detenerlo en cualquier momento',
      'Funciona con Claude, GPT, DeepSeek, Groq, xAI, Mistral, OpenRouter y Ollama'
    ],
    '1.2.2': [
      'Corregido el error "signal is not defined" que impedía usar Claude, Gemini y Ollama: ahora el control de detención llega correctamente a todos los proveedores',
      'Mensajes de error más claros: si no hay conexión con el proveedor la app te lo explica (antes solo decía "fetch failed")'
    ],
    '1.2.1': [
      'Catálogo de modelos verificado con la documentación oficial (agosto 2026)',
      'Claude: añadidos claude-opus-5, claude-sonnet-5, claude-fable-5, claude-opus-4-8 y claude-opus-4-7 (retirado el antiguo claude-opus-4-1)',
      'GPT: añadidos gpt-5.6 (Sol/Terra/Luna), gpt-5.5 y gpt-5.4 (Pro/Mini/Nano); retirado gpt-4.5 que quedó deprecado',
      'Gemini: añadidos gemini-3.7-flash, gemini-3.6-flash y gemini-3.5-flash; retirado gemini-2.0-flash',
      'DeepSeek: actualizado a deepseek-v4-flash y deepseek-v4-pro (deepseek-chat y deepseek-reasoner fueron retirados por DeepSeek)',
      'Groq: actualizado a gpt-oss-120b/20b, Llama 4 Maverick/Scout y Qwen3.6 (retirado deepseek-r1-distill deprecado)',
      'Grok: actualizado a grok-4.6, grok-4.5, grok-4.3 y grok-build (retirados grok-4 y grok-code-fast)',
      'Mistral: añadidos mistral-medium-latest y ministral-8b-latest',
      'Ollama: modelos recomendados actualizados (llama3.3, qwen3, gemma3, phi4, gpt-oss…)',
      'Corregido el envío a modelos nuevos: GPT-5.x/o3 usan max_completion_tokens y Gemini 3.x ya no recibe temperatura'
    ],
    '1.2.0': [
      'Exporta cualquier conversación a un archivo Markdown desde el botón del chat',
      'Renombra tus conversaciones con doble clic en el título (sidebar)',
      'Modelos actualizados: GPT-4.5, GPT-4.1-nano, o3 y GPT-OSS-120b de Groq',
      'Carga mucho más rápida: los modelos de OpenRouter/Ollama/LM Studio ahora se recargan con caché (y botón "recargar" si no hay modelos)',
      'Mejor rendimiento al escribir: las respuestas se dibujan más fluidas en chats largos',
      'Corregido el botón "Escuchar última respuesta" (funciona aunque la voz esté desactivada)',
      'Corregido el cursor parpadeante que se quedaba al detener una respuesta',
      'Diseño pulido: avatares con el color del proveedor, scrollbar más fina y animaciones suaves'
    ],
    '1.1.0': [
      'Novedades: al abrir la app tras una actualización verás qué cambió en la nueva versión',
      'Clave de API opcional para Ollama y LM Studio (por si tu servidor local pide autenticación)',
      'Corregidos los modelos de xAI/Grok: ahora incluye grok-4.6, el modelo más nuevo',
      'Botón "Ver novedades" en Ajustes para consultar el historial de versiones',
      'Mejoras y correcciones menores'
    ]
  }
}