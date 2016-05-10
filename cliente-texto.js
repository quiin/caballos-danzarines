#!/usr/bin/env node

'use strict';

//------------------------------------------------------------------------------
const querystring   = require('querystring');
const request       = require('request');

//------------------------------------------------------------------------------
const stdin         = process.stdin;
const stdout        = process.stdout;
var servicioWeb;
const PAUSA       = 1000;          // Milisegundos entre cada petición de espera

//------------------------------------------------------------------------------
// Creador de objetos para invocar servicios web.

function invocadorServicioWeb(host) {

  let cookiesSesion = null;

  //----------------------------------------------------------------------------
  function obtenerCookies(res) {

    let valorSetCookies = res.headers['set-cookie'];

    if (valorSetCookies) {
      let cookies = [];
      valorSetCookies.forEach(str => cookies.push(/([^=]+=[^;]+);/.exec(str)[1]));
      cookiesSesion = cookies.join('; ');
    }
  }

  //----------------------------------------------------------------------------
  function encabezados(metodo) {
    let r = {};
    if (metodo !== 'GET') {
      r['Content-type'] = 'application/x-www-form-urlencoded';
    }
    if (cookiesSesion) {
      r['Cookie'] = cookiesSesion;
    }
    return r;
  }

  return {

    //--------------------------------------------------------------------------
    invocar: (metodo, ruta, params, callback) => {

      let opciones = {
        url: host + ruta,
        method: metodo,
        headers: encabezados(metodo)
      };
      let qs = querystring.stringify(params);
      if (metodo === 'GET' && qs !== '') {
        opciones.url +=  '?' + qs;
      } else {
        opciones.body = qs;
      }

      request(opciones, (error, res, body) => {
        if (res.statusCode !== 200) {
          errorFatal('Not OK status code (' + res.statusCode + ')');
        }
        obtenerCookies(res);
        callback(JSON.parse(body));
      });
    }
  };
}

//------------------------------------------------------------------------------
function crearJuego() {

  imprimirNl();
  imprimir('Indica el nombre del juego, seguido por el número de renglones y \nel número de columnas (entre 4 y 10), separados por un espacio: ');

  stdin.once('data', data => {

    let arr = data.toString().trim().split(' ');

    if (arr.length !== 3) {
      menu();

    } else {
      servicioWeb.invocar(
        'POST',
        '/caballos/crear_juego/',
        {'nombre': arr[0],
         'renglones': arr[1],
         'columnas': arr[2]
        },
        resultado => {

          if (resultado.creado) {
            jugar(resultado.simbolo);
            return;

          } else if (resultado.codigo === 'duplicado') {
            imprimirNl();
            imprimirNl('Error: Alguien más ya creó un juego con este ' +
                      'nombre: ' + arr[0]);

          } else if (resultado.codigo === 'numeros_invalidos') {
            imprimirNl();
            imprimirNl('Error: el número de renglones o columnas no está entre 4 y 10.')
          } else {
            imprimirNl();
            imprimirNl('No se proporcionó un nombre de juego válido.');
          }

          menu();
        }
      );
    }
  });
}

//------------------------------------------------------------------------------
function errorFatal(mensaje) {
  imprimirNl('ERROR FATAL: ' + mensaje);
  process.exit(1);
}

//------------------------------------------------------------------------------
function esperarTurno(callback) {
  servicioWeb.invocar(
    'GET',
    '/caballos/estado/',
    {},
    resultado => {
      if (resultado.estado === 'espera') {
        setTimeout(() => esperarTurno(callback), PAUSA);
      } else {
        imprimirNl();
        callback(resultado);
      }
    }
  );
}

//------------------------------------------------------------------------------
function imprimir(mens) {
  if (mens !== undefined) {
    stdout.write(mens);
  }
}

//-------------------------------------------------------------------------------
function imprimirMenu() {
  imprimirNl();
  imprimirNl('================');
  imprimirNl(' MENÚ PRINCIPAL');
  imprimirNl('================');
  imprimirNl('(1) Crear un nuevo juego');
  imprimirNl('(2) Unirse a un juego existente');
  imprimirNl('(3) Salir');
  imprimirNl();
}

//------------------------------------------------------------------------------
function imprimirNl(mens) {
  if (mens !== undefined) {
    stdout.write(mens);
  }
  stdout.write('\n');
}

//------------------------------------------------------------------------------
// function imprimirPosicionesTablero() {
//   imprimirTablero([[0, 1, 2], [3, 4, 5], [6, 7, 8]]);
//   imprimirNl();
// }

//------------------------------------------------------------------------------

function imprimirTablero(t) {
  var printedBoard = '';
  printedBoard += '        ';
  // columnas: t[0].length
  //renglones: t.length
  for (var k = 0; k < t[0].length; k++) {
    printedBoard += '(- ' + k + ' -) ';
  }
  printedBoard += '\n';
  for (var i = 0; i < t.length; i++) {
    printedBoard += '(- ' + i + ' -) ';
    for (var j = 0; j < t[0].length; j++) {
      printedBoard += t[i][j] + " ";
    }
    printedBoard += "\n";
  }
  imprimirNl(printedBoard);
}

//------------------------------------------------------------------------------
function juegoTerminado(estado) {

  function mens(s) {
    imprimirNl();
    imprimirNl(s);
    return true;
  }

  switch (estado) {

  case 'empate':
    return mens('Empate... espera, ¿qué?');

  case 'ganaste':
    return mens('A winner is you!');

  case 'perdiste':
    return mens('¡Deshonra a tu vaca!');

  default:
    return false;
  }
}

