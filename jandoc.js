/*
 * Expose the Jandoc API to JavaScript
 */

var fs = require('fs-extra'),
    path = require('path'),
    procedure = require('./lib/procedure'),
    argParse  = require('./lib/argparser').parse,
    cmdLine   = require('child_process').exec;

var jandocOptions = (fs.readJSONSync(path.join(__dirname, './options.json'))).options;

/*
 * Trim extraneous whitespace from strings.
 */
function trim(str) {
  return str.replace(/^\s+/, '').replace(/\s+$/, '');
}

/*
 * Shortcut for the hasOwnProperty check in for...in loops.
 */
function has(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

/*
 * Converts an option key like 'baseHeaderLevel'
 * into a bash flag like '--base-header-level'.
 */
function bashifyKey(key) {
  var i, len = key.length, builder = '--', caps = /[A-Z]/;
  for (i = 0; i < len; i += 1) {
    if (caps.test(key[i])) {
      builder += ('-' + key[i].toLowerCase());
    } else {
      builder += key[i];
    }
  }
  return builder;
}

/*
 * Pass an object to the jandoc function and each
 * key will represent a command line flag.
 *
 * Options: see `./options.json`
 */
function buildArgString(options) {
  var argString = '', key, type, val, i;
  for (key in options) {
    if (has(options, key)) {
      val = options[key];
      type = typeof val;
      
      /*
       * Input and output are outliers because
       * we've modified them.  Deal with those
       * specifically.
       */
      if (key === 'input') {
        argString += (' -d \"' + val + '\"');
      } else if (key === 'output') {
        argString += (' -o \"' + val + '\"');
      } else {
        
        /*
         * Procedure to deal with boolean options and
         * non-object options.
         */
        if (type === 'boolean') {
          argString += (' ' + bashifyKey(key));
        } else if (type !== 'object') {
          argString += (' ' + bashifyKey(key) + ' \"' + val + '\"');
        } else {
          
          /*
           * The variable option is an object.  Deal with
           * it as such.
           */
          if (key === 'variable') {
            for (i in val) {
              if (has(val, i)) {
                argString += (' --variable \"' + i + '\"=\"' + val[i] + '\"');
              }
            }
          
          /*
           * The epubEmbedFont variable is an array.  Deal
           * with it as such.
           */
          } else if (key === 'epubEmbedFont') {
            for (i = 0; i < val.length; i += 1) {
              argString += (' --epub-embed-font \"' + val[i] + '\"');
            }
          }
        }
      }
    }
  }
  
  /*
   * Cut off extraneous whitespace and return the argument string.
   */
  return trim(argString);
}

/*
 * Define a function that initializes the jandoc
 * functionality with a command line string.
 */
function callCommand(str, callback) {
  var cleanArgs = trim(str).split(/\s+/g), // turns args into an array
      args      = argParse(cleanArgs, [    // put args into a symlinked object
        ['-v', '--version'],
        ['-h', '--help'],
        ['-d', '--input-data'],
        ['-o', '--output-location'],
        ['-t', '-w', '--to', '--write'],
        ['-f', '-r', '--from', '--read']
      ]);
  
  if (callback) {
    pandoc = procedure(cleanArgs, args, callback || null);  // initialize with both items
  }
}

/*
 * Define a function that converts an options
 * object into a command line string and passes
 * that string to callCommand.
 *
 * We'll call it the jandoc function and expose
 * it to the user.
 */
function jandoc(options, callback) {
  var argString = buildArgString(options);
  callCommand(argString, callback);
}

/* (also make a sync version)
 */
jandoc.sync = function (options) {
  var argString = buildArgString(options);
  callCommand(argString);
}

/*
 * Allow the user to access the command line
 * version through jandoc.cmd.
 */
jandoc.cmd = function (str, callback) {
  callCommand(str, callback);
}

/* (also make a sync version)
 */
jandoc.cmdSync = callCommand;

/*
 * Expose the jandoc function.
 */
module.exports = (function () {

  /*
   * When the module gets required, do an asynchronous check to see if
   * Pandoc exists on the system.
   */
  cmdLine('pandoc -v', function (err, stdout) {
    
    /*
     * If 'which pandoc' throws an error, die.
     */
    if (err || !stdout) {
      console.error('ERROR: Could not find Pandoc on your system.\n       Please make sure Haskell and Pandoc are installed before running Jandoc.');
      process.exit(1);
    }
  });

  /*
   * Ignore the Pandoc check and return the jandoc function.  This way,
   * if Pandoc does exist, the user won't get held up by the check.  If
   * it doesn't, you'll get an error at some point.
   */
  
  // - attach options
  jandoc.OPTIONS = jandocOptions;
  return jandoc;

}());

