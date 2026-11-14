@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "APP_URL=http://localhost:5174/"
set "APP_PORT=5174"

if /I "%~1"=="--server" goto run_server
goto run_launcher

:run_launcher
echo.
echo ========================================
echo   HYPER STUDENT CARE
echo ========================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo [오류] npm을 찾을 수 없습니다.
  echo Node.js가 설치되어 PATH에 포함되어 있는지 확인한 뒤 다시 실행하세요.
  echo.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo [오류] Hyper Student Care 프로젝트 폴더를 찾을 수 없습니다.
  echo 이 실행 파일은 프로젝트 폴더 안에 있어야 합니다.
  echo.
  pause
  exit /b 1
)

call :check_port
if not errorlevel 1 (
  echo 이미 서버가 실행 중입니다. 브라우저만 엽니다.
  powershell -NoProfile -Command "Start-Process '%APP_URL%'"
  exit /b 0
)

if not exist "node_modules\" (
  echo [오류] node_modules 폴더가 없습니다.
  echo 프로젝트 폴더에서 npm install 을 한 번 실행한 뒤 다시 시도하세요.
  echo.
  pause
  exit /b 1
)

echo 개발 서버를 시작합니다.
echo 작업 표시줄의 최소화 된 서버 창을 닫으면 앱이 종료됩니다.
echo.

set "HSC_LAUNCHER=%~f0"
set "HSC_ROOT=%CD%"
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -WorkingDirectory $env:HSC_ROOT -WindowStyle Minimized -ArgumentList @('/d','/k',('call {0}{1}{0} --server' -f [char]34, $env:HSC_LAUNCHER))"
if errorlevel 1 (
  echo [오류] 서버 창을 시작하지 못했습니다.
  echo.
  pause
  exit /b 1
)

set "WAIT_SEC=0"
:wait_loop
call :check_port
if not errorlevel 1 goto open_browser
set /a WAIT_SEC+=1
if %WAIT_SEC% GEQ 60 (
  echo.
  echo [오류] 서버가 60초 안에 준비되지 않았습니다.
  echo 작업 표시줄에서 최소화 된 서버 창을 열어 오류 메시지를 확인하세요.
  echo.
  pause
  exit /b 1
)
timeout /t 1 /nobreak >nul
goto wait_loop

:open_browser
echo 서버가 준비되었습니다. 브라우저를 엽니다.
powershell -NoProfile -Command "Start-Process '%APP_URL%'"
exit /b 0

:run_server
title HYPER STUDENT CARE 서버 - 이 창을 닫으면 앱이 종료됩니다
echo.
echo  **********************************************
echo   이 창을 닫으면 Hyper Student Care가 종료됩니다.
echo   하루 수업이 끝나면 이 창을 닫아 서버를 끄세요.
echo  **********************************************
echo.
call npm run dev
echo.
echo 서버가 종료되었습니다. 창을 닫으려면 아무 키나 누르세요.
pause
exit /b %ERRORLEVEL%

:check_port
netstat -ano | findstr /I "LISTENING" | findstr /R /C:":%APP_PORT%[^0-9]" >nul 2>&1
exit /b %ERRORLEVEL%