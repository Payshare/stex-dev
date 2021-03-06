module.exports = function() {
  
  var stexDev = require("../index.js");
  var plugins = stexDev.gulpPlugins();
  var paths   = stexDev.paths;
  var gulp    = require("gulp");

  gulp.on('stop', shutdown);
  gulp.on('err', shutdown);

  addAppTasks();
  addTestTasks();
  addDbTasks();

  gulp.task('docs', function() {
    return gulp.src(paths.docs)
      .pipe(plugins.jsdoc.parser({}))
      .pipe(plugins.jsdoc.generator('./docs'));
  });

  gulp.task('watch', function() {
    gulp.run('test');
    gulp.watch(paths.watch, ['test']);
    gulp.watch(paths.docs,  ['docs']);
  });

  return gulp;

  function addAppTasks() {
    gulp.task('app', function(next) {
      var stex = require(paths.root + "/lib/app");
      stex.init().then(function() {
        stex.activate();
        next();
      })
    });
  }

  function addTestTasks() {
    gulp.task('lint', function () {
      return gulp.src(paths.lint)
        .pipe(plugins.jshint('.jshintrc'))
        // .pipe(plugins.jscs())
        .pipe(plugins.jshint.reporter('jshint-stylish'));
    });


    gulp.task('mocha', function(cb) {
      return gulp
        .src(paths.tests, {"cwd": paths.root})
        .pipe(plugins.spawnMocha({
          'reporter' : 'list', 
          'env'      : {'NODE_ENV': 'test'}
        }));
    });
  }

  function addDbTasks() {
    gulp.task('db:ensure-created', ['app'], function() {
      var Knex       = stex.constructor.Knex;
      var dbConfig   = conf.get("db");
      var dbToCreate = dbConfig.connection.database;

      // create a connection to the db without specifying the db
      delete dbConfig.connection.database;
      var db = Knex.initialize(dbConfig);

      return db.raw("CREATE DATABASE IF NOT EXISTS `" + dbToCreate + "`")
        .then(function() { /* noop */ })
        .finally(function(){
          db.client.pool.destroy(); 
        });
    });

    gulp.task('db:migrate', function(next) {
      var join  = require('path').join;
      var spawn = require('child_process').spawn;
      var bin   = join(require.resolve('stex'), "..", "bin", "stex");
      
      var proc = spawn(bin, ["db-migrate", "up"], { stdio: 'inherit' });
      proc.on('close', function (code) {
        if(code === 0) {
          next();
        } else {
          next(new Error("Process failed: " + code));
        }
      });
    });
  }


  function shutdown() {
    if(typeof stex !== 'undefined') {
      stex.shutdown();
    }
  };
};
