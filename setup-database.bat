@echo off
echo ========================================
echo Chess Platform Database Setup
echo ========================================
echo.

REM PostgreSQL 18 found at: C:\Program Files\PostgreSQL\18\bin\psql.exe
set PSQL_PATH=C:\Program Files\PostgreSQL\18\bin\psql.exe

REM Check if PostgreSQL 18 exists
if not exist "%PSQL_PATH%" (
    echo PostgreSQL 18 not found at expected location.
    echo Trying to find PostgreSQL installation...
    echo.
    
    REM Try other common versions
    if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" (
        set PSQL_PATH=C:\Program Files\PostgreSQL\16\bin\psql.exe
    ) else if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" (
        set PSQL_PATH=C:\Program Files\PostgreSQL\15\bin\psql.exe
    ) else if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" (
        set PSQL_PATH=C:\Program Files\PostgreSQL\14\bin\psql.exe
    ) else (
        echo ERROR: Could not find PostgreSQL installation!
        echo.
        echo Please use pgAdmin GUI method instead:
        echo   1. Open pgAdmin
        echo   2. Right-click Databases -^> Create -^> Database (name: chess_db)
        echo   3. Right-click chess_db -^> Query Tool
        echo   4. Open backend\database\schema.sql and paste contents
        echo   5. Click Execute
        echo.
        echo See MANUAL_DB_SETUP.md for detailed instructions.
        pause
        exit /b 1
    )
)

REM Check if psql is in PATH (preferred)
where psql >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set PSQL_PATH=psql
)

REM If version provided as argument, use it
if not "%1"=="" (
    if exist "C:\Program Files\PostgreSQL\%1\bin\psql.exe" (
        set PSQL_PATH=C:\Program Files\PostgreSQL\%1\bin\psql.exe
    )
)

echo Using PostgreSQL at: %PSQL_PATH%
echo.

echo Step 1: Creating database 'chess_db'...
echo Please enter your PostgreSQL password when prompted:
"%PSQL_PATH%" -U postgres -c "CREATE DATABASE chess_db;" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Database created successfully!
) else (
    echo Note: Database might already exist, continuing...
)

echo.
echo Step 2: Running schema...
echo Please enter your PostgreSQL password again:
"%PSQL_PATH%" -U postgres -d chess_db -f backend\database\schema.sql
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Database setup completed successfully!
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Create backend\.env file (see instructions below)
    echo 2. Run: cd backend ^&^& npm run setup-db
    echo.
    echo To create .env file:
    echo   1. Go to backend folder
    echo   2. Copy .env.template to .env
    echo   3. Edit .env and replace YOUR_PASSWORD_HERE with your PostgreSQL password
    echo.
) else (
    echo.
    echo ERROR: Failed to run schema
    echo.
    echo Possible issues:
    echo   - Wrong password (default user is 'postgres')
    echo   - PostgreSQL service not running
    echo   - Database doesn't exist
    echo.
    echo Try using pgAdmin GUI method instead (see MANUAL_DB_SETUP.md)
    echo.
)

pause
