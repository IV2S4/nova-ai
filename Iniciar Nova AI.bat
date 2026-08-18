@echo off
chcp 65001 >nul
title Nova AI
cd /d "%~dp0"
echo Iniciando Nova AI...
call npm start
pause