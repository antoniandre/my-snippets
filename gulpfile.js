/**
 * Uses GULP 4.
 *
 * Use in terminal
 * —-------------
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
try {require('os').networkInterfaces();}
catch (e) {require('os').networkInterfaces = () => ({});}


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
    dev = true,
    bs = plugins.browserSync.create(),


// INDIVIDUAL TASKS.
//=======================================================================================//

    // Create bower directory and populate with bower.json dependencies.
    doCreateBower = function()
    {
        return plugins.bower().pipe(gulp.dest(config.bowerDir));
        console.log('OK - Bower folder generated.');
    },

    // Php and html.
    doTpl = function()
    {
        var tpl = gulp.src(config.src + '/templates/*.html')
            .pipe(plugins.replaceTask(
            {
                patterns:
                [{
                    match: /\{\{gulp:min\}\}/g,
                    replacement: dev ? '' : '.min'
                }]
            }))
            .pipe(gulp.dest(config.dest + '/templates/'))
            .pipe(bs.reload({stream:true}));

        console.log('OK - Template files copied.');

        return tpl;
    },
    doSnippetsSymlink = function()
    {
        var symlink = gulp.src(config.src + '/snippets')
            .pipe(gulp.symlink(config.dest));

        console.log('OK - snippets folder symlinked.');

        return symlink;
    },
    doPhp = function()
    {
        var php = gulp
            .src(
            [
                // All except templates as they are changed just bellow.
                config.src + '/**/*.+(php|html|json)',
                '!' + config.src + '/templates/*.html',
                '!' + config.src + '/snippets/*',
                config.src + '/**/.htaccess'
            ])
            .pipe(gulp.dest(config.dest));

        console.log('OK - PHP / HTML files copied.');

        return php;
    },
    doFonts = function()
    {
        var symlink = gulp.src(config.src + '/css/fonts')
            .pipe(gulp.symlink(config.dest + '/css'));

        console.log('OK - fonts folder symlinked.');

        return symlink;
    },

    doCss = function()
    {
        var css = gulp.src([config.src + '/css/*.+(scss|css)'])
            .pipe(
                plugins.include(
                {
                    extensions: "css",
                    includePaths: [config.src + "/css", config.bowerDir]
                })
            )
            .pipe(plugins.sass())
            // @todo: fix autoprefixer triggering error.
            // .pipe(plugins.autoprefixer())
            .pipe(plugins.cssbeautify())
            .pipe(gulp.dest(config.dest + '/css/'))
            .pipe(bs.reload({stream:true}));

        console.log('OK - SCSS/CSS compiling task completed.');

        return css;
    },

    doCssMin = function()
    {
        var css = gulp.src([config.src + '/css/*.+(scss|css)'])
            .pipe(
                plugins.include(
                {
                    extensions: "css",
                    includePaths: [config.src + "/css", config.bowerDir]
                })
            )
            .pipe(plugins.sass())
            // @todo: fix autoprefixer triggering error.
            // .pipe(plugins.autoprefixer())
            .pipe(plugins.csso())
            .pipe(plugins.rename({suffix: '.min'}))
            .pipe(gulp.dest(config.dest + '/css/'));

        console.log('OK - CSS minifying task completed.');

        return css;
    },

    // Js.
    doJs = function()
    {
        var js = gulp.src([config.src + '/js/*.js', '!' + config.src + '/js/inc.*.js'])
        .pipe(
            plugins.include(
            {
                extensions: "js",
                includePaths: [config.src + "/js", config.bowerDir]
            })
        )
        .pipe(gulp.dest(config.dest + '/js'))
        .pipe(bs.reload({stream:true}));

        console.log('OK - JS files copied.');

        return js;
    },

    // Concatenates all the JS and the bower js libs.
    doJsMin = function()
    {
        var js = gulp.src([config.src + '/js/*.js', '!' + config.src + '/js/inc.*.js'])
        .pipe(
            plugins.include(
            {
                extensions: "js",
                includePaths: [config.src + "/js", config.bowerDir]
            })
        )
        .on('error', console.log)
        .pipe(plugins.uglify())
        .pipe(plugins.rename({suffix: '.min'}))
        .pipe(gulp.dest(config.dest + '/js'));

        console.log('OK - JS minifying task completed.');

        return js;
    },


    // BROWSER SYNC.
    //=======================================================================================//
    doSync = function(done)
    {
        bs.init
        ({
            open: false, // Set to false if you don't like the browser window opening automatically
            port: 3000, // Port number for the live version of the site; default: 3000
            proxy: 'localhost:80', // We need to use a proxy instead of the built-in server because WordPress has to do some server-side rendering for the theme to work
            // server: {baseDir: config.dest},
            startPath: 'my-snippets/dist/index.php',
            // reloadDelay: 1000,
        }, done);
    },


    // WATCH.
    //=======================================================================================//
    doSetEnv = function(done)
    {
        // console.log(process.argv);
        // Check if gulp task is dev or prod, and default to dev environment.
        dev = process.argv[process.argv.length-1] !== 'prod';

        done();
    },

    doWatch = function(done)
    {
        gulp.watch(config.src + '/css/*.+(css|scss)', gulp.series(doCss));
        console.log('Watching files: ' + config.src + '/css/*.+(css|scss)');

        gulp.watch(config.src + '/js/*.js', gulp.series(doJs));
        console.log('Watching files: ' + config.src + '/js/*.js');

        gulp.watch(config.src + '/templates/*.html', gulp.series(doTpl));
        console.log('Watching files: ' + config.src + '/templates/*.html');

        gulp.watch([config.src + '/**/*.+(php|html|json|htaccess)', '!' + config.src + '/templates/*.html'],
                   gulp.series(doPhp, function(done){bs.reload();done()}));
        console.log('Watching files: ' + config.src + '/**/*.+(php|html|json|htaccess)');

        done();
    };


// SHORTCUT TASKS: BUILD, DEV, PROD, DEFAULT.
//=======================================================================================//
gulp.task('dev', gulp.series(doSetEnv, doSnippetsSymlink, gulp.parallel(doPhp, doTpl, doFonts, doCss, doJs), gulp.parallel(doSync, doWatch)));

gulp.task('prod', gulp.series(doSetEnv, doSnippetsSymlink, gulp.parallel(doPhp, doTpl, doFonts, doCssMin, doJsMin), gulp.parallel(doSync, doWatch)));

gulp.task('travis', gulp.series(doSetEnv, doSnippetsSymlink, gulp.parallel(doPhp, doTpl, doFonts, doCssMin, doJsMin), gulp.parallel(doSync, doWatch)), function()
{
    process.exit(0);
});

// Run when typing 'gulp' (only) in console.
gulp.task('default', gulp.series('dev'));

gulp.task('watch', gulp.series(doSync, doWatch));