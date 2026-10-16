@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
  py -3 scripts\serve.py --open
  goto done
)
where python >nul 2>nul
if not errorlevel 1 (
  python scripts\serve.py --open
  goto done
)
echo Python was not found. Install Python 3.10 or later, then run this script again.
echo The 3D modules need a local HTTP server. Opening dist\index.html directly shows only the static page.
:done
pause
