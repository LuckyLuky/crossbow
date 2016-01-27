/**
 * @type {{cwd: *, runMode: string, resumeOnError: boolean, summary: string, strict: boolean}}
 */
const defaults = {
    /**
     * The current working directory, we never advise changing this
     */
    cwd: process.cwd(),
    /**
     * By default, tasks will wait in line and run when the previous
     * one completes. You can set this to 'parallel' instead
     * if you wish for your code to run as fast as possible
     */
    runMode: 'series',
    resumeOnError: false,
    /**
     * How much task information should be output
     * following task completion/setup
     */
    summary: 'short', // 'short', 'long', 'verbose'
    /**
     * Force config file etc
     */
    strict: false
};

/**
 * Allow single char flags such as
 *    $ crossbow run task1 task2 -p
 *
 * @type {{p: flagTransforms.p}}
 */
const flagTransforms = {
    p: (opts) => {
        return opts.update('runMode', () => 'parallel');
    },
    s: (opts) => {
        return opts.update('strict', () => true);
    }
};

/**
 * Merge default with incoming opts.
 * Also deal with single char flasg
 * @param opts
 * @returns {*}
 */
module.exports.merge = function (opts) {

    const newOpts = require('immutable')
        .fromJS(defaults)
        .mergeDeep(opts);

    return Object.keys(flagTransforms).reduce(function (opts, x) {
        if (opts.has(x)) {
            return flagTransforms[x].call(null, opts);
        }
        return opts;
    }, newOpts);
};