//------------------------------------------------------------------------------
function jugar(symbol) {

  imprimirNl();
  imprimirNl('Un momento');
  esperarTurno(resultado => {

    //--------------------------------------------------------------------------
    function tiroEfectuado(tablero) {
      imprimirNl();
      imprimirTablero(tablero);
      servicioWeb.invocar(
        'GET',
        '/caballos/estado/',
        {},
        resultado => {
          if (juegoTerminado(resultado.estado)) {
            menu();
          } else {
            jugar(symbol);
          }
        }
      );
    }

    //--------------------------------------------------------------------------
    function tiroNoEfectuado() {
      imprimirNl();
      imprimirNl('ERROR: Tiro inválido.');
      jugar(symbol);
    }
    //--------------------------------------------------------------------------
    console.log("TABLERO");
    console.log(resultado.tablero);
    imprimirTablero(resultado.tablero);
    
    if (juegoTerminado(resultado.estado)) {
      menu();

    } else if (resultado.estado === 'tu_turno') {
      imprimirNl();
      imprimirNl('Tú tiras con: ' + symbol);
      imprimirNl();
      imprimirTablero(resultado.tablero);
      leerNumero(0, 9, 2, opcion => {
        servicioWeb.invocar(
          'PUT',
          '/caballos/tirar/',
          { ren: parseInt(opcion[0]), col: parseInt(opcion[1]) },
          resultado => {
            if (resultado.efectuado) {
              tiroEfectuado(resultado.tablero);
            } else {
              tiroNoEfectuado();
            }
          }
        );
      });
    }
  });
}

//------------------------------------------------------------------------------
function leerNumero(inicio, fin, n, callback) {
  
  if (n === 2) {
    imprimirNl('Escribe la coordenada a la que quieras llevar a tu caballo.\nRecuerda seguir las reglas de movimiento del ajedrez.');
  } else if (n === 1) {
    imprimirNl('Selecciona una opción del ' + inicio + " al " + fin);
  }

  stdin.once('data', data => {

    let numeroValido = false;
    
    data = data.toString().trim();
    var num = [0, 0];
    if (n === 2) {
      if (/^\d+ \d+$/.test(data)) {
        num = data.split(' ');
        if ((inicio <= parseInt(num[0]) && parseInt(num[0]) <= fin) && (inicio <= parseInt(num[1]) && parseInt(num[1]) <= fin)) {
          numeroValido = true;
        }
      }
    } else if (n === 1) {
      if (/^\d+$/.test(data)) {
        num = parseInt(data);
      }
      if (inicio <= num && num <= fin) {
        numeroValido = true;
      }
    }
    if (numeroValido) {
      callback(num);
    } else {
      leerNumero(inicio, fin, n, callback);
    }
  });
}

//------------------------------------------------------------------------------
function licencia() {
  console.log('Este programa es software libre: usted puede redistribuirlo y/o');
  console.log('modificarlo bajo los términos de la Licencia Pública General GNU');
  console.log('versión 3 o posterior.');
  console.log('Este programa se distribuye sin garantía alguna.');
}

//------------------------------------------------------------------------------
function menu() {
  imprimirMenu();
  leerNumero(1, 3, 1, opcion => {
    switch (opcion) {

    case 1:
      crearJuego();
      break;

    case 2:
      unirJuego();
      break;

    case 3:
      process.exit(0);
    }});
}

//------------------------------------------------------------------------------
function seleccionarJuegosDisponibles(juegos, callback) {

  let total = juegos.length + 1;

  imprimirNl();
  imprimirNl('¿A qué juego deseas unirte?');
  for (let i = 1; i < total; i++) {
    imprimirNl('    (' + i + ') «' + juegos[i - 1].nombre + '»');
  }
  imprimirNl('    (' + total + ') Regresar al menú principal');
  leerNumero(1, total, 1, opcion => callback(opcion === total ? -1 : opcion - 1));
}

//------------------------------------------------------------------------------
function titulo() {
  imprimirNl('Caballos danzarines distribuído');
  imprimirNl('© 2016 Carlos Reyna y Diego Monroy, ITESM CEM.');
}

//------------------------------------------------------------------------------
function unirJuego() {

  //----------------------------------------------------------------------------
  function verificarUnion(resultado) {
    if (resultado.unido) {
      jugar(resultado.simbolo);
    } else {
      imprimirNl();
      imprimirNl('No es posible unirse a ese juego.');
      menu();
    }
  }
  //----------------------------------------------------------------------------

  servicioWeb.invocar(
    'GET',
    '/caballos/juegos_existentes/',
    {},
    juegos => {
      if (juegos.length === 0) {
        imprimirNl();
        imprimirNl('No hay juegos disponibles.');
        menu();
      } else {
        seleccionarJuegosDisponibles(juegos, opcion => {
          if (opcion === -1) {
            menu();
          } else {
            servicioWeb.invocar(
              'PUT',
              '/caballos/unir_juego/',
              { id_juego: juegos[opcion].id },
              verificarUnion
            );
          }
        });
      }
    }
  );
}

//------------------------------------------------------------------------------

titulo();
imprimirNl();
licencia();

if (process.argv.length !== 3) {
  imprimirNl();
  imprimirNl('Se debe indicar: http://<nombre de host>:<puerto>');
  process.exit(0);

} else {
  servicioWeb = invocadorServicioWeb(process.argv[2]);
  menu();
}
