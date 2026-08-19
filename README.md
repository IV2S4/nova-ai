# Nova AI

Asistente de IA de escritorio para Windows: conversaciones con Claude, GPT, Gemini, Groq, DeepSeek, Mistral, Grok, OpenRouter y modelos locales (Ollama, LM Studio). Incluye comparador de modelos, agente con herramientas, memoria, búsqueda web, servers MCP, proyectos de conocimiento y panel Git.

## Características

- **11 proveedores** con streaming en tiempo real y reintentos automáticos
- **Comparador**: lanza el mismo mensaje en hasta 4 modelos a la vez
- **Agente IA**: ejecuta herramientas sobre tu proyecto (leer/escribir archivos, terminal, búsqueda web, grep), modo PLAN con propuestas aprobables, @menciones de archivos, reglas `.novarules`, checkpoints y panel Git (staging, diff, commit con mensaje IA)
- **Servers MCP**: conecta herramientas externas al agente desde Ajustes
- **Proyectos de conocimiento**: indexa tus documentos y el agente los consulta por relevancia
- **Chat**: auto-títulos, conversaciones fijadas, agrupadas por día, búsqueda (Ctrl+F), imágenes (pegar/arrastrar), generación y edición de imágenes con IA, matemáticas LaTeX, exportar a HTML/PDF/Word, paleta de comandos (Ctrl+K)
- **Memoria**: aprende hechos de tus conversaciones y resume chats largos
- **Modo claro/oscuro/sistema**, voz, siempre encima, copias de seguridad

## Instalación

Descarga el instalador desde [Releases](https://github.com/IV2S4/nova-ai/releases) (`Nova AI Setup X.Y.Z.exe`).

## Desarrollo

```bash
npm install
npm start          # ejecuta la app
npm run build      # compila el frontend (vite)
npm run dist       # genera el instalador .exe (electron-builder)
```

Requiere Node.js 20+ y npm.

## Configuración de proveedores

Abre **Ajustes** dentro de la app y pega tus API keys. Solo hace falta una para empezar:
Gemini (gratis), Groq (gratis), OpenRouter (modelos `:free`), o un servidor local con Ollama/LM Studio.

## Actualizaciones

La app comprueba automáticamente en GitHub si hay una versión nueva (botón "Buscar actualizaciones" en Ajustes).