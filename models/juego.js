

'use strict';

var mongoose = require('mongoose');
var constantes = require('./constantes.js');

//-------------------------------------------------------------------------------
var esquemaJuego = mongoose.Schema({
  nombre:   String,
  renglones: Number,
  columnas: Number,
  iniciado: { type: Boolean,
              default: false },
  turno:    { type: String, default:
              constantes.SIMBOLO[0] },
  // tablero:  { type: String, // Sustituir esto por código para crear tablero n * m
  //             default: JSON.stringify(constantes.TABLERO_EN_BLANCO) }
  tablero: String
});

//-------------------------------------------------------------------------------
esquemaJuego.methods.getTablero = function () {
  //return JSON.parse(this.tablero);
  return convertStringToBoard(this.tablero);
};

//-------------------------------------------------------------------------------
esquemaJuego.methods.setTablero = function (tablero) {
  //this.tablero = JSON.stringify(tablero);
  this.tablero = convertBoardToString(tablero);
};

//-------------------------------------------------------------------------------
module.exports = mongoose.model('Juego', esquemaJuego);

//-------------------------------------------------------------------------------
function convertBoardToString (board) {
  /* Converts a board (array) into a string, for storing in MongoDB.
     Number of rows and collumns stored at the end as two numbers.*/
  var boardString = '';
  let rows = board.length;
  let collumns = board[0].length;
  for (var i = 0; i < rows; i++) {
    for (var j = 0; j < collumns; j++) {
      boardString += board[i][j] + ',';
    }
  }
  boardString += rows + ',' + collumns;
  return boardString;
}

//-------------------------------------------------------------------------------
function convertStringToBoard (string) {
  /* Takes a string that contains a board and converts it into an array. */
  string = string.split(',');
  let rows = parseInt(string[string.length-2]);
  let collumns = parseInt(string[string.length-1]);
  var boardArray = [rows];
  var count = 0;
  for (var i = 0; i < rows; i++) {
    boardArray[i] = new Array(collumns);
    for (var j = 0; j < collumns; j++) {
      boardArray[i][j] = string[count];
      count++;
    }
  }
  return boardArray;
}