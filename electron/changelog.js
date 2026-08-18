module.exports = {
  entries: {
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