var gulp    = require('gulp'),
    // All the devDependencies from package.json.
    plugins = require('gulp-load-plugins')(
    {
        pattern: ['gulp-*', 'gulp.*', 'main-bower-files', 'browser-sync'],
        replaceString: /\bgulp[\-.]/
    }),
    config  =
    {
        // Paths variables.
        src : './src',// Dev.
        dest: './dist',// Distribution.
        bowerDir: './bower_components' 
    };

gulp
    // INDIVIDUAL TASKS.
    //=======================================================================================//

    // Create bower directory and populate with bower.json dependencies.
    .task('create-bower', function()
    { 
        return plugins.bower().pipe(gulp.dest(config.bowerDir)) ;
    })
    
    // Php and html.
    .task('php', function()
    {
        gulp.src(config.src + '/**/*.+(php|html)')
            .pipe(gulp.dest(config.dest));
        console.log('Php files copied.');
    })

    // Css.
    .task('sass', function()
    {
        gulp.src(config.src + '/css/*.scss')
            .pipe(plugins.sass(
            {
                 // style: 'compressed',
                 /*loadPath:
                [
                     './resources/sass',
                     config.bowerDir + '/bootstrap-sass-official/assets/stylesheets',
                     config.bowerDir + '/fontawesome/scss'
                 ]*/
             }))
            .pipe(plugins.cssbeautify())
            .pipe(plugins.autoprefixer())
            .pipe(gulp.dest(config.dest + '/css/'))
            .pipe(plugins.browserSync.reload({stream: true}));

        console.log('Css compiling task completed.');
    })

    .task('minify-css', function()
    {
        gulp.src(config.dest + '/css/*.css')
            .pipe(plugins.uglify())
            .pipe(plugins.rename({suffix: '.min'}))
            .pipe(gulp.dest(config.dest + '/css/'));
        console.log('Css minifying task completed.');
    })

    // Js.
    .task('js', function()
    {
        gulp.src(config.src + '/js/*.js')
               .pipe(gulp.dest(config.dest + '/js/'));
        console.log('JS files copied.');
    })

    .task('minify-js', function()
    {
        gulp.src(config.dest + '/js/*.js')
            .pipe(plugins.rename({suffix: '.min'}))
            .pipe(gulp.dest(config.dest + '/js/'));
        console.log('JS minifying task completed.');
    })

    // Concatenates all the JS and the bower js libs.
    .task('merge-js', function() {

        var jsFiles = [config.src + '/js/*'];

        gulp.src(plugins.mainBowerFiles().concat(jsFiles))
            .pipe(plugins.filter('**/*.js'))
            .pipe(plugins.concat('main.js'))// Concat all the files into main.js.
            .pipe(plugins.rename({suffix: '.min'}))
            .pipe(plugins.uglify())
            .pipe(gulp.dest(config.dest + '/js/'));
    })


    // WATCH.
    //=======================================================================================//
    .task('watch', ['browserSync', 'sass'], function()
    {
        // Doesn't work on windows bash but works on cygwin or macOS.
        gulp.watch(config.src + '/css/*.scss', ['sass']);
        // Trying things for windows bash...
        // gulp.watch('/css/main.scss', {cwd: config.src}, ['build']});
        console.log('Watching files: ' + config.src + '/css/*.scss');
    })


    // BROWSER SYNC.
    //=======================================================================================//
    .task('sync', function()
    {
        plugins.browserSync.init
        ({
            server: {baseDir: config.src}
        })
    })

    // SHORTCUT TASKS: BUILD, DEV, PROD, DEFAULT.
    //=======================================================================================//
    .task('build', ['sass', 'php', 'js'])
    .task('dev', ['build', 'watch'])
    .task('prod', ['build', 'minify-css', 'minify-js'])
    .task('default', ['dev']);// Run when typing 'gulp' (only) in console.
