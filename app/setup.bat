@echo off
echo Installation des dépendances pour l'application Payment Splitter...
echo.

echo Installation des dépendances principales...
npm install

echo.
echo Installation des polyfills et dépendances de développement...
npm install --save-dev assert buffer crypto-browserify https-browserify os-browserify process react-app-rewired stream-browserify stream-http url

echo.
echo Installation terminée! Démarrez l'application avec "npm start"
echo.
pause
