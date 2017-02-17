/**
 * Use in terminal
 * ---------------
 *
 * gulp bower
 * gulp dev
 */

var gulp    = require('gulp'),
    // All the devDependencies from package.json.
    plugins = require('gulp-load-plugins')(
    {
        pattern: ['gulp-*', 'main-bower-files', 'browser-sync', 'merge2'],
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
    dev = true;

gulp
    // INDIVIDUAL TASKS.
    //=======================================================================================//

    // Create bower directory and populate with bower.json dependencies.
    .task('create-bower', function()
    { 
        return plugins.bower().pipe(gulp.dest(config.bowerDir)) ;
        console.log('OK - Bower folder generated.');
    })

    // Php and html.
    .task('php', function()
    {
        gulp
            .src(
            [
                // All except templates as they are changed in js task.
                config.src + '/**/*.+(php|html)', '!' + config.src + '/templates/*.html',
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
            .pipe(gulp.dest(config.dest + '/templates/'));

        console.log('OK - PHP / HTML files copied.');
    })

    // Css.
    /*.task('sass', function()
    {
        gulp.src(config.src + '/css/*.scss')
            .pipe(plugins.sass())
            .pipe(plugins.cssbeautify())
            .pipe(plugins.autoprefixer())
            .pipe(gulp.dest(config.dest + '/css/'))
            .pipe(plugins.browserSync.reload({stream: true}));

        console.log('OK - CSS compiling task completed.');
    })*/
    .task('css', function()
    {
        gulp.src(getFiles('scss'))
           .pipe(plugins.sass())
           .pipe(plugins.autoprefixer())
           .pipe(plugins.cssbeautify())
           .pipe(gulp.dest(config.dest + '/css/'));

        gulp.src(getFiles('css'))
           .pipe(plugins.autoprefixer())
           .pipe(plugins.cssbeautify())
           .pipe(gulp.dest(config.dest + '/css/'));

        console.log('OK - SCSS/CSS compiling task completed.');
    })
    .task('css-min', function()
    {
        var scss = gulp.src(getFiles('scss'))
                       .pipe(plugins.sass()),
            css  = gulp.src(getFiles('css'));

            plugins.merge2(scss, css)
            .pipe(plugins.autoprefixer())
            .pipe(plugins.csso())
            .pipe(plugins.concat('main.min.css'))
            .pipe(gulp.dest(config.dest + '/css/'));
        console.log('OK - CSS minifying task completed.');
    })

    // Js.
    .task('js', function()
    {
        gulp.src([config.src + '/js/*.js', '!' + config.src + '/js/main.js'])
        .pipe(
            plugins.include(
            {
                extensions: "js",
                includePaths: [
                    config.bowerDir,
                    config.src + "/js"
                ]
            })
        )
        .pipe(gulp.dest(config.dest + '/js'));

        gulp.src(config.src + '/templates/*.html')
            .pipe(plugins.replaceTask(
            {
                patterns:
                [{
                    match: /\{\{gulp:min\}\}/g,
                    replacement: ''
                }]
            }))
            .pipe(gulp.dest(config.dest + '/templates/'));

        console.log('OK - JS files copied.');
    })
    // Concatenates all the JS and the bower js libs.
    .task('js-min', function()
    {
        gulp.src([config.src + '/js/*.js', '!' + config.src + '/js/main.js'])
        .pipe(
            plugins.include(
            {
                extensions: "js",
                includePaths: [
                    config.bowerDir,
                    config.src + "/js"
                ]
            })
        )
        .on('error', console.log)
        .pipe(plugins.uglify())
        .pipe(plugins.rename({suffix: '.min'}))
        .pipe(gulp.dest(config.dest + '/js'));

        // gulp.src(getFiles('js'))
        //     .pipe(plugins.concat('main.min.js'))
        //     .pipe(plugins.uglify())
        //     .pipe(gulp.dest(config.dest + '/js/'));

        console.log('OK - JS minifying task completed.');
    })


    // WATCH.
    //=======================================================================================//
    .task('watch', ['sync', 'css'], function()
    {
        // Doesn't work on windows bash but works on cygwin or macOS.
        gulp.watch(config.src + '/css/*.+(css|scss)', ['css']);
        // Trying things for windows bash...
        // gulp.watch('/css/main.scss', {cwd: config.src}, ['build']});
        console.log('Watching files: ' + config.src + '/css/*.+(css|scss)');
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
    .task('dev', function()
    {
        dev = true;
        gulp.start(['php', 'css', 'js']);
    })
    .task('prod', function()
    {
        dev = false;
        gulp.start(['php', 'css-min', 'js-min']);
    })
    // Run when typing 'gulp' (only) in console.
    .task('default', function()
    {
        dev = true;
        gulp.start(['dev']);
    });



/**
 * Get CSS or JS Files.
 *
 * @param  string type: CSS, SCSS or JS.
 * @return array: the array of matched files paths.
 */
function getFiles(type)
{
    // Type files mask CSS or JS.
    var dir        = type === 'scss' ? 'css' : type,
        files      = [config.src + '/' + dir + '/*.+' + '(' + type + ')'],
        filter     = new RegExp('\.' + type + '$'),
        bowerFiles = getBowerFiles();

    if (bowerFiles) files = bowerFiles.filter(function(path){return filter.test(path)}).concat(files);

    return files;
}

function getBowerFiles()
{
    var files = null;

    if (bowerFiles) return bowerFiles;

    try {files = plugins.mainBowerFiles()}
    catch(e) {console.log('============= /!\\ =============\n' + e + '\n===============================\nIgnoring bower files...')}

    bowerFiles = files;
    return files;
}

function browserSyncInit(baseDir, files)
{
    plugins.browserSync.instance = plugins.browserSync.init(files,
    {
        startPath: '/', server: { baseDir: baseDir }
    });
}