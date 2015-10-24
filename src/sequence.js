var utils = require('./utils');
var basename = require('path').basename;
var objPath = require('object-path');
var Rx = require('rx');
var RxNode = require('rx-node');
var logger = require('./logger');
var gruntCompat = require('./grunt-compat');
var t = require('./task-resolve');
var compat = require('./compat');

module.exports = function (tasks, input, config) {

    return flatten([], tasks);

    function flatten (initial, items) {
        return items.reduce((all, item) => {
            if (!item.modules.length && item.compat) {
                return all.concat(compatSeq(item, input, config))
            }
            if (item.modules.length) {
                return all.concat(loadModules(input, item.modules, item));
            }
            if (item.tasks.length) {
                return flatten(all, item.tasks);
            }
            return all;
        }, initial);
    }
}

module.exports.groupByParent = function (sequence) {
    return sequence.reduce(function (all, item) {
        if (item.task.compat) {
            if (!item.task.parent.length) {
                all['($' + item.task.compat + ')'] = [item];
                return all;
            } else {
                all[item.task.parent + ' ($' + item.task.compat + ')'] = [item];
                return all;
            }

        }
        if (!item.task.parent.length) {
            all[item.task.taskName] = [item];
            return all;
        }
        if (!all[item.task.parent]) {
            all[item.task.parent] = [item];
        } else {
            all[item.task.parent].push(item);
        }
        return all;
    }, {});
}

module.exports.getSeqTime = function (sequence) {
    return sequence.reduce(function (all, seq) {
        return all + seq.seq.taskItems.reduce(function (all, item) {
                return all + item.duration;
            }, 0);
    }, 0);
}
/**
 * If the task resolves to a file on disk,
 * we pick out the 'tasks' property
 * @param {String} item
 * @returns {Object}
 */
function requireModule(item) {
    var tasks = [].concat(require(item).tasks);
    var completed = false;
    var taskItems = tasks.map(function (fn) {
    	return {
            FUNCTION: fn,
            completed: false
        }
    })
    return {taskItems, completed};
}

/**
 * @param input
 * @param modules
 * @param item
 * @returns {*}
 */
function loadModules (input, modules, item) {

    let config = objPath.get(input, 'config', {});

    if (!item.subTasks.length) {
        let topLevelOpts = objPath.get(input, ['config', item.taskName], {});
        return {
            seq: requireModule(modules[0]),
            opts: utils.transformStrings(topLevelOpts, config),
            task: item
        };
    }

    return item.subTasks.map(function (subTask) {
        let subTaskOptions = objPath.get(input, ['config', item.taskName, subTask], {});
        return {
            seq: requireModule(modules[0]),
            opts: utils.transformStrings(subTaskOptions, config),
            task: item
        };
    });
}

/**
 * Call the create method of the compatibility layer
 * to enable a fn that can be used in the pipeline
 * @param item
 * @param input
 * @param config
 * @returns {{fns: *[], opts: {}, task: *}}
 */
function compatSeq (item, input, config, parent) {

    var args = [
        input,
        config,
        item
    ];

    return {
        seq: {
            taskItems: [
                {
                    FUNCTION: compat.compatAdaptors[item.compat].create.apply(null, args),
                    completed: false
                }
            ]
        },
        opts: {},
        task: item,
        parent
    }
}