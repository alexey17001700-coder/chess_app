/* =========================================================
   ШАХМАТЫ — движок + ИИ (минимакс с альфа-бета) + интерфейс
   Индексация доски: 0 = a8 (верхний левый), 63 = h1.
   'P' = белая пешка, 'p' = чёрная пешка, '' = пусто.
   ========================================================= */
(function () {
  'use strict';

  var WHITE = 'w', BLACK = 'b';
  var MATE = 100000;

  var KNIGHT_D = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  var BISHOP_D = [[-1,-1],[-1,1],[1,-1],[1,1]];
  var ROOK_D   = [[-1,0],[1,0],[0,-1],[0,1]];
  var KING_D   = BISHOP_D.concat(ROOK_D);

  var GLYPH = {K:'\u2654',Q:'\u2655',R:'\u2656',B:'\u2657',N:'\u2658',P:'\u2659',
               k:'\u265A',q:'\u265B',r:'\u265C',b:'\u265D',n:'\u265E',p:'\u265F'};

  /* ---------- «живые» фигуры: объёмные SVG-силуэты (viewBox 0 0 45 45) ---------- */
  var PIECE_BASE =
    '<path d="M12.6 33.4h19.8l2.4 5.6c.4 1-.3 2.1-1.4 2.1H11.6c-1.1 0-1.8-1.1-1.4-2.1z"/>';

  var PIECE_TOP = {
    P: '<circle cx="22.5" cy="12.6" r="5.4"/>' +
       '<path d="M17.6 18.4h9.8c0 4.2-1.7 5.8-2.5 8.9l1.3 6.1H18.8l1.3-6.1c-.8-3.1-2.5-4.7-2.5-8.9z"/>',
    R: '<path d="M12 9h4.2v3.2h4.1V9h4.4v3.2h4.1V9H33v6.2l-3.2 2.6v15.6H15.2V17.8L12 15.2z"/>',
    N: '<path d="M22.6 8.2c1.4 0 2.4 1 3.4 2.4 2 2.9 4.9 4.9 6.3 8.3 1.4 3.4 1.4 6.8 1.4 10.2v4.3H14.9v-3.8c0-2.9 1.4-4.9 3.4-6.3 1.4-1 2.9-1.5 3.9-2.4-1.9 0-3.4-.5-4.4-1.5-1-1-1-2.4 0-3.4.8-.8 1.9-1 2.9-1.5-.5-1-.5-1.9 0-2.9.5-1 1.4-1.4 1.9-1.4z"/>' +
       '<circle class="eye" cx="19.4" cy="14.6" r="1.15"/>',
    B: '<circle cx="22.5" cy="6.6" r="1.9"/>' +
       '<path d="M22.5 8.4c2.4 3.4 5.8 6.8 5.8 10.7 0 3.4-2.4 5.8-5.8 5.8s-5.8-2.4-5.8-5.8c0-3.9 3.4-7.3 5.8-10.7z"/>' +
       '<path d="M16.4 25.4h12.2l1.4 8H15z"/>',
    Q: '<circle cx="22.5" cy="7.6" r="2.3"/>' +
       '<circle cx="12.4" cy="11.6" r="2"/><circle cx="32.6" cy="11.6" r="2"/>' +
       '<circle cx="17.4" cy="9.2" r="1.8"/><circle cx="27.6" cy="9.2" r="1.8"/>' +
       '<path d="M12.4 13.4 17 24.6h11l4.6-11.2-3.9 8.6-2.9-9.4-3.3 9.4-3.3-9.4-2.9 9.4z"/>' +
       '<path d="M15.4 24.6h14.2l1.6 8.8H13.8z"/>',
    K: '<path class="cross" d="M22.5 4.6v6.2M19.4 7.7h6.2"/>' +
       '<path d="M13.6 15.4c0-2.2 2.2-3.4 4.4-3.4h9c2.2 0 4.4 1.2 4.4 3.4l-2.2 9.2H15.8z"/>' +
       '<path d="M15.4 24.6h14.2l1.6 8.8H13.8z"/>'
  };

  function pieceSVG(p) {
    var t = p.toUpperCase();
    return '<svg viewBox="0 0 45 45" aria-hidden="true">' +
           PIECE_TOP[t] + PIECE_BASE + '</svg>';
  }

  /* ---------- живые фигуры: SVG-тела (viewBox 0 0 100 100) ---------- */
  var PIECE_SVG = {
    P:'<ellipse class="body line" cx="50" cy="87" rx="27" ry="7"/>' +
      '<rect class="body line" x="31" y="76" width="38" height="12" rx="6"/>' +
      '<path class="body line" d="M50 40c-9 0-16 8-16 18 0 8 5 15 12 18h8c7-3 12-10 12-18 0-10-7-18-16-18z"/>' +
      '<circle class="body line" cx="50" cy="30" r="14"/>' +
      '<circle class="eye" cx="45" cy="30" r="2.4"/><circle class="eye" cx="55" cy="30" r="2.4"/>',
    R:'<ellipse class="body line" cx="50" cy="87" rx="27" ry="7"/>' +
      '<rect class="body line" x="31" y="76" width="38" height="12" rx="6"/>' +
      '<path class="body line" d="M36 76V40h28v36z"/>' +
      '<path class="body line" d="M30 40V22h9v9h7v-9h8v9h7v-9h9v18z"/>' +
      '<circle class="eye" cx="43" cy="56" r="2.6"/><circle class="eye" cx="57" cy="56" r="2.6"/>',
    N:'<ellipse class="body line" cx="50" cy="87" rx="27" ry="7"/>' +
      '<rect class="body line" x="31" y="76" width="38" height="12" rx="6"/>' +
      '<path class="body line" d="M34 76c0-17 4-27 12-35 3-3 6-6 7-10l3-8 5 7 6 3c8 4 12 12 12 22v21z"/>' +
      '<circle class="eye" cx="58" cy="45" r="2.7"/>',
    B:'<ellipse class="body line" cx="50" cy="87" rx="27" ry="7"/>' +
      '<rect class="body line" x="31" y="76" width="38" height="12" rx="6"/>' +
      '<path class="body line" d="M50 22c-11 0-19 10-19 21 0 9 6 16 13 19h12c7-3 13-10 13-19 0-11-8-21-19-21z"/>' +
      '<circle class="body line" cx="50" cy="15" r="6"/>' +
      '<path class="line" d="M50 30v22" stroke-width="3" fill="none"/>' +
      '<circle class="eye" cx="43" cy="40" r="2.2"/><circle class="eye" cx="57" cy="40" r="2.2"/>',
    Q:'<ellipse class="body line" cx="50" cy="87" rx="27" ry="7"/>' +
      '<rect class="body line" x="31" y="76" width="38" height="12" rx="6"/>' +
      '<path class="body line" d="M50 32c-10 0-18 9-18 20 0 9 6 16 14 19h8c8-3 14-10 14-19 0-11-8-20-18-20z"/>' +
      '<path class="body line" d="M28 36l6-16 8 10 8-16 8 16 8-10 6 16z"/>' +
      '<circle class="body line" cx="50" cy="14" r="4"/>' +
      '<circle class="eye" cx="44" cy="46" r="2.2"/><circle class="eye" cx="56" cy="46" r="2.2"/>',
    K:'<ellipse class="body line" cx="50" cy="87" rx="27" ry="7"/>' +
      '<rect class="body line" x="31" y="76" width="38" height="12" rx="6"/>' +
      '<path class="body line" d="M50 36c-10 0-18 9-18 20 0 9 6 16 14 19h8c8-3 14-10 14-19 0-11-8-20-18-20z"/>' +
      '<path class="body line" d="M30 38l4-14 8 8 8-14 8 14 8-8 4 14z"/>' +
      '<path class="line" d="M50 4v12M44 10h12" stroke-width="4" fill="none"/>' +
      '<circle class="eye" cx="44" cy="50" r="2.2"/><circle class="eye" cx="56" cy="50" r="2.2"/>'
  };

  function pieceSVG(p) {
    var t = p.toUpperCase();
    return '<svg class="psvg" viewBox="0 0 100 100" aria-hidden="true">' +
           (PIECE_SVG[t] || '') + '</svg>';
  }

  var VALUE = {P:100,N:320,B:330,R:500,Q:900,K:0};

  /* ---------- таблицы позиционных оценок (для белых, индекс 0 = a8) ---------- */
  var PST = {
    P:[  0,  0,  0,  0,  0,  0,  0,  0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
         5,  5, 10, 25, 25, 10,  5,  5,
         0,  0,  0, 20, 20,  0,  0,  0,
         5, -5,-10,  0,  0,-10, -5,  5,
         5, 10, 10,-20,-20, 10, 10,  5,
         0,  0,  0,  0,  0,  0,  0,  0],
    N:[-50,-40,-30,-30,-30,-30,-40,-50,
       -40,-20,  0,  0,  0,  0,-20,-40,
       -30,  0, 10, 15, 15, 10,  0,-30,
       -30,  5, 15, 20, 20, 15,  5,-30,
       -30,  0, 15, 20, 20, 15,  0,-30,
       -30,  5, 10, 15, 15, 10,  5,-30,
       -40,-20,  0,  5,  5,  0,-20,-40,
       -50,-40,-30,-30,-30,-30,-40,-50],
    B:[-20,-10,-10,-10,-10,-10,-10,-20,
       -10,  0,  0,  0,  0,  0,  0,-10,
       -10,  0,  5, 10, 10,  5,  0,-10,
       -10,  5,  5, 10, 10,  5,  5,-10,
       -10,  0, 10, 10, 10, 10,  0,-10,
       -10, 10, 10, 10, 10, 10, 10,-10,
       -10,  5,  0,  0,  0,  0,  5,-10,
       -20,-10,-10,-10,-10,-10,-10,-20],
    R:[  0,  0,  0,  0,  0,  0,  0,  0,
         5, 10, 10, 10, 10, 10, 10,  5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
         0,  0,  0,  5,  5,  0,  0,  0],
    Q:[-20,-10,-10, -5, -5,-10,-10,-20,
       -10,  0,  0,  0,  0,  0,  0,-10,
       -10,  0,  5,  5,  5,  5,  0,-10,
        -5,  0,  5,  5,  5,  5,  0, -5,
         0,  0,  5,  5,  5,  5,  0, -5,
       -10,  5,  5,  5,  5,  5,  0,-10,
       -10,  0,  5,  0,  0,  0,  0,-10,
       -20,-10,-10, -5, -5,-10,-10,-20],
    K:[-30,-40,-40,-50,-50,-40,-40,-30,
       -30,-40,-40,-50,-50,-40,-40,-30,
       -30,-40,-40,-50,-50,-40,-40,-30,
       -30,-40,-40,-50,-50,-40,-40,-30,
       -20,-30,-30,-40,-40,-30,-30,-20,
       -10,-20,-20,-20,-20,-20,-20,-10,
        20, 20,  0,  0,  0,  0, 20, 20,
        20, 30, 10,  0,  0, 10, 30, 20],
    K_END:[-50,-40,-30,-20,-20,-30,-40,-50,
           -30,-20,-10,  0,  0,-10,-20,-30,
           -30,-10, 20, 30, 30, 20,-10,-30,
           -30,-10, 30, 40, 40, 30,-10,-30,
           -30,-10, 30, 40, 40, 30,-10,-30,
           -30,-10, 20, 30, 30, 20,-10,-30,
           -30,-30,  0,  0,  0,  0,-30,-30,
           -50,-30,-30,-30,-30,-30,-30,-50]
  };

  /* ============================ БАЗОВЫЕ УТИЛИТЫ ============================ */

  function isWhitePiece(p) { return !!p && p === p.toUpperCase(); }
  function fileOf(i) { return i & 7; }
  function rankOf(i) { return i >> 3; }
  function sqName(i) { return 'abcdefgh'[fileOf(i)] + (8 - rankOf(i)); }

  /* Ключ позиции — для правила троекратного повторения */
  function positionKey(s) {
    var c = (s.castling.wK ? 'K' : '') + (s.castling.wQ ? 'Q' : '') +
            (s.castling.bK ? 'k' : '') + (s.castling.bQ ? 'q' : '');
    return s.board.join('') + '|' + s.turn + '|' + c + '|' + s.ep;
  }

  function initialState() {
    var board = new Array(64).fill('');
    var back = ['r','n','b','q','k','b','n','r'];
    for (var c = 0; c < 8; c++) {
      board[c]      = back[c];                       // 8-я горизонталь (чёрные)
      board[8 + c]  = 'p';
      board[48 + c] = 'P';
      board[56 + c] = back[c].toUpperCase();         // 1-я горизонталь (белые)
    }
    var s = {
      board: board,
      turn: WHITE,
      castling: { wK: true, wQ: true, bK: true, bQ: true },
      ep: -1,          // поле для взятия на проходе
      halfmove: 0,
      fullmove: 1,
      moves: [],       // история ходов (для нотации)
      keys: []         // история ключей позиций (для повторения)
    };
    s.keys.push(positionKey(s));
    return s;
  }

  function cloneState(s) {
    return {
      board: s.board.slice(),
      turn: s.turn,
      castling: { wK: s.castling.wK, wQ: s.castling.wQ, bK: s.castling.bK, bQ: s.castling.bQ },
      ep: s.ep,
      halfmove: s.halfmove,
      fullmove: s.fullmove,
      moves: s.moves.slice(),
      keys: s.keys ? s.keys.slice() : []
    };
  }

  /* ============================ АТАКА / ШАХ ============================ */

  function isAttacked(b, idx, byWhite) {
    var r = rankOf(idx), c = fileOf(idx), dr, dc, nr, nc, p, k;

    // пешки
    var pr = byWhite ? r + 1 : r - 1;
    if (pr >= 0 && pr < 8) {
      for (var d = -1; d <= 1; d += 2) {
        nc = c + d;
        if (nc < 0 || nc > 7) continue;
        p = b[pr * 8 + nc];
        if (p && p === (byWhite ? 'P' : 'p')) return true;
      }
    }
    // кони
    for (k = 0; k < KNIGHT_D.length; k++) {
      nr = r + KNIGHT_D[k][0]; nc = c + KNIGHT_D[k][1];
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
      p = b[nr * 8 + nc];
      if (p && p === (byWhite ? 'N' : 'n')) return true;
    }
    // король
    for (k = 0; k < KING_D.length; k++) {
      nr = r + KING_D[k][0]; nc = c + KING_D[k][1];
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
      p = b[nr * 8 + nc];
      if (p && p === (byWhite ? 'K' : 'k')) return true;
    }
    // слон / ферзь
    var esc = byWhite ? ['B', 'Q'] : ['b', 'q'];
    for (k = 0; k < BISHOP_D.length; k++) {
      dr = BISHOP_D[k][0]; dc = BISHOP_D[k][1];
      nr = r + dr; nc = c + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        p = b[nr * 8 + nc];
        if (p) { if (p === esc[0] || p === esc[1]) return true; break; }
        nr += dr; nc += dc;
      }
    }
    // ладья / ферзь
    var rsc = byWhite ? ['R', 'Q'] : ['r', 'q'];
    for (k = 0; k < ROOK_D.length; k++) {
      dr = ROOK_D[k][0]; dc = ROOK_D[k][1];
      nr = r + dr; nc = c + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        p = b[nr * 8 + nc];
        if (p) { if (p === rsc[0] || p === rsc[1]) return true; break; }
        nr += dr; nc += dc;
      }
    }
    return false;
  }

  function inCheck(s) {
    var k = s.board.indexOf(s.turn === WHITE ? 'K' : 'k');
    if (k === -1) return false;
    return isAttacked(s.board, k, s.turn !== WHITE);
  }

  /* ============================ ГЕНЕРАЦИЯ ХОДОВ ============================ */

  function pushPawn(moves, from, to, piece, captured, promoRank) {
    if (rankOf(to) === promoRank) {
      var pr = ['Q', 'R', 'B', 'N'];
      for (var i = 0; i < pr.length; i++) {
        moves.push({ from: from, to: to, piece: piece, captured: captured, promotion: pr[i] });
      }
    } else {
      moves.push({ from: from, to: to, piece: piece, captured: captured });
    }
  }

  function genPseudo(s) {
    var moves = [];
    var b = s.board, white = s.turn === WHITE;

    for (var i = 0; i < 64; i++) {
      var p = b[i];
      if (!p) continue;
      if (isWhitePiece(p) !== white) continue;

      var t = p.toUpperCase(), r = rankOf(i), c = fileOf(i), k, nr, nc, to, tp;

      if (t === 'P') {
        var dir = white ? -1 : 1;
        var startRank = white ? 6 : 1;
        var promoRank = white ? 0 : 7;
        var one = i + dir * 8;

        if (one >= 0 && one < 64 && !b[one]) {
          pushPawn(moves, i, one, p, '', promoRank);
          var two = i + dir * 16;
          if (r === startRank && !b[two]) {
            moves.push({ from: i, to: two, piece: p, captured: '', double: true });
          }
        }
        for (k = -1; k <= 1; k += 2) {
          nc = c + k; nr = r + dir;
          if (nc < 0 || nc > 7 || nr < 0 || nr > 7) continue;
          to = nr * 8 + nc; tp = b[to];
          if (tp && isWhitePiece(tp) !== white) {
            pushPawn(moves, i, to, p, tp, promoRank);
          } else if (!tp && to === s.ep) {
            moves.push({ from: i, to: to, piece: p,
                         captured: white ? 'p' : 'P', ep: true });
          }
        }
      } else if (t === 'N' || t === 'K') {
        var dirs = (t === 'N') ? KNIGHT_D : KING_D;
        for (k = 0; k < dirs.length; k++) {
          nr = r + dirs[k][0]; nc = c + dirs[k][1];
          if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
          to = nr * 8 + nc; tp = b[to];
          if (tp && isWhitePiece(tp) === white) continue;
          moves.push({ from: i, to: to, piece: p, captured: tp || '' });
        }
      } else {
        var slides = (t === 'B') ? BISHOP_D : (t === 'R') ? ROOK_D : KING_D;
        for (k = 0; k < slides.length; k++) {
          nr = r + slides[k][0]; nc = c + slides[k][1];
          while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            to = nr * 8 + nc; tp = b[to];
            if (tp) {
              if (isWhitePiece(tp) !== white) {
                moves.push({ from: i, to: to, piece: p, captured: tp });
              }
              break;
            }
            moves.push({ from: i, to: to, piece: p, captured: '' });
            nr += slides[k][0]; nc += slides[k][1];
          }
        }
      }
    }

    /* ---------- рокировка ---------- */
    if (white) {
      if (s.castling.wK && b[60] === 'K' && b[63] === 'R' &&
          !b[61] && !b[62] &&
          !isAttacked(b, 60, false) && !isAttacked(b, 61, false) && !isAttacked(b, 62, false)) {
        moves.push({ from: 60, to: 62, piece: 'K', captured: '', castle: 'K' });
      }
      if (s.castling.wQ && b[60] === 'K' && b[56] === 'R' &&
          !b[59] && !b[58] && !b[57] &&
          !isAttacked(b, 60, false) && !isAttacked(b, 59, false) && !isAttacked(b, 58, false)) {
        moves.push({ from: 60, to: 58, piece: 'K', captured: '', castle: 'Q' });
      }
    } else {
      if (s.castling.bK && b[4] === 'k' && b[7] === 'r' &&
          !b[5] && !b[6] &&
          !isAttacked(b, 4, true) && !isAttacked(b, 5, true) && !isAttacked(b, 6, true)) {
        moves.push({ from: 4, to: 6, piece: 'k', captured: '', castle: 'K' });
      }
      if (s.castling.bQ && b[4] === 'k' && b[0] === 'r' &&
          !b[3] && !b[2] && !b[1] &&
          !isAttacked(b, 4, true) && !isAttacked(b, 3, true) && !isAttacked(b, 2, true)) {
        moves.push({ from: 4, to: 2, piece: 'k', captured: '', castle: 'Q' });
      }
    }

    return moves;
  }

  /* ============================ ПРИМЕНЕНИЕ ХОДА ============================ */

  function makeMove(s, m) {
    var n = cloneState(s);
    var b = n.board;
    var white = isWhitePiece(m.piece);
    var t = m.piece.toUpperCase();

    b[m.from] = '';

    if (m.ep) {
      b[m.to + (white ? 8 : -8)] = '';
    }

    b[m.to] = m.promotion
      ? (white ? m.promotion.toUpperCase() : m.promotion.toLowerCase())
      : m.piece;

    if (m.castle) {
      if (m.castle === 'K') {
        var rf = white ? 63 : 7, rt = white ? 61 : 5;
        b[rt] = b[rf]; b[rf] = '';
      } else {
        var rf2 = white ? 56 : 0, rt2 = white ? 59 : 3;
        b[rt2] = b[rf2]; b[rf2] = '';
      }
    }

    // права на рокировку
    if (t === 'K') {
      if (white) { n.castling.wK = false; n.castling.wQ = false; }
      else       { n.castling.bK = false; n.castling.bQ = false; }
    }
    if (m.from === 63 || m.to === 63) n.castling.wK = false;
    if (m.from === 56 || m.to === 56) n.castling.wQ = false;
    if (m.from === 7  || m.to === 7)  n.castling.bK = false;
    if (m.from === 0  || m.to === 0)  n.castling.bQ = false;

    // взятие на проходе
    n.ep = m.double ? (m.from + m.to) / 2 : -1;

    // счётчик 50 ходов
    n.halfmove = (m.captured || t === 'P') ? 0 : s.halfmove + 1;
    if (!white) n.fullmove = s.fullmove + 1;

    n.turn = white ? BLACK : WHITE;
    n.moves = s.moves.concat([m]);
    return n;
  }

  function legalMoves(s) {
    var pseudo = genPseudo(s), out = [];
    var kingChar = s.turn === WHITE ? 'K' : 'k';
    for (var i = 0; i < pseudo.length; i++) {
      var n = makeMove(s, pseudo[i]);
      var k = n.board.indexOf(kingChar);
      if (k === -1) continue;
      if (!isAttacked(n.board, k, s.turn !== WHITE)) out.push(pseudo[i]);
    }
    return out;
  }

  function movesFrom(s, idx) {
    return legalMoves(s).filter(function (m) { return m.from === idx; });
  }

  /* ============================ СТАТУС ИГРЫ ============================ */

  function insufficientMaterial(b) {
    var counts = {}, total = 0, bishops = [], knights = 0;
    for (var i = 0; i < 64; i++) {
      var p = b[i];
      if (!p) continue;
      total++;
      var t = p.toUpperCase();
      counts[t] = (counts[t] || 0) + 1;
      if (t === 'B') bishops.push(fileOf(i) + rankOf(i) % 2);
      if (t === 'N') knights++;
    }
    if (total === 2) return true;                                  // K vs K
    if (total === 3 && (counts.B === 1 || counts.N === 1)) return true; // K+B / K+N
    if (total === 4 && counts.B === 2 && bishops.length === 2 &&
        bishops[0] % 2 === bishops[1] % 2) return true;            // одноцветные слоны
    return false;
  }

  function gameStatus(s) {
    var moves = legalMoves(s);
    var checked = inCheck(s);
    if (moves.length === 0) {
      if (checked) {
        return { over: true, checkmate: true,
                 text: 'Мат! Победа ' + (s.turn === WHITE ? 'чёрных' : 'белых') };
      }
      return { over: true, checkmate: false, text: 'Пат — ничья' };
    }
    if (s.halfmove >= 100) {
      return { over: true, checkmate: false, text: 'Ничья: правило 50 ходов' };
    }
    if (insufficientMaterial(s.board)) {
      return { over: true, checkmate: false, text: 'Ничья: недостаточно материала' };
    }
    return {
      over: false, checkmate: false, check: checked,
      text: (s.turn === WHITE ? 'Ход белых' : 'Ход чёрных') + (checked ? ' — шах!' : '')
    };
  }

  /* ============================ ОЦЕНКА ПОЗИЦИИ ============================ */

  function evaluate(s) {
    var b = s.board, score = 0, i, p, t;
    var mat = 0;
    for (i = 0; i < 64; i++) {
      p = b[i]; if (!p) continue;
      t = p.toUpperCase();
      if (t === 'Q' || t === 'R') mat += VALUE[t];
    }
    var endgame = mat <= 1300;

    for (i = 0; i < 64; i++) {
      p = b[i]; if (!p) continue;
      t = p.toUpperCase();
      var table = (t === 'K') ? (endgame ? PST.K_END : PST.K) : PST[t];
      var idx = isWhitePiece(p) ? i : (i ^ 56);
      var v = VALUE[t] + table[idx];
      score += isWhitePiece(p) ? v : -v;
    }
    return score; // с точки зрения белых
  }

  function evalSide(s) {
    return (s.turn === WHITE ? 1 : -1) * evaluate(s);
  }

  /* ============================ ИИ: МИНИМАКС + АЛЬФА-БЕТА ============================ */

  function orderMoves(moves) {
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i], sc = 0;
      if (m.captured) {
        sc += 10 * VALUE[m.captured.toUpperCase()] - VALUE[m.piece.toUpperCase()];
      }
      if (m.promotion) sc += 800;
      if (m.castle) sc += 50;
      m._score = sc;
    }
    moves.sort(function (a, b) { return b._score - a._score; });
    return moves;
  }

  function quiesce(s, alpha, beta, ply, qd) {
    var stand = evalSide(s);
    if (qd <= 0) return stand;
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;

    var caps = legalMoves(s).filter(function (m) {
      return m.captured || m.promotion;
    });
    orderMoves(caps);

    for (var i = 0; i < caps.length; i++) {
      var v = -quiesce(makeMove(s, caps[i]), -beta, -alpha, ply + 1, qd - 1);
      if (v >= beta) return beta;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }

  function negamax(s, depth, alpha, beta, ply) {
    // Сначала отсекаем листья: генерация ходов на каждом листе была лишней
    // и заметно тормозила «Сложный» уровень на телефонах.
    if (depth <= 0) return quiesce(s, alpha, beta, ply, 2);
    var moves = orderMoves(legalMoves(s));
    if (moves.length === 0) {
      return inCheck(s) ? -(MATE - ply) : 0;
    }

    var best = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var v = -negamax(makeMove(s, moves[i]), depth - 1, -beta, -alpha, ply + 1);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  function bestMove(s, depth) {
    var root = orderMoves(legalMoves(s));
    if (!root.length) return null;

    var best = root[0];
    var deadline = Date.now() + 2500;   // страховка от зависания на слабых телефонах

    // Итеративное углубление: не успели — отдаём лучший ход прошлой глубины
    for (var d = 1; d <= depth; d++) {
      var bestVal = -Infinity, ties = [], aborted = false;

      for (var i = 0; i < root.length; i++) {
        var v = -negamax(makeMove(s, root[i]), d - 1, -Infinity, Infinity, 1);
        if (v > bestVal) { bestVal = v; ties = [root[i]]; }
        else if (v === bestVal) { ties.push(root[i]); }
        if (Date.now() > deadline) { aborted = true; break; }
      }

      if (aborted) break;

      // среди равных по оценке ходов выбираем случайный — партии не повторяются
      best = ties[(Math.random() * ties.length) | 0];

      // лучший ход в начало списка — ускоряет следующий проход
      var bi = root.indexOf(best);
      if (bi > 0) { root.splice(bi, 1); root.unshift(best); }

      if (bestVal >= MATE - 1000) break;  // мат найден — глубже не нужно
    }
    return best;
  }

  /* ============================ НОТАЦИЯ (SAN, упрощённая) ============================ */

  function toSAN(s, m) {
    if (m.castle) {
      var san = (m.castle === 'K') ? 'O-O' : 'O-O-O';
      return san + suffix(s, m);
    }
    var t = m.piece.toUpperCase();
    var out = '';

    if (t === 'P') {
      if (m.captured) out += 'abcdefgh'[fileOf(m.from)] + 'x';
      out += sqName(m.to);
      if (m.promotion) out += '=' + m.promotion;
    } else {
      out += t;
      // уточнение при неоднозначности
      var rivals = legalMoves(s).filter(function (x) {
        return x.to === m.to && x.from !== m.from &&
               x.piece.toUpperCase() === t && x.piece === m.piece;
      });
      if (rivals.length) {
        var sameFile = rivals.some(function (x) { return fileOf(x.from) === fileOf(m.from); });
        var sameRank = rivals.some(function (x) { return rankOf(x.from) === rankOf(m.from); });
        if (!sameFile) out += 'abcdefgh'[fileOf(m.from)];
        else if (!sameRank) out += (8 - rankOf(m.from));
        else out += sqName(m.from);
      }
      if (m.captured) out += 'x';
      out += sqName(m.to);
    }
    return out + suffix(s, m);
  }

  function suffix(s, m) {
    var n = makeMove(s, m);
    var replies = legalMoves(n);
    if (replies.length === 0) return inCheck(n) ? '#' : '';
    return inCheck(n) ? '+' : '';
  }

  /* ============================ ЭКСПОРТ ДВИЖКА ============================ */
  var Chess = {
    WHITE: WHITE, BLACK: BLACK,
    GLYPH: GLYPH,
    initialState: initialState,
    legalMoves: legalMoves,
    movesFrom: movesFrom,
    makeMove: makeMove,
    inCheck: inCheck,
    gameStatus: gameStatus,
    bestMove: bestMove,
    toSAN: toSAN,
    evaluate: evaluate,
    sqName: sqName,
    fileOf: fileOf,
    rankOf: rankOf
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Chess;
  if (typeof window !== 'undefined') window.Chess = Chess;

  /* =======================================================================
     ИНТЕРФЕЙС
     ======================================================================= */
  if (typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', function () {
    var boardEl   = document.getElementById('board');
    var statusEl  = document.getElementById('status');
    var promoEl   = document.getElementById('promo');
    var moveListEl= document.getElementById('movelist');
    var modeEl    = document.getElementById('mode');
    var levelEl   = document.getElementById('level');

    var state, stack, selected, legal, flipped, thinking, over, lastMove;

    function aiColor() {
      var mode = modeEl.value;
      if (mode === 'ai-b') return BLACK;
      if (mode === 'ai-w') return WHITE;
      return null;
    }

    function humanTurn() {
      return !thinking && !over && state.turn !== aiColor();
    }

    function reset() {
      state = Chess.initialState();
      stack = [state];
      selected = -1;
      legal = [];
      thinking = false;
      over = false;
      lastMove = null;
      flipped = (modeEl.value === 'ai-w');
      promoEl.classList.add('hidden');
      promoEl.innerHTML = '';
      render();
      maybeAiMove();
    }

    /* --------------------------- отрисовка --------------------------- */

    function render() {
      var b = state.board;
      var html = '';
      var checkIdx = -1;
      if (Chess.inCheck(state)) {
        checkIdx = b.indexOf(state.turn === WHITE ? 'K' : 'k');
      }

      for (var v = 0; v < 64; v++) {
        var idx = flipped ? 63 - v : v;
        var r = Chess.rankOf(idx), c = Chess.fileOf(idx);
        var light = (r + c) % 2 === 0;
        var cls = 'square ' + (light ? 'light' : 'dark');

        if (lastMove && (idx === lastMove.from || idx === lastMove.to)) cls += ' last';
        if (idx === selected) cls += ' sel';
        if (idx === checkIdx) cls += ' check';

        var inner = '';
        var p = b[idx];
        if (p) {
          var color = p === p.toUpperCase() ? 'white' : 'black';
          var justMoved = !!(lastMove && idx === lastMove.to);
          inner += '<span class="piece ' + color + (justMoved ? ' moved' : '') + '">' +
                   pieceSVG(p) + '</span>';
        }

        if (legal.length && idx !== selected) {
          var hit = legal.filter(function (m) { return m.to === idx; });
          if (hit.length) {
            inner += hit[0].captured || hit[0].ep ? '<span class="ring"></span>' : '<span class="dot"></span>';
          }
        }

        // координаты
        var vRow = Math.floor(v / 8), vCol = v % 8;
        if (vRow === 7) inner += '<span class="file">' + 'abcdefgh'[c] + '</span>';
        if (vCol === 0) inner += '<span class="rank">' + (8 - r) + '</span>';

        html += '<div class="' + cls + '" data-idx="' + idx + '">' + inner + '</div>';
      }

      boardEl.innerHTML = html;
      updateStatus();
      renderMoves();
    }

    function updateStatus() {
      var st = Chess.gameStatus(state);
      over = st.over;
      statusEl.classList.remove('over', 'warn');
      if (st.over) {
        statusEl.classList.add('over');
        statusEl.textContent = st.text;
      } else if (thinking) {
        statusEl.textContent = 'ИИ думает…';
      } else {
        if (st.check) statusEl.classList.add('warn');
        statusEl.textContent = st.text;
      }
    }

    function renderMoves() {
      var moves = state.moves;
      var html = '';
      for (var i = 0; i < moves.length; i += 2) {
        var num = i / 2 + 1;
        var w = moves[i] ? moves[i].san : '';
        var bl = moves[i + 1] ? moves[i + 1].san : '';
        html += '<li><span class="num">' + num + '.</span>' +
                '<span class="w">' + w + '</span>' +
                '<span class="b">' + bl + '</span></li>';
      }
      moveListEl.innerHTML = html;
      moveListEl.parentElement.scrollTop = moveListEl.parentElement.scrollHeight;
    }

    /* --------------------------- ходы --------------------------- */

    function applyMove(m) {
      var san = Chess.toSAN(state, m);
      var next = Chess.makeMove(state, m);
      next.moves[next.moves.length - 1].san = san;
      state = next;
      stack.push(state);
      lastMove = { from: m.from, to: m.to };
      selected = -1;
      legal = [];
      render();
      maybeAiMove();
    }

    function maybeAiMove() {
      var ac = aiColor();
      if (over || ac === null || state.turn !== ac) return;
      thinking = true;
      updateStatus();
      var depth = parseInt(levelEl.value, 10) || 2;
      setTimeout(function () {
        var m = Chess.bestMove(state, depth);
        thinking = false;
        if (!m) { updateStatus(); return; }
        applyMove(m);
      }, 60);
    }

    function onSquareClick(idx) {
      if (!humanTurn()) return;
      var piece = state.board[idx];

      // выбор фигуры
      if (piece && (piece === piece.toUpperCase()) === (state.turn === WHITE)) {
        selected = idx;
        legal = Chess.movesFrom(state, idx);
        render();
        return;
      }

      // ход на выбранное поле
      if (selected >= 0 && legal.length) {
        var candidates = legal.filter(function (m) { return m.to === idx; });
        if (candidates.length === 0) {
          selected = -1; legal = []; render(); return;
        }
        if (candidates[0].promotion) {
          askPromotion(candidates);
          return;
        }
        applyMove(candidates[0]);
        return;
      }

      selected = -1; legal = []; render();
    }

    function askPromotion(candidates) {
      promoEl.innerHTML = '<div class="promo-title">Выберите фигуру</div><div class="promo-row"></div>';
      var row = promoEl.querySelector('.promo-row');
      ['Q', 'R', 'B', 'N'].forEach(function (pr) {
        var bt = document.createElement('button');
        var white = candidates[0].piece === candidates[0].piece.toUpperCase();
        bt.textContent = Chess.GLYPH[white ? pr : pr.toLowerCase()];
        bt.addEventListener('click', function () {
          var m = candidates.filter(function (x) { return x.promotion === pr; })[0];
          promoEl.classList.add('hidden');
          promoEl.innerHTML = '';
          applyMove(m);
        });
        row.appendChild(bt);
      });
      promoEl.classList.remove('hidden');
    }

    function undo() {
      if (thinking) return;
      var ac = aiColor();
      if (stack.length <= 1) return;
      stack.pop();
      // в игре с ИИ откатываем до того состояния, где ход снова у человека
      if (ac !== null) {
        while (stack.length > 1 && stack[stack.length - 1].turn === ac) {
          stack.pop();
        }
      }
      state = stack[stack.length - 1];
      over = false;
      selected = -1;
      legal = [];
      lastMove = state.moves.length
        ? { from: state.moves[state.moves.length - 1].from, to: state.moves[state.moves.length - 1].to }
        : null;
      render();
    }

    /* --------------------------- события --------------------------- */

    boardEl.addEventListener('click', function (e) {
      var cell = e.target.closest('.square');
      if (!cell) return;
      onSquareClick(parseInt(cell.getAttribute('data-idx'), 10));
    });

    document.getElementById('new').addEventListener('click', reset);
    document.getElementById('undo').addEventListener('click', undo);
    document.getElementById('flip').addEventListener('click', function () {
      flipped = !flipped;
      render();
    });
    modeEl.addEventListener('change', reset);

    reset();
  });
})();