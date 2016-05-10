
'use strict';

//------------------------------------------------------------------------------
const express    = require('express');
const router     = express.Router();
const constantes = require('../models/constantes.js');
const Juego      = require('../models/juego.js');
const Jugador    = require('../models/jugador.js');

module.exports = router;

//------------------------------------------------------------------------------

const ABORTAR  = true;

//------------------------------------------------------------------------------
// Convierte una función asíncrona en una promesa de ES6.
//------------------------------------------------------------------------------
function promisify(fun) {
  return function (/* ... */) {
    return new Promise((resolve, reject) => {
      let args = Array.prototype.slice.call(arguments);
      args.push((err, ...result) => {
        if (err) reject(err);
        else resolve(result);
      });
      fun.apply(null, args);
    });
  };
}

//------------------------------------------------------------------------------
router.get('/', (req, res) => {
  res.redirect('/caballos/');
});

//------------------------------------------------------------------------------
router.get('/caballos/', (req, res) => {
  res.render('index.ejs');
});

//------------------------------------------------------------------------------
router.post('/caballos/crear_juego/', (req, res) => {
  
  let resultado = { creado: false, codigo: 'invalido' };
  let nombre = req.body.nombre;
  let renglones = req.body.renglones;
  let columnas = req.body.columnas;
  let juego;
  let jugador;  
  //--------------------------------------------------------------------------
    
  function createBoard(m, n) {
    /* Function that creates a board with m rows and n columns, and 
       assigns a random position to both Kings and Knights. */
    var board = [m];
    
    if (!( (4 <= m && m <=10) && (4 <= n && n <= 10) )) {
      return 'error';
    }
    
    // Fill board with 'Empty' places => 0
    for (var i = 0; i < m; i++) {
      board[i] = new Array(n);
      for (var j = 0; j < n; j++) {
        board[i][j] = '(- | -)';
      }
    }
      
    // Get King A, B & Knight A, B 's places in the board.
    var randomKing_A_ = Math.floor(Math.random()*n);
    var randomKing_B_ = Math.floor(Math.random()*n);
    while (randomKing_A_ === randomKing_B_) { randomKing_B_ = Math.floor(Math.random()*n) };
    var randomKnightA = Math.floor(Math.random()*n);
    var randomKnightB = Math.floor(Math.random()*n);
    while (randomKnightA === randomKnightB) { randomKnightB = Math.floor(Math.random()*n) };
    
    // Place Kings
    board[m-1][randomKing_A_] = 'King_A_';
    board[m-1][randomKing_B_] = 'King_B_';
    console.log("KING_A: (" + (m-1) + "," + randomKing_A_ + ")");
    console.log("KING_B: (" + (m-1) + "," + randomKing_B_ + ")");
    
    // Place Knights
    board[0][randomKnightA] = 'KnightA';
    board[0][randomKnightB] = 'KnightB';
    console.log("Knight_A: (" + 0 + "," + randomKnightA + ")");
    console.log("Knight_B: (" + 0 + "," + randomKnightB + ")");
    
    return board;
  }

  //--------------------------------------------------------------------------
    
  if (nombre) {
    let find = promisify(Juego.find.bind(Juego));
    find({ nombre: nombre, iniciado: false })
    .then(arg => {
      let juegos = arg[0];
      if (juegos.length === 0) {
        let board = createBoard(renglones, columnas);
        if (board === 'error') {
          resultado.codigo = 'numeros_invalidos';
          throw ABORTAR;
        }        
        juego = new Juego({nombre: nombre, renglones: renglones, columnas: columnas, tablero: ''});
        juego.setTablero(board);
        let save = promisify(juego.save.bind(juego));
        return save();
      } else {
        resultado.codigo = 'duplicado';
        throw ABORTAR;
      }
    })
    .then(_ => {
      jugador = new Jugador({
        juego: juego._id,
        simbolo: constantes.SIMBOLO[0]
      });
      let save = promisify(jugador.save.bind(juego));
      return save();
    })
    .then(_ => {
      req.session.id_jugador = jugador._id;
      resultado.creado = true;
      resultado.codigo = 'bien';
      resultado.simbolo = jugador.simbolo;
    })
    .catch(err => {
      if (err !== ABORTAR) {
        console.log(err);
      }
    })
    .then(_ => res.json(resultado));
  }
});

