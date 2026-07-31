@echo off
REM Atualiza o projeto com a versão (commit) mais recente do repositório.
REM Basta dar dois cliques neste arquivo no Windows.

cd /d "%~dp0"

echo ============================================
echo  Baixando a atualizacao mais recente...
echo ============================================
echo.

git pull

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ============================================
    echo  Ocorreu um erro ao atualizar o projeto.
    echo  Verifique sua conexao com a internet e se
    echo  o Git esta instalado corretamente.
    echo ============================================
    pause
    exit /b 1
)

echo.
echo ============================================
echo  Projeto atualizado com sucesso!
echo ============================================
pause
