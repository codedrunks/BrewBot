@echo off

:: colors from https://gist.githubusercontent.com/mlocati/fdabcaeb8071d5c75a2d51712db24011/raw/b710612d6320df7e146508094e84b92b34c77d48/win10colors.cmd
echo [33mOpening redis in a new window[0m
echo.

cmd /c start wsl -e redis-server