//------------------------------------------------------------------------------
router.get('/caballos/estado/', (req, res) => {

  let resultado = { estado: 'error'};

  obtenerJuegoJugador(req, (err, juego, jugador) => {

    //--------------------------------------------------------------------------
    function eliminarJuegoJugadores () {
      let remove = promisify(jugador.remove.bind(jugador));
      delete req.session.id_jugador;
      remove()
      .then(_ => {
        let find = promisify(Jugador.find.bind(Jugador));
        return find({ juego: juego._id });
      })
      .then(arg => {
        let jugadores = arg[0];
        if (jugadores.length === 0) {
          let remove = promisify(juego.remove.bind(juego));
          return remove();
        }
      })
      .catch(err => console.log(err))
      .then(_ => res.json(resultado));
    }

    //--------------------------------------------------------------------------
    
    function ganado(p, board) {
      /* Get wether piece p has eaten King_p in this board. */
      var enemyKing = '';
      var enemyKnight = '';
      if (p === 'KnightA') {
        enemyKing = 'King_B_';
        enemyKnight = 'KnightB';
      } else if (p === 'KnightB') {
        enemyKing = 'King_A_';
        enemyKnight = 'KnightA';
      } else {
        console.log('Error while checking piece: None of them was either Knight.\n');
        return false;
      }
      var enemyKingLives = false;
      var enemyKnightLives = false;
      for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[0].length; j++) {
          if (board[i][j] === enemyKing) {
            enemyKingLives = true;
          }
          if (board[i][j] === enemyKnight) {
            enemyKnightLives = true;
          }
        }
      }
      return !(enemyKingLives && enemyKnightLives);
    }

    //--------------------------------------------------------------------------
    // function lleno(t) {
    //   for (let i = 0; i < 3; i++) {
    //     for (let j = 0; j < 3; j++) {
    //       if (t[i][j] === ' ') return false;
    //     }
    //   }
    //   return true;
    // }
    //--------------------------------------------------------------------------

    if (err) {
      console.log(err);
      res.json(resultado);

    } else {
      let tablero = juego.getTablero();
      resultado.tablero = tablero;
      if (!juego.iniciado) {
        resultado.estado = 'espera';
        res.json(resultado);

      } else if (ganado(jugador.simbolo, tablero)) {
        resultado.estado = 'ganaste';
        eliminarJuegoJugadores();

      } else if (ganado(contrincante(jugador.simbolo), tablero)) {
        resultado.estado = 'perdiste';
        eliminarJuegoJugadores();

      } else if (juego.turno === jugador.simbolo) {
        resultado.estado = 'tu_turno';
        console.log("TABLERO:");
        console.log(resultado.tablero)
        res.json(resultado);

      } else {
        resultado.estado = 'espera';
        res.json(resultado);
      }
    }
  });
});

//------------------------------------------------------------------------------
router.get('/caballos/juegos_existentes/', (req, res) => {
  Juego
  .find({ iniciado: false })
  .sort('nombre')
  .exec((err, juegos) => {
    if (err) {
      console.log(err);
    }
    res.json(juegos.map(x => ({ id: x._id, nombre: x.nombre })));
  });
});

