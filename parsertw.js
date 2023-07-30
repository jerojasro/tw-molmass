/*\
title: $:/plugins/jerojasro/molecularmass/macros.js
type: application/javascript
module-type: macro

Macro to calculate the molecular mass of a compound given its molecular formula

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.name = "molmass";

exports.params = [
    {name: 'formula', 'default': undefined},
    {name: 'verbose', 'default': 'no'}
];

class DataInputError extends Error {
    constructor(message) {
        super(message);
        this.name = "DATA_INPUT_ERROR";
        this.message = message;
    };
};

// taken from https://www.degruyter.com/document/doi/10.1515/pac-2019-0603/html?lang=en
const atomMasses = {
    H:    1.0080,
    He:   4.0026,
    Li:   6.94,
    Be:   9.0122,
    B:   10.81,
    C:   12.011,
    N:   14.007,
    O:   15.999,
    F:   18.998,
    Ne:  20.18,
    Na:  22.99,
    Mg:  24.305,
    Al:  26.982,
    Si:  28.085,
    P:   30.974,
    S:   32.06,
    Cl:  35.45,
    Ar:  39.95,
    K:   39.098,
    Ca:  40.078,
    Sc:  44.956,
    Ti:  47.867,
    V:   50.942,
    Cr:  51.996,
    Mn:  54.938,
    Fe:  55.845,
    Co:  58.933,
    Ni:  58.693,
    Cu:  63.546,
    Zn:  65.38,
    Ga:  69.723,
    Ge:  72.63,
    As:  74.922,
    Se:  78.971,
    Br:  79.904,
    Kr:  83.798,
    Rb:  85.468,
    Sr:  87.62,
    Y:   88.906,
    Zr:  91.224,
    Nb:  92.906,
    Mo:  95.95,
    Tc:  96.90636,
    Ru: 101.07,
    Rh: 102.91,
    Pd: 106.42,
    Ag: 107.87,
    Cd: 112.41,
    In: 114.82,
    Sn: 118.71,
    Sb: 121.76,
    Te: 127.6,
    I:  126.9,
    Xe: 131.29,
    Cs: 132.91,
    Ba: 137.33,
    La: 138.91,
    Ce: 140.12,
    Pr: 140.91,
    Nd: 144.24,
    Pm: 144.91276,
    Sm: 150.36,
    Eu: 151.96,
    Gd: 157.25,
    Tb: 158.93,
    Dy: 162.5,
    Ho: 164.93,
    Er: 167.26,
    Tm: 168.93,
    Yb: 173.05,
    Lu: 174.97,
    Hf: 178.49,
    Ta: 180.95,
    W:  183.84,
    Re: 186.21,
    Os: 190.23,
    Ir: 192.22,
    Pt: 195.08,
    Au: 196.97,
    Hg: 200.59,
    Tl: 204.38,
    Pb: 207.2,
    Bi: 208.98,
    Po: 208.98243,
    At: 209.98715,
    Rn: 209.98969,
    Fr: 211.99623,
    Ra: 226.02541,
    Ac: 227.02775,
    Th: 232.04,
    Pa: 231.04,
    U: 238.03,
    Np: 237.04817,
    Pu: 244.06420,
    Am: 243.06138,
    Cm: 247.07035,
    Bk: 247.07031,
    Cf: 251.07959,
    Es: 252.08298,
    Fm: 257.09511,
    Md: 258.09843,
    No: 259.10100,
    Lr: 262.10962,
    Rf: 267.12179,
    Db: 268.12567,
    Sg: 269.12850,
    Bh: 270.13337,
    Hs: 269.13365,
    Mt: 277.15353,
    Ds: 281.16455,
    Rg: 282.16934,
    Cn: 285.17723,
    Nh: 285.18011,
    Fl: 289.19052,
    Mc: 288.19288,
    Lv: 291.20101,
    Ts: 294.21084,
    Og: 294.21398
};

function isDigit(c) {
    // preconditions: c is a string
    if (typeof(c) !== "string") {
        throw new TypeError('not a string, but a ' + typeof(c));
    };
    // preconditions: c has length 1
    if (c.length != 1) {
        throw new TypeError('should only get a single character, got ' + c.length);
    };

    const COD_0 = '0'.charCodeAt(0);
    const COD_9 = '9'.charCodeAt(0);

    const ccode = c.charCodeAt(0);
    if (ccode < COD_0 || ccode > COD_9) {
        return false;
    };
    return true;
};

function isAsciiLower(c) {
    // preconditions: c is a string
    if (typeof(c) !== "string") {
        throw new TypeError('not a string, but a ' + typeof(c));
    };
    // preconditions: c has length 1
    if (c.length != 1) {
        throw new TypeError('should only get a single character, got ' + c.length);
    };

    return c.charCodeAt(0) >= 97 && c.charCodeAt(0) <= 122;
};

function isAsciiUpper(c) {
    // preconditions: c is a string
    if (typeof(c) !== "string") {
        throw new TypeError('not a string, but a ' + typeof(c));
    };
    // preconditions: c has length 1
    if (c.length != 1) {
        throw new TypeError('should only get a single character, got ' + c.length);
    };

    return c.charCodeAt(0) >= 65 && c.charCodeAt(0) <= 90;
};

// fs: an string that
//
//   * has at least 1 char
//   * starts with A-Z
//
// returns: The symbol for an element in the periodic table; it's a string of
//          length [1, 2]
//
function extractElement(fs) {
    // preconditions: fs is a string
    if (typeof(fs) !== "string") {
        throw new TypeError('not a string, but a ' + typeof(fs));
    };
    // preconditions: fs has length >= 1
    if (fs.length < 1) {
        throw new TypeError('should have at least 1 char, but got empty string');
    };

    // preconditions: fs starts with an uppercase ASCII character
    if (!isAsciiUpper(fs[0])) {
        throw new TypeError('should have received an uppercase letter, got ' + fs[0]);
    };

    if (fs.length == 1) {
        return fs;
    };

    const currChar = fs[0];
    const nextChar = fs[1];

    if (isDigit(nextChar)) {
        return currChar;
    };

    if (isAsciiLower(nextChar)) {
        return currChar + nextChar;
    };
    return currChar;
};

// returns: a list of two items:
//
//   * first item: how many characters it "consumed" from the input string
//   * second item: the integer value (count) extracted from the string
//
// if there were no digits at the start of fs, the function will return [0, 1]:
// zero characters consumed, and count=1
function extractCount(fs) {
    // preconditions: fs is a string
    if (typeof(fs) !== "string") {
        throw new TypeError('not a string, but a ' + typeof(fs));
    };

    var digits = "";
    const COD_0 = '0'.charCodeAt(0);
    const COD_9 = '9'.charCodeAt(0);
    for (var i = 0; i < fs.length; i++) {
        const ccode = fs.charCodeAt(i);
        if (ccode < COD_0 || ccode > COD_9) {
            break;
        };
        digits += fs[i];
    };

    if (digits.length == 0) {
        return [0, 1];
    };

    return [i, parseInt(digits, 10)];
};

// fs starts with some sort of paren: [({
//
// returns: a 2-item list:
//
//   * first item: how many characters it consumed from fs
//   * second item: an array of ElementCounts, (it's the same signature as
//     returned by parseFormula)
function parseSubFormula(fs) {
    // preconditions: fs is a string
    if (typeof(fs) !== "string") {
        throw new TypeError('not a string, but a ' + typeof(fs));
    };

    // preconditions: fs has length >= 1
    if (fs.length < 1) {
        throw new TypeError('should have at least 1 char, but got empty string');
    };

    const parens = {'{': '}', '[': ']', '(': ')'};

    const left = fs[0];
    // preconditions: fs starts with an opening parentheses: ({[
    if (!(left in parens)) {
        throw new TypeError('string should start with paren, starts instead with ' + left);
    };

    const right = parens[left];
    var openParens = 0;
    var lastIdx = 0;

    for (var i = 0; i < fs.length; i++) {
        if (fs[i] == left) {
            openParens = openParens + 1;
        } else if (fs[i] == right) {
            openParens = openParens - 1;
        };

        if (openParens == 0) {
            lastIdx = i;
            break;
        };
    };

    if (openParens != 0) {
        throw new DataInputError('Unbalanced parens');
    };

    const subFormulaStr = fs.substring(1, lastIdx);

    const subFormula = parseFormula(subFormulaStr, []);
    return [lastIdx + 1, subFormula];
};

// fs starts with either:
//
// * an Element (One uppercase and optionally one lowercase char)
// * a parenthesis: ([{
//
function parseFormula(fs, elems) {
    if (fs.length == 0) {
        return elems;
    }

    // TODO check whether all characters are alphanumeric, ASCII only

    const parens = {'{': '}', '[': ']', '(': ')'};

    var elemOrPolyElem, consumedChars;
    var rv;
    if (fs[0] in parens) {
        [consumedChars, elemOrPolyElem] = parseSubFormula(fs);
    } else if (isAsciiUpper(fs[0])) {
        elemOrPolyElem = extractElement(fs);
        consumedChars = elemOrPolyElem.length;
    } else {
        throw new DataInputError('Invalid character: ' + fs[0]);
    };

    fs = fs.substring(consumedChars);

    const [charsConsumed, value] = extractCount(fs);
    fs = fs.substring(charsConsumed);

    elems.push({element: elemOrPolyElem, count: value});
    return parseFormula(fs, elems);
};

function molecularMass(formula) {

    var atomCount = {};

    for (const elemOrIonPart of formula) {
        var atoms = [];
        if (Array.isArray(elemOrIonPart.element)) {
            const [_, ionAtoms] = molecularMass(elemOrIonPart.element);
            for (const elem in ionAtoms) {
                atoms.push({element: elem, count: ionAtoms[elem]['count'] * elemOrIonPart.count});
            }
        } else {
            atoms.push(elemOrIonPart);
        };

        for (const elem of atoms) {
            if (!(elem.element in atomCount)) {
                atomCount[elem.element] = elem.count;
            } else {
                atomCount[elem.element] = atomCount[elem.element] + elem.count;
            };
        };
    };

    var totalMass = 0;
    for (const [k, v] of Object.entries(atomCount)) {
        if (!(k in atomMasses)) {
            throw new DataInputError('Unknown element: ' + k);
        };
        atomCount[k] = {
            count: v,
            totalMass: v * atomMasses[k],
            atomMass: atomMasses[k]
        };
        totalMass = totalMass + v * atomMasses[k];
    };
    for (const k in atomCount) {
        atomCount[k]['percentMass'] = 100 * atomCount[k]['totalMass'] / totalMass;
    };
    return [totalMass, atomCount];
};

function formula2HTML(parsedFormula) {
    var tokens = [];
    for (const formItem of parsedFormula) {
        if (!Array.isArray(formItem.element)) {
            tokens.push(formItem.element);
        } else {
            tokens.push("(");
            tokens.push(formula2HTML(formItem.element));
            tokens.push(")");
        };

        if (formItem.count > 1) {
            tokens.push("<sub>" + formItem.count + "</sub>");
        };
    };
    return tokens.join('');
};

function asTable(formula, perElemMass, totalMass) {
    var rv = "<table>";
    rv = rv + "<tr>";
    rv = rv + "<th colspan='5'>" + formula + "</th>";
    rv = rv + "</tr>";
    rv = rv + "<tr>";
    rv = rv + "<th>Atom</th>";
    rv = rv + "<th>#</th>";
    rv = rv + "<th>Atom Mass</th>";
    rv = rv + "<th>Mass (g)</th>";
    rv = rv + "<th>Mass %</th>";
    rv = rv + "</tr>";
    for (const [elem, elemData] of Object.entries(perElemMass)) {
        rv = rv + "<tr>";
        rv = rv + "<td>" + elem + "</td>";
        rv = rv + "<td>" + elemData.count + "</td>";
        rv = rv + "<td>" + elemData.atomMass + "</td>";
        rv = rv + "<td>" + elemData.totalMass.toFixed(3) + "</td>";
        rv = rv + "<td>" + elemData.percentMass.toFixed(3) + "%</td>";
        rv = rv + "</tr>";
    };
    rv = rv + "<tr>";
    rv = rv + "<th colspan='3'>Total Mass</th>";
    rv = rv + "<th>" + totalMass.toFixed(3) + "</th>";
    rv = rv + "<th>100%</th>";
    rv = rv + "</tr>";
    rv = rv + "</table>";

    return rv;
};

exports.run = function (formula, verbose) {
    let parsedFormula, totalMass, perElemMass;
    let errorMessage = "";

    // let's do some minimal preprocessing to the received text: remove any sort of whitespace
    //
    // about the regexp: \s is equivalent to
    // [\f\n\r\t\v\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]
    // as per
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Character_classes
    let whitespaceRegexp = /\s+/g;
    try {
        formula = formula.replace(whitespaceRegexp, "");
        parsedFormula = parseFormula(formula, []);
        [totalMass, perElemMass] = molecularMass(parsedFormula);
    } catch (error) {

        // intended error handling: if we are not in verbose mode, just return
        // zero and carry on, since we are likely in the middle of some
        // arithmetic operation
        //
        // if we are in verbose mode, return as output the error message; if
        // the error was caused by a violation of defined preconditions in any
        // function (expressed as raising TypeError), or by any other kind of
        // exception, then let the user know that it's not their fault, but
        // yours truly the programmer's, by prefixing the message with 'BUG IN
        // PLUGIN'

        totalMass = 0;
        errorMessage = error.message;

        if (!(error instanceof DataInputError)) {
            // programmer error
            errorMessage = "BUG IN PLUGIN: " + errorMessage;
        };
    };

    if (verbose != "yes") {
        return totalMass;
    };

    if (errorMessage == "") {
        const prettyFormula = formula2HTML(parsedFormula);
        return asTable(prettyFormula, perElemMass, totalMass);
    };

    return $tw.utils.htmlEncode(errorMessage);
};

})();
