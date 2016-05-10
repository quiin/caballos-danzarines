# Juego de caballos danzarines distribuido

Esta es una aplicación web de Node que implementa el juego de caballos danzarines. Permite que múltiples parejas de jugadores jueguen simultáneamente.


## 0. Requisitos

Para poder ejecutarse se requiere tener instalado el siguiente software:

- Node 4.2.*
- MongoDB 2.6.*

## 1. Instalación

La aplicación requiere instalar varios módulos de Node. Teclea el siguiente comando desde la terminal dentro del directorio `caballos_danzarines`:

      npm install

## 2. Corriendo los servidores

Primero se debe arrancar el servior de MongoDB. En una terminal teclea:

      mongod 

No es necesario crear explícitamente la base de datos ni las colecciones.

Posteriormente, teclea en otra terminal dentro del directorio `caballos_danzarines` el siguiente comando:

      npm start

## 3. Corriendo el cliente de texto

Para correr el cliente de texto (suponiendo que el servidor está corriendo en la misma máquina en el puerto `$PORT`), en una terminal disponible dentro del directorio `caballos_danzarines` teclea lo siguiente:

      npm run-script cliente

o alternativamente:

      node cliente-texto.js http://localhost:$PORT

## 4. Corriendo el cliente web

En un navegador, ir al URL: `http://nombre-del-servidor/caballos/`. Si se desea jugar en la misma computadora, se requerirán al menos dos navegadores distintos (por ejemplo Firefox y Chromium) o un mismo navegador abriendo una segunda ventana en modo incógnito.

Un mismo juego puede usar un cliente web y el otro cliente de modo texto.