//------------------------------------------------------------------------------
router.put('/caballos/tirar/', (req, res) => {

  let resultado = { efectuado: false };

  obtenerJuegoJugador(req, (err, juego, jugador) => {

    //--------------------------------------------------------------------------
    function convertirEntero(s) {
      let r = /^(0*)(\d+)$/.exec(s);
      return r ? parseInt(r[2], 10) : -1;
    }

    //--------------------------------------------------------------------------
    function guardarCambios(tablero, ren, col, pieza) {
      // Removing piece from previous place.
      var posicion = getPosition(tablero, pieza);
      // Moving piece to corresponding place.
      tablero[ren][col] = pieza;
      tablero[posicion[0]][posicion[1]] = '(- | -)';
      // Changing the game turn and setting the new board.
      juego.turno = contrincante(juego.turno);
      juego.setTablero(tablero);
      juego.save((err) => {
        if (err) {
          console.log(err);
        }
        resultado.efectuado = true;
        resultado.tablero = tablero;
        res.json(resultado);
      });
      
    }

    //--------------------------------------------------------------------------
    
    function getPosition(board, p) {
      /* Get the position (as an array) of a certain piece */
      var position = [2];
      for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[0].length; j++) {
          if (board[i][j] === p) {
            position[0] = i;
            position[1] = j;
            return position
          }
        }
      }
    }
  
    //--------------------------------------------------------------------------
    
    function tiroValido(board, row, col, piece) {
      if (!((0 <= row && row < board.length) && (0 <= col && col < board[0].length))) {
        return false;
      }
      var pos = getPosition(board, piece);
      // List of possible possitions for a Knight.
      var possiblePositions = [[pos[0]-2, pos[1]+1], [pos[0]-1, pos[1]+2], [pos[0]+1, pos[1]+2], [pos[0]+2, pos[1]+1], 
                              [pos[0]+2, pos[1]-1], [pos[0]+1, pos[1]-2], [pos[0]-1, pos[1]-2], [pos[0]-2, pos[1]-1]];
      for (var i = 0; i < possiblePositions.length; i++) {
        if (possiblePositions[i][0] === row && possiblePositions[i][1] === col) {
          console.log("Position to move (r, c): " + row + " " + col);
          return true;
        }
      }
      return false;
    }
    //--------------------------------------------------------------------------

    if (err) {
      console.log(err);
      res.json(resultado);
    } else {
      let simbolo = jugador.simbolo;
      let ren = convertirEntero(req.body.ren);
      let col = convertirEntero(req.body.col);
      if (juego.turno === simbolo) {
        var tablero = juego.getTablero();
        if (tiroValido(tablero, ren, col, simbolo)) {
          guardarCambios(tablero, ren, col, simbolo);
        } else {
          res.json(resultado);
        }
      } else {
        res.json(resultado);
      }
    }
  });
});

//------------------------------------------------------------------------------
router.put('/caballos/unir_juego/', (req, res) => {

  let resultado = { unido: false, codigo: 'id_malo', tablero: null };
  let idJuego = req.body.id_juego;
  let juego;
  let jugador;

  if (idJuego) {
    let findOne = promisify(Juego.findOne.bind(Juego));
    findOne({_id: idJuego})
    .then(arg => {
      juego = arg[0];
      if (juego.iniciado) {
        throw ABORTAR;
      } else {
        juego.iniciado = true;
        let save = promisify(juego.save.bind(juego));
        return save();
      }
    })
    .then(_ => {
      jugador = new Jugador({
        juego: juego._id,
        simbolo: constantes.SIMBOLO[1]
      });
      let save = promisify(jugador.save.bind(jugador));
      return save();
    })
    .then(_ => {
      req.session.id_jugador = jugador._id;
      resultado.unido = true;
      resultado.codigo = 'bien';
      resultado.simbolo = jugador.simbolo;
      resultado.tablero = juego.getTablero();
    })
    .catch(err => {
      if (err !== ABORTAR) {
        console.log(err);
      }
    })
    .then(_ => res.json(resultado));

  } else {
    res.json(resultado);
  }
});

//------------------------------------------------------------------------------
function contrincante(s) {
  return constantes.SIMBOLO[(s === constantes.SIMBOLO[1]) ? 0: 1];
}

//------------------------------------------------------------------------------
function obtenerJuegoJugador(req, callback) {

  let idJugador = req.session.id_jugador;
  let juego;
  let jugador;

  if (idJugador) {
    let findOne = promisify(Jugador.findOne.bind(Jugador));
    findOne({ _id: idJugador })
    .then(arg => {
      jugador = arg[0];
      let findOne = promisify(Juego.findOne.bind(Juego));
      return findOne({ _id: jugador.juego });
    })
    .then(arg => {
      juego = arg[0];
    })
    .catch(err => console.log(err))
    .then(_ => callback(null, juego, jugador));

  } else {
    callback(new Error('La sesión no contiene el ID del jugador'));
  }
}
