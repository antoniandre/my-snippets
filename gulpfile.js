/**
 * Use in terminal
 * ---------------
 *
 * gulp create-bower
 * gulp dev
 */

// useful plugins:
// gulp-load-plugins: just avoiding requiring all plugins 1 by 1.
// browser-sync: watch files and reinject up to date content in browser.
// gulp-autoprefixer: add the vendor browsers prefixes in css.
// gulp-bower: create the bower dir populated with all deps writen in bower.json
// gulp-concat: concat multiple streams into one file.
// gulp-cssbeautify
// gulp-csso: minify css.
// gulp-filter: start from a large set of files then filter the stream to apply some specific actions on specific files.
// gulp-replace-task: modify html content with search/replace patterns.
// gulp-if: like gulp filter, perform an action if a file name from the current stream matches a sub pattern.
// gulp-include: include a file within another in just one directive. Very good.
// gulp-rename: rename a file after outputing. E.g. main.js -> main.min.js.
// gulp-sass
// gulp-uglify: minify js only.
// main-bower-files: get the main file of each dep present in bower.json. Then create an array of main bower files paths to give to gulp.src().
// merge2: merge 2 streams.
// Hack for Ubuntu on Windows: interface enumeration fails with EINVAL, so return empty.
try {
  require('os').networkInterfaces();
} catch (e) {
  require('os').networkInterfaces = () => ({});
}

var gulp    = require('gulp'),
    // All the devDependencies from package.json.
    plugins = require('gulp-load-plugins')(
    {
        pattern: ['*'],
        replaceString: /\bgulp[\-.]/
    }),
    config  =
    {
        // Paths variables.
        src : './src',// Dev.
        dest: './dist',// Distribution.
        bowerDir: './bower_components'
    },
    bowerFiles,
    dev = true,
    bs = plugins.browserSync.create();

gulp
    // INDIVIDUAL TASKS.
    //=======================================================================================//

    // Create bower directory and populate with bower.json dependencies.
    .task('create-bower', function()
    {
        return plugins.bower().pipe(gulp.dest(config.bowerDir));
        console.log('OK - Bower folder generated.');
    })

    // Php and html.
    .task('php', function()
    {
        gulp
            .src(
            [
                // All except templates as they are changed just bellow.
                config.src + '/**/*.+(php|html|json)', '!' + config.src + '/templates/*.html',
                config.src + '/**/.htaccess'
            ])
            .pipe(gulp.dest(config.dest));

        gulp.src(config.src + '/templates/*.html')
            .pipe(plugins.replaceTask(
            {
                patterns:
                [{
                    match: /\{\{gulp:min\}\}/g,
                    replacement: dev ? '' : '.min'
                }]
            }))
            .pipe(gulp.dest(config.dest + '/templates/'))
            .pipe(bs.reload({stream: true}));

        console.log('OK - PHP / HTML files copied.');
    })

   .task('css', function()
    {
        gulp.src([config.src + '/css/*.+(scss|css)', '!' + config.src + '/css/inc.*.+(scss|css)'])
        .pipe(
            plugins.include(
            {
                extensions: "css",
                includePaths: [config.src + "/css", config.bowerDir]
            })
        )
        .pipe(plugins.sass())
        .pipe(plugins.autoprefixer())
        .pipe(plugins.cssbeautify())
        .pipe(gulp.dest(config.dest + '/css/'))
        .pipe(bs.reload({stream: true}));

        console.log('OK - SCSS/CSS compiling task completed.');
    })
    .task('css-min', function()
    {
        gulp.src([config.src + '/css/*.+(scss|css)', '!' + config.src + '/css/inc.*.+(scss|css)'])
        .pipe(
            plugins.include(
            {
                extensions: "css",
                includePaths: [config.src + "/css", config.bowerDir]
            })
        )
        .pipe(plugins.sass())
        .pipe(plugins.autoprefixer())
        .pipe(plugins.csso())
        .pipe(plugins.rename({suffix: '.min'}))
        .pipe(gulp.dest(config.dest + '/css/'))
        .pipe(bs.reload({stream: true}));

        console.log('OK - CSS minifying task completed.');
    })

    // Js.
    .task('js', function()
    {
        gulp.src([config.src + '/js/*.js', '!' + config.src + '/js/inc.*.js'])
        .pipe(
            plugins.include(
            {
                extensions: "js",
                includePaths: [config.bowerDir, config.src + "/js"]
            })
        )
        .pipe(gulp.dest(config.dest + '/js'))
        .pipe(bs.reload({stream: true}));

        console.log('OK - JS files copied.');
    })
    // Concatenates all the JS and the bower js libs.
    .task('js-min', function()
    {
        gulp.src([config.src + '/js/*.js', '!' + config.src + '/js/inc.*.js'])
        .pipe(
            plugins.include(
            {
                extensions: "js",
                includePaths: [config.bowerDir, config.src + "/js"]
            })
        )
        .on('error', console.log)
        .pipe(plugins.uglify())
        .pipe(plugins.rename({suffix: '.min'}))
        .pipe(gulp.dest(config.dest + '/js'))
        .pipe(bs.reload({stream: true}));

        console.log('OK - JS minifying task completed.');
    })


    // WATCH.
    //=======================================================================================//
    .task('watch', ['sync'], function()
    {
        // Doesn't work on windows bash but works on cygwin or macOS.
        gulp.watch(config.src + '/css/*.+(css|scss)', ['css']);
        gulp.watch(config.src + '/js/*.js', ['js']);
        gulp.watch(config.src + '/templates/*.html', ['php']);
        // Trying things for windows bash...
        // gulp.watch('/css/main.scss', {cwd: config.src}, ['build']});
        console.log('Watching files: ' + config.src + '/css/*.+(css|scss)');
    })


    // BROWSER SYNC.
    //=======================================================================================//
    .task('sync', function()
    {
        bs.init
        ({
            open: false, // Set to false if you don't like the browser window opening automatically
            port: 3000, // Port number for the live version of the site; default: 3000
            proxy: 'localhost:80', // We need to use a proxy instead of the built-in server because WordPress has to do some server-side rendering for the theme to work
            // server: {baseDir: config.dest},
            startPath: 'my-snippets/dist/index.php'
        })
    })

    // SHORTCUT TASKS: BUILD, DEV, PROD, DEFAULT.
    //=======================================================================================//
    .task('dev', function()
    {
        dev = true;
        gulp.start(['php', 'css', 'js'/*, 'watch'*/]);
    })
    .task('prod', function()
    {
        dev = false;
        gulp.start(['php', 'css-min', 'js-min', 'watch']);
    })
    // Run when typing 'gulp' (only) in console.
    .task('default', function()
    {
        dev = true;
        gulp.start(['dev']);
    });