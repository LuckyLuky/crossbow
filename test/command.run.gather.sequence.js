const assert = require('chai').assert;
const cli = require("../");

function handoff(cmd, input, cb) {
    return cli({
        input: ['run'].concat(cmd),
        flags: {
            handoff: true
        }
    }, input, cb);
}

describe.skip('Gathering run tasks', function () {
    it('Accepts single string for on-disk file', function () {
        var runner = handoff(['test/fixtures/tasks/observable.js'], {});
        assert.equal(runner.sequence[0].sequenceTasks.length, 2); // 2 exported functions
    });
    it('Accepts single string for nested tasks', function () {
        var runner = handoff(['js'], {
            tasks: {
                js: 'test/fixtures/tasks/simple.js'
            }
        });
        assert.equal(runner.sequence[0].sequenceTasks.length, 1); // 2 exported functions
    });
    it('Accepts single string for multi nested tasks on disk', function () {
        var runner = handoff(['js'], {
            tasks: {
                js: 'js2',
                js2: 'js3',
                js3: 'js4',
                js4: 'test/fixtures/tasks/simple.js'
            }
        });
        assert.equal(runner.sequence[0].sequenceTasks.length, 1); // 1 exported functions
        assert.equal(runner.sequence[0].task.taskName, 'test/fixtures/tasks/simple.js');
        assert.deepEqual(runner.sequence[0].task.parents, ['js', 'js2', 'js3', 'js4']);
    });
    it('Accepts single string for multi nested adaptor tasks', function () {
        var runner = handoff(['js'], {
            tasks: {
                js: 'js2',
                js2: '@npm tsc src/*.ts --module commonjs --outDir dist'
            }
        });
        assert.equal(runner.sequence[0].sequenceTasks.length, 1); // 1 exported functions
        assert.equal(runner.sequence[0].task.taskName, '@npm tsc src/*.ts --module commonjs --outDir dist');
        assert.equal(runner.sequence[0].task.adaptor, 'npm');
        assert.equal(runner.sequence[0].task.rawInput, '@npm tsc src/*.ts --module commonjs --outDir dist');
        assert.equal(runner.sequence[0].task.command, 'tsc src/*.ts --module commonjs --outDir dist');
        assert.deepEqual(runner.sequence[0].task.parents, ['js', 'js2']);
    });
    it('can combine files to form sequence', function () {
        const runner = handoff(['test/fixtures/tasks/simple.js', 'test/fixtures/tasks/simple2.js'], {});
        assert.equal(runner.sequence.length, 2);
        assert.equal(runner.sequence[0].sequenceTasks.length, 1);
        assert.equal(runner.sequence[1].sequenceTasks.length, 1);
    });
    it('can combine files to form sequence from alias', function () {
        const runner = handoff(["js", "test/fixtures/tasks/stream.js"], {
            tasks: {
                js: ["dummy"],
                dummy: ["test/fixtures/tasks/simple.js", "test/fixtures/tasks/simple2.js"]
            }
        });

        assert.equal(runner.sequence[0].sequenceTasks.length, 1);
        assert.equal(runner.sequence[0].sequenceTasks[0].FUNCTION.name, 'simple');
        assert.equal(runner.sequence[1].sequenceTasks.length, 1);
        assert.equal(runner.sequence[1].sequenceTasks[0].FUNCTION.name, 'simple2');
        assert.equal(runner.sequence[2].sequenceTasks.length, 2);
    });
    it('can gather opts for sub tasks', function () {
        const runner = cli({
            input: ["run", "test/fixtures/tasks/simple.js:dev"],
            flags: {handoff: true}
        }, {
            config: {
                "test/fixtures/tasks/simple.js": {
                    default: {
                        input: "scss/core.scss",
                        output: "css/core.css"
                    },
                    dev: {
                        input: "scss/main.scss",
                        output: "css/main.min.css"
                    }
                }
            }
        });

        assert.equal(runner.sequence[0].sequenceTasks.length, 1);
        assert.equal(runner.sequence[0].opts.input, 'scss/main.scss');
        assert.equal(runner.sequence[0].opts.output, 'css/main.min.css');
    });
    it('can gather tasks when multi given in alias', function () {
        const runner = cli({
            input: ['run', 'js'],
            flags: {
                handoff: true
            }
        }, {
            tasks: {
                js: ['test/fixtures/tasks/simple.js:dev', "test/fixtures/tasks/simple.js:default"]
            },
            config: {
                "test/fixtures/tasks/simple.js": {
                    default: {
                        input: "scss/core.scss",
                        output: "css/core.css"
                    },
                    dev: {
                        input: "scss/main.scss",
                        output: "css/main.min.css"
                    }
                }
            }
        });

        assert.equal(runner.sequence[0].opts.input, 'scss/main.scss');
        assert.equal(runner.sequence[0].opts.output, 'css/main.min.css');

        assert.equal(runner.sequence[1].opts.input, 'scss/core.scss');
        assert.equal(runner.sequence[1].opts.output, 'css/core.css');
    });
    it('can gather tasks from multiple alias', function () {
        const runner = cli({
            input: ['run', 'css'],
            flags: {handoff: true}
        }, {
            tasks: {
                css: ['js'],
                js: ['test/fixtures/tasks/simple.js:dev', 'test/fixtures/tasks/simple.js:dev:default']
            },
            config: {
                'test/fixtures/tasks/simple.js': {
                    default: {
                        input: "scss/core.scss",
                        output: "css/core.css"
                    },
                    dev: {
                        input: "scss/main.scss",
                        output: "css/main.min.css"
                    }
                }
            }
        });

        assert.equal(runner.sequence[0].opts.input, 'scss/main.scss');
        assert.equal(runner.sequence[0].opts.output, 'css/main.min.css');
        assert.equal(runner.sequence[1].task.subTasks[0], 'dev');
        assert.equal(runner.sequence[1].task.subTasks[1], 'default');
    });
    it('can gather handle no-tasks in config', function () {

        const runner = cli({
            input: ["run", "test/fixtures/tasks/simple.js"],
            flags: {handoff: true}
        }, {
            config: {
                "test/fixtures/tasks/simple.js": {
                    default: {
                        input: "scss/core.scss",
                        output: "css/core.css"
                    },
                    dev: {
                        input: "scss/main.scss",
                        output: "css/main.min.css"
                    }
                }
            }
        });

        assert.equal(runner.sequence.length, 1);
        assert.equal(runner.sequence[0].opts.default.input, 'scss/core.scss');
        assert.equal(runner.sequence[0].opts.default.output, 'css/core.css');
    });
    it('can process config options with {} replacements', function () {
        const runner = cli({
            input: ["run", "css"],
            flags: {handoff: true}
        }, {
            tasks: {
                "css": ['test/fixtures/tasks/simple.js:default', 'test/fixtures/tasks/simple.js:dev']
            },
            config: {
                $: {
                    name: 'kittie'
                },
                root: '/user',
                public: '{{root}}/public',
                nested: {
                    props: 'no-problem',
                    arr: [
                        {
                            another: 'shane'
                        }
                    ]
                },
                'test/fixtures/tasks/simple.js': {
                    default: {
                        input: '{{public}}/css',
                        output: '{{public}}/dist/css',
                        random: '{{nested.props}}/js',
                        joke: '{{nested.arr.0.another}}',
                        animal: '{{$.name}}'
                    },
                    dev: {
                        input: '{{root}}/css',
                        output: '{{root}}/dist/css'
                    }
                }
            }
        });

        assert.equal(runner.sequence[0].opts.input, '/user/public/css');
        assert.equal(runner.sequence[0].opts.output, '/user/public/dist/css');
        assert.equal(runner.sequence[0].opts.random, 'no-problem/js');
        assert.equal(runner.sequence[0].opts.joke, 'shane');
        assert.equal(runner.sequence[0].opts.animal, 'kittie');

        assert.equal(runner.sequence[1].opts.output, '/user/dist/css');
        assert.equal(runner.sequence[1].opts.output, '/user/dist/css');
    });
});
