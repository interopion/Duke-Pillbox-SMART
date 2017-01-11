var mobileLibs = [
    'src/vendor/jquery-2.1.3.js',
    'src/vendor/underscore.js',
    'src/vendor/backbone.js',
    'src/vendor/aes.js'
];

var mobileLibsMin = [
    'src/vendor/jquery-2.1.3.min.js',
    'src/vendor/underscore-min.js',
    'src/vendor/backbone-min.js',
    'src/vendor/aes.js'
];

var desktopLibs = [
    'src/vendor/jquery-1.11.2.js',
    'src/vendor/underscore.js',
    'src/vendor/backbone.js',
    'src/vendor/qrcode.js',
    'src/vendor/aes.js'
];

var desktopLibsMin = [
    'src/vendor/jquery-1.11.2.min.js',
    'src/vendor/underscore-min.js',
    'src/vendor/backbone-min.js',
    'src/vendor/qrcode.js',
    'src/vendor/aes.js'
];

module.exports = function(grunt) {

    grunt.initConfig({
        pkg : grunt.file.readJSON('package.json'),

        less: {
            mobile_dev: {
                options: {
                    banner  : "/* Duke Pillbox Mobile App v<%-pkg.version%> */\n",
                    cleancss: false,
                    compress: false
                },
                files: {
                    "build/mobile_app/css/style.css" : "src/mobile_app/css/style.less"
                }
            },
            mobile_prod: {
                options: {
                    cleancss: true,
                    compress: true
                },
                files: {
                    "build/mobile_app/css/style.css" : "src/mobile_app/css/style.less"
                }
            },
            desktop_dev: {
                options: {
                    cleancss: false,
                    compress: false
                },
                files: {
                    "build/desktop_app/css/style.css" : "src/desktop_app/css/style.less"
                }
            },
            desktop_prod: {
                options: {
                    cleancss: true,
                    compress: true
                },
                files: {
                    "build/desktop_app/css/style.css" : "src/desktop_app/css/style.less"
                }
            }
        },

        browserify: {
            mobile: {
                files: {
                    'build/mobile_app/js/app.js' : 'src/mobile_app/js/main.js'
                }
            },
            desktop: {
                files: {
                    'build/desktop_app/js/main.js' : 'src/desktop_app/js/main.js'
                }
            }
        },

        concat: {
            mobileLibs : {
                src : mobileLibs,
                dest: 'build/mobile_app/js/libs.js'
            },
            mobileLibsMin : {
                options: {
                    separator: ';',
                },
                src: mobileLibsMin,
                dest: 'build/mobile_app/js/libs.js'
            },
            desktopLibs : {
                src : desktopLibs,
                dest: 'build/desktop_app/js/libs.js'
            },
            desktopLibsMin : {
                options: {
                    separator: ';',
                },
                src : desktopLibsMin,
                dest: 'build/desktop_app/js/libs.js'
            }
        },

        jshint: {
            options: {
                jshintrc : ".jshintrc",
                reporter : require('jshint-stylish')
            },
            gruntfile: [ 'Gruntfile.js' ],
            mobile   : [ 'src/mobile_app/js/**/*.js'],
            desktop  : [ "build/desktop_app/js/app.js" ]
        },

        copy: {
            mobileHTML : {
                src    : 'src/mobile_app/index.html',
                dest   : 'build/mobile_app/index.html',
                options: {
                    process: grunt.template.process
                }
            },
            desktopHTML : {
                src    : 'src/desktop_app/index.html',
                dest   : 'build/desktop_app/index.html',
                options: {
                    process: grunt.template.process
                }
            }
        },

        watch : {
            options : {
                interrupt : true
            },

            dev : {
                files : [].concat(
                    mobileLibs,
                    mobileLibsMin,
                    desktopLibs,
                    desktopLibsMin,
                    [
                        "package.json",
                        "Gruntfile.js",
                        ".jshintrc",

                        "src/rxnorm.js",
                        "src/pillbox_codec.js",
                        "src/less_framework/**",

                        "src/mobile_app/js/**/*.js",
                        "src/mobile_app/css/**/*.*",
                        "src/mobile_app/index.html",

                        "src/desktop_app/js/**/*.js",
                        "src/desktop_app/css/**/*.*",
                        "src/desktop_app/index.html"
                    ]
                ),
                tasks : [ "dev" ]
            },

            prod : {
                files : [].concat(
                    mobileLibs,
                    mobileLibsMin,
                    desktopLibs,
                    desktopLibsMin,
                    [
                        "package.json",
                        "Gruntfile.js",
                        ".jshintrc",

                        "src/rxnorm.js",
                        "src/pillbox_codec.js",
                        "src/less_framework/**",

                        "src/mobile_app/js/**/*.js",
                        "src/mobile_app/css/**/*.*",
                        "src/mobile_app/index.html",

                        "src/desktop_app/js/**/*.js",
                        "src/desktop_app/css/**/*.*",
                        "src/desktop_app/index.html"
                    ]
                ),
                tasks : [ "default" ]
            }
        },

        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
                    '<%= grunt.template.today("yyyy-mm-dd") %> */\n',
                report : "gzip",
                mangle : true,
                compress: true
            },
            mobile: {
                files: {
                    'build/mobile_app/js/app.js' : ['build/mobile_app/js/app.js']
                }
            },
            desktop : {
                files: {
                    'build/desktop_app/js/main.js' : ['build/desktop_app/js/main.js']
                }
            }
        }
    });

    // Load the plugins
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-browserify');

    grunt.registerTask('dev', [
        "jshint:gruntfile",

        "jshint:mobile",
        "browserify:mobile",
        "concat:mobileLibs",
        "less:mobile_dev",
        "copy:mobileHTML",

        "browserify:desktop",
        "jshint:desktop",
        "concat:desktopLibs",
        "less:desktop_dev",
        "copy:desktopHTML"
    ]);

    // Default task - build everything for production
    grunt.registerTask('default', [
        "jshint:gruntfile",

        "jshint:mobile",
        "browserify:mobile",
        "concat:mobileLibsMin",
        "less:mobile_prod",
        "copy:mobileHTML",
        "uglify:mobile",

        "browserify:desktop",
        "jshint:desktop",
        "concat:desktopLibsMin",
        "less:desktop_prod",
        "copy:desktopHTML",
        "uglify:desktop"
    ]);
};
