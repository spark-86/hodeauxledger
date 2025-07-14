@echo off
echo WARNING: This will ERASE all secrets and ledger data.
pause

echo Deleting secrets...
del /Q C:\secrets\*

echo Deleting ledger state...
del /Q C:\ledger\*

echo.
echo === Starting Usher Genesis Bootstrap ===
echo.
set /p passphrase=Enter passphrase for genesis key:
node usher -v -g --passphrase "%passphrase%"
