require('es6-promise').polyfill();


var gulp    = require('gulp'),
    plugins = require('gulp-load-plugins')(),// All the devDependencies from package.json.
    config  =
    {
        // Paths variables.
        src : './src',// Dev.
        dest: './dist'// Distribution.
    }


gulp
    // INDIVIDUAL TASKS.
    .task('css', function()
    {
        return gulp.src(config.src + '/css/main.scss')
                   .pipe(plugins.sass())
                   .pipe(plugins.cssbeautify())
                   .pipe(plugins.autoprefixer())
                   .pipe(gulp.dest(config.dest + '/css/'));
    })
    .task('minify', function()
    {
        return gulp.src(config.dest + '/css/*.css')
                   .pipe(plugins.csso())
                   .pipe(plugins.rename({suffix: '.min'}))
                   .pipe(gulp.dest(config.dest + '/css/'))
                   .pipe(plugins.notify({message: 'Minify task complete'}));
    })


    // SHORTCUT TASKS: BUILD, DEV, PROD, DEFAULT.
    .task('build', ['css'])
    .task('dev', ['build', 'watch'])
    .task('prod', ['build', 'minify'])
    .task('default', ['dev'])// Run when typing 'gulp' (only) in console.

    // WATCH.
    .task('watch', function()
    {
        // Work only with cygwin.
        gulp.watch(config.src + '/css/*.scss', ['build']);
        // Trying things for windows bash...
        // gulp.watch('/css/main.scss', {cwd: config.src}, ['build']});
    });
