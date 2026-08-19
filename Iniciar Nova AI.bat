@echo off
chcp 65001 >nul
title Nova AI
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [ERROR] Node.js no esta instalado.
  echo  Descargalo de https://nodejs.org e instala la version LTS.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando dependencias por primera vez (solo una vez)...
  call npm install
  if errorlevel 1 (
    echo.
    echo  [ERROR] Fallo la instalacion de dependencias.
    echo  Revisa tu conexion a internet e intenta de nuevo.
    echo.
    pause
    exit /b 1
  )
  echo Dependencias instaladas.
)

echo Iniciando Nova AI...
call npm start

echo.
echo Nova AI se cerro. Pulsa una tecla para salir...
pause >nul