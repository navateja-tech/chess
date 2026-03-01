@echo off
echo ========================================
echo Creating .env file for backend
echo ========================================
echo.

if exist .env (
    echo .env file already exists!
    echo Do you want to overwrite it? (y/n)
    set /p overwrite=
    if /i not "%overwrite%"=="y" (
        echo Cancelled.
        pause
        exit /b 0
    )
)

echo.
echo Enter your PostgreSQL password (default user: postgres):
set /p db_password=

echo.
echo Enter JWT secret (or press Enter for default):
set /p jwt_secret=

if "%jwt_secret%"=="" set jwt_secret=dev_secret_change_in_production

(
echo PORT=5000
echo DATABASE_URL=postgresql://postgres:%db_password%@localhost:5432/chess_db
echo JWT_SECRET=%jwt_secret%
) > .env

echo.
echo .env file created successfully!
echo.
echo Contents:
type .env
echo.
pause
