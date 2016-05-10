

/* global $ */

'use strict';

const PAUSA = 1000;  
const EMPTY = '(- | -)';
const KNIGHT_A = 'KnightA';
const KNIGHT_B = 'KnightB';
const KING_A = 'King_A_'
const KING_B = 'King_B_'
const EMPATE = 0;
const GANADOR = 1;
const PERDEDOR = -1;

var someone_joined = false;


//------------------------------------------------------------------------------
$(document).ready(function () {

  //----------------------------------------------------------------------------
  $('.regresar_al_menu').click(menuPrincipal);
  
  //slider renglones
  $('#numero_de_renglones').on('change mousemove', function(){
    $('#ren_change').html($('#numero_de_renglones').val());
  });

  //slider columnas
  $('#numero_de_columnas').on('change mousemove', function(){
    $('#col_change').html($('#numero_de_columnas').val());
  });

  //modal OK listener
  $(document).on('confirmation', '.remodal', function(){
    window.location.replace("/");    
  })

  //----------------------------------------------------------------------------
  $('#boton_continuar_crear_juego').click(continuarCrearJuego);

  //----------------------------------------------------------------------------
  $('#boton_crear_juego').click(function () {
    $('div:not(.container):not(.form-group):not(#titulo):not(.modal):not(.remodal)').hide();
    $('#nombre_del_juego').val('');
    $('#seccion_solicitar_nombre').show();
    someone_joined = false;
  });

  //----------------------------------------------------------------------------
  $('#boton_continuar_unir_juego').click(function () {
    var id_juego = $('#lista_juego').val();
    $.ajax({
      url: '/caballos/unir_juego/',
      type: 'PUT',
      dataType: 'json',
      data: { id_juego: id_juego },
      error: errorConexion,
      success: function (resultado) {        
        if (resultado.unido) {
          $('div:not(.container):not(.form-group):not(#titulo):not(.modal):not(.remodal)').hide();
          $('#simbolo').html('Caballo Negro');
          $('#boton_mensajes_regresar_al_menu').hide();
          $('#titulo').hide();
          $('#seccion_mensajes').show();
          $('#seccion_tablero').show();          
          var renglones = resultado.tablero.length
          var columnas = resultado.tablero[0].length
          //Render board
          dibujarTablero(renglones, columnas);
          actualizar(resultado.tablero)
          someone_joined = true;

          esperaTurno();
        }
      }
    });
  });

  //----------------------------------------------------------------------------
  $('#boton_unir_juego').click(function () {
    $('div:not(.container):not(.form-group):not(#titulo):not(.modal):not(.remodal)').hide();
    $.ajax({
      url: '/caballos/juegos_existentes/',
      type: 'GET',
      dataType: 'json',
      error: errorConexion,
      success: function (resultado) {
        if (resultado.length === 0) {
          $('#seccion_sin_juegos').show();
        } else {
          var r = resultado.map(function (x) {
            return '<option value="' + x.id + '">' +
              escaparHtml(x.nombre) + '</option>';
          });
          $('#lista_juego').html(r.join(''));
          $('#seccion_lista_juegos').show();
        }
      }
    });
  });

  //----------------------------------------------------------------------------
  $('#form_lista_juegos').submit(function () {
    return false; // Se requiere para evitar que la forma haga un "submit".
  });

  //----------------------------------------------------------------------------
  $('#form_nombre_del_juego').submit(continuarCrearJuego);

  //----------------------------------------------------------------------------
  function activar(tablero) {
    recorreTablero(tablero, function (c, i, j) {
      $(c).removeClass('desactivo');
      $(c).addClass('activo');
      // if (tablero[i][j] === ' ') {
      $(c).addClass('seleccionable');
      tirable(c, i, j);
      // }
    });
  }

  //----------------------------------------------------------------------------
  function actualizar(tablero) {
    recorreTablero(tablero, function () {});
  }

  function dibujarTablero(renglones, columnas){
    console.log('dibujando tablero de ' + renglones + 'x' + columnas);
    var content = "<table class = 'table'>";
    for(var i = 0; i< renglones;i++){
      content += '<tr>'
      for(var j = 0;j< columnas;j++){
        var color = (i%2 == 0 && j%2 != 0) || (i%2 != 0 && j%2 == 0) ? '#a5a5a5' : '#868686'
        content += "<td id='c" + i + '' + j + "' class='desactivado' bgcolor= '" + color +"'>"
        content += '</td>'
      }
      content += '</tr>'
    }
    content += '</table>'
    $('#seccion_tablero').html(content)
  }

  //----------------------------------------------------------------------------
  function continuarCrearJuego() {

    var nombre = $('#nombre_del_juego').val().trim();
    var renglones = $('#numero_de_renglones').val().trim();
    var columnas = $('#numero_de_columnas').val().trim();

    if (nombre === '') {
      mensajeError('El nombre del juego no puede quedar vacío.');
    } else {
      $.ajax({
        url: '/caballos/crear_juego/',
        type: 'POST',
        dataType: 'json',
        data: {
          nombre: nombre,
          renglones: renglones,
          columnas: columnas
        },
        error: errorConexion,
        success: function (resultado) { 
          console.log("SE CREÓ UN TABLERO CON " + renglones + " renglones y " + columnas +" columnas")                   
          var texto;
          if (resultado.creado) {
            $('div:not(.container):not(.form-group):not(#titulo):not(.modal):not(.remodal)').hide();
            $('#simbolo').html('Caballo blanco');            
            // $('#estado').html('Esperando que el otro jugador tire.');
            $('#boton_mensajes_regresar_al_menu').hide();
            $('#titulo').hide();
            $('#seccion_mensajes').show();
            $('#seccion_tablero').show();
            
            //render board on screen
            dibujarTablero(renglones, columnas);
            //waiting animation
            
            esperaTurno();
          } else {
            switch (resultado.codigo) {

            case 'duplicado':
              texto = 'Alguien más ya creó un juego con este ' +
                'nombre: <em>' + escaparHtml(nombre) + '</em>';
              break;

            case 'invalido':
              texto = 'No se proporcionó un nombre de juego válido.';
              break;

            default:
              texto = 'Error desconocido.';
              break;
            }
            mensajeError(texto);
          }
        }
      });
    }
    return false; // Se requiere para evitar que la forma haga un "submit".
  }

  //----------------------------------------------------------------------------
  function desactivar(tablero) {
    recorreTablero(tablero, function (c, i, j) {
      $(c).removeClass('activo');
      $(c).removeClass('seleccionable');
      $(c).addClass('desactivo');
      $(c).unbind('click');
    });
  }

  //----------------------------------------------------------------------------
  function errorConexion() {
    mensajeError('No es posible conectarse al servidor.');
  }

  //----------------------------------------------------------------------------
  // Para evitar inyecciones de HTML.
  function escaparHtml (str) {
    return $('<div/>').text(str).html();
  }
  //----------------------------------------------------------------------------
  function imprimirTablero (t) {
    // columnas: t[0].length
    //renglones: t.length
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
    console.log(printedBoard);
  }
  //----------------------------------------------------------------------------
  function esperaTurno() {

    var segundos = 0;
    //Waiting...
    $('body').css('cursor', 'wait');
    // $('body').addClass('loading');
    var inst = $('[data-remodal-id=modal]').remodal();        
    inst.open();

    function ticToc() {      
      $('#estado_desc').html('Llevas ' + segundos + ' segundo' +
        (segundos === 1 ? '' : 's') + ' esperando.');
      segundos++;
      $.ajax({
        url: '/caballos/estado/',
        type: 'GET',
        dataType: 'json',
        error: errorConexion,
        success: function (resultado) {
          console.log("RESULTADO")
          console.log(resultado)

          switch (resultado.estado) {

          case 'tu_turno':
            //stop waiting
            // $('body').removeClass('loading'); 
            someone_joined = true;
            inst.close();                
            imprimirTablero(resultado.tablero);            
            turnoTirar(resultado.tablero);
            break;

          case 'espera':
            if(someone_joined){
              $('#estado').html('Esperando que el otro jugador tire.');
            }else{
              console.log('wut')
              $('#estado').html('Esperando a que alguien más se una al juego');
            }
            
            setTimeout(ticToc, PAUSA);
            break;

          case 'empate':
            actualizar(resultado.tablero);
            finDeJuego(EMPATE);
            break;

          case 'ganaste':
            finDeJuego(GANADOR);
            // resalta(resultado.tablero);
            break;

          case 'perdiste':
            finDeJuego(PERDEDOR);
            actualizar(resultado.tablero);
            // resalta(resultado.tablero);
            break;
          }
        }
      });
    }
    setTimeout(ticToc, 0);
  }

  //----------------------------------------------------------------------------
  function finDeJuego(mensaje) {
    // $('body').removeClass('loading');
    var inst = $('[data-remodal-id=modal]').remodal();
    $('#button-here').html("<button data-remodal-action='confirm' class='remodal-confirm'>OK</button>");
    $('body').css('cursor', 'auto');
    switch (mensaje) {
      case GANADOR:
        $('#estado').html('¡Felicidades!');
        $('#estado_desc').html('Ganaste este juego.');        
        inst.open();
        break;
      case PERDEDOR:
        $('#estado').html('Qué lástima');
        $('#estado_desc').html('Perdsite este juego :c');
        inst.open();
        break;
      case EMPATE:
        $('#estado').html('Empate');
        $('#estado_desc').html('No sé cómo lo hicieron pero empataron...');
        inst.open();
        break;      
    }
  }

  //----------------------------------------------------------------------------
  function mensajeError(mensaje) {
    $('body').css('cursor', 'auto');
    $('div:not(.container):not(.form-group):not(#titulo):not(.modal):not(.remodal)').hide();
    $('#mensaje_error').html(mensaje);
    $('#seccion_error').show();
  }

  //----------------------------------------------------------------------------
  function menuPrincipal() {
    // reiniciaTablero();
    $('div:not(.container):not(.form-group):not(#titulo):not(.modal):not(.remodal)').hide();
    $('#seccion_menu').show();
    $('#titulo').show();
    return false;
  }

  //----------------------------------------------------------------------------
  function recorreTablero(tablero, f) {
    for (var i = 0; i < tablero.length; i++) {
      for (var j = 0; j < tablero[i].length; j++) {
        var c = '#c' + i + j;
        var celda = parsear(tablero[i][j]);
        $(c).html(celda);
        f(c, i, j);
      }
    }
  }

  function parsear(simbolo){
    switch (simbolo) {
      case EMPTY:        
        return '';
      case KING_A:
        return '<span class="playerA glyphicon glyphicon-king"></span>'
      case KING_B:
        return '<span class="playerB glyphicon glyphicon-king"></span>'
      case KNIGHT_A:
        return '<span class="playerA glyphicon glyphicon-knight"></span>'
      case KNIGHT_B:
        return '<span class="playerB glyphicon glyphicon-knight"></span>'
      default:        
        return simbolo;
    }
  }

  //----------------------------------------------------------------------------
  function reiniciaTablero() {
    var tablero = [[' ', ' ', ' '],[' ', ' ', ' '],[' ', ' ', ' ']];
    recorreTablero(tablero, function (c, i, j) {
      $(c).removeClass();
      $(c).addClass('desactivo');
    });
  }

  //----------------------------------------------------------------------------
  function resalta(t) {

    function revisa(a, b, c) {
      if (t[a[0]][a[1]] === t[b[0]][b[1]] &&
          t[b[0]][b[1]] === t[c[0]][c[1]] &&
          t[a[0]][a[1]] !== ' ') {
        $('#c' + a[0] + a[1]).removeClass().addClass('ganador');
        $('#c' + b[0] + b[1]).removeClass().addClass('ganador');
        $('#c' + c[0] + c[1]).removeClass().addClass('ganador');
      }
    }

    revisa([0,0],[0,1],[0,2]);
    revisa([1,0],[1,1],[1,2]);
    revisa([2,0],[2,1],[2,2]);
    revisa([0,0],[1,0],[2,0]);
    revisa([0,1],[1,1],[2,1]);
    revisa([0,2],[1,2],[2,2]);
    revisa([0,0],[1,1],[2,2]);
    revisa([0,2],[1,1],[2,0]);
  }

  //----------------------------------------------------------------------------
  function tirable(nombre, ren, col) {
    $(nombre).click(function () {
      $.ajax({
        url: '/caballos/tirar/',
        type: 'PUT',
        dataType: 'json',
        data: {ren: ren, col: col},
        error: errorConexion,
        success: function (data) {
          if (data.efectuado) {
            desactivar(data.tablero);            
            esperaTurno();
          }
        }
      });
    });
  }

  //----------------------------------------------------------------------------
  function turnoTirar(tablero) {
    $('body').css('cursor', 'auto');
    activar(tablero);
  }

});